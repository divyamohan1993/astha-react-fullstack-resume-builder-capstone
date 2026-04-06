import { create } from 'zustand';
import { createIndexedDBStorage } from '@/store/persist';
import type {
  BridgeCriteria,
  ScoreBreakdown,
  TestSession,
  SignedScorecard,
  MatchSignal,
  MatchStatus,
  ResumePin,
  Calibration,
  GeneratedQuestion,
  QuestionResponse,
  IntegrityFlag,
  AudioFlag,
  DifficultyLevel,
} from './types';

interface BridgeReply {
  replyId: string;
  matchId: string;
  message: string;
  sentAt: Date;
}

interface BridgeState {
  criteria: BridgeCriteria | null;
  selfAssessment: ScoreBreakdown | null;
  testSession: TestSession | null;
  scorecard: SignedScorecard | null;
  matches: MatchSignal[];
  replies: BridgeReply[];
  loaded: boolean;

  setCriteria: (criteria: BridgeCriteria) => void;
  clearCriteria: () => void;
  setSelfAssessment: (assessment: ScoreBreakdown) => void;
  initTestSession: (sessionId: string, criteriaCode: string, candidateId: string, resumePin: ResumePin) => void;
  setCalibration: (calibration: Calibration) => void;
  setQuestions: (questions: GeneratedQuestion[]) => void;
  recordResponse: (response: QuestionResponse) => void;
  addFlag: (flag: IntegrityFlag) => void;
  addAudioFlag: (flag: AudioFlag) => void;
  updateLevel: (skill: string, level: DifficultyLevel) => void;
  incrementConsecutive: (skill: string) => void;
  resetConsecutive: (skill: string) => void;
  advanceQuestion: () => void;
  suspendTest: () => void;
  resumeTest: () => void;
  completeTest: () => void;
  setScorecard: (scorecard: SignedScorecard) => void;
  addMatch: (match: MatchSignal) => void;
  updateMatchStatus: (matchId: string, status: MatchStatus) => void;
  addReply: (reply: BridgeReply) => void;
  load: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  criteria: null as BridgeCriteria | null,
  selfAssessment: null as ScoreBreakdown | null,
  testSession: null as TestSession | null,
  scorecard: null as SignedScorecard | null,
  matches: [] as MatchSignal[],
  replies: [] as BridgeReply[],
  loaded: false,
};

const storage = createIndexedDBStorage<typeof initialState>('bridge');

function updateSession(state: BridgeState, patch: Partial<TestSession>): Partial<BridgeState> {
  if (!state.testSession) return {};
  return { testSession: { ...state.testSession, ...patch } };
}

export const useBridgeStore = create<BridgeState>((set, _get) => ({
  ...initialState,

  setCriteria: (criteria) =>
    set((s) => {
      const next = { ...s, criteria };
      storage.save(next);
      return { criteria };
    }),

  clearCriteria: () =>
    set((s) => {
      const next = { ...s, criteria: null };
      storage.save(next);
      return { criteria: null };
    }),

  setSelfAssessment: (selfAssessment) =>
    set((s) => {
      const next = { ...s, selfAssessment };
      storage.save(next);
      return { selfAssessment };
    }),

  initTestSession: (sessionId, criteriaCode, candidateId, resumePin) =>
    set((s) => {
      const testSession: TestSession = {
        sessionId,
        criteriaCode,
        candidateId,
        resumePin,
        calibration: { wpm: 0, ambientDb: 0, micPermission: false },
        questions: [],
        responses: [],
        flags: [],
        audioFlags: [],
        startedAt: Date.now(),
        completedAt: null,
        status: 'calibrating',
        currentQuestionIndex: 0,
        currentLevel: {},
        consecutiveCorrect: {},
      };
      storage.save({ ...s, testSession });
      return { testSession };
    }),

  setCalibration: (calibration) =>
    set((s) => {
      const patch = updateSession(s, { calibration, status: 'in_progress' });
      storage.save({ ...s, ...patch });
      return patch;
    }),

  setQuestions: (questions) =>
    set((s) => {
      const patch = updateSession(s, { questions });
      storage.save({ ...s, ...patch });
      return patch;
    }),

  recordResponse: (response) =>
    set((s) => {
      if (!s.testSession) return {};
      const patch = updateSession(s, { responses: [...s.testSession.responses, response] });
      storage.save({ ...s, ...patch });
      return patch;
    }),

  addFlag: (flag) =>
    set((s) => {
      if (!s.testSession) return {};
      const patch = updateSession(s, { flags: [...s.testSession.flags, flag] });
      storage.save({ ...s, ...patch });
      return patch;
    }),

  addAudioFlag: (flag) =>
    set((s) => {
      if (!s.testSession) return {};
      const patch = updateSession(s, { audioFlags: [...s.testSession.audioFlags, flag] });
      storage.save({ ...s, ...patch });
      return patch;
    }),

  updateLevel: (skill, level) =>
    set((s) => {
      if (!s.testSession) return {};
      const patch = updateSession(s, {
        currentLevel: { ...s.testSession.currentLevel, [skill]: level },
      });
      storage.save({ ...s, ...patch });
      return patch;
    }),

  incrementConsecutive: (skill) =>
    set((s) => {
      if (!s.testSession) return {};
      const current = s.testSession.consecutiveCorrect[skill] ?? 0;
      const patch = updateSession(s, {
        consecutiveCorrect: { ...s.testSession.consecutiveCorrect, [skill]: current + 1 },
      });
      storage.save({ ...s, ...patch });
      return patch;
    }),

  resetConsecutive: (skill) =>
    set((s) => {
      if (!s.testSession) return {};
      const patch = updateSession(s, {
        consecutiveCorrect: { ...s.testSession.consecutiveCorrect, [skill]: 0 },
      });
      storage.save({ ...s, ...patch });
      return patch;
    }),

  advanceQuestion: () =>
    set((s) => {
      if (!s.testSession) return {};
      const patch = updateSession(s, {
        currentQuestionIndex: s.testSession.currentQuestionIndex + 1,
      });
      storage.save({ ...s, ...patch });
      return patch;
    }),

  suspendTest: () =>
    set((s) => {
      const patch = updateSession(s, { status: 'suspended' });
      storage.save({ ...s, ...patch });
      return patch;
    }),

  resumeTest: () =>
    set((s) => {
      const patch = updateSession(s, { status: 'in_progress' });
      storage.save({ ...s, ...patch });
      return patch;
    }),

  completeTest: () =>
    set((s) => {
      const patch = updateSession(s, { status: 'completed', completedAt: Date.now() });
      storage.save({ ...s, ...patch });
      return patch;
    }),

  setScorecard: (scorecard) =>
    set((s) => {
      storage.save({ ...s, scorecard });
      return { scorecard };
    }),

  addMatch: (match) =>
    set((s) => {
      const matches = [...s.matches, match];
      storage.save({ ...s, matches });
      return { matches };
    }),

  updateMatchStatus: (matchId, status) =>
    set((s) => {
      const matches = s.matches.map((m) =>
        m.matchId === matchId ? { ...m, status } : m,
      );
      storage.save({ ...s, matches });
      return { matches };
    }),

  addReply: (reply) =>
    set((s) => {
      const replies = [...s.replies, reply];
      storage.save({ ...s, replies });
      return { replies };
    }),

  load: async () => {
    const saved = await storage.load();
    if (saved) {
      set({ ...saved, loaded: true });
    } else {
      set({ loaded: true });
    }
  },

  reset: () => {
    set({ ...initialState });
    storage.save(initialState);
  },
}));
