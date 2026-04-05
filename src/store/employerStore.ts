import { create } from 'zustand';
import type { Job, Candidate } from './types';
import { createIndexedDBStorage } from './persist';

interface EmployerState {
  job: Job | null;
  loaded: boolean;
  setJob: (job: Job) => void;
  updateJobRequirements: (
    requirements: Partial<Job['extractedRequirements']>,
  ) => void;
  addCandidate: (candidate: Candidate) => void;
  updateCandidate: (id: string, updates: Partial<Candidate>) => void;
  removeCandidate: (id: string) => void;
  clearAll: () => void;
  load: () => Promise<void>;
}

const storage = createIndexedDBStorage<Job | null>('employer');

export const useEmployerStore = create<EmployerState>((set) => ({
  job: null,
  loaded: false,

  setJob: (job) => {
    storage.save(job);
    set({ job });
  },

  updateJobRequirements: (requirements) =>
    set((s) => {
      if (!s.job) return s;
      const job = {
        ...s.job,
        extractedRequirements: {
          ...s.job.extractedRequirements,
          ...requirements,
        },
      };
      storage.save(job);
      return { job };
    }),

  addCandidate: (candidate) =>
    set((s) => {
      if (!s.job) return s;
      const job = {
        ...s.job,
        candidates: [...s.job.candidates, candidate],
      };
      storage.save(job);
      return { job };
    }),

  updateCandidate: (id, updates) =>
    set((s) => {
      if (!s.job) return s;
      const job = {
        ...s.job,
        candidates: s.job.candidates.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
      };
      storage.save(job);
      return { job };
    }),

  removeCandidate: (id) =>
    set((s) => {
      if (!s.job) return s;
      const job = {
        ...s.job,
        candidates: s.job.candidates.filter((c) => c.id !== id),
      };
      storage.save(job);
      return { job };
    }),

  clearAll: () => {
    storage.save(null);
    set({ job: null });
  },

  load: async () => {
    const saved = await storage.load();
    set({ job: saved ?? null, loaded: true });
  },
}));
