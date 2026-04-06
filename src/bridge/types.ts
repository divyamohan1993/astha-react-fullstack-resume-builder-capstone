// src/bridge/types.ts

// --- Criteria (Employer publishes) ---
export interface CustomSignal { name: string; weight: number; description: string; }
export interface TestConfig { skillsToTest: string[]; difficultyFloor: number; questionCount: number; }
export interface BridgeCriteria {
  shortCode: string; jobTitle: string; description: string;
  requiredSkills: string[]; preferredSkills: string[];
  customSignals: CustomSignal[]; weights: Record<string, number>;
  threshold: number; testConfig: TestConfig; employerId: string;
  createdAt: Date; expiresAt: Date; status: 'active' | 'paused' | 'closed';
}

// --- Resume Pinning ---
export interface ResumePin { hash: string; scoreAtTest: number; sections: string[]; skillsClaimed: string[]; }

// --- Calibration ---
export interface Calibration { wpm: number; ambientDb: number; micPermission: boolean; }

// --- Questions ---
export type QuestionType = 'concept' | 'scenario' | 'micro-challenge';
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;
export interface QuestionOption { text: string; charCount: number; }
export interface GeneratedQuestion {
  id: string; skill: string; type: QuestionType; level: DifficultyLevel;
  text: string; options: QuestionOption[]; correctIndex: number;
  timeAllotted: number; wordCount: number;
}
export interface QuestionResponse {
  questionId: string; selectedIndex: number; correct: boolean;
  timeElapsed: number; expectedReadTime: number; wpmRatio: number;
}

// --- Integrity Flags ---
export type IntegrityFlagType = 'tabSwitch' | 'paste' | 'fullscreenExit' | 'speedAnomaly' | 'compoundAnomaly';
export interface IntegrityFlag { type: IntegrityFlagType; timestamp: number; penalty: number; metadata: Record<string, unknown>; }
export type AudioFlagType = 'speechBurst' | 'conversation' | 'continuousSpeech' | 'whisper' | 'speechPlusTabSwitch';
export interface AudioFlag { type: AudioFlagType; timestamp: number; durationMs: number; dbDelta: number; penalty: number; }

// --- Test Session ---
export type TestStatus = 'calibrating' | 'in_progress' | 'suspended' | 'completed';
export interface TestSession {
  sessionId: string; criteriaCode: string; candidateId: string;
  resumePin: ResumePin; calibration: Calibration;
  questions: GeneratedQuestion[]; responses: QuestionResponse[];
  flags: IntegrityFlag[]; audioFlags: AudioFlag[];
  startedAt: number; completedAt: number | null; status: TestStatus;
  currentQuestionIndex: number; currentLevel: Record<string, DifficultyLevel>;
  consecutiveCorrect: Record<string, number>;
}

// --- Scores ---
export interface SkillVerification { skill: string; score: number; peakLevel: DifficultyLevel; questionsAttempted: number; }
export interface VerificationResult { overall: number; perSkill: SkillVerification[]; totalQuestions: number; duration: number; }
export interface IntegrityResult { score: number; micPermission: boolean; flags: IntegrityFlag[]; audioFlags: AudioFlag[]; flagSummary: Record<string, number>; }
export interface ScoreBreakdown { overall: number; breakdown: Record<string, { raw: number; weighted: number; weight: number }>; }

// --- Scorecard ---
export interface SignedScorecard {
  version: number; criteriaCode: string; criteriaHash: string;
  candidateId: string; sessionId: string; timestamp: string;
  resumeScore: ScoreBreakdown; resumePin: ResumePin;
  verification: VerificationResult; integrity: IntegrityResult;
  gap: number; calibration: Calibration; signature: string;
}

// --- Match System ---
export interface ContactInfo { name: string; email: string; phone?: string; linkedin?: string; github?: string; }
export type MatchStatus = 'pending' | 'viewed' | 'replied';
export interface MatchSignal {
  matchId: string; criteriaCode: string; scorecardId: string;
  candidateId: string; employerId: string; contactInfo: ContactInfo;
  resumeScore: number; verifiedScore: number; integrityScore: number;
  gap: number; meetsThreshold: boolean; sentAt: Date; status: MatchStatus;
}
export interface EmployerReply { replyId: string; matchId: string; employerId: string; candidateId: string; message: string; sentAt: Date; }

// --- Constants ---
export const DEFAULT_WEIGHTS: Record<string, number> = {
  skillsMatch: 30, experience: 20, education: 15, projects: 10,
  certifications: 5, distance: 5, extracurricular: 5, gpa: 3, completeness: 2,
};

export const LEVEL_MULTIPLIERS: Record<DifficultyLevel, number> = { 1: 1.0, 2: 1.5, 3: 2.5, 4: 4.0, 5: 6.0 };

export const SCORE_CEILINGS = { L2_MAX: 45, L3_MAX: 75, L4_MAX: 90, L5_MAX: 100 } as const;

export const INTEGRITY_PENALTIES = {
  tabSwitch: 5, paste: 8, fullscreenExit: 3,
  speedAnomalyImpossible: 10, speedAnomalySuspicious: 4, compoundAnomaly: 15,
  speechBurst: 1, conversation: 5, continuousSpeech: 8,
  whisper: 6, speechPlusTabSwitch: 12, backgroundMusic: 1,
} as const;
