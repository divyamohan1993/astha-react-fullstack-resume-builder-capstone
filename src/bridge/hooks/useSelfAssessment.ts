/**
 * Self-Assessment Hook -- runs the employer scoring pipeline on the candidate's
 * own resume against loaded bridge criteria.
 *
 * Pipeline: L1 NLP -> L2 Embedding -> ScoreAgent -> weight mapping -> keyword analysis.
 *
 * Citations:
 * - NACE Job Outlook 2024 (skills weight 30%)
 * - Jaccard (1901) exact keyword matching
 * - Wang et al. (2020) MiniLM semantic similarity
 * - Salton (1975) TF-IDF fallback
 */

import { useState, useCallback } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import { useBridgeStore } from '@/bridge/store';
import { analyzeL1 } from '@/ai/agents/L1_NLPAgent';
import { analyzeL2Sync } from '@/ai/agents/L2_EmbedAgent';
import { computeScore } from '@/ai/agents/ScoreAgent';
import type { BridgeCriteria, ScoreBreakdown } from '@/bridge/types';
import type { Resume } from '@/store/types';

interface KeywordAnalysis {
  matched: string[];
  missing: string[];
  semantic: string[];
}

interface SelfAssessmentReturn {
  assess: (criteria: BridgeCriteria) => void;
  loading: boolean;
  result: ScoreBreakdown | null;
  keywordAnalysis: KeywordAnalysis | null;
}

/**
 * Convert a Resume object to plain text for NLP analysis.
 * Concatenates personal info, summary, all section headings, entry fields, and bullets.
 */
function resumeToText(resume: Resume): string {
  const parts: string[] = [];

  // Personal info
  const p = resume.personal;
  if (p.name) parts.push(p.name);
  if (p.email) parts.push(p.email);
  if (p.phone) parts.push(p.phone);
  if (p.location) parts.push(p.location);
  if (p.linkedin) parts.push(p.linkedin);
  if (p.github) parts.push(p.github);

  // Summary
  if (resume.summary) parts.push(resume.summary);

  // Sections
  for (const section of resume.sections) {
    parts.push(section.heading);
    for (const entry of section.entries) {
      // Entry fields (title, organization, date, description, etc.)
      for (const value of Object.values(entry.fields)) {
        if (value) parts.push(value);
      }
      // Bullets
      for (const bullet of entry.bullets) {
        if (bullet) parts.push(bullet);
      }
    }
  }

  return parts.join('\n');
}

/**
 * Build JD text from bridge criteria for scoring pipeline input.
 */
function criteriaToJdText(criteria: BridgeCriteria): string {
  const parts: string[] = [];

  if (criteria.jobTitle) parts.push(criteria.jobTitle);
  if (criteria.description) parts.push(criteria.description);

  if (criteria.requiredSkills.length > 0) {
    parts.push('Required Skills: ' + criteria.requiredSkills.join(', '));
  }
  if (criteria.preferredSkills.length > 0) {
    parts.push('Preferred Skills: ' + criteria.preferredSkills.join(', '));
  }

  return parts.join('\n');
}

/**
 * Map CandidateScores dimensions to ScoreBreakdown format with custom weights.
 */
function buildBreakdown(
  candidateScores: ReturnType<typeof computeScore>,
  customWeights: Record<string, number>,
): ScoreBreakdown {
  // Default weights (sum to ~100) from bridge types
  const defaultWeights: Record<string, number> = {
    skillsMatch: 30,
    experience: 20,
    education: 15,
    projects: 10,
    certifications: 5,
    distance: 5,
    extracurricular: 5,
    gpa: 3,
    completeness: 2,
  };

  const weights = { ...defaultWeights, ...customWeights };

  // Raw scores from candidate scoring
  const rawScores: Record<string, number> = {
    skillsMatch: candidateScores.skillsMatch.score,
    experience: candidateScores.experience.score,
    education: candidateScores.education.score,
    projects: candidateScores.projects.score,
    certifications: candidateScores.certifications.score,
    distance: candidateScores.distance?.score ?? 0,
    extracurricular: candidateScores.extracurricular.score,
    gpa: candidateScores.gpa?.score ?? 0,
    completeness: candidateScores.completeness.score,
  };

  // Normalize weights (exclude distance if unavailable)
  const activeKeys = Object.keys(weights).filter(
    (k) => !(k === 'distance' && !candidateScores.distance),
  );
  const totalWeight = activeKeys.reduce((sum, k) => sum + (weights[k] ?? 0), 0);

  const breakdown: Record<string, { raw: number; weighted: number; weight: number }> = {};
  let overall = 0;

  for (const key of activeKeys) {
    const w = (weights[key] ?? 0) / totalWeight;
    const raw = rawScores[key] ?? 0;
    const weighted = raw * w * 100;
    breakdown[key] = { raw, weighted, weight: weights[key] ?? 0 };
    overall += weighted;
  }

  return {
    overall: Math.round(Math.max(0, Math.min(100, overall)) * 100) / 100,
    breakdown,
  };
}

/**
 * Extract keyword analysis: matched, missing, and semantic matches from required skills.
 */
function extractKeywordAnalysis(
  resumeText: string,
  criteria: BridgeCriteria,
  l2SemanticMatches: string[],
): KeywordAnalysis {
  const resumeLower = resumeText.toLowerCase();

  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of criteria.requiredSkills) {
    if (resumeLower.includes(skill.toLowerCase())) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  // Check preferred skills too (add matched ones)
  for (const skill of criteria.preferredSkills) {
    if (resumeLower.includes(skill.toLowerCase()) && !matched.includes(skill)) {
      matched.push(skill);
    }
  }

  // Semantic matches from L2 analysis (bigram overlaps detected by embedding agent)
  const semantic = l2SemanticMatches.filter(
    (m) => !matched.some((mk) => mk.toLowerCase() === m.toLowerCase()),
  );

  return { matched, missing, semantic };
}

export function useSelfAssessment(): SelfAssessmentReturn {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreBreakdown | null>(null);
  const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordAnalysis | null>(null);

  const assess = useCallback((criteria: BridgeCriteria) => {
    setLoading(true);

    try {
      const resume = useResumeStore.getState().resume;
      const resumeText = resumeToText(resume);
      const jdText = criteriaToJdText(criteria);

      // Pipeline: L1 -> L2 -> Score
      const l1 = analyzeL1(resumeText, jdText);
      const l2 = analyzeL2Sync(resumeText, jdText);
      const candidateScores = computeScore(l1, l2, null, null);

      // Build breakdown with custom weights from criteria
      const scoreBreakdown = buildBreakdown(candidateScores, criteria.weights);

      // Keyword analysis
      const keywords = extractKeywordAnalysis(resumeText, criteria, l2.semanticMatches);

      setResult(scoreBreakdown);
      setKeywordAnalysis(keywords);

      // Persist to bridge store
      useBridgeStore.getState().setSelfAssessment(scoreBreakdown);
    } finally {
      setLoading(false);
    }
  }, []);

  return { assess, loading, result, keywordAnalysis };
}
