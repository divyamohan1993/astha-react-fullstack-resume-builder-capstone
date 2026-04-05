/**
 * Tests for the employer Zustand store.
 * Covers: setJob, addCandidate, removeCandidate, updateCandidate,
 * updateJobRequirements, clearAll.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEmployerStore } from '../employerStore';
import type { Job, Candidate, CandidateScores } from '../types';

vi.mock('../persist', () => ({
  createIndexedDBStorage: () => ({
    load: () => Promise.resolve(undefined),
    save: () => {},
  }),
}));

function getState() {
  return useEmployerStore.getState();
}

const emptyScores: CandidateScores = {
  overall: 0,
  skillsMatch: { matched: [], missing: [], semantic: [], score: 0 },
  experience: { level: 'low', score: 0 },
  education: { relevance: 'irrelevant', score: 0 },
  projects: { hasQuantified: false, score: 0 },
  certifications: { relevant: [], score: 0 },
  distance: null,
  extracurricular: { hasLeadership: false, score: 0 },
  gpa: null,
  parseability: false,
  completeness: { missingSections: [], score: 0 },
};

function makeJob(): Job {
  return {
    id: 'job-1',
    title: 'SDE Intern',
    description: 'Looking for a CS student',
    location: 'Solan, HP',
    extractedRequirements: {
      requiredSkills: ['Python', 'React'],
      preferredSkills: ['TypeScript'],
      experienceLevel: 'fresher',
      educationRequirements: ['B.Tech CSE'],
      location: 'Solan',
    },
    candidates: [],
  };
}

function makeCandidate(id: string, name: string): Candidate {
  return {
    id,
    name,
    resumeText: `${name} resume text`,
    scores: emptyScores,
    redFlags: [],
    analysisLayers: [],
    analysisStatus: 'pending',
  };
}

describe('employerStore', () => {
  beforeEach(() => {
    useEmployerStore.setState({ job: null, loaded: false });
  });

  it('setJob stores job', () => {
    const job = makeJob();
    getState().setJob(job);
    expect(getState().job).toEqual(job);
  });

  it('addCandidate adds to job candidates', () => {
    getState().setJob(makeJob());
    const c = makeCandidate('c-1', 'Alice');
    getState().addCandidate(c);
    expect(getState().job!.candidates).toHaveLength(1);
    expect(getState().job!.candidates[0].name).toBe('Alice');
  });

  it('addCandidate does nothing when no job', () => {
    getState().addCandidate(makeCandidate('c-1', 'Bob'));
    expect(getState().job).toBeNull();
  });

  it('removeCandidate removes by id', () => {
    getState().setJob(makeJob());
    getState().addCandidate(makeCandidate('c-1', 'Alice'));
    getState().addCandidate(makeCandidate('c-2', 'Bob'));
    getState().removeCandidate('c-1');
    expect(getState().job!.candidates).toHaveLength(1);
    expect(getState().job!.candidates[0].id).toBe('c-2');
  });

  it('updateCandidate merges partial updates', () => {
    getState().setJob(makeJob());
    getState().addCandidate(makeCandidate('c-1', 'Alice'));
    getState().updateCandidate('c-1', { analysisStatus: 'done' });
    expect(getState().job!.candidates[0].analysisStatus).toBe('done');
    expect(getState().job!.candidates[0].name).toBe('Alice'); // unchanged
  });

  it('updateJobRequirements merges partial updates', () => {
    getState().setJob(makeJob());
    getState().updateJobRequirements({ requiredSkills: ['Python', 'React', 'Node.js'] });
    const reqs = getState().job!.extractedRequirements;
    expect(reqs.requiredSkills).toEqual(['Python', 'React', 'Node.js']);
    expect(reqs.preferredSkills).toEqual(['TypeScript']); // unchanged
  });

  it('updateJobRequirements does nothing when no job', () => {
    getState().updateJobRequirements({ requiredSkills: ['Go'] });
    expect(getState().job).toBeNull();
  });

  it('clearAll resets to null', () => {
    getState().setJob(makeJob());
    getState().addCandidate(makeCandidate('c-1', 'Alice'));
    getState().clearAll();
    expect(getState().job).toBeNull();
  });
});
