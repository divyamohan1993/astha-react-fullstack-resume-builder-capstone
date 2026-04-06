import type { DifficultyLevel, QuestionResponse, IntegrityFlag, AudioFlag, VerificationResult, SkillVerification, IntegrityResult } from '../types';
import { LEVEL_MULTIPLIERS, SCORE_CEILINGS } from '../types';

export interface SkillData {
  skill: string;
  responses: QuestionResponse[];
  levels: DifficultyLevel[];
}

export function getNextLevel(current: DifficultyLevel, correct: boolean, wrongCountAtLevel: number): DifficultyLevel {
  if (correct) {
    return Math.min(current + 1, 5) as DifficultyLevel;
  }
  if (wrongCountAtLevel >= 1) {
    return Math.max(current - 1, 1) as DifficultyLevel;
  }
  return current;
}

export function computeVerificationScore(skills: SkillData[]): VerificationResult {
  const perSkill: SkillVerification[] = skills.map(({ skill, responses, levels }) => {
    let rawScore = 0;
    let maxPossible = 0;
    let peakLevel: DifficultyLevel = 1;
    let consecutiveCorrectAtL3Plus = 0;
    let hasSustainedBonus = false;

    for (let i = 0; i < responses.length; i++) {
      const level = levels[i];
      const multiplier = LEVEL_MULTIPLIERS[level];
      maxPossible += multiplier;

      if (responses[i].correct) {
        rawScore += multiplier;
        if (level >= 3) {
          consecutiveCorrectAtL3Plus++;
          if (consecutiveCorrectAtL3Plus >= 3) hasSustainedBonus = true;
        } else {
          consecutiveCorrectAtL3Plus = 0;
        }
      } else {
        consecutiveCorrectAtL3Plus = 0;
      }

      if (level > peakLevel) peakLevel = level;
    }

    let normalized = maxPossible > 0 ? (rawScore / maxPossible) * 100 : 0;

    if (hasSustainedBonus) {
      normalized *= 1.15;
    }

    // Apply score ceilings based on peak level
    if (peakLevel <= 2) {
      normalized = Math.min(normalized, SCORE_CEILINGS.L2_MAX);
    } else if (peakLevel === 3) {
      normalized = Math.min(normalized, SCORE_CEILINGS.L3_MAX);
    } else if (peakLevel === 4) {
      normalized = Math.min(normalized, SCORE_CEILINGS.L4_MAX);
    }
    // peakLevel 5: cap at 100 (implicit)
    normalized = Math.min(normalized, 100);

    return { skill, score: normalized, peakLevel, questionsAttempted: responses.length };
  });

  const totalQuestions = perSkill.reduce((sum, s) => sum + s.questionsAttempted, 0);
  const overall = perSkill.length > 0
    ? perSkill.reduce((sum, s) => sum + s.score, 0) / perSkill.length
    : 0;

  return { overall, perSkill, totalQuestions, duration: 0 };
}

export function computeIntegrityScore(flags: IntegrityFlag[], audioFlags: AudioFlag[], micPermission: boolean): IntegrityResult {
  let score = 100;

  for (const flag of flags) {
    score -= flag.penalty;
  }
  for (const af of audioFlags) {
    score -= af.penalty;
  }

  score = Math.max(0, Math.min(100, score));

  const flagSummary: Record<string, number> = {};
  for (const flag of flags) {
    flagSummary[flag.type] = (flagSummary[flag.type] ?? 0) + 1;
  }
  for (const af of audioFlags) {
    flagSummary[af.type] = (flagSummary[af.type] ?? 0) + 1;
  }

  return { score, micPermission, flags, audioFlags, flagSummary };
}
