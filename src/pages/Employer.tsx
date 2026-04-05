import { useEffect, useCallback } from 'react';
import { useEmployerStore } from '../store/employerStore';
import { JDInput } from '../employer/components/JDInput';
import { ResumeUploader } from '../employer/components/ResumeUploader';
import { CandidateTable } from '../employer/components/CandidateTable';

function generateMockScores() {
  const matched = ['Python', 'React', 'SQL'].slice(
    0,
    Math.floor(Math.random() * 3) + 1,
  );
  const missing = ['Docker', 'AWS', 'TypeScript'].filter(
    (s) => !matched.includes(s),
  );
  const overall = Math.floor(Math.random() * 60) + 30;

  return {
    overall,
    skillsMatch: {
      matched,
      missing,
      semantic: ['JavaScript'],
      score: matched.length / (matched.length + missing.length),
    },
    experience: {
      level: (overall > 70 ? 'high' : overall > 45 ? 'medium' : 'low') as
        | 'high'
        | 'medium'
        | 'low',
      score: overall / 100,
    },
    education: {
      relevance: (
        overall > 60 ? 'relevant' : overall > 40 ? 'partial' : 'irrelevant'
      ) as 'relevant' | 'partial' | 'irrelevant',
      score: overall > 60 ? 0.9 : overall > 40 ? 0.6 : 0.3,
    },
    projects: { hasQuantified: overall > 50, score: overall / 100 },
    certifications: { relevant: [], score: 0 },
    distance: null,
    extracurricular: { hasLeadership: overall > 65, score: overall > 65 ? 0.8 : 0.4 },
    gpa: null,
    parseability: true,
    completeness: { missingSections: [], score: 0.8 },
  };
}

export function Employer() {
  const { job, loaded, load, updateCandidate } = useEmployerStore();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const analyzeAll = useCallback(() => {
    if (!job) return;
    for (const c of job.candidates) {
      if (c.analysisStatus === 'pending') {
        updateCandidate(c.id, {
          scores: generateMockScores(),
          analysisStatus: 'done',
          analysisLayers: ['L1'],
          redFlags:
            Math.random() > 0.6
              ? [
                  {
                    type: 'framing',
                    dimension: 'embellishment',
                    description: 'Vague project description without measurable outcomes',
                    evidence: 'Worked on various projects',
                    penalty: 5,
                    citation: 'Henle taxonomy of resume deception (2005)',
                  },
                ]
              : [],
        });
      }
    }
  }, [job, updateCandidate]);

  if (!loaded) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        role="status"
        aria-label="Loading employer dashboard"
      >
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  const hasPending = job?.candidates.some((c) => c.analysisStatus === 'pending');

  return (
    <div
      className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8"
      style={{ color: 'var(--text-primary)' }}
    >
      <header className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--accent-navy)' }}
        >
          Employer Dashboard
        </h1>
        {hasPending && (
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] rounded-md px-6 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--accent-red)' }}
            onClick={analyzeAll}
            aria-label="Analyze all pending candidates"
          >
            Analyze All
          </button>
        )}
      </header>

      <JDInput />
      <ResumeUploader />
      <CandidateTable />

      <footer
        className="pt-4 text-center text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        Powered by ResumeAI - Astha Chandel
      </footer>
    </div>
  );
}
