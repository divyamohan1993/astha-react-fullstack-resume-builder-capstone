/**
 * Score Agent -- THE CORE.
 *
 * Implements the exact composite scoring formula from spec section 6.13.
 * Every line has citation comments tracing back to the source.
 *
 * Weight sources:
 * - 30% skills:         NACE Job Outlook 2024 (naceweb.org)
 * - 20% experience:     NACE Internship Survey 2024
 * - 15% education:      NACE Job Outlook 2024 (73.4% screen by major)
 * - 10% projects:       AAC&U / Hart Research 2018 (93% value problem-solving)
 * - 5%  certifications: SHRM Credentials 2021 (87% HR confidence)
 * - 5%  distance:       Marinescu & Rathelot 2018, AEJ:Macro 10(3):42-70
 * - 5%  extracurricular: Roulin & Bangerter 2013, J. Education & Work 26(1)
 * - 3%  GPA:            NACE 2024 (38.3% use 3.0 cutoff)
 * - 2%  completeness:   Ladders Eye-Tracking 2018
 *
 * Penalties:
 * - Henle, Dineen & Duffy (2019), J. Business Psychology 34, 207-225
 * - Knouse (1994), Personnel Psychology
 */

import type { CandidateScores } from '../../store/types';
import type { L1Result } from './L1_NLPAgent';
import type { L2Result } from './L2_EmbedAgent';
import type { L3Result } from './L3_ReasonAgent';
import { distanceScoreFromKm } from '../scoring/distanceDecay';
import { gpaScore } from '../scoring/gpaScore';

// Spec section 6.13: parameter weights
// Citation: NACE Job Outlook 2024, SHRM 2021, Marinescu & Rathelot 2018,
//           Roulin & Bangerter 2013, Ladders 2018, AAC&U/Hart 2018
const WEIGHTS = {
  skills: 0.30,         // NACE Job Outlook 2024 -- skills #1 attribute
  experience: 0.20,     // NACE Internship Survey 2024 -- 56.1% intern-to-hire
  education: 0.15,      // NACE Job Outlook 2024 -- 73.4% screen by major
  projects: 0.10,       // AAC&U / Hart Research 2018 -- 93% value problem-solving
  certifications: 0.05, // SHRM Credentials 2021 -- 87% HR confidence
  distance: 0.05,       // Marinescu & Rathelot 2018, AEJ:Macro 10(3):42-70
  extracurricular: 0.05,// Roulin & Bangerter 2013, J. Education & Work 26(1)
  gpa: 0.03,            // NACE 2024 -- 38.3% use 3.0 cutoff
  completeness: 0.02,   // Ladders Eye-Tracking 2018 -- F-pattern scan order
} as const satisfies Record<string, number>;

/**
 * Detect leadership roles in extracurricular text.
 *
 * Citation: Roulin & Bangerter (2013) -- significant positive callback effects
 * for leadership roles in student organizations.
 * Cole et al. (2007) -- extracurriculars signal conscientiousness.
 */
const LEADERSHIP_PATTERN =
  /\b(president|lead|captain|founder|head|chair|director|coordinator|manager|secretary|treasurer|vice[\s-]president|vp)\b/i;

/**
 * Detect quantified outcomes in project descriptions.
 * Used for AAC&U VALUE rubric classification.
 */
const QUANTIFIED_PATTERN =
  /\d+%|\d+x|\d+\s*(users?|requests?|ms|seconds?|transactions?|records?|improvement|reduction|increase|decrease)/i;

/**
 * Compute the weighted composite score from all analysis layers.
 *
 * Formula (spec section 6.13):
 *   base_score = sum(weight_i * score_i) * 100
 *   penalty = sum(flag.penalty for flag in red_flags)
 *   final_score = clamp(base_score + penalty, 0, 100)
 *
 * Hard gate (spec section 6.9): if parseability fails, final_score = 0.
 *
 * Distance unavailable: redistribute 5% proportionally across params 1-5.
 * Formula: w_i_adjusted = w_i / (1.0 - sum_of_excluded_weights)
 */
