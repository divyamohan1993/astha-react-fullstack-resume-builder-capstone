import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../store/persist', () => ({
  createIndexedDBStorage: () => ({
    load: vi.fn().mockResolvedValue(null),
    save: vi.fn(),
  }),
}));

vi.mock('../../firebase/config', () => ({
  getDb: vi.fn(),
  isFirebaseConfigured: () => false,
}));

import { useBridgeStore } from '../store';
import type {
  BridgeCriteria,
  ScoreBreakdown,
  ResumePin,
  Calibration,
  GeneratedQuestion,
  QuestionResponse,
  IntegrityFlag,
  AudioFlag,
  SignedScorecard,
  MatchSignal,
} from '../types';

function getState() {
  return useBridgeStore.getState();
}

const mockCriteria: BridgeCriteria = {
  shortCode: 'TST-001',
  jobTitle: 'Software Engineer',
  description: 'Test position',
  requiredSkills: ['typescript', 'react'],
  preferredSkills: ['node'],
  customSignals: [],
  weights: { skillsMatch: 30 },
  threshold: 70,
  testConfig: { skillsToTest: ['typescript'], difficultyFloor: 1, questionCount: 10 },
  employerId: 'emp-1',
  createdAt: new Date('2026-01-01'),
  expiresAt: new Date('2026-12-31'),
  status: 'active',
};

const mockPin: ResumePin = {
  hash: 'abc123',
  scoreAtTest: 85,
  sections: ['experience', 'skills'],
  skillsClaimed: ['typescript', 'react'],
};

const mockCalibration: Calibration = {
  wpm: 250,
  ambientDb: 30,
  micPermission: true,
};

const mockQuestion: GeneratedQuestion = {
  id: 'q-1',
  skill: 'typescript',
  type: 'concept',
  level: 2,
  text: 'What is a union type?',
  options: [
    { text: 'Option A', charCount: 8 },
    { text: 'Option B', charCount: 8 },
  ],
  correctIndex: 0,
  timeAllotted: 30,
  wordCount: 6,
};

const mockResponse: QuestionResponse = {
  questionId: 'q-1',
  selectedIndex: 0,
  correct: true,
  timeElapsed: 15,
  expectedReadTime: 10,
  wpmRatio: 1.2,
};

const mockFlag: IntegrityFlag = {
  type: 'tabSwitch',
  timestamp: Date.now(),
  penalty: 5,
  metadata: {},
};

const mockAudioFlag: AudioFlag = {
  type: 'speechBurst',
  timestamp: Date.now(),
  durationMs: 500,
  dbDelta: 10,
  penalty: 1,
};

const mockScoreBreakdown: ScoreBreakdown = {
  overall: 82,
  breakdown: {
    skillsMatch: { raw: 90, weighted: 27, weight: 30 },
    experience: { raw: 75, weighted: 15, weight: 20 },
  },
};

const mockScorecard: SignedScorecard = {
  version: 1,
  criteriaCode: 'TST-001',
  criteriaHash: 'hash-abc',
  candidateId: 'cand-1',
  sessionId: 'sess-1',
  timestamp: new Date().toISOString(),
  resumeScore: mockScoreBreakdown,
  resumePin: mockPin,
  verification: {
    overall: 80,
    perSkill: [{ skill: 'typescript', score: 80, peakLevel: 3, questionsAttempted: 5 }],
    totalQuestions: 10,
    duration: 600,
  },
  integrity: {
    score: 95,
    micPermission: true,
    flags: [],
    audioFlags: [],
    flagSummary: {},
  },
  gap: 5,
  calibration: mockCalibration,
  signature: 'sig-xyz',
};

const mockMatch: MatchSignal = {
  matchId: 'match-1',
  criteriaCode: 'TST-001',
  scorecardId: 'sc-1',
  candidateId: 'cand-1',
  employerId: 'emp-1',
  contactInfo: { name: 'Test User', email: 'test@example.com' },
  resumeScore: 85,
  verifiedScore: 80,
  integrityScore: 95,
  gap: 5,
  meetsThreshold: true,
  sentAt: new Date(),
  status: 'pending',
};

