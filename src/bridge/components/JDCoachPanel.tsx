/**
 * JD Coach Panel -- generates JD-specific improvement suggestions.
 *
 * All analysis runs client-side. No API calls. Instant feedback.
 *
 * Checks:
 * 1. Missing required skills (high severity, ~3pts each)
 * 2. Summary quality (generic words, length)
 * 3. Quantified achievements in bullets
 * 4. Education section presence
 * 5. Experience/projects section presence
 *
 * Citations:
 * - NACE Job Outlook 2024 (skills as #1 screening attribute)
 * - Ladders Eye-Tracking 2018 (section presence)
 * - AAC&U VALUE Rubrics (quantified outcomes)
 */

import { useState, useMemo } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import { useBridgeStore } from '../store';
import type { BridgeCriteria } from '../types';
import type { Resume } from '@/store/types';

type Severity = 'high' | 'medium' | 'tip';

interface Suggestion {
  id: string;
  severity: Severity;
  section: string;
  current: string;
  suggestedFix: string;
  impact: number;
  reason: string;
}

interface Props {
  criteria: BridgeCriteria;
  onRescore: () => void;
}

const GENERIC_WORDS = [
  'passionate',
  'motivated',
  'enthusiastic',
  'hardworking',
  'dedicated',
  'detail-oriented',
  'team player',
  'self-starter',
  'go-getter',
  'results-driven',
  'dynamic',
  'proactive',
];

const QUANTIFIED_PATTERN = /\d+%|\d+x|\$\d+/;

function resumeToText(resume: Resume): string {
  const parts: string[] = [];
  const p = resume.personal;
  if (p.name) parts.push(p.name);
  if (resume.summary) parts.push(resume.summary);
  for (const section of resume.sections) {
    parts.push(section.heading);
    for (const entry of section.entries) {
      for (const value of Object.values(entry.fields)) {
        if (value) parts.push(value);
      }
      for (const bullet of entry.bullets) {
        if (bullet) parts.push(bullet);
      }
    }
  }
  return parts.join('\n');
}

function generateSuggestions(
  resume: Resume,
  criteria: BridgeCriteria,
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const resumeText = resumeToText(resume);
  const resumeLower = resumeText.toLowerCase();
  let idCounter = 0;

  // 1. Missing required skills -> high severity, ~3pts per skill
  for (const skill of criteria.requiredSkills) {
    if (!resumeLower.includes(skill.toLowerCase())) {
      suggestions.push({
        id: `s-${idCounter++}`,
        severity: 'high',
        section: 'Skills',
        current: `"${skill}" not found in your resume`,
        suggestedFix: `Add "${skill}" to your skills section. If you have experience with it, mention it in your project or experience bullets too.`,
        impact: 3,
        reason:
          'Required skills are the #1 screening attribute. NACE Job Outlook 2024: employers rank skills above GPA, major, and experience.',
      });
    }
  }

  // 2. Summary quality checks
  const summary = resume.summary.trim();
  if (!summary) {
    suggestions.push({
      id: `s-${idCounter++}`,
      severity: 'high',
      section: 'Summary',
      current: 'No summary/objective section',
      suggestedFix: `Write a 2-3 sentence summary highlighting your fit for "${criteria.jobTitle}". Mention your strongest relevant skill and a concrete achievement.`,
      impact: 4,
      reason:
        'Ladders Eye-Tracking 2018: recruiters spend 7.4 seconds on initial scan. A targeted summary anchors their attention on your best match signals.',
    });
  } else if (summary.length < 50) {
    suggestions.push({
      id: `s-${idCounter++}`,
      severity: 'medium',
      section: 'Summary',
      current: 'Summary is too short (under 50 characters)',
      suggestedFix: `Expand your summary to 2-3 sentences. Include your target role, top skills for "${criteria.jobTitle}", and a quantified achievement.`,
      impact: 2,
      reason:
        'Ladders Eye-Tracking 2018: a concise but complete summary improves recruiter engagement during the 7.4-second initial scan.',
    });
  } else {
    const summaryLower = summary.toLowerCase();
    const foundGeneric = GENERIC_WORDS.filter((w) =>
      summaryLower.includes(w),
    );
    if (foundGeneric.length > 0) {
      suggestions.push({
        id: `s-${idCounter++}`,
        severity: 'medium',
        section: 'Summary',
        current: `Contains generic words: ${foundGeneric.join(', ')}`,
        suggestedFix: `Replace generic words with specific skills or measurable outcomes. Instead of "${foundGeneric[0]}", mention a concrete technology or achievement number.`,
        impact: 2,
        reason:
          'Jobscan ATS analysis: generic buzzwords add zero keyword match value. Specific skills and numbers score higher in both ATS and human review.',
      });
    }
  }

  // 3. Quantified achievements in bullets
  const allBullets: string[] = [];
  for (const section of resume.sections) {
    if (['experience', 'projects'].includes(section.type)) {
      for (const entry of section.entries) {
        allBullets.push(...entry.bullets.filter(Boolean));
      }
    }
  }

  if (allBullets.length > 0) {
    const quantifiedCount = allBullets.filter((b) =>
      QUANTIFIED_PATTERN.test(b),
    ).length;

    if (quantifiedCount === 0) {
      suggestions.push({
        id: `s-${idCounter++}`,
        severity: 'high',
        section: 'Experience / Projects',
        current: 'No bullets contain quantified results (%, $, Nx)',
        suggestedFix:
          'Add numbers to your bullet points. Examples: "Reduced load time by 40%", "Served 1000+ users", "Cut costs by $5K". Even approximate numbers help.',
        impact: 5,
        reason:
          'AAC&U VALUE Rubrics: quantified outcomes signal applied competence. Resumes with metrics receive 40% more callbacks (Jobvite Recruiter Nation 2020).',
      });
    } else if (quantifiedCount < allBullets.length * 0.3) {
      suggestions.push({
        id: `s-${idCounter++}`,
        severity: 'medium',
        section: 'Experience / Projects',
        current: `Only ${quantifiedCount} of ${allBullets.length} bullets have numbers`,
        suggestedFix: `Aim for at least half your bullets to include measurable outcomes. Add metrics like user counts, performance improvements, or scope numbers.`,
        impact: 3,
        reason:
          'AAC&U VALUE Rubrics: demonstrating measurable impact is a key differentiator. More quantified bullets correlate with higher interview rates.',
      });
    }
  }

  // 4. Education section
  const hasEducation = resume.sections.some(
    (s) => s.type === 'education' && s.entries.length > 0,
  );
  if (!hasEducation) {
    suggestions.push({
      id: `s-${idCounter++}`,
      severity: 'high',
      section: 'Education',
      current: 'No education entries found',
      suggestedFix:
        'Add your education details: degree, institution, graduation year. For freshers, education is the #2 most-scanned section after name.',
      impact: 4,
      reason:
        'NACE Job Outlook 2024: 73.4% of employers screen by major/degree. Missing education triggers immediate rejection in most ATS systems.',
    });
  }

  // 5. Experience or projects
  const hasExperience = resume.sections.some(
    (s) => s.type === 'experience' && s.entries.length > 0,
  );
  const hasProjects = resume.sections.some(
    (s) => s.type === 'projects' && s.entries.length > 0,
  );

  if (!hasExperience && !hasProjects) {
    suggestions.push({
      id: `s-${idCounter++}`,
      severity: 'high',
      section: 'Experience / Projects',
      current: 'No experience or project entries found',
      suggestedFix:
        'Add at least 2-3 projects or experience entries. For each, include a title, brief description, technologies used, and your specific contribution with outcomes.',
      impact: 5,
      reason:
        'Ladders Eye-Tracking 2018: after name, recruiters scan for current/previous roles. For freshers, projects serve as experience proxy. Missing both is a hard fail.',
    });
  }

  // Sort by impact descending
  suggestions.sort((a, b) => b.impact - a.impact);

  return suggestions;
}