export function computeScore(
  l1: L1Result,
  l2: L2Result,
  l3: L3Result | null,
  distance: { km: number } | null
): CandidateScores {
  // --- Skills Match (30%) ---
  // Spec section 6.1: skills_score = 0.4 * L1_exact + 0.6 * L2_semantic
  // L1 already computes the blended score; L2 adds semantic depth
  const skillsMatchScore = 0.4 * l1.skillsScore + 0.6 * l2.semanticScore;

  // Determine matched/missing/semantic skills
  const matched = l2.semanticMatches.slice(0, 10);
  const missing: string[] = []; // Populated by JD analysis
  const semantic = l2.semanticMatches.slice(10, 20);

  // --- Experience (20%) ---
  // Spec section 6.2: has_experience * relevance
  const hasExperience = l1.sections.includes('experience') ? 1 : 0;
  const experienceRelevance = l2.semanticScore; // Embedding similarity proxy
  const experienceRaw = hasExperience * experienceRelevance;
  const experienceLevel: 'high' | 'medium' | 'low' =
    l3?.experienceLevel ?? (hasExperience ? 'medium' : 'low');

  // --- Education (15%) ---
  // Spec section 6.3: CIP-SOC crosswalk (L1 keyword proxy)
  const educationRaw = l1.educationScore;
  const educationRelevance: 'relevant' | 'partial' | 'irrelevant' =
    educationRaw >= 0.8 ? 'relevant' : educationRaw >= 0.4 ? 'partial' : 'irrelevant';

  // --- Projects (10%) ---
  // Spec section 6.4: AAC&U VALUE rubric, average of per-project scores
  // Citation: AAC&U VALUE Rubrics, aacu.org/value/rubrics, 5600+ organizations
  let projectScore = 0.25; // Default benchmark if no projects
  let hasQuantified = false;
  if (l3?.projectScores && l3.projectScores.length > 0) {
    // L3 provides direct rubric scores (1-4 scale)
    projectScore =
      l3.projectScores.reduce((sum, s) => sum + s, 0) /
      (l3.projectScores.length * 4);
    hasQuantified = l3.projectScores.some((s) => s >= 3);
  } else if (l1.sections.includes('projects')) {
    // Fallback: simple heuristic based on L1 parsing
    projectScore = QUANTIFIED_PATTERN.test(l1.keywords.join(' ')) ? 0.75 : 0.5;
    hasQuantified = QUANTIFIED_PATTERN.test(l1.keywords.join(' '));
  }

  // --- Certifications (5%) ---
  // Spec section 6.5: SHRM Credentials 2021 -- 87% HR confidence
  const hasCerts = l1.sections.includes('certifications');
  const certScore = hasCerts ? l2.semanticScore : 0;
  const relevantCerts: string[] = hasCerts ? ['detected'] : [];

  // --- Distance (5%) ---
  // Spec section 6.6: exp(-0.043 * miles), Marinescu & Rathelot (2018)
  const distanceAvailable = distance !== null;
  let distResult: CandidateScores['distance'] = null;
  if (distanceAvailable) {
    const dScore = distanceScoreFromKm(distance.km);
    distResult = { km: distance.km, minutes: 0, score: dScore };
  }

  // --- Extracurricular (5%) ---
  // Spec section 6.7: Roulin & Bangerter (2013), Cole et al. (2007)
  // extra_score = 0.6 * has_extracurricular + 0.4 * has_leadership_role
  const hasExtra = l1.sections.includes('extracurricular') ? 1 : 0;
  const resumeTextForLeadership = l1.keywords.join(' ');
  const hasLeadership = LEADERSHIP_PATTERN.test(resumeTextForLeadership) ? 1 : 0;
  const extraScore = 0.6 * hasExtra + 0.4 * hasLeadership;

  // --- GPA (3%) ---
  // Spec section 6.8: NACE 2024, linear scale, 3.0 cutoff
  // GPA extraction from L1 not yet wired; use null (neutral 0.5)
  const gpaValue: number | null = null;
  const gpaScoreVal = gpaScore(gpaValue);

  // --- Completeness (2%) ---
  // Spec section 6.10: Ladders 2018 F-pattern section check
  const completenessRaw = l1.completenessScore;

  // --- Collect all scores ---
  const scores: Record<string, number> = {
    skills: skillsMatchScore,
    experience: experienceRaw,
    education: educationRaw,
    projects: projectScore,
    certifications: certScore,
    distance: distResult?.score ?? 0,
    extracurricular: extraScore,
    gpa: gpaScoreVal,
    completeness: completenessRaw,
  };

  // --- Weight redistribution when distance unavailable ---
  // Spec section 6.13: redistribute 5% proportionally
  // w_i_adjusted = w_i / (1.0 - sum_of_excluded_weights)
  let activeWeights: Record<string, number> = { ...WEIGHTS };
  if (!distanceAvailable) {
    const excludedWeight = WEIGHTS.distance;
    const totalActive = 1.0 - excludedWeight;
    activeWeights = {
      skills: WEIGHTS.skills / totalActive,
      experience: WEIGHTS.experience / totalActive,
      education: WEIGHTS.education / totalActive,
      projects: WEIGHTS.projects / totalActive,
      certifications: WEIGHTS.certifications / totalActive,
      distance: 0,
      extracurricular: WEIGHTS.extracurricular / totalActive,
      gpa: WEIGHTS.gpa / totalActive,
      completeness: WEIGHTS.completeness / totalActive,
    };
  }

  // --- Base score: weighted sum * 100 ---
  // Spec section 6.13: base_score = sum(w_i * score_i) * 100
  let baseScore = 0;
  for (const [param, weight] of Object.entries(activeWeights)) {
    baseScore += weight * (scores[param] ?? 0);
  }
  baseScore *= 100;

  // --- Red flag penalties ---
  // Spec sections 6.11, 6.12: Henle et al. (2019), Knouse (1994)
  const redFlags = l3?.redFlags ?? [];
  const penalty = redFlags.reduce((sum, flag) => sum + flag.penalty, 0);

  // --- Final score ---
  // Spec section 6.13: final_score = clamp(base_score + penalty, 0, 100)
  let finalScore = Math.max(0, Math.min(100, baseScore + penalty));

  // --- Hard gate: parseability ---
  // Spec section 6.9: if parseability fails, final_score = 0
  // Ladders Eye-Tracking 2018 -- if sections can't be found, resume fails screen
  if (!l1.parseability) {
    finalScore = 0;
  }

  // Determine missing sections for completeness reporting
  const expectedSections = ['name', 'education', 'skills', 'projects_or_experience', 'summary'];
  const missingSections = expectedSections.filter((s) => {
    if (s === 'name') return !l1.name;
    if (s === 'projects_or_experience')
      return !l1.sections.includes('projects') && !l1.sections.includes('experience');
    return !l1.sections.includes(s);
  });

  return {
    overall: Math.round(finalScore * 100) / 100,
    skillsMatch: {
      matched,
      missing,
      semantic,
      score: skillsMatchScore,
    },
    experience: {
      level: experienceLevel,
      score: experienceRaw,
    },
    education: {
      relevance: educationRelevance,
      score: educationRaw,
    },
    projects: {
      hasQuantified,
      score: projectScore,
    },
    certifications: {
      relevant: relevantCerts,
      score: certScore,
    },
    distance: distResult,
    extracurricular: {
      hasLeadership: hasLeadership === 1,
      score: extraScore,
    },
    gpa: gpaValue !== null ? { value: gpaValue, score: gpaScoreVal } : null,
    parseability: l1.parseability,
    completeness: {
      missingSections,
      score: completenessRaw,
    },
  };
}
