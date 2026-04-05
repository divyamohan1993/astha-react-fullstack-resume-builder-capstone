/**
 * AI Analysis Pipeline Orchestrator
 *
 * Runs the 4-layer analysis pipeline: Parse -> L1 -> L2 -> L3 -> Score.
 * Supports progressive callbacks so the UI updates as each layer completes.
 * Handles batch processing of multiple resumes.
 *
 * Pipeline order (spec section 6.3):
 *   ParseAgent -> L1_NLPAgent -> L2_EmbedAgent -> L3_ReasonAgent -> ScoreAgent -> DistanceAgent
 *
 * Progressive: L1 scores appear instantly. L2 enriches within 2s.
 * L3 adds reasoning flags over 5-15s. Dashboard updates progressively.
 */

import type { CandidateScores, AnalysisLayer, RedFlag } from '../store/types';
import { analyzeL1 } from './agents/L1_NLPAgent';
import { analyzeL2 } from './agents/L2_EmbedAgent';
import {
  buildContradictionPrompt,
  buildRefinementPrompt,
  parseContradictionResponse,
  type L3Result,
} from './agents/L3_ReasonAgent';
import { analyzeWithGemini } from './agents/L4_FallbackAgent';
import { computeScore } from './agents/ScoreAgent';
import { getDistance } from './agents/DistanceAgent';

export interface PipelineConfig {
  /** Gemini API key for L4 fallback (optional) */
  geminiApiKey?: string;
  /** Google Maps API key for distance calculation (optional) */
  mapsApiKey?: string;
  /** Job location for distance calculation */
  jobLocation?: string;
  /** Max concurrent analyses for batch processing */
  concurrency?: number;
}

export interface PipelineProgress {
  candidateId: string;
  layer: AnalysisLayer | 'done' | 'error';
  scores: CandidateScores | null;
  redFlags: RedFlag[];
  error?: string;
}

export type ProgressCallback = (progress: PipelineProgress) => void;

/**
 * Run the full analysis pipeline for a single resume.
 *
 * Pipeline stages:
 * 1. L1 (NLP): instant keyword + section + entity extraction
 * 2. L2 (Embed): TF-IDF cosine similarity (MiniLM proxy)
 * 3. L3 (Reason): Gemma 3 WebLLM contradiction detection (stub)
 * 4. Score: weighted composite per spec section 6.13
 * 5. Distance: Google Maps (optional, async)
 */
export async function analyzeResume(
  candidateId: string,
  resumeText: string,
  jdText: string,
  config: PipelineConfig = {},
  onProgress?: ProgressCallback
): Promise<{ scores: CandidateScores; redFlags: RedFlag[] }> {
  let redFlags: RedFlag[] = [];

  // --- Layer 1: NLP (instant) ---
  const l1 = analyzeL1(resumeText, jdText);
  onProgress?.({
    candidateId,
    layer: 'L1',
    scores: null,
    redFlags: [],
  });

  // --- Layer 2: Embedding proxy (TF-IDF cosine) ---
  const l2 = analyzeL2(resumeText, jdText);
  onProgress?.({
    candidateId,
    layer: 'L2',
    scores: null,
    redFlags: [],
  });

  // --- Layer 3: Reasoning (stub -- WebLLM Gemma 3 not yet wired) ---
  let l3: L3Result | null = null;
  try {
    // L3 WebLLM will be wired here when model files are available.
    // For now, attempt L4 fallback if API key is configured.
    if (config.geminiApiKey) {
      const prompt = buildContradictionPrompt(resumeText, jdText);
      const response = await analyzeWithGemini(config.geminiApiKey, prompt);
      redFlags = parseContradictionResponse(response);

      // Get refinement analysis for experience/project scoring
      const refinePrompt = buildRefinementPrompt(resumeText);
      const refineResponse = await analyzeWithGemini(
        config.geminiApiKey,
        refinePrompt
      );
      try {
        let cleaned = refineResponse.trim();
        const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) cleaned = jsonMatch[1].trim();
        const objMatch = cleaned.match(/\{[\s\S]*\}/);
        if (objMatch) {
          const parsed = JSON.parse(objMatch[0]);
          l3 = {
            redFlags,
            experienceLevel: parsed.experienceLevel ?? 'medium',
            projectScores: parsed.projectScores ?? [],
            reasoning: parsed.reasoning ?? '',
          };
        }
      } catch {
        l3 = { redFlags, experienceLevel: 'medium', projectScores: [], reasoning: '' };
      }
    }
  } catch {
    // L3/L4 failure: continue with L1+L2 scores only
    l3 = null;
  }

  onProgress?.({
    candidateId,
    layer: 'L3',
    scores: null,
    redFlags,
  });

  // --- Distance (optional, async) ---
  let distance: { km: number } | null = null;
  if (config.mapsApiKey && config.jobLocation && l1.name) {
    // Extract candidate location from resume (heuristic: near contact info)
    const candidateLocation = extractLocation(resumeText);
    if (candidateLocation) {
      const distResult = await getDistance(
        config.mapsApiKey,
        candidateLocation,
        config.jobLocation
      );
      if (distResult) {
        distance = { km: distResult.km };
      }
    }
  }

  // --- Score computation (spec section 6.13) ---
  const scores = computeScore(l1, l2, l3, distance);

  onProgress?.({
    candidateId,
    layer: 'done',
    scores,
    redFlags,
  });

  return { scores, redFlags };
}

/**
 * Extract a location string from resume text (near the top, likely contact area).
 * Heuristic: look for city/state patterns or address-like text in first few lines.
 */
function extractLocation(text: string): string {
  const lines = text.split('\n').slice(0, 10);
  for (const line of lines) {
    // Match city, state patterns or Indian city names
    const locationMatch = line.match(
      /\b(?:[A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2}\b|[A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Za-z\s]+(?:India|USA|UK|Canada))/
    );
    if (locationMatch) return locationMatch[0];
  }
  return '';
}

/**
 * Batch analyze multiple resumes with concurrency control.
 *
 * Processes up to `concurrency` resumes in parallel (default: 4, per spec section 5.3).
 * Calls onProgress for each resume as each layer completes.
 */
export async function analyzeBatch(
  candidates: Array<{ id: string; resumeText: string }>,
  jdText: string,
  config: PipelineConfig = {},
  onProgress?: ProgressCallback
): Promise<Map<string, { scores: CandidateScores; redFlags: RedFlag[] }>> {
  const concurrency = config.concurrency ?? 4;
  const results = new Map<
    string,
    { scores: CandidateScores; redFlags: RedFlag[] }
  >();

  // Process in batches of `concurrency`
  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map((c) =>
        analyzeResume(c.id, c.resumeText, jdText, config, onProgress)
          .then((result) => ({ id: c.id, result }))
          .catch((error) => {
            onProgress?.({
              candidateId: c.id,
              layer: 'error',
              scores: null,
              redFlags: [],
              error: String(error),
            });
            return null;
          })
      )
    );

    for (const settled of batchResults) {
      if (settled.status === 'fulfilled' && settled.value) {
        results.set(settled.value.id, settled.value.result);
      }
    }
  }

  return results;
}