describe('bridgeStore', () => {
  beforeEach(() => {
    useBridgeStore.getState().reset();
  });

  describe('criteria', () => {
    it('setCriteria stores criteria', () => {
      getState().setCriteria(mockCriteria);
      expect(getState().criteria).toEqual(mockCriteria);
    });

    it('clearCriteria resets to null', () => {
      getState().setCriteria(mockCriteria);
      getState().clearCriteria();
      expect(getState().criteria).toBeNull();
    });
  });

  describe('selfAssessment', () => {
    it('setSelfAssessment stores score breakdown', () => {
      getState().setSelfAssessment(mockScoreBreakdown);
      expect(getState().selfAssessment).toEqual(mockScoreBreakdown);
    });
  });

  describe('initTestSession', () => {
    it('creates test session with calibrating status', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      const session = getState().testSession;
      expect(session).not.toBeNull();
      expect(session!.sessionId).toBe('sess-1');
      expect(session!.criteriaCode).toBe('TST-001');
      expect(session!.candidateId).toBe('cand-1');
      expect(session!.resumePin).toEqual(mockPin);
      expect(session!.status).toBe('calibrating');
      expect(session!.questions).toEqual([]);
      expect(session!.responses).toEqual([]);
      expect(session!.flags).toEqual([]);
      expect(session!.audioFlags).toEqual([]);
      expect(session!.currentQuestionIndex).toBe(0);
    });
  });

  describe('setCalibration', () => {
    it('sets calibration and transitions status to in_progress', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      getState().setCalibration(mockCalibration);
      const session = getState().testSession;
      expect(session!.calibration).toEqual(mockCalibration);
      expect(session!.status).toBe('in_progress');
    });
  });

  describe('setQuestions', () => {
    it('sets questions on the test session', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      getState().setQuestions([mockQuestion]);
      expect(getState().testSession!.questions).toEqual([mockQuestion]);
    });
  });

  describe('recordResponse', () => {
    it('appends response to responses array', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      getState().recordResponse(mockResponse);
      expect(getState().testSession!.responses).toHaveLength(1);
      expect(getState().testSession!.responses[0]).toEqual(mockResponse);
    });

    it('accumulates multiple responses', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      getState().recordResponse(mockResponse);
      const second = { ...mockResponse, questionId: 'q-2' };
      getState().recordResponse(second);
      expect(getState().testSession!.responses).toHaveLength(2);
    });
  });

  describe('addFlag', () => {
    it('appends integrity flag', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      getState().addFlag(mockFlag);
      expect(getState().testSession!.flags).toHaveLength(1);
      expect(getState().testSession!.flags[0]).toEqual(mockFlag);
    });
  });

  describe('addAudioFlag', () => {
    it('appends audio flag', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      getState().addAudioFlag(mockAudioFlag);
      expect(getState().testSession!.audioFlags).toHaveLength(1);
      expect(getState().testSession!.audioFlags[0]).toEqual(mockAudioFlag);
    });
  });

  describe('updateLevel', () => {
    it('updates skill difficulty level', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      getState().updateLevel('typescript', 3);
      expect(getState().testSession!.currentLevel['typescript']).toBe(3);
    });
  });

  describe('consecutiveCorrect tracking', () => {
    it('incrementConsecutive increases count', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      getState().incrementConsecutive('typescript');
      expect(getState().testSession!.consecutiveCorrect['typescript']).toBe(1);
      getState().incrementConsecutive('typescript');
      expect(getState().testSession!.consecutiveCorrect['typescript']).toBe(2);
    });

    it('resetConsecutive zeros the count', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      getState().incrementConsecutive('typescript');
      getState().incrementConsecutive('typescript');
      getState().resetConsecutive('typescript');
      expect(getState().testSession!.consecutiveCorrect['typescript']).toBe(0);
    });
  });

  describe('advanceQuestion', () => {
    it('increments currentQuestionIndex', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      expect(getState().testSession!.currentQuestionIndex).toBe(0);
      getState().advanceQuestion();
      expect(getState().testSession!.currentQuestionIndex).toBe(1);
    });
  });

  describe('status transitions', () => {
    it('suspendTest sets status to suspended', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      getState().setCalibration(mockCalibration);
      getState().suspendTest();
      expect(getState().testSession!.status).toBe('suspended');
    });

    it('resumeTest sets status to in_progress', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      getState().setCalibration(mockCalibration);
      getState().suspendTest();
      getState().resumeTest();
      expect(getState().testSession!.status).toBe('in_progress');
    });

    it('completeTest sets status to completed and records completedAt', () => {
      getState().initTestSession('sess-1', 'TST-001', 'cand-1', mockPin);
      getState().setCalibration(mockCalibration);
      getState().completeTest();
      const session = getState().testSession!;
      expect(session.status).toBe('completed');
      expect(session.completedAt).not.toBeNull();
    });
  });

  describe('scorecard', () => {
    it('setScorecard stores the signed scorecard', () => {
      getState().setScorecard(mockScorecard);
      expect(getState().scorecard).toEqual(mockScorecard);
    });
  });

  describe('matches', () => {
    it('addMatch appends to matches array', () => {
      getState().addMatch(mockMatch);
      expect(getState().matches).toHaveLength(1);
      expect(getState().matches[0]).toEqual(mockMatch);
    });

    it('updateMatchStatus changes match status', () => {
      getState().addMatch(mockMatch);
      getState().updateMatchStatus('match-1', 'viewed');
      expect(getState().matches[0].status).toBe('viewed');
    });

    it('updateMatchStatus ignores unknown matchId', () => {
      getState().addMatch(mockMatch);
      getState().updateMatchStatus('unknown', 'viewed');
      expect(getState().matches[0].status).toBe('pending');
    });
  });

  describe('replies', () => {
    it('addReply appends to replies array', () => {
      const reply = { replyId: 'r-1', matchId: 'match-1', message: 'Hello', sentAt: new Date() };
      getState().addReply(reply);
      expect(getState().replies).toHaveLength(1);
      expect(getState().replies[0].replyId).toBe('r-1');
    });
  });

  describe('load', () => {
    it('sets loaded to true', async () => {
      expect(getState().loaded).toBe(false);
      await getState().load();
      expect(getState().loaded).toBe(true);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      getState().setCriteria(mockCriteria);
      getState().setSelfAssessment(mockScoreBreakdown);
      getState().addMatch(mockMatch);
      getState().reset();
      expect(getState().criteria).toBeNull();
      expect(getState().selfAssessment).toBeNull();
      expect(getState().testSession).toBeNull();
      expect(getState().scorecard).toBeNull();
      expect(getState().matches).toEqual([]);
      expect(getState().replies).toEqual([]);
      expect(getState().loaded).toBe(false);
    });
  });
});
