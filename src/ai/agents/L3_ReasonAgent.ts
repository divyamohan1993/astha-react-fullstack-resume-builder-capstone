/**
 * L3 Reasoning Agent -- Gemma 3 WebLLM stub.
 *
 * Defines prompt templates for contradiction detection using Henle et al.'s
 * three-dimensional taxonomy of resume fraud, and resume refinement prompts.
 *
 * Actual WebLLM integration will be wired when model files are available.
 * This module exports the prompts and parsing logic so they can be used
 * by both L3 (local Gemma 3) and L4 (Gemini API fallback).
 *
 * Citations:
 * - Henle, C.A., Dineen, B.R., & Duffy, M.K. (2019). "Assessing Intentional
 *   Resume Deception: Development and Nomological Network of a Resume Fraud
 *   Measure." Journal of Business and Psychology, 34, 207-225.
 *   https://link.springer.com/article/10.1007/s10869-017-9527-4
 * - Knouse, S.B. (1994). "Impressions of the Resume." Personnel Psychology.
 */

import type { RedFlag } from '../../store/types';

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
 *
 * Citation: Henle, Dineen & Duffy (2019), J. Business Psychology, 34, 207-225.
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
 *
 * Citation: AAC&U VALUE Rubrics, aacu.org/value/rubrics
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
  "suggestions": [
    {
      "section": "which section",
      "severity": "high" | "medium" | "tip",
      "current": "current text",
      "suggested": "improved text",
      "reason": "why this change matters"
    }
  ],
  "reasoning": "overall assessment"
}`;
}

/**
 * Parse the LLM response for contradiction detection into typed RedFlag objects.
 *
 * Handles both clean JSON and markdown-wrapped JSON (```json ... ```).
 * Falls back gracefully on parse failure.
 */
export function parseContradictionResponse(response: string): RedFlag[] {
  try {
    // Strip markdown code fences if present
    let cleaned = response.trim();
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    }

    // Try to extract JSON array
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return [];

    const parsed = JSON.parse(arrayMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item: Record<string, unknown>) =>
          item.type && item.dimension && item.description
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