const SEVERITY_STYLES: Record<Severity, { border: string; badge: string; badgeText: string }> = {
  high: {
    border: 'border-red-300',
    badge: 'bg-red-100 text-red-800',
    badgeText: 'High Impact',
  },
  medium: {
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-800',
    badgeText: 'Medium Impact',
  },
  tip: {
    border: 'border-blue-300',
    badge: 'bg-blue-100 text-blue-800',
    badgeText: 'Tip',
  },
};

export function JDCoachPanel({ criteria, onRescore }: Props) {
  const selfAssessment = useBridgeStore((s) => s.selfAssessment);
  const resume = useResumeStore((s) => s.resume);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const suggestions = useMemo(
    () => generateSuggestions(resume, criteria),
    [resume, criteria],
  );

  // Only render when self-assessment exists
  if (!selfAssessment) return null;

  const visibleSuggestions = suggestions.filter(
    (s) => !dismissed.has(s.id),
  );

  if (visibleSuggestions.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="font-semibold text-green-800">
          No improvement suggestions. Your resume looks solid for this role.
        </p>
        <button
          type="button"
          onClick={onRescore}
          className="mt-3 rounded-lg bg-green-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-green-700 focus:outline-2 focus:outline-offset-2 focus:outline-green-600"
        >
          Re-score after changes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">
          Improvement Suggestions
        </h3>
        <span className="text-sm text-gray-500">
          {visibleSuggestions.length} suggestion{visibleSuggestions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {visibleSuggestions.map((suggestion) => {
        const style = SEVERITY_STYLES[suggestion.severity];

        return (
          <div
            key={suggestion.id}
            className={`rounded-lg border-2 ${style.border} bg-white p-5 shadow-sm`}
            role="article"
            aria-label={`${suggestion.severity} priority suggestion for ${suggestion.section}`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {suggestion.section}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}
                >
                  {style.badgeText}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                  +{suggestion.impact} pts
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDismissed((prev) => new Set([...prev, suggestion.id]))
                }
                className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
                aria-label={`Dismiss suggestion for ${suggestion.section}`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-2 rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <span className="font-medium">Current: </span>
              {suggestion.current}
            </div>

            <div className="mb-2 rounded bg-green-50 px-3 py-2 text-sm text-green-800">
              <span className="font-medium">Fix: </span>
              {suggestion.suggestedFix}
            </div>

            <p className="text-xs text-gray-500 italic">
              {suggestion.reason}
            </p>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onRescore}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
      >
        Re-score after changes
      </button>
    </div>
  );
}
