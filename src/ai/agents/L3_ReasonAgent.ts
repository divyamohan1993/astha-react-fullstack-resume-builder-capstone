/**
 * L3 Reasoning Agent -- Gemma 3 via WebLLM.
 *
 * Loads Gemma-3-1B-it-q4f16_1-MLC in the browser via @mlc-ai/web-llm.
 * Runs on WebGPU (fast) or WASM CPU fallback (30-60s per analysis).
 * Model ~600MB, cached in IndexedDB after first download.
 *
 * Prompt templates use Henle et al.'s taxonomy for contradiction detection
 * and AAC&U VALUE rubrics for project quality assessment.
 *
 * Citations:
 * - Henle, C.A., Dineen, B.R., & Duffy, M.K. (2019). "Assessing Intentional
 *   Resume Deception." J. Business Psychology, 34, 207-225.
 *   https://link.springer.com/article/10.1007/s10869-017-9527-4
 * - Knouse, S.B. (1994). "Impressions of the Resume." Personnel Psychology.
 * - AAC&U VALUE Rubrics: aacu.org/value/rubrics
 */

import type { RedFlag } from '../../store/types';
import {
  getOrCreateEngine,
  generate,
  isEngineReady,
  type ProgressCallback,
} from '../models/webllm';

export interface L3Result {
  redFlags: RedFlag[];
  experienceLevel: 'high' | 'medium' | 'low';
  projectScores: number[];
  reasoning: string;
}

/**
 * Build the contradiction detection prompt using Henle et al. (2019) taxonomy.
 *
 * Taxonomy dimensions:
 * - Fabrication: knowingly stating false information (-20 penalty)
 * - Embellishment: exaggerating real experience (-10 penalty)
 * - Omission: strategically hiding information (-5 penalty)
 */
export function buildContradictionPrompt(resume: string, jd: string): string {
  return `You are an expert ATS analyst detecting resume inconsistencies.

Analyze this resume against the job description using Henle et al.'s (2019) three-dimensional taxonomy of resume fraud (Journal of Business and Psychology, 34, 207-225):

1. FABRICATION: Knowingly false information (e.g., claiming an unearned degree, fabricating a company name)
2. EMBELLISHMENT: Exaggeration of real experience (e.g., inflating role titles, overstating impact metrics)
3. OMISSION: Strategically hiding information (e.g., removing dates to hide gaps, omitting short-tenure jobs)

Also check for:
- Date inconsistencies: graduation year vs claimed years of experience, overlapping dates
- Skill inflation: skills listed but never evidenced in experience/projects (Knouse 1994)
- Title inflation: title disproportionate to described responsibilities (Henle et al. 2019)
- Buzzword stuffing: abnormally high keyword density vs substantive content (Jobscan ATS Study)
- Skill count credibility: >15 unrelated skills (Knouse 1994)

RESUME:
${resume}

JOB DESCRIPTION:
${jd}

Respond in JSON array format. Each item:
{
  "type": "contradiction" | "framing" | "date-inconsistency" | "skill-inflation" | "hidden-text",
  "dimension": "fabrication" | "embellishment" | "omission",
  "description": "what was found",
  "evidence": "specific text from resume",
  "penalty": number (-5 to -20),
  "citation": "research source for this detection"
}

If no issues found, return an empty array: []`;
}

/**
 * Build the resume refinement prompt for AI coaching.
 * Uses AAC&U VALUE rubric criteria for project quality assessment.
 */
export function buildRefinementPrompt(resume: string): string {
  return `You are an expert resume coach. Analyze this resume and provide specific, actionable improvements.

Score each project using the AAC&U VALUE Rubric (aacu.org/value/rubrics):
- Capstone (4): Quantified outcome + tech stack + problem statement + methodology
- Milestone 3: Quantified outcome + tech stack, missing methodology
- Milestone 2: Tech stack present, no quantification
- Benchmark (1): Vague description, no measurable outcome

Also assess:
- Experience level: high (2+ years relevant) / medium (internship or 1 year) / low (no experience)
- Bullet point quality: action verb + quantified impact + context
- Summary effectiveness: specific vs generic

RESUME:
${resume}

Respond in JSON:
{
  "experienceLevel": "high" | "medium" | "low",
  "projectScores": [1-4 for each project],
  "reasoning": "overall assessment"
}`;
}

/**
 * Parse the LLM response for contradiction detection into typed RedFlag objects.
 * Handles both clean JSON and markdown-wrapped JSON.
 */
export function parseContradictionResponse(response: string): RedFlag[] {
  try {
    let cleaned = response.trim();
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    }

    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return [];

    const parsed = JSON.parse(arrayMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item: Record<string, unknown>) =>
          item.type && item.dimension && item.description,
      )
      .map((item: Record<string, unknown>) => ({
        type: item.type as RedFlag['type'],
        dimension: item.dimension as RedFlag['dimension'],
        description: String(item.description),
        evidence: String(item.evidence ?? ''),
        penalty: typeof item.penalty === 'number' ? item.penalty : -5,
        citation: String(item.citation ?? 'Henle et al. (2019)'),
      }));
  } catch {
    return [];
  }
}

/**
 * Parse refinement response from LLM.
 */
function parseRefinementResponse(response: string): Omit<L3Result, 'redFlags'> {
  try {
    let cleaned = response.trim();
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) cleaned = jsonMatch[1].trim();

    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!objMatch) {
      return { experienceLevel: 'low', projectScores: [], reasoning: '' };
    }

    const parsed = JSON.parse(objMatch[0]);
    return {
      experienceLevel: parsed.experienceLevel ?? 'low',
      projectScores: Array.isArray(parsed.projectScores) ? parsed.projectScores : [],
      reasoning: String(parsed.reasoning ?? ''),
    };
  } catch {
    return { experienceLevel: 'low', projectScores: [], reasoning: '' };
  }
}

/**
 * Run full L3 analysis using Gemma 3 via WebLLM.
 *
 * Steps:
 * 1. Load engine (first time: ~600MB download, subsequent: instant from cache)
 * 2. Run contradiction detection prompt
 * 3. Run refinement prompt
 * 4. Parse and return structured results
 *
 * Throws if WebLLM/WebGPU/WASM fails entirely (caller should catch and skip L3).
 */
export async function analyzeL3(
  resumeText: string,
  jdText: string,
  onProgress?: ProgressCallback,
): Promise<L3Result> {
  const engine = await getOrCreateEngine(onProgress);

  // Run both prompts (sequentially -- single model instance)
  const contradictionPrompt = buildContradictionPrompt(resumeText, jdText);
  const contradictionResponse = await generate(engine, contradictionPrompt, 2048);
  const redFlags = parseContradictionResponse(contradictionResponse);

  const refinementPrompt = buildRefinementPrompt(resumeText);
  const refinementResponse = await generate(engine, refinementPrompt, 1024);
  const refinement = parseRefinementResponse(refinementResponse);

  return {
    redFlags,
    ...refinement,
  };
}

/**
 * Check if the L3 engine is loaded and ready for inference.
 */
export function isL3Ready(): boolean {
  return isEngineReady();
}
