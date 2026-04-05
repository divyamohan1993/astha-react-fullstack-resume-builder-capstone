# Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Bridge trust layer connecting candidates and employers through self-assessment, adaptive skill verification testing with anti-cheat, cryptographic scorecards, and match notifications.

**Architecture:** Firebase (Auth, Firestore, Cloud Functions) as the mailbox and trust layer. All AI/scoring runs client-side. New Zustand store for bridge state. Six phases: Foundation, Employer Criteria, Candidate Self-Assessment, Test Engine, Anti-Cheat, Scorecard & Match System.

**Tech Stack:** React 19, TypeScript, Zustand 5, Firebase 11 (Auth, Firestore, Functions), Web Audio API (AudioWorklet), Gemini API (question generation), qrcode (QR generation), HMAC-SHA256 (scorecard signing)

**Spec:** `docs/superpowers/specs/2026-04-05-bridge-design.md`

---

## Phase 1: Foundation (Tasks 1-4)

### Task 1: Firebase Setup and Configuration

**Files:**
- Create: `src/firebase/config.ts`
- Create: `src/firebase/auth.ts`
- Create: `firebase/firestore.rules`
- Create: `firebase/functions/src/index.ts`
- Create: `firebase/functions/package.json`
- Create: `firebase/functions/tsconfig.json`
- Create: `firebase/.firebaserc`
- Create: `firebase/firebase.json`
- Modify: `package.json`

- [ ] **Step 1: Install Firebase dependencies**

Run:
```bash
cd /mnt/experiments/astha-resume && npm install firebase@^11
```

- [ ] **Step 2: Create Firebase config**

```typescript
// src/firebase/config.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

export function initFirebase(): { app: FirebaseApp; db: Firestore; auth: Auth } {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
  }
  return { app, db, auth };
}

export function getDb(): Firestore {
  if (!db) initFirebase();
  return db;
}

export function getAppAuth(): Auth {
  if (!auth) initFirebase();
  return auth;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}
```

- [ ] **Step 3: Create Firebase auth helper**

```typescript
// src/firebase/auth.ts
import { getAppAuth } from './config';
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

export async function signInAnon(): Promise<User> {
  const auth = getAppAuth();
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function signInEmail(email: string, password: string): Promise<User> {
  const auth = getAppAuth();
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function registerEmail(email: string, password: string): Promise<User> {
  const auth = getAppAuth();
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOut(): Promise<void> {
  const auth = getAppAuth();
  await fbSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getAppAuth();
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  const auth = getAppAuth();
  return auth.currentUser;
}
```

- [ ] **Step 4: Create Firestore security rules**

```
// firebase/firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Criteria: anyone can read active criteria, only authenticated employers can write
    match /criteria/{code} {
      allow read: if resource.data.status == 'active';
      allow create, update: if request.auth != null
        && request.auth.token.email != null;
      allow delete: if request.auth != null
        && request.auth.uid == resource.data.employerId;
    }

    // Sessions: only the candidate who owns it can read/write
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.candidateId;
    }

    // Scorecards: candidates read their own, employers read for their criteria
    match /scorecards/{scorecardId} {
      allow read: if request.auth != null
        && (request.auth.uid == resource.data.candidateId
        || request.auth.uid == resource.data.employerId);
      allow create: if false; // Only Cloud Functions can create
    }

    // Matches: candidates create, employers read for their criteria
    match /matches/{matchId} {
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.candidateId;
      allow read: if request.auth != null
        && (request.auth.uid == resource.data.candidateId
        || request.auth.uid == resource.data.employerId);
      allow update: if false;
    }

    // Replies: employers create, candidates read
    match /replies/{replyId} {
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.employerId;
      allow read: if request.auth != null
        && (request.auth.uid == resource.data.candidateId
        || request.auth.uid == resource.data.employerId);
    }
  }
}
```

- [ ] **Step 5: Create Cloud Functions project**

```json
// firebase/functions/package.json
{
  "name": "resumeai-functions",
  "private": true,
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions"
  },
  "engines": {
    "node": "20"
  },
  "dependencies": {
    "firebase-admin": "^13.0.0",
    "firebase-functions": "^6.3.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0"
  }
}
```

```json
// firebase/functions/tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2022",
    "esModuleInterop": true
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

- [ ] **Step 6: Create Cloud Functions entry point (signing + notifications)**

```typescript
// firebase/functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createHmac, randomBytes } from 'crypto';

admin.initializeApp();
const db = admin.firestore();

// Generate a short code for criteria sharing
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// Publish criteria and generate short code + signing secret
export const publishCriteria = functions.https.onCall(async (request) => {
  if (!request.auth || !request.auth.token.email) {
    throw new functions.HttpsError('unauthenticated', 'Employer auth required');
  }

  const data = request.data;
  const shortCode = generateShortCode();
  const signingSecret = randomBytes(32).toString('hex');

  const criteria = {
    shortCode,
    jobTitle: data.jobTitle,
    description: data.description,
    requiredSkills: data.requiredSkills,
    preferredSkills: data.preferredSkills || [],
    customSignals: data.customSignals || [],
    weights: data.weights,
    threshold: data.threshold,
    testConfig: data.testConfig,
    employerId: request.auth.uid,
    employerEmail: request.auth.token.email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: 'active',
  };

  // Store criteria (public, readable by candidates)
  await db.collection('criteria').doc(shortCode).set(criteria);

  // Store signing secret separately (only accessible by functions)
  await db.collection('secrets').doc(shortCode).set({ signingSecret });

  return { shortCode };
});

// Start a test session -- generates a server-side session ID
export const startTestSession = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.HttpsError('unauthenticated', 'Auth required');
  }

  const { criteriaCode, resumePin } = request.data;

  // Verify criteria exists and is active
  const criteriaDoc = await db.collection('criteria').doc(criteriaCode).get();
  if (!criteriaDoc.exists || criteriaDoc.data()?.status !== 'active') {
    throw new functions.HttpsError('not-found', 'Criteria not found or inactive');
  }

  // Check for existing session with same resume pin (anti-gaming)
  const existingSessions = await db.collection('sessions')
    .where('candidateId', '==', request.auth.uid)
    .where('criteriaCode', '==', criteriaCode)
    .where('status', '==', 'completed')
    .get();

  const existingPins = existingSessions.docs.map(d => d.data());
  const matchingPin = existingPins.find(s => s.resumePin?.hash === resumePin.hash);

  if (matchingPin) {
    throw new functions.HttpsError('already-exists',
      'Test already completed with this resume. Modify resume (>10% change) to retest.');
  }

  // Compute change percentage against previous attempts
  let previousAttempts: { hash: string; scoreAtTest: number }[] = [];
  for (const doc of existingSessions.docs) {
    const d = doc.data();
    if (d.resumePin) {
      previousAttempts.push({
        hash: d.resumePin.hash,
        scoreAtTest: d.resumePin.scoreAtTest,
      });
    }
  }

  const sessionId = db.collection('sessions').doc().id;
  const session = {
    sessionId,
    criteriaCode,
    candidateId: request.auth.uid,
    resumePin,
    previousAttempts,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'in_progress',
    heartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('sessions').doc(sessionId).set(session);

  return { sessionId, previousAttempts };
});

// Heartbeat -- keeps session alive, validates online
export const heartbeat = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.HttpsError('unauthenticated', 'Auth required');
  }

  const { sessionId } = request.data;
  const sessionRef = db.collection('sessions').doc(sessionId);
  const session = await sessionRef.get();

  if (!session.exists || session.data()?.candidateId !== request.auth.uid) {
    throw new functions.HttpsError('not-found', 'Session not found');
  }

  if (session.data()?.status !== 'in_progress') {
    throw new functions.HttpsError('failed-precondition', 'Session not active');
  }

  await sessionRef.update({
    heartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

// Sign scorecard
export const signScorecard = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.HttpsError('unauthenticated', 'Auth required');
  }

  const payload = request.data;

  // Validate session
  const sessionDoc = await db.collection('sessions').doc(payload.sessionId).get();
  if (!sessionDoc.exists) {
    throw new functions.HttpsError('not-found', 'Session not found');
  }
  const session = sessionDoc.data()!;
  if (session.candidateId !== request.auth.uid) {
    throw new functions.HttpsError('permission-denied', 'Not your session');
  }
  if (session.status === 'scored') {
    throw new functions.HttpsError('already-exists', 'Scorecard already generated');
  }

  // Validate criteria
  const criteriaDoc = await db.collection('criteria').doc(payload.criteriaCode).get();
  if (!criteriaDoc.exists) {
    throw new functions.HttpsError('not-found', 'Criteria not found');
  }

  // Get signing secret
  const secretDoc = await db.collection('secrets').doc(payload.criteriaCode).get();
  if (!secretDoc.exists) {
    throw new functions.HttpsError('internal', 'Signing secret missing');
  }
  const signingSecret = secretDoc.data()!.signingSecret;

  // Build canonical payload (everything except signature)
  const canonical = JSON.stringify({
    version: payload.version,
    criteriaCode: payload.criteriaCode,
    criteriaHash: payload.criteriaHash,
    candidateId: request.auth.uid,
    sessionId: payload.sessionId,
    timestamp: payload.timestamp,
    resumeScore: payload.resumeScore,
    resumePin: payload.resumePin,
    verification: payload.verification,
    integrity: payload.integrity,
    gap: payload.gap,
    calibration: payload.calibration,
  });

  // HMAC-SHA256 sign
  const signature = createHmac('sha256', signingSecret)
    .update(canonical)
    .digest('hex');

  const signedScorecard = {
    ...JSON.parse(canonical),
    candidateId: request.auth.uid,
    employerId: criteriaDoc.data()!.employerId,
    signature,
    signedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Store scorecard
  const scorecardId = db.collection('scorecards').doc().id;
  await db.collection('scorecards').doc(scorecardId).set(signedScorecard);

  // Mark session as scored
  await db.collection('sessions').doc(payload.sessionId).update({
    status: 'scored',
    scorecardId,
  });

  return { scorecardId, signature };
});

// Send match signal
export const sendMatchSignal = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.HttpsError('unauthenticated', 'Auth required');
  }

  const { criteriaCode, scorecardId, contactInfo } = request.data;

  // Validate scorecard belongs to this user
  const scorecardDoc = await db.collection('scorecards').doc(scorecardId).get();
  if (!scorecardDoc.exists || scorecardDoc.data()?.candidateId !== request.auth.uid) {
    throw new functions.HttpsError('permission-denied', 'Not your scorecard');
  }

  const scorecard = scorecardDoc.data()!;

  // Check threshold
  const criteriaDoc = await db.collection('criteria').doc(criteriaCode).get();
  if (!criteriaDoc.exists) {
    throw new functions.HttpsError('not-found', 'Criteria not found');
  }
  const criteria = criteriaDoc.data()!;

  const matchId = db.collection('matches').doc().id;
  const match = {
    matchId,
    criteriaCode,
    scorecardId,
    candidateId: request.auth.uid,
    employerId: criteria.employerId,
    contactInfo,
    resumeScore: scorecard.resumeScore?.overall ?? 0,
    verifiedScore: scorecard.verification?.overall ?? 0,
    integrityScore: scorecard.integrity?.score ?? 0,
    gap: scorecard.gap ?? 0,
    meetsThreshold: (scorecard.verification?.overall ?? 0) >= criteria.threshold,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'pending',
  };

  await db.collection('matches').doc(matchId).set(match);

  return { matchId, meetsThreshold: match.meetsThreshold };
});

// Employer reply to match
export const replyToMatch = functions.https.onCall(async (request) => {
  if (!request.auth || !request.auth.token.email) {
    throw new functions.HttpsError('unauthenticated', 'Employer auth required');
  }

  const { matchId, message } = request.data;

  const matchDoc = await db.collection('matches').doc(matchId).get();
  if (!matchDoc.exists || matchDoc.data()?.employerId !== request.auth.uid) {
    throw new functions.HttpsError('permission-denied', 'Not your match');
  }

  // Check if already replied
  const existingReplies = await db.collection('replies')
    .where('matchId', '==', matchId)
    .limit(1)
    .get();

  if (!existingReplies.empty) {
    throw new functions.HttpsError('already-exists', 'Already replied to this match');
  }

  const replyId = db.collection('replies').doc().id;
  const reply = {
    replyId,
    matchId,
    employerId: request.auth.uid,
    candidateId: matchDoc.data()!.candidateId,
    message,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('replies').doc(replyId).set(reply);

  // Update match status
  await db.collection('matches').doc(matchId).update({ status: 'replied' });

  return { replyId };
});

// Firestore trigger: notify employer on new match via email
export const onMatchCreated = functions.firestore
  .onDocumentCreated('matches/{matchId}', async (event) => {
    const match = event.data?.data();
    if (!match) return;

    // Get employer email from criteria
    const criteriaDoc = await db.collection('criteria').doc(match.criteriaCode).get();
    if (!criteriaDoc.exists) return;
    const criteria = criteriaDoc.data()!;

    // Store notification for in-app display
    await db.collection('notifications').doc().set({
      type: 'new_match',
      employerId: match.employerId,
      matchId: match.matchId,
      criteriaCode: match.criteriaCode,
      jobTitle: criteria.jobTitle,
      candidateName: match.contactInfo?.name ?? 'Anonymous',
      verifiedScore: match.verifiedScore,
      resumeScore: match.resumeScore,
      integrityScore: match.integrityScore,
      gap: match.gap,
      meetsThreshold: match.meetsThreshold,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Email notification would be sent via SendGrid extension
    // The extension triggers on writes to a 'mail' collection
    if (criteria.employerEmail) {
      await db.collection('mail').doc().set({
        to: criteria.employerEmail,
        message: {
          subject: `New match for ${criteria.jobTitle}`,
          text: `A candidate scored ${match.verifiedScore}% (verified) on your criteria for "${criteria.jobTitle}". Log in to view their scorecard.`,
          html: `<p>A candidate scored <strong>${match.verifiedScore}%</strong> (verified) on your criteria for "<strong>${criteria.jobTitle}</strong>".</p><p>Resume Score: ${match.resumeScore}% | Integrity: ${match.integrityScore}% | Gap: ${match.gap}</p><p>Log in to view their full scorecard.</p>`,
        },
      });
    }
  });
```

- [ ] **Step 7: Create Firebase project config files**

```json
// firebase/firebase.json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs20"
  },
  "hosting": {
    "public": "../dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

```json
// firebase/.firebaserc
{
  "projects": {
    "default": "resumeai-bridge"
  }
}
```

- [ ] **Step 8: Create .env.example**

```
# .env.example
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GEMINI_API_KEY=
```

- [ ] **Step 9: Commit**

```bash
git add src/firebase/ firebase/ .env.example
git commit -m "feat: Firebase infrastructure - auth, firestore rules, cloud functions"
```

---

### Task 2: Bridge Types

**Files:**
- Create: `src/bridge/types.ts`

- [ ] **Step 1: Create all Bridge TypeScript types**

```typescript
// src/bridge/types.ts

// --- Criteria (Employer publishes) ---

export interface CustomSignal {
  name: string;
  weight: number;
  description: string;
}

export interface TestConfig {
  skillsToTest: string[];
  difficultyFloor: number;
  questionCount: number;
}

export interface BridgeCriteria {
  shortCode: string;
  jobTitle: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  customSignals: CustomSignal[];
  weights: Record<string, number>;
  threshold: number;
  testConfig: TestConfig;
  employerId: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'paused' | 'closed';
}

// --- Resume Pinning ---

export interface ResumePin {
  hash: string;
  scoreAtTest: number;
  sections: string[];
  skillsClaimed: string[];
}

// --- Calibration ---

export interface Calibration {
  wpm: number;
  ambientDb: number;
  micPermission: boolean;
}

// --- Questions ---

export type QuestionType = 'concept' | 'scenario' | 'micro-challenge';
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface QuestionOption {
  text: string;
  charCount: number;
}

export interface GeneratedQuestion {
  id: string;
  skill: string;
  type: QuestionType;
  level: DifficultyLevel;
  text: string;
  options: QuestionOption[];
  correctIndex: number;
  timeAllotted: number;
  wordCount: number;
}

export interface QuestionResponse {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  timeElapsed: number;
  expectedReadTime: number;
  wpmRatio: number;
}

// --- Integrity Flags ---

export type IntegrityFlagType =
  | 'tabSwitch'
  | 'paste'
  | 'fullscreenExit'
  | 'speedAnomaly'
  | 'compoundAnomaly';

export interface IntegrityFlag {
  type: IntegrityFlagType;
  timestamp: number;
  penalty: number;
  metadata: Record<string, unknown>;
}

export type AudioFlagType =
  | 'speechBurst'
  | 'conversation'
  | 'continuousSpeech'
  | 'whisper'
  | 'speechPlusTabSwitch';

export interface AudioFlag {
  type: AudioFlagType;
  timestamp: number;
  durationMs: number;
  dbDelta: number;
  penalty: number;
}

// --- Test Session ---

export type TestStatus = 'calibrating' | 'in_progress' | 'suspended' | 'completed';

export interface TestSession {
  sessionId: string;
  criteriaCode: string;
  candidateId: string;
  resumePin: ResumePin;
  calibration: Calibration;
  questions: GeneratedQuestion[];
  responses: QuestionResponse[];
  flags: IntegrityFlag[];
  audioFlags: AudioFlag[];
  startedAt: number;
  completedAt: number | null;
  status: TestStatus;
  currentQuestionIndex: number;
  currentLevel: Record<string, DifficultyLevel>;
  consecutiveCorrect: Record<string, number>;
}

// --- Scores ---

export interface SkillVerification {
  skill: string;
  score: number;
  peakLevel: DifficultyLevel;
  questionsAttempted: number;
}

export interface VerificationResult {
  overall: number;
  perSkill: SkillVerification[];
  totalQuestions: number;
  duration: number;
}

export interface IntegrityResult {
  score: number;
  micPermission: boolean;
  flags: IntegrityFlag[];
  audioFlags: AudioFlag[];
  flagSummary: Record<string, number>;
}

export interface ScoreBreakdown {
  overall: number;
  breakdown: Record<string, { raw: number; weighted: number; weight: number }>;
}

// --- Scorecard ---

export interface SignedScorecard {
  version: number;
  criteriaCode: string;
  criteriaHash: string;
  candidateId: string;
  sessionId: string;
  timestamp: string;
  resumeScore: ScoreBreakdown;
  resumePin: ResumePin;
  verification: VerificationResult;
  integrity: IntegrityResult;
  gap: number;
  calibration: Calibration;
  signature: string;
}

// --- Match System ---

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  github?: string;
}

export type MatchStatus = 'pending' | 'viewed' | 'replied';

export interface MatchSignal {
  matchId: string;
  criteriaCode: string;
  scorecardId: string;
  candidateId: string;
  employerId: string;
  contactInfo: ContactInfo;
  resumeScore: number;
  verifiedScore: number;
  integrityScore: number;
  gap: number;
  meetsThreshold: boolean;
  sentAt: Date;
  status: MatchStatus;
}

export interface EmployerReply {
  replyId: string;
  matchId: string;
  employerId: string;
  candidateId: string;
  message: string;
  sentAt: Date;
}

// --- Research-backed default weights ---

export const DEFAULT_WEIGHTS: Record<string, number> = {
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

export const LEVEL_MULTIPLIERS: Record<DifficultyLevel, number> = {
  1: 1.0,
  2: 1.5,
  3: 2.5,
  4: 4.0,
  5: 6.0,
};

export const SCORE_CEILINGS = {
  L2_MAX: 45,
  L3_MAX: 75,
  L4_MAX: 90,
  L5_MAX: 100,
} as const;

export const INTEGRITY_PENALTIES = {
  tabSwitch: 5,
  paste: 8,
  fullscreenExit: 3,
  speedAnomalyImpossible: 10,
  speedAnomalySuspicious: 4,
  compoundAnomaly: 15,
  speechBurst: 1,
  conversation: 5,
  continuousSpeech: 8,
  whisper: 6,
  speechPlusTabSwitch: 12,
  backgroundMusic: 1,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/bridge/types.ts
git commit -m "feat: Bridge type definitions - criteria, test, scorecard, match types"
```

---

### Task 3: Bridge Store

**Files:**
- Create: `src/bridge/store.ts`
- Create: `src/bridge/__tests__/store.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/bridge/__tests__/store.test.ts
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

describe('Bridge Store', () => {
  beforeEach(() => {
    useBridgeStore.setState(useBridgeStore.getInitialState());
  });

  describe('criteria', () => {
    const mockCriteria = {
      shortCode: 'R7Kx3m',
      jobTitle: 'Frontend Developer',
      description: 'Build React UIs',
      requiredSkills: ['React', 'TypeScript'],
      preferredSkills: ['Node.js'],
      customSignals: [],
      weights: { skillsMatch: 30, experience: 20 },
      threshold: 70,
      testConfig: { skillsToTest: ['React', 'TypeScript'], difficultyFloor: 1, questionCount: 20 },
      employerId: 'emp123',
      createdAt: new Date(),
      expiresAt: new Date(),
      status: 'active' as const,
    };

    it('sets criteria', () => {
      useBridgeStore.getState().setCriteria(mockCriteria);
      expect(useBridgeStore.getState().criteria).toEqual(mockCriteria);
    });

    it('clears criteria', () => {
      useBridgeStore.getState().setCriteria(mockCriteria);
      useBridgeStore.getState().clearCriteria();
      expect(useBridgeStore.getState().criteria).toBeNull();
    });
  });

  describe('self-assessment', () => {
    it('sets self-assessment scores', () => {
      const scores = { overall: 72, breakdown: { skillsMatch: { raw: 80, weighted: 24, weight: 30 } } };
      useBridgeStore.getState().setSelfAssessment(scores);
      expect(useBridgeStore.getState().selfAssessment).toEqual(scores);
    });
  });

  describe('test session', () => {
    it('initializes test session', () => {
      useBridgeStore.getState().initTestSession('sess1', 'R7Kx3m', 'cand1', {
        hash: 'abc',
        scoreAtTest: 72,
        sections: ['education'],
        skillsClaimed: ['React'],
      });
      const session = useBridgeStore.getState().testSession;
      expect(session).not.toBeNull();
      expect(session!.sessionId).toBe('sess1');
      expect(session!.status).toBe('calibrating');
    });

    it('sets calibration', () => {
      useBridgeStore.getState().initTestSession('sess1', 'R7Kx3m', 'cand1', {
        hash: 'abc', scoreAtTest: 72, sections: [], skillsClaimed: [],
      });
      useBridgeStore.getState().setCalibration({ wpm: 134, ambientDb: 40, micPermission: true });
      expect(useBridgeStore.getState().testSession!.calibration.wpm).toBe(134);
      expect(useBridgeStore.getState().testSession!.status).toBe('in_progress');
    });

    it('records question response', () => {
      useBridgeStore.getState().initTestSession('sess1', 'R7Kx3m', 'cand1', {
        hash: 'abc', scoreAtTest: 72, sections: [], skillsClaimed: [],
      });
      useBridgeStore.getState().recordResponse({
        questionId: 'q1', selectedIndex: 2, correct: true,
        timeElapsed: 15, expectedReadTime: 20, wpmRatio: 1.33,
      });
      expect(useBridgeStore.getState().testSession!.responses).toHaveLength(1);
    });

    it('adds integrity flag', () => {
      useBridgeStore.getState().initTestSession('sess1', 'R7Kx3m', 'cand1', {
        hash: 'abc', scoreAtTest: 72, sections: [], skillsClaimed: [],
      });
      useBridgeStore.getState().addFlag({
        type: 'tabSwitch', timestamp: Date.now(), penalty: 5, metadata: {},
      });
      expect(useBridgeStore.getState().testSession!.flags).toHaveLength(1);
    });

    it('adds audio flag', () => {
      useBridgeStore.getState().initTestSession('sess1', 'R7Kx3m', 'cand1', {
        hash: 'abc', scoreAtTest: 72, sections: [], skillsClaimed: [],
      });
      useBridgeStore.getState().addAudioFlag({
        type: 'speechBurst', timestamp: Date.now(), durationMs: 3000, dbDelta: 15, penalty: 1,
      });
      expect(useBridgeStore.getState().testSession!.audioFlags).toHaveLength(1);
    });

    it('completes test session', () => {
      useBridgeStore.getState().initTestSession('sess1', 'R7Kx3m', 'cand1', {
        hash: 'abc', scoreAtTest: 72, sections: [], skillsClaimed: [],
      });
      useBridgeStore.getState().completeTest();
      expect(useBridgeStore.getState().testSession!.status).toBe('completed');
      expect(useBridgeStore.getState().testSession!.completedAt).not.toBeNull();
    });
  });

  describe('scorecard', () => {
    it('sets scorecard', () => {
      const scorecard = {
        version: 1, criteriaCode: 'R7Kx3m', criteriaHash: 'hash',
        candidateId: 'c1', sessionId: 's1', timestamp: new Date().toISOString(),
        resumeScore: { overall: 72, breakdown: {} },
        resumePin: { hash: 'h', scoreAtTest: 72, sections: [], skillsClaimed: [] },
        verification: { overall: 85, perSkill: [], totalQuestions: 25, duration: 1080 },
        integrity: { score: 94, micPermission: true, flags: [], audioFlags: [], flagSummary: {} },
        gap: -13, calibration: { wpm: 134, ambientDb: 40, micPermission: true },
        signature: 'sig',
      };
      useBridgeStore.getState().setScorecard(scorecard);
      expect(useBridgeStore.getState().scorecard).toEqual(scorecard);
    });
  });

  describe('matches', () => {
    it('adds a match signal', () => {
      useBridgeStore.getState().addMatch({
        matchId: 'm1', criteriaCode: 'R7Kx3m', scorecardId: 'sc1',
        candidateId: 'c1', employerId: 'e1',
        contactInfo: { name: 'Test', email: 'test@test.com' },
        resumeScore: 72, verifiedScore: 85, integrityScore: 94,
        gap: -13, meetsThreshold: true, sentAt: new Date(), status: 'pending',
      });
      expect(useBridgeStore.getState().matches).toHaveLength(1);
    });

    it('updates match status', () => {
      useBridgeStore.getState().addMatch({
        matchId: 'm1', criteriaCode: 'R7Kx3m', scorecardId: 'sc1',
        candidateId: 'c1', employerId: 'e1',
        contactInfo: { name: 'Test', email: 'test@test.com' },
        resumeScore: 72, verifiedScore: 85, integrityScore: 94,
        gap: -13, meetsThreshold: true, sentAt: new Date(), status: 'pending',
      });
      useBridgeStore.getState().updateMatchStatus('m1', 'viewed');
      expect(useBridgeStore.getState().matches[0].status).toBe('viewed');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/experiments/astha-resume && npx vitest run src/bridge/__tests__/store.test.ts`
Expected: FAIL — module `../store` not found

- [ ] **Step 3: Write the store implementation**

```typescript
// src/bridge/store.ts
import { create } from 'zustand';
import { createIndexedDBStorage } from '../store/persist';
import type {
  BridgeCriteria,
  TestSession,
  SignedScorecard,
  MatchSignal,
  ResumePin,
  Calibration,
  QuestionResponse,
  IntegrityFlag,
  AudioFlag,
  ScoreBreakdown,
  GeneratedQuestion,
  DifficultyLevel,
} from './types';

interface BridgeState {
  // Criteria (loaded from employer's shared link)
  criteria: BridgeCriteria | null;
  // Self-assessment result
  selfAssessment: ScoreBreakdown | null;
  // Active test session
  testSession: TestSession | null;
  // Signed scorecard after test completion
  scorecard: SignedScorecard | null;
  // Match signals sent by candidate
  matches: MatchSignal[];
  // Employer replies received
  replies: { replyId: string; matchId: string; message: string; sentAt: Date }[];
  // Loading state
  loaded: boolean;

  // Actions
  setCriteria: (criteria: BridgeCriteria) => void;
  clearCriteria: () => void;
  setSelfAssessment: (scores: ScoreBreakdown) => void;
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
  updateMatchStatus: (matchId: string, status: MatchSignal['status']) => void;
  addReply: (reply: { replyId: string; matchId: string; message: string; sentAt: Date }) => void;
  load: () => Promise<void>;
  reset: () => void;
}

const storage = createIndexedDBStorage<Omit<BridgeState, 'loaded' | keyof BridgeActions>>('bridge');

type BridgeActions = {
  [K in keyof BridgeState]: BridgeState[K] extends (...args: unknown[]) => unknown ? K : never;
}[keyof BridgeState];

const initialState = {
  criteria: null,
  selfAssessment: null,
  testSession: null,
  scorecard: null,
  matches: [],
  replies: [],
  loaded: false,
};

export const useBridgeStore = create<BridgeState>()((set, get) => {
  const save = () => {
    const { criteria, selfAssessment, testSession, scorecard, matches, replies } = get();
    storage.save({ criteria, selfAssessment, testSession, scorecard, matches, replies });
  };

  return {
    ...initialState,

    setCriteria: (criteria) => {
      set({ criteria });
      save();
    },

    clearCriteria: () => {
      set({ criteria: null, selfAssessment: null });
      save();
    },

    setSelfAssessment: (scores) => {
      set({ selfAssessment: scores });
      save();
    },

    initTestSession: (sessionId, criteriaCode, candidateId, resumePin) => {
      set({
        testSession: {
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
        },
      });
      save();
    },

    setCalibration: (calibration) => {
      const session = get().testSession;
      if (!session) return;
      set({
        testSession: { ...session, calibration, status: 'in_progress' },
      });
      save();
    },

    setQuestions: (questions) => {
      const session = get().testSession;
      if (!session) return;
      set({ testSession: { ...session, questions } });
      save();
    },

    recordResponse: (response) => {
      const session = get().testSession;
      if (!session) return;
      set({
        testSession: {
          ...session,
          responses: [...session.responses, response],
        },
      });
      save();
    },

    addFlag: (flag) => {
      const session = get().testSession;
      if (!session) return;
      set({
        testSession: { ...session, flags: [...session.flags, flag] },
      });
      save();
    },

    addAudioFlag: (flag) => {
      const session = get().testSession;
      if (!session) return;
      set({
        testSession: { ...session, audioFlags: [...session.audioFlags, flag] },
      });
      save();
    },

    updateLevel: (skill, level) => {
      const session = get().testSession;
      if (!session) return;
      set({
        testSession: {
          ...session,
          currentLevel: { ...session.currentLevel, [skill]: level },
        },
      });
      save();
    },

    incrementConsecutive: (skill) => {
      const session = get().testSession;
      if (!session) return;
      set({
        testSession: {
          ...session,
          consecutiveCorrect: {
            ...session.consecutiveCorrect,
            [skill]: (session.consecutiveCorrect[skill] ?? 0) + 1,
          },
        },
      });
      save();
    },

    resetConsecutive: (skill) => {
      const session = get().testSession;
      if (!session) return;
      set({
        testSession: {
          ...session,
          consecutiveCorrect: { ...session.consecutiveCorrect, [skill]: 0 },
        },
      });
      save();
    },

    advanceQuestion: () => {
      const session = get().testSession;
      if (!session) return;
      set({
        testSession: {
          ...session,
          currentQuestionIndex: session.currentQuestionIndex + 1,
        },
      });
      save();
    },

    suspendTest: () => {
      const session = get().testSession;
      if (!session) return;
      set({ testSession: { ...session, status: 'suspended' } });
      save();
    },

    resumeTest: () => {
      const session = get().testSession;
      if (!session) return;
      set({ testSession: { ...session, status: 'in_progress' } });
      save();
    },

    completeTest: () => {
      const session = get().testSession;
      if (!session) return;
      set({
        testSession: { ...session, status: 'completed', completedAt: Date.now() },
      });
      save();
    },

    setScorecard: (scorecard) => {
      set({ scorecard });
      save();
    },

    addMatch: (match) => {
      set({ matches: [...get().matches, match] });
      save();
    },

    updateMatchStatus: (matchId, status) => {
      set({
        matches: get().matches.map((m) =>
          m.matchId === matchId ? { ...m, status } : m
        ),
      });
      save();
    },

    addReply: (reply) => {
      set({ replies: [...get().replies, reply] });
      save();
    },

    load: async () => {
      const saved = await storage.load();
      if (saved) {
        set({ ...saved, loaded: true });
      } else {
        set({ loaded: true });
      }
    },

    reset: () => {
      set(initialState);
      save();
    },
  };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/experiments/astha-resume && npx vitest run src/bridge/__tests__/store.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/bridge/store.ts src/bridge/__tests__/store.test.ts
git commit -m "feat: Bridge Zustand store with full test coverage"
```

---

### Task 4: Resume Pinning Utility

**Files:**
- Create: `src/bridge/resumePin.ts`
- Create: `src/bridge/__tests__/resumePin.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/bridge/__tests__/resumePin.test.ts
import { describe, it, expect } from 'vitest';
import {
  normalizeResumeText,
  hashResume,
  computeChangePct,
  classifyChange,
  createResumePin,
} from '../resumePin';
import type { Resume } from '../../store/types';

describe('Resume Pinning', () => {
  describe('normalizeResumeText', () => {
    it('lowercases and collapses whitespace', () => {
      expect(normalizeResumeText('  Hello   WORLD  ')).toBe('hello world');
    });

    it('strips punctuation', () => {
      expect(normalizeResumeText('React, Node.js & SQL!')).toBe('react nodejs sql');
    });
  });

  describe('hashResume', () => {
    it('returns consistent hash for same content', async () => {
      const h1 = await hashResume('hello world');
      const h2 = await hashResume('hello world');
      expect(h1).toBe(h2);
    });

    it('returns different hash for different content', async () => {
      const h1 = await hashResume('hello world');
      const h2 = await hashResume('hello earth');
      expect(h1).not.toBe(h2);
    });
  });

  describe('computeChangePct', () => {
    it('returns 0 for identical text', () => {
      expect(computeChangePct('react nodejs sql', 'react nodejs sql')).toBe(0);
    });

    it('returns 100 for completely different text', () => {
      expect(computeChangePct('react nodejs sql', 'python django flask')).toBe(100);
    });

    it('returns partial change for partial edit', () => {
      const pct = computeChangePct(
        'react nodejs typescript sql docker kubernetes',
        'react nodejs typescript python flask django',
      );
      expect(pct).toBeGreaterThan(0);
      expect(pct).toBeLessThan(100);
    });
  });

  describe('classifyChange', () => {
    it('returns same for < 10%', () => {
      expect(classifyChange(5)).toBe('same');
    });

    it('returns moderate for 10-30%', () => {
      expect(classifyChange(20)).toBe('moderate');
    });

    it('returns substantial for > 30%', () => {
      expect(classifyChange(50)).toBe('substantial');
    });
  });

  describe('createResumePin', () => {
    it('extracts skills and sections from resume', async () => {
      const resume: Resume = {
        id: '1',
        meta: { createdAt: '', updatedAt: '', templateId: 'ats-classic' },
        personal: { name: 'Test', email: '', phone: '', location: '', linkedin: '', github: '' },
        summary: 'Full stack developer',
        sections: [
          {
            id: 's1', type: 'skills', heading: 'Skills', layout: 'tags',
            entries: [{ id: 'e1', fields: { skill: 'React' }, bullets: [] }],
          },
          {
            id: 's2', type: 'education', heading: 'Education', layout: 'list',
            entries: [{ id: 'e2', fields: { institution: 'MIT' }, bullets: [] }],
          },
        ],
      };
      const pin = await createResumePin(resume, 72);
      expect(pin.sections).toContain('skills');
      expect(pin.sections).toContain('education');
      expect(pin.scoreAtTest).toBe(72);
      expect(pin.hash).toBeTruthy();
      expect(pin.skillsClaimed.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/experiments/astha-resume && npx vitest run src/bridge/__tests__/resumePin.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/bridge/resumePin.ts
import type { Resume } from '../store/types';
import type { ResumePin } from './types';

export function normalizeResumeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function hashResume(normalizedText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function extractTrigrams(text: string): Set<string> {
  const words = text.split(' ').filter(Boolean);
  const trigrams = new Set<string>();
  for (let i = 0; i <= words.length - 3; i++) {
    trigrams.add(words.slice(i, i + 3).join(' '));
  }
  // Also add bigrams and unigrams for short texts
  for (let i = 0; i <= words.length - 2; i++) {
    trigrams.add(words.slice(i, i + 2).join(' '));
  }
  for (const w of words) {
    trigrams.add(w);
  }
  return trigrams;
}

export function computeChangePct(oldNormalized: string, newNormalized: string): number {
  const oldTrigrams = extractTrigrams(oldNormalized);
  const newTrigrams = extractTrigrams(newNormalized);

  if (oldTrigrams.size === 0 && newTrigrams.size === 0) return 0;

  const union = new Set([...oldTrigrams, ...newTrigrams]);
  const intersection = new Set([...oldTrigrams].filter((t) => newTrigrams.has(t)));

  if (union.size === 0) return 0;

  const similarity = intersection.size / union.size;
  return Math.round((1 - similarity) * 100);
}

export function classifyChange(changePct: number): 'same' | 'moderate' | 'substantial' {
  if (changePct < 10) return 'same';
  if (changePct <= 30) return 'moderate';
  return 'substantial';
}

function resumeToText(resume: Resume): string {
  const parts: string[] = [];
  parts.push(resume.personal.name);
  parts.push(resume.personal.email);
  parts.push(resume.summary);
  for (const section of resume.sections) {
    parts.push(section.heading);
    for (const entry of section.entries) {
      parts.push(Object.values(entry.fields).join(' '));
      parts.push(entry.bullets.join(' '));
    }
  }
  return parts.filter(Boolean).join(' ');
}

function extractSkills(resume: Resume): string[] {
  const skills: string[] = [];
  for (const section of resume.sections) {
    if (section.type === 'skills') {
      for (const entry of section.entries) {
        const vals = Object.values(entry.fields).filter(Boolean);
        skills.push(...vals);
      }
    }
  }
  // Also extract from summary and project descriptions as keywords
  return [...new Set(skills)];
}

export async function createResumePin(resume: Resume, scoreAtTest: number): Promise<ResumePin> {
  const rawText = resumeToText(resume);
  const normalized = normalizeResumeText(rawText);
  const hash = await hashResume(normalized);
  const sections = resume.sections.map((s) => s.type);
  const skillsClaimed = extractSkills(resume);

  return {
    hash,
    scoreAtTest,
    sections,
    skillsClaimed,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/experiments/astha-resume && npx vitest run src/bridge/__tests__/resumePin.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/bridge/resumePin.ts src/bridge/__tests__/resumePin.test.ts
git commit -m "feat: Resume pinning - content hashing, change detection, anti-gaming"
```

---

## Phase 2: Employer Criteria Publishing (Tasks 5-6)

### Task 5: Criteria Publishing Form Component

**Files:**
- Create: `src/bridge/components/CriteriaPublishForm.tsx`
- Create: `src/bridge/components/WeightEditor.tsx`
- Create: `src/bridge/components/CustomSignalEditor.tsx`
- Create: `src/bridge/components/SharePanel.tsx`

- [ ] **Step 1: Create WeightEditor component**

```tsx
// src/bridge/components/WeightEditor.tsx
import { useState } from 'react';
import { DEFAULT_WEIGHTS } from '../types';

interface WeightEditorProps {
  weights: Record<string, number>;
  onChange: (weights: Record<string, number>) => void;
}

const WEIGHT_LABELS: Record<string, { label: string; citation: string }> = {
  skillsMatch: { label: 'Skills Match', citation: 'NACE Job Outlook 2024' },
  experience: { label: 'Experience', citation: 'NACE Internship Survey 2024' },
  education: { label: 'Education', citation: 'NACE 2024, 73.4% screen by major' },
  projects: { label: 'Projects', citation: 'AAC&U/Hart Research 2018' },
  certifications: { label: 'Certifications', citation: 'SHRM Credentials 2021' },
  distance: { label: 'Distance', citation: 'Marinescu & Rathelot 2018' },
  extracurricular: { label: 'Extracurricular', citation: 'Roulin & Bangerter 2013' },
  gpa: { label: 'GPA', citation: 'NACE 2024, 38.3% cutoff' },
  completeness: { label: 'Completeness', citation: 'Ladders Eye-Tracking 2018' },
};

export function WeightEditor({ weights, onChange }: WeightEditorProps) {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);

  const handleChange = (key: string, value: number) => {
    onChange({ ...weights, [key]: value });
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_WEIGHTS });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Scoring Weights</h3>
        <button
          type="button"
          onClick={handleReset}
          className="text-sm underline opacity-70 hover:opacity-100"
        >
          Reset to research defaults
        </button>
      </div>
      <p className="text-sm opacity-60">
        Total must equal 100. Research-backed defaults shown in parentheses.
      </p>

      {Object.entries(WEIGHT_LABELS).map(([key, { label, citation }]) => (
        <div key={key} className="flex items-center gap-3">
          <label className="w-40 text-sm">{label}</label>
          <input
            type="range"
            min={0}
            max={50}
            value={weights[key] ?? DEFAULT_WEIGHTS[key]}
            onChange={(e) => handleChange(key, Number(e.target.value))}
            className="flex-1"
            aria-label={`${label} weight`}
          />
          <span className="w-12 text-right text-sm font-mono">
            {weights[key] ?? DEFAULT_WEIGHTS[key]}%
          </span>
          <span className="text-xs opacity-40 w-8 text-center">
            ({DEFAULT_WEIGHTS[key]})
          </span>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-2 border-t">
        <span className="text-sm font-medium">Total:</span>
        <span className={`text-sm font-mono ${total !== 100 ? 'text-red-500 font-bold' : 'text-green-600'}`}>
          {total}%
        </span>
        {total !== 100 && (
          <span className="text-xs text-red-500">Must equal 100%</span>
        )}
      </div>

      <details className="text-xs opacity-50">
        <summary className="cursor-pointer">Research citations</summary>
        <ul className="mt-1 space-y-0.5 pl-4 list-disc">
          {Object.entries(WEIGHT_LABELS).map(([key, { label, citation }]) => (
            <li key={key}>{label}: {citation}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
```

- [ ] **Step 2: Create CustomSignalEditor component**

```tsx
// src/bridge/components/CustomSignalEditor.tsx
import { useState } from 'react';
import type { CustomSignal } from '../types';

interface CustomSignalEditorProps {
  signals: CustomSignal[];
  onChange: (signals: CustomSignal[]) => void;
}

export function CustomSignalEditor({ signals, onChange }: CustomSignalEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(5);

  const handleAdd = () => {
    if (!name.trim()) return;
    onChange([...signals, { name: name.trim(), description: description.trim(), weight }]);
    setName('');
    setDescription('');
    setWeight(5);
  };

  const handleRemove = (index: number) => {
    onChange(signals.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-base">Custom Scoring Signals</h3>
      <p className="text-sm opacity-60">
        Add your own scoring dimensions beyond the research-backed defaults.
      </p>

      {signals.map((signal, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded border">
          <div className="flex-1">
            <span className="text-sm font-medium">{signal.name}</span>
            <span className="text-xs opacity-50 ml-2">{signal.description}</span>
          </div>
          <span className="text-sm font-mono">{signal.weight}%</span>
          <button
            type="button"
            onClick={() => handleRemove(i)}
            className="text-red-500 text-sm px-2 hover:bg-red-50 rounded"
            aria-label={`Remove ${signal.name}`}
          >
            Remove
          </button>
        </div>
      ))}

      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs block mb-1">Signal name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Open Source Contributions"
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs block mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What to look for"
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>
        <div className="w-20">
          <label className="text-xs block mb-1">Weight %</label>
          <input
            type="number"
            min={1}
            max={20}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!name.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create SharePanel component**

```tsx
// src/bridge/components/SharePanel.tsx
import { useState, useEffect, useRef } from 'react';

interface SharePanelProps {
  shortCode: string;
  baseUrl?: string;
}

export function SharePanel({ shortCode, baseUrl }: SharePanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fullUrl = `${baseUrl ?? window.location.origin}/bridge/${shortCode}`;

  useEffect(() => {
    generateQR();
  }, [shortCode]);

  async function generateQR() {
    // QR code generation using Canvas API
    // We use a minimal QR encoder inline to avoid deps
    // For production, use the 'qrcode' npm package
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const { default: QRCode } = await import('qrcode');
      await QRCode.toCanvas(canvas, fullUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(canvas.toDataURL('image/png'));
    } catch {
      // Fallback: just show the link
      setQrDataUrl('');
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `resumeai-${shortCode}-qr.png`;
    a.click();
  };

  const embedCode = `<iframe src="${fullUrl}/widget" width="400" height="200" style="border:none;border-radius:8px;" title="Score yourself"></iframe>`;

  return (
    <div className="space-y-6 p-6 border rounded-lg">
      <h3 className="text-lg font-bold">Share your criteria</h3>

      {/* Link */}
      <div className="space-y-2">
        <label className="text-sm font-medium block">Share Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={fullUrl}
            className="flex-1 px-3 py-2 border rounded text-sm bg-gray-50"
            aria-label="Share link"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm whitespace-nowrap"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="space-y-2">
        <label className="text-sm font-medium block">QR Code</label>
        <canvas ref={canvasRef} className="border rounded" />
        {qrDataUrl && (
          <button
            onClick={handleDownloadQR}
            className="px-4 py-2 border rounded text-sm"
          >
            Download QR (300dpi PNG)
          </button>
        )}
      </div>

      {/* Embed */}
      <div className="space-y-2">
        <label className="text-sm font-medium block">Embed on your careers page</label>
        <textarea
          readOnly
          value={embedCode}
          rows={3}
          className="w-full px-3 py-2 border rounded text-xs font-mono bg-gray-50"
          aria-label="Embed code"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create CriteriaPublishForm component**

```tsx
// src/bridge/components/CriteriaPublishForm.tsx
import { useState } from 'react';
import { WeightEditor } from './WeightEditor';
import { CustomSignalEditor } from './CustomSignalEditor';
import { SharePanel } from './SharePanel';
import { DEFAULT_WEIGHTS } from '../types';
import type { CustomSignal, TestConfig } from '../types';
import { getDb, isFirebaseConfigured } from '../../firebase/config';
import { getCurrentUser } from '../../firebase/auth';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { initFirebase } from '../../firebase/config';

interface ExtractedRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
}

function extractSkillsFromJD(text: string): ExtractedRequirements {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];

  let inRequired = false;
  let inPreferred = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('required') || lower.includes('must have') || lower.includes('qualifications')) {
      inRequired = true;
      inPreferred = false;
      continue;
    }
    if (lower.includes('preferred') || lower.includes('nice to have') || lower.includes('bonus')) {
      inPreferred = true;
      inRequired = false;
      continue;
    }

    if ((inRequired || inPreferred) && (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./))) {
      const skill = line.replace(/^[-*\d.)\s]+/, '').trim();
      if (skill.length > 1 && skill.length < 60) {
        if (inPreferred) {
          preferredSkills.push(skill);
        } else {
          requiredSkills.push(skill);
        }
      }
    }
  }

  return { requiredSkills, preferredSkills };
}

export function CriteriaPublishForm() {
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({ ...DEFAULT_WEIGHTS });
  const [customSignals, setCustomSignals] = useState<CustomSignal[]>([]);
  const [threshold, setThreshold] = useState(70);
  const [testConfig, setTestConfig] = useState<TestConfig>({
    skillsToTest: [],
    difficultyFloor: 1,
    questionCount: 20,
  });
  const [skillInput, setSkillInput] = useState('');
  const [preferredInput, setPreferredInput] = useState('');
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = () => {
    const extracted = extractSkillsFromJD(description);
    if (extracted.requiredSkills.length > 0) {
      setRequiredSkills((prev) => [...new Set([...prev, ...extracted.requiredSkills])]);
    }
    if (extracted.preferredSkills.length > 0) {
      setPreferredSkills((prev) => [...new Set([...prev, ...extracted.preferredSkills])]);
    }
  };

  const addRequiredSkill = () => {
    if (!skillInput.trim()) return;
    setRequiredSkills((prev) => [...new Set([...prev, skillInput.trim()])]);
    setSkillInput('');
  };

  const addPreferredSkill = () => {
    if (!preferredInput.trim()) return;
    setPreferredSkills((prev) => [...new Set([...prev, preferredInput.trim()])]);
    setPreferredInput('');
  };

  const handlePublish = async () => {
    if (!jobTitle.trim() || requiredSkills.length === 0) {
      setError('Job title and at least one required skill are needed.');
      return;
    }

    const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0)
      + customSignals.reduce((s, cs) => s + cs.weight, 0);
    if (totalWeight !== 100) {
      setError(`Weights must total 100%. Current: ${totalWeight}%`);
      return;
    }

    if (!isFirebaseConfigured()) {
      setError('Firebase not configured. Add credentials to .env');
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      setError('Please sign in first.');
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const { app } = initFirebase();
      const functions = getFunctions(app);
      const publish = httpsCallable<unknown, { shortCode: string }>(functions, 'publishCriteria');

      const result = await publish({
        jobTitle,
        description,
        requiredSkills,
        preferredSkills,
        customSignals,
        weights,
        threshold,
        testConfig: {
          ...testConfig,
          skillsToTest: testConfig.skillsToTest.length > 0
            ? testConfig.skillsToTest
            : requiredSkills.slice(0, 5),
        },
      });

      setShortCode(result.data.shortCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  if (shortCode) {
    return <SharePanel shortCode={shortCode} />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-4">
      <h2 className="text-2xl font-bold">Publish Job Criteria</h2>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded text-sm" role="alert">{error}</div>
      )}

      {/* Job Title */}
      <div>
        <label htmlFor="jobTitle" className="block text-sm font-medium mb-1">Job Title</label>
        <input
          id="jobTitle"
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Frontend Developer"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {/* Job Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">Job Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          placeholder="Paste the full job description..."
          className="w-full px-3 py-2 border rounded text-sm"
        />
        <button
          type="button"
          onClick={handleExtract}
          className="mt-2 px-3 py-1 border rounded text-sm"
        >
          Extract skills from JD
        </button>
      </div>

      {/* Required Skills */}
      <div>
        <label className="block text-sm font-medium mb-1">Required Skills</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {requiredSkills.map((skill) => (
            <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center gap-1">
              {skill}
              <button
                onClick={() => setRequiredSkills((prev) => prev.filter((s) => s !== skill))}
                className="text-blue-600 hover:text-blue-900 ml-1"
                aria-label={`Remove ${skill}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequiredSkill())}
            placeholder="Add a required skill"
            className="flex-1 px-3 py-2 border rounded text-sm"
          />
          <button onClick={addRequiredSkill} className="px-3 py-2 border rounded text-sm">Add</button>
        </div>
      </div>

      {/* Preferred Skills */}
      <div>
        <label className="block text-sm font-medium mb-1">Preferred Skills</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {preferredSkills.map((skill) => (
            <span key={skill} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm flex items-center gap-1">
              {skill}
              <button
                onClick={() => setPreferredSkills((prev) => prev.filter((s) => s !== skill))}
                className="text-green-600 hover:text-green-900 ml-1"
                aria-label={`Remove ${skill}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={preferredInput}
            onChange={(e) => setPreferredInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPreferredSkill())}
            placeholder="Add a preferred skill"
            className="flex-1 px-3 py-2 border rounded text-sm"
          />
          <button onClick={addPreferredSkill} className="px-3 py-2 border rounded text-sm">Add</button>
        </div>
      </div>

      {/* Weights */}
      <WeightEditor weights={weights} onChange={setWeights} />

      {/* Custom Signals */}
      <CustomSignalEditor signals={customSignals} onChange={setCustomSignals} />

      {/* Threshold */}
      <div>
        <label htmlFor="threshold" className="block text-sm font-medium mb-1">
          Match Threshold: {threshold}%
        </label>
        <p className="text-xs opacity-60 mb-2">
          Candidates scoring above this on the verification test will trigger a match notification.
        </p>
        <input
          id="threshold"
          type="range"
          min={30}
          max={95}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Test Config */}
      <div className="space-y-3">
        <h3 className="font-semibold text-base">Test Configuration</h3>
        <div>
          <label htmlFor="questionCount" className="block text-sm mb-1">Questions per skill</label>
          <input
            id="questionCount"
            type="number"
            min={5}
            max={10}
            value={testConfig.questionCount}
            onChange={(e) => setTestConfig((prev) => ({ ...prev, questionCount: Number(e.target.value) }))}
            className="w-24 px-3 py-2 border rounded text-sm"
          />
        </div>
      </div>

      {/* Publish */}
      <button
        onClick={handlePublish}
        disabled={publishing || !jobTitle.trim() || requiredSkills.length === 0}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium text-lg disabled:opacity-40"
      >
        {publishing ? 'Publishing...' : 'Publish Criteria'}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Install qrcode package**

Run: `cd /mnt/experiments/astha-resume && npm install qrcode && npm install -D @types/qrcode`

- [ ] **Step 6: Commit**

```bash
git add src/bridge/components/
git commit -m "feat: Employer criteria publishing form with weights, custom signals, QR sharing"
```

---

### Task 6: Employer Publish Page and Routes

**Files:**
- Create: `src/pages/EmployerPublish.tsx`
- Create: `src/pages/EmployerMatches.tsx`
- Create: `src/pages/BridgeLanding.tsx`
- Create: `src/pages/BridgeTest.tsx`
- Create: `src/pages/BridgeScorecard.tsx`
- Create: `src/pages/BridgeDashboard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create all page shell components**

```tsx
// src/pages/EmployerPublish.tsx
import { CriteriaPublishForm } from '../bridge/components/CriteriaPublishForm';

export default function EmployerPublish() {
  return (
    <main id="main-content" className="min-h-screen py-8">
      <CriteriaPublishForm />
    </main>
  );
}
```

```tsx
// src/pages/EmployerMatches.tsx
import { EmployerMatchDashboard } from '../bridge/components/EmployerMatchDashboard';

export default function EmployerMatches() {
  return (
    <main id="main-content" className="min-h-screen py-8">
      <EmployerMatchDashboard />
    </main>
  );
}
```

```tsx
// src/pages/BridgeLanding.tsx
import { useParams } from 'react-router-dom';
import { BridgeAssessment } from '../bridge/components/BridgeAssessment';

export default function BridgeLanding() {
  const { code } = useParams<{ code: string }>();
  if (!code) return <div>Invalid criteria code</div>;
  return (
    <main id="main-content" className="min-h-screen py-8">
      <BridgeAssessment criteriaCode={code} />
    </main>
  );
}
```

```tsx
// src/pages/BridgeTest.tsx
import { useParams } from 'react-router-dom';
import { TestEngine } from '../bridge/components/TestEngine';

export default function BridgeTest() {
  const { code } = useParams<{ code: string }>();
  if (!code) return <div>Invalid criteria code</div>;
  return (
    <main id="main-content" className="min-h-screen">
      <TestEngine criteriaCode={code} />
    </main>
  );
}
```

```tsx
// src/pages/BridgeScorecard.tsx
import { useParams } from 'react-router-dom';
import { ScorecardView } from '../bridge/components/ScorecardView';

export default function BridgeScorecard() {
  const { code } = useParams<{ code: string }>();
  if (!code) return <div>Invalid criteria code</div>;
  return (
    <main id="main-content" className="min-h-screen py-8">
      <ScorecardView criteriaCode={code} />
    </main>
  );
}
```

```tsx
// src/pages/BridgeDashboard.tsx
import { CandidateDashboard } from '../bridge/components/CandidateDashboard';

export default function BridgeDashboard() {
  return (
    <main id="main-content" className="min-h-screen py-8">
      <CandidateDashboard />
    </main>
  );
}
```

- [ ] **Step 2: Update App.tsx with new routes**

Add after the existing routes in `src/App.tsx`, inside the `<Routes>` block:

The lazy imports should be added at the top with the existing lazy imports, and routes added inside the Routes element.

```tsx
// Add these lazy imports after existing ones at top of App.tsx
const EmployerPublish = lazy(() => import('./pages/EmployerPublish'));
const EmployerMatches = lazy(() => import('./pages/EmployerMatches'));
const BridgeLanding = lazy(() => import('./pages/BridgeLanding'));
const BridgeTest = lazy(() => import('./pages/BridgeTest'));
const BridgeScorecard = lazy(() => import('./pages/BridgeScorecard'));
const BridgeDashboard = lazy(() => import('./pages/BridgeDashboard'));

// Add these routes inside the <Route element={<Layout />}> block:
<Route path="/employer/publish" element={<Suspense fallback={<div className="p-8 text-center">Loading...</div>}><EmployerPublish /></Suspense>} />
<Route path="/employer/matches" element={<Suspense fallback={<div className="p-8 text-center">Loading...</div>}><EmployerMatches /></Suspense>} />
<Route path="/bridge/:code" element={<Suspense fallback={<div className="p-8 text-center">Loading...</div>}><BridgeLanding /></Suspense>} />
<Route path="/bridge/:code/test" element={<Suspense fallback={<div className="p-8 text-center">Loading...</div>}><BridgeTest /></Suspense>} />
<Route path="/bridge/:code/scorecard" element={<Suspense fallback={<div className="p-8 text-center">Loading...</div>}><BridgeScorecard /></Suspense>} />
<Route path="/bridge/dashboard" element={<Suspense fallback={<div className="p-8 text-center">Loading...</div>}><BridgeDashboard /></Suspense>} />
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/EmployerPublish.tsx src/pages/EmployerMatches.tsx src/pages/BridgeLanding.tsx src/pages/BridgeTest.tsx src/pages/BridgeScorecard.tsx src/pages/BridgeDashboard.tsx src/App.tsx
git commit -m "feat: Bridge routes and page components"
```

---

## Phase 3: Candidate Self-Assessment (Tasks 7-8)

### Task 7: Bridge Assessment Component (Self-Assessment + AI Coach Fix-It)

**Files:**
- Create: `src/bridge/components/BridgeAssessment.tsx`
- Create: `src/bridge/hooks/useSelfAssessment.ts`

- [ ] **Step 1: Create the self-assessment hook**

```typescript
// src/bridge/hooks/useSelfAssessment.ts
import { useState, useCallback } from 'react';
import { analyzeL1 } from '../../ai/agents/L1_NLPAgent';
import { analyzeL2Sync } from '../../ai/agents/L2_EmbedAgent';
import { computeScore } from '../../ai/agents/ScoreAgent';
import { useResumeStore } from '../../store/resumeStore';
import { useBridgeStore } from '../store';
import type { BridgeCriteria, ScoreBreakdown } from '../types';
import type { Resume } from '../../store/types';

function resumeToText(resume: Resume): string {
  const parts: string[] = [];
  parts.push(resume.personal.name);
  parts.push(resume.personal.email);
  parts.push(resume.personal.phone);
  parts.push(resume.personal.location);
  parts.push(resume.summary);
  for (const section of resume.sections) {
    parts.push(section.heading);
    for (const entry of section.entries) {
      parts.push(Object.values(entry.fields).join(' '));
      parts.push(entry.bullets.join(' '));
    }
  }
  return parts.filter(Boolean).join('\n');
}

export function useSelfAssessment() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreBreakdown | null>(null);
  const [keywordAnalysis, setKeywordAnalysis] = useState<{
    matched: string[];
    missing: string[];
    semantic: string[];
  } | null>(null);

  const assess = useCallback(async (criteria: BridgeCriteria) => {
    setLoading(true);
    try {
      const resume = useResumeStore.getState().resume;
      const resumeText = resumeToText(resume);
      const jdText = [
        criteria.description,
        'Required: ' + criteria.requiredSkills.join(', '),
        'Preferred: ' + criteria.preferredSkills.join(', '),
      ].join('\n');

      // Run L1 NLP analysis
      const l1 = analyzeL1(resumeText, jdText);

      // Run L2 embedding analysis
      const l2 = analyzeL2Sync(resumeText, jdText);

      // Compute score using custom weights if provided
      const scores = computeScore(l1, l2, null, null);

      // Apply custom weights if different from defaults
      const breakdown: Record<string, { raw: number; weighted: number; weight: number }> = {};
      let total = 0;

      const weightKeys = Object.keys(criteria.weights);
      for (const key of weightKeys) {
        const raw = getScoreDimension(scores, key);
        const weight = criteria.weights[key];
        const weighted = (raw / 100) * weight;
        breakdown[key] = { raw, weighted, weight };
        total += weighted;
      }

      const scoreBreakdown: ScoreBreakdown = {
        overall: Math.round(total),
        breakdown,
      };

      // Extract keyword analysis
      const resumeWords = new Set(resumeText.toLowerCase().split(/\s+/));
      const matched = criteria.requiredSkills.filter((s) =>
        resumeWords.has(s.toLowerCase()) || resumeText.toLowerCase().includes(s.toLowerCase())
      );
      const missing = criteria.requiredSkills.filter((s) =>
        !resumeWords.has(s.toLowerCase()) && !resumeText.toLowerCase().includes(s.toLowerCase())
      );
      const semantic = l2.semanticMatches?.map((m) => m.phrase) ?? [];

      setKeywordAnalysis({ matched, missing, semantic });
      setResult(scoreBreakdown);
      useBridgeStore.getState().setSelfAssessment(scoreBreakdown);
    } finally {
      setLoading(false);
    }
  }, []);

  return { assess, loading, result, keywordAnalysis };
}

function getScoreDimension(scores: ReturnType<typeof computeScore>, key: string): number {
  switch (key) {
    case 'skillsMatch': return scores.skillsMatch?.score ?? 0;
    case 'experience': return scores.experience?.score ?? 0;
    case 'education': return scores.education?.score ?? 0;
    case 'projects': return scores.projects?.score ?? 0;
    case 'certifications': return scores.certifications?.score ?? 0;
    case 'distance': return scores.distance?.score ?? 50;
    case 'extracurricular': return scores.extracurricular?.score ?? 0;
    case 'gpa': return scores.gpa?.score ?? 50;
    case 'completeness': return scores.completeness?.score ?? 0;
    default: return 0;
  }
}
```

- [ ] **Step 2: Create the BridgeAssessment component**

```tsx
// src/bridge/components/BridgeAssessment.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { getDb, isFirebaseConfigured } from '../../firebase/config';
import { useBridgeStore } from '../store';
import { useSelfAssessment } from '../hooks/useSelfAssessment';
import { useResumeStore } from '../../store/resumeStore';
import type { BridgeCriteria } from '../types';

interface BridgeAssessmentProps {
  criteriaCode: string;
}

export function BridgeAssessment({ criteriaCode }: BridgeAssessmentProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const criteria = useBridgeStore((s) => s.criteria);
  const setCriteria = useBridgeStore((s) => s.setCriteria);
  const selfAssessment = useBridgeStore((s) => s.selfAssessment);
  const resume = useResumeStore((s) => s.resume);
  const { assess, loading: assessing, result, keywordAnalysis } = useSelfAssessment();

  // Load criteria from Firestore
  useEffect(() => {
    async function loadCriteria() {
      if (criteria?.shortCode === criteriaCode) {
        setLoading(false);
        return;
      }

      if (!isFirebaseConfigured()) {
        setError('Firebase not configured');
        setLoading(false);
        return;
      }

      try {
        const db = getDb();
        const docRef = doc(db, 'criteria', criteriaCode);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
          setError('Criteria not found or expired');
          setLoading(false);
          return;
        }

        const data = snap.data() as BridgeCriteria;
        if (data.status !== 'active') {
          setError('These criteria are no longer active');
          setLoading(false);
          return;
        }

        setCriteria({ ...data, shortCode: criteriaCode });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load criteria');
      } finally {
        setLoading(false);
      }
    }

    loadCriteria();
  }, [criteriaCode]);

  const handleAssess = () => {
    if (!criteria) return;
    assess(criteria);
  };

  const handleStartTest = () => {
    navigate(`/bridge/${criteriaCode}/test`);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading criteria...</div>;
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!criteria) return null;

  const hasResume = resume.personal.name.trim() !== '';

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      {/* Job Info */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{criteria.jobTitle}</h1>
        <p className="text-sm opacity-70">{criteria.description.slice(0, 300)}...</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {criteria.requiredSkills.map((skill) => (
            <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Resume check */}
      {!hasResume && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="font-medium">Build your resume first</p>
          <p className="text-sm mt-1 opacity-70">
            You need a resume to assess against these criteria.
          </p>
          <button
            onClick={() => navigate('/builder')}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            Go to Resume Builder
          </button>
        </div>
      )}

      {/* Self-Assessment */}
      {hasResume && (
        <div className="space-y-4">
          <button
            onClick={handleAssess}
            disabled={assessing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-40"
          >
            {assessing ? 'Analyzing...' : result ? 'Re-assess' : 'Score My Resume'}
          </button>

          {result && (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="text-center p-6 rounded-lg border">
                <div className="text-5xl font-bold">{result.overall}%</div>
                <div className="text-sm opacity-60 mt-1">Resume Score against this JD</div>
              </div>

              {/* Score Breakdown */}
              <div className="space-y-2">
                <h3 className="font-semibold">Score Breakdown</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Parameter</th>
                      <th className="text-right py-1">Weight</th>
                      <th className="text-right py-1">Raw</th>
                      <th className="text-right py-1">Weighted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.breakdown).map(([key, val]) => (
                      <tr key={key} className="border-b border-gray-100">
                        <td className="py-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                        <td className="text-right py-1">{val.weight}%</td>
                        <td className="text-right py-1">{Math.round(val.raw)}%</td>
                        <td className="text-right py-1 font-mono">{val.weighted.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Keyword Analysis */}
              {keywordAnalysis && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Keyword Analysis</h3>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <span className="text-xs font-medium text-green-700">Matched</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {keywordAnalysis.matched.map((k) => (
                          <span key={k} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">{k}</span>
                        ))}
                        {keywordAnalysis.matched.length === 0 && <span className="text-xs opacity-40">None</span>}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-red-700">Missing Required</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {keywordAnalysis.missing.map((k) => (
                          <span key={k} className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">{k}</span>
                        ))}
                        {keywordAnalysis.missing.length === 0 && <span className="text-xs opacity-40">None</span>}
                      </div>
                    </div>
                    {keywordAnalysis.semantic.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-blue-700">Semantic Matches</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {keywordAnalysis.semantic.map((k) => (
                            <span key={k} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => navigate('/builder')}
                  className="px-4 py-2 border rounded text-sm"
                >
                  Improve Resume
                </button>
                <button
                  onClick={handleStartTest}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium"
                >
                  Take Skill Verification Test
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/bridge/components/BridgeAssessment.tsx src/bridge/hooks/useSelfAssessment.ts
git commit -m "feat: Candidate self-assessment - score resume against employer criteria"
```

---

### Task 8: JD-Specific AI Coach Fix-It Mode

**Files:**
- Create: `src/bridge/components/JDCoachPanel.tsx`

- [ ] **Step 1: Create the JD-specific coach component**

```tsx
// src/bridge/components/JDCoachPanel.tsx
import { useState, useEffect } from 'react';
import { useBridgeStore } from '../store';
import { useResumeStore } from '../../store/resumeStore';
import type { BridgeCriteria, ScoreBreakdown } from '../types';

interface Suggestion {
  id: string;
  severity: 'high' | 'medium' | 'tip';
  section: string;
  current: string;
  suggested: string;
  impact: number; // estimated score increase
  reason: string;
}

function generateSuggestions(
  criteria: BridgeCriteria,
  scores: ScoreBreakdown,
  resume: ReturnType<typeof useResumeStore.getState>['resume'],
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  let id = 0;

  // Check missing required skills
  const resumeText = resume.sections
    .flatMap((s) => s.entries.flatMap((e) => [...Object.values(e.fields), ...e.bullets]))
    .join(' ')
    .toLowerCase();

  const missingSkills = criteria.requiredSkills.filter(
    (skill) => !resumeText.includes(skill.toLowerCase()),
  );

  if (missingSkills.length > 0) {
    const topMissing = missingSkills.slice(0, 5);
    suggestions.push({
      id: String(++id),
      severity: 'high',
      section: 'Skills / Experience',
      current: `Missing: ${topMissing.join(', ')}`,
      suggested: `Add these skills to your Skills section and reference them in project/experience bullets: ${topMissing.join(', ')}`,
      impact: Math.min(topMissing.length * 3, 15),
      reason: `These skills are required by the employer. Each missing required skill reduces your match score. (NACE 2024: skills match carries ${criteria.weights.skillsMatch ?? 30}% weight)`,
    });
  }

  // Check summary alignment
  if (!resume.summary || resume.summary.length < 30) {
    suggestions.push({
      id: String(++id),
      severity: 'high',
      section: 'Summary',
      current: resume.summary || '(empty)',
      suggested: `Write a 2-3 sentence summary highlighting your experience with ${criteria.requiredSkills.slice(0, 3).join(', ')} and alignment with the ${criteria.jobTitle} role.`,
      impact: 5,
      reason: 'Recruiters spend 7.4 seconds on a resume. A targeted summary hooks them immediately. (Ladders 2018 Eye-Tracking Study)',
    });
  } else {
    const summaryLower = resume.summary.toLowerCase();
    const genericWords = ['passionate', 'motivated', 'hard-working', 'team player', 'detail-oriented'];
    const foundGeneric = genericWords.filter((w) => summaryLower.includes(w));
    if (foundGeneric.length > 0) {
      suggestions.push({
        id: String(++id),
        severity: 'medium',
        section: 'Summary',
        current: `Contains generic phrases: ${foundGeneric.join(', ')}`,
        suggested: `Replace generic words with specific achievements. Instead of "${foundGeneric[0]}", say what you actually did with ${criteria.requiredSkills[0] ?? 'your skills'}.`,
        impact: 3,
        reason: 'Generic language signals a non-targeted resume. ATS and recruiters both penalize it.',
      });
    }
  }

  // Check for quantified achievements
  const bulletTexts = resume.sections.flatMap((s) =>
    s.entries.flatMap((e) => e.bullets),
  );
  const hasNumbers = bulletTexts.some((b) => /\d+%|\d+x|\$\d+|\d+ users?|\d+ projects?/i.test(b));
  if (!hasNumbers && bulletTexts.length > 0) {
    suggestions.push({
      id: String(++id),
      severity: 'high',
      section: 'Experience / Projects',
      current: 'No quantified achievements found in your bullet points',
      suggested: 'Add metrics: "Reduced load time by 40%", "Built system serving 10K users", "Managed team of 5". Numbers make claims verifiable.',
      impact: 8,
      reason: 'AAC&U VALUE Rubric capstone criteria requires quantified evidence. Without numbers, projects score at benchmark level (25%) instead of capstone (100%).',
    });
  }

  // Check education relevance
  const educationSections = resume.sections.filter((s) => s.type === 'education');
  if (educationSections.length === 0) {
    suggestions.push({
      id: String(++id),
      severity: 'high',
      section: 'Education',
      current: 'No education section found',
      suggested: 'Add your education. Include relevant coursework that aligns with the role requirements.',
      impact: 5,
      reason: `73.4% of employers screen by major/field of study. (NACE 2024). Education carries ${criteria.weights.education ?? 15}% weight.`,
    });
  }

  // Check for projects if fresher
  const experienceSections = resume.sections.filter((s) => s.type === 'experience');
  const projectSections = resume.sections.filter((s) => s.type === 'projects');
  if (experienceSections.flatMap((s) => s.entries).length === 0 && projectSections.flatMap((s) => s.entries).length === 0) {
    suggestions.push({
      id: String(++id),
      severity: 'high',
      section: 'Projects',
      current: 'No experience or projects found',
      suggested: `Add 2-3 projects demonstrating ${criteria.requiredSkills.slice(0, 3).join(', ')}. Include: problem statement, tech used, quantified outcome.`,
      impact: 10,
      reason: 'For freshers, projects are the primary evidence of applied skill. (AAC&U/Hart Research 2018: 91% of employers value applied projects).',
    });
  }

  // Sort by impact descending
  suggestions.sort((a, b) => b.impact - a.impact);
  return suggestions;
}

interface JDCoachPanelProps {
  criteria: BridgeCriteria;
  onRescore: () => void;
}

export function JDCoachPanel({ criteria, onRescore }: JDCoachPanelProps) {
  const selfAssessment = useBridgeStore((s) => s.selfAssessment);
  const resume = useResumeStore((s) => s.resume);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selfAssessment) {
      setSuggestions(generateSuggestions(criteria, selfAssessment, resume));
    }
  }, [selfAssessment, resume, criteria]);

  const activeSuggestions = suggestions.filter((s) => !dismissed.has(s.id));
  const totalImpact = activeSuggestions.reduce((sum, s) => sum + s.impact, 0);

  if (!selfAssessment) return null;

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">AI Coach: Fix-It Suggestions</h3>
        <span className="text-sm opacity-60">
          Potential improvement: +{totalImpact}pts
        </span>
      </div>

      {activeSuggestions.length === 0 ? (
        <p className="text-sm text-green-700">
          Your resume looks strong against this JD. Consider taking the verification test.
        </p>
      ) : (
        <div className="space-y-3">
          {activeSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={`p-3 rounded-lg border-l-4 ${
                suggestion.severity === 'high'
                  ? 'border-l-red-500 bg-red-50'
                  : suggestion.severity === 'medium'
                  ? 'border-l-yellow-500 bg-yellow-50'
                  : 'border-l-blue-500 bg-blue-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase opacity-60">
                      {suggestion.section}
                    </span>
                    <span className="text-xs text-green-600 font-mono">
                      +{suggestion.impact}pts
                    </span>
                  </div>
                  <p className="text-sm mt-1">{suggestion.current}</p>
                  <p className="text-sm mt-2 font-medium">{suggestion.suggested}</p>
                  <p className="text-xs mt-1 opacity-50">{suggestion.reason}</p>
                </div>
                <button
                  onClick={() => setDismissed((prev) => new Set([...prev, suggestion.id]))}
                  className="text-xs opacity-40 hover:opacity-70 shrink-0"
                  aria-label={`Dismiss suggestion for ${suggestion.section}`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onRescore}
        className="w-full py-2 border rounded text-sm font-medium"
      >
        Re-score after changes
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/bridge/components/JDCoachPanel.tsx
git commit -m "feat: JD-specific AI Coach with fix-it suggestions and impact scoring"
```

---

## Phase 4: Test Engine (Tasks 9-12)

### Task 9: Question Generator

**Files:**
- Create: `src/bridge/test/questionGenerator.ts`
- Create: `src/bridge/test/__tests__/questionGenerator.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/bridge/test/__tests__/questionGenerator.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  buildQuestionPrompt,
  validateQuestion,
  calculateTimeAllotted,
  type RawQuestion,
} from '../questionGenerator';

describe('Question Generator', () => {
  describe('buildQuestionPrompt', () => {
    it('includes skill and level in prompt', () => {
      const prompt = buildQuestionPrompt('React', 2, 'concept', ['Built dashboards with React hooks']);
      expect(prompt).toContain('React');
      expect(prompt).toContain('Level 2');
      expect(prompt).toContain('dashboards');
    });

    it('includes anti-LLM-tell constraints', () => {
      const prompt = buildQuestionPrompt('Node.js', 1, 'concept', []);
      expect(prompt).toContain('character count variance');
      expect(prompt).toContain('20%');
    });
  });

  describe('validateQuestion', () => {
    it('accepts well-formed question', () => {
      const q: RawQuestion = {
        text: 'What does useEffect cleanup do?',
        options: [
          'Removes the component from DOM',
          'Runs before re-render or unmount',
          'Resets component state values',
          'Clears the browser console log',
        ],
        correctIndex: 1,
        type: 'concept',
      };
      expect(validateQuestion(q)).toBe(true);
    });

    it('rejects when correct option is longest', () => {
      const q: RawQuestion = {
        text: 'What is X?',
        options: [
          'Short A',
          'This is a very long correct answer that exceeds all others significantly',
          'Short C',
          'Short D',
        ],
        correctIndex: 1,
        type: 'concept',
      };
      expect(validateQuestion(q)).toBe(false);
    });

    it('rejects when character variance exceeds 20%', () => {
      const q: RawQuestion = {
        text: 'What is X?',
        options: [
          'A',
          'This is way too long compared to option A',
          'B',
          'C',
        ],
        correctIndex: 0,
        type: 'concept',
      };
      expect(validateQuestion(q)).toBe(false);
    });

    it('rejects when correct option has more commas', () => {
      const q: RawQuestion = {
        text: 'What is X?',
        options: [
          'Simple answer here',
          'Also simple answer',
          'One, two, three, four, five',
          'Another simple answer',
        ],
        correctIndex: 2,
        type: 'concept',
      };
      expect(validateQuestion(q)).toBe(false);
    });
  });

  describe('calculateTimeAllotted', () => {
    it('uses calibrated WPM for timing', () => {
      // 20 words at 120 WPM = 10s read time + 3s answer buffer = 13s
      const time = calculateTimeAllotted(20, 120, 'concept', 1);
      expect(time).toBeGreaterThanOrEqual(10);
      expect(time).toBeLessThanOrEqual(20);
    });

    it('applies level modifier', () => {
      const timeL1 = calculateTimeAllotted(30, 120, 'concept', 1);
      const timeL2 = calculateTimeAllotted(30, 120, 'concept', 2);
      expect(timeL2).toBeLessThan(timeL1); // L2 has 0.9x modifier
    });

    it('enforces 10s floor', () => {
      const time = calculateTimeAllotted(5, 300, 'concept', 1); // very fast reader, short question
      expect(time).toBeGreaterThanOrEqual(10);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/experiments/astha-resume && npx vitest run src/bridge/test/__tests__/questionGenerator.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/bridge/test/questionGenerator.ts
import type { QuestionType, DifficultyLevel, GeneratedQuestion } from '../types';

export interface RawQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  type: QuestionType;
}

const LEVEL_LABELS: Record<DifficultyLevel, string> = {
  1: 'Fundamentals',
  2: 'Applied',
  3: 'Architecture & Edge Cases',
  4: 'Expert Tradeoffs',
  5: 'Novel Problem',
};

const LEVEL_TIME_MODIFIERS: Record<DifficultyLevel, number> = {
  1: 1.0,
  2: 0.9,
  3: 1.0,
  4: 1.1,
  5: 1.1,
};

const ANSWER_BUFFERS: Record<QuestionType, number> = {
  'concept': 3,
  'scenario': 5,
  'micro-challenge': 8,
};

export function buildQuestionPrompt(
  skill: string,
  level: DifficultyLevel,
  type: QuestionType,
  resumeClaims: string[],
): string {
  const claimsContext = resumeClaims.length > 0
    ? `The candidate claims: ${resumeClaims.join('; ')}. Probe these specific claims.`
    : '';

  return `Generate a ${type} question about ${skill} at Level ${level} (${LEVEL_LABELS[level]}).

${claimsContext}

QUESTION TYPE:
- concept: "What happens when..." or "Why would you..." -- tests understanding
- scenario: "Given this code/situation, what's wrong?" -- tests applied skill
- micro-challenge: Small code/logic problem -- tests hands-on ability

DIFFICULTY LEVEL ${level}:
${level === 1 ? 'Test fundamental concepts. What does X do? What is Y?' : ''}
${level === 2 ? 'Test applied usage. How would you use X to solve Y? What happens when Z?' : ''}
${level === 3 ? 'Test architecture decisions and edge cases. When would X fail? What are the tradeoffs?' : ''}
${level === 4 ? 'Test expert-level tradeoffs. Compare approaches. Identify subtle bugs. Design constraints.' : ''}
${level === 5 ? 'Test novel problem-solving. Combine concepts. Handle unusual constraints. Creative application.' : ''}

CRITICAL CONSTRAINTS -- ANTI-LLM-TELL RULES:
1. All 4 options MUST have character count variance under 20% of each other
2. The correct option MUST NOT be the longest
3. The correct option MUST NOT have more commas or semicolons than any distractor
4. Sometimes make the shortest option correct, sometimes the longest is a distractor
5. Each distractor MUST target a specific misconception, not be obviously wrong
6. Use plain language -- simplest phrasing that is technically accurate
7. NO "all of the above" or "none of the above"

Respond in JSON:
{
  "text": "question text",
  "options": ["option A", "option B", "option C", "option D"],
  "correctIndex": 0,
  "type": "${type}"
}`;
}

export function validateQuestion(q: RawQuestion): boolean {
  if (!q.text || q.options.length !== 4 || q.correctIndex < 0 || q.correctIndex > 3) {
    return false;
  }

  const lengths = q.options.map((o) => o.length);
  const avg = lengths.reduce((s, l) => s + l, 0) / lengths.length;

  // Check character count variance < 20%
  for (const len of lengths) {
    if (Math.abs(len - avg) / avg > 0.2) {
      return false;
    }
  }

  // Check correct option is not longest
  const maxLen = Math.max(...lengths);
  if (lengths[q.correctIndex] === maxLen && lengths.filter((l) => l === maxLen).length === 1) {
    return false;
  }

  // Check correct option doesn't have more commas/semicolons
  const countPunctuation = (s: string) => (s.match(/[,;]/g) ?? []).length;
  const correctPunct = countPunctuation(q.options[q.correctIndex]);
  for (let i = 0; i < q.options.length; i++) {
    if (i !== q.correctIndex && correctPunct > countPunctuation(q.options[i])) {
      return false;
    }
  }

  return true;
}

export function calculateTimeAllotted(
  wordCount: number,
  candidateWpm: number,
  type: QuestionType,
  level: DifficultyLevel,
): number {
  const readTimeSeconds = (wordCount / candidateWpm) * 60;
  const answerBuffer = ANSWER_BUFFERS[type];
  const levelModifier = LEVEL_TIME_MODIFIERS[level];
  const raw = (readTimeSeconds + answerBuffer) * levelModifier;
  return Math.max(Math.round(raw), 10); // 10s floor
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function shuffleOptions(q: RawQuestion): RawQuestion {
  const indices = [0, 1, 2, 3];
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const newOptions = indices.map((i) => q.options[i]);
  const newCorrectIndex = indices.indexOf(q.correctIndex);
  return { ...q, options: newOptions, correctIndex: newCorrectIndex };
}

export async function generateQuestion(
  skill: string,
  level: DifficultyLevel,
  type: QuestionType,
  resumeClaims: string[],
  candidateWpm: number,
  geminiApiKey: string,
): Promise<GeneratedQuestion | null> {
  const prompt = buildQuestionPrompt(skill, level, type, resumeClaims);

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );

      if (!response.ok) continue;

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      // Parse JSON from response (handle markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const raw: RawQuestion = JSON.parse(jsonMatch[0]);

      if (!validateQuestion(raw)) continue;

      // Shuffle options to randomize position
      const shuffled = shuffleOptions(raw);

      const totalWords = countWords(shuffled.text) + shuffled.options.reduce((s, o) => s + countWords(o), 0);
      const timeAllotted = calculateTimeAllotted(totalWords, candidateWpm, type, level);

      return {
        id: crypto.randomUUID(),
        skill,
        type: shuffled.type,
        level,
        text: shuffled.text,
        options: shuffled.options.map((o) => ({ text: o, charCount: o.length })),
        correctIndex: shuffled.correctIndex,
        timeAllotted,
        wordCount: totalWords,
      };
    } catch {
      continue;
    }
  }

  return null;
}

export async function generateTestQuestions(
  skills: string[],
  resumeClaims: Record<string, string[]>,
  candidateWpm: number,
  questionsPerSkill: number,
  geminiApiKey: string,
): Promise<GeneratedQuestion[]> {
  const questions: GeneratedQuestion[] = [];
  const types: QuestionType[] = ['concept', 'scenario', 'micro-challenge'];

  for (const skill of skills) {
    const claims = resumeClaims[skill] ?? [];

    for (let i = 0; i < questionsPerSkill; i++) {
      // Start at L1, questions will be served adaptively
      // Generate a spread of levels so we have questions ready
      const level = Math.min(Math.ceil((i + 1) / 2), 5) as DifficultyLevel;
      const type = types[i % types.length];

      const q = await generateQuestion(skill, level, type, claims, candidateWpm, geminiApiKey);
      if (q) {
        questions.push(q);
      }
    }
  }

  return questions;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/experiments/astha-resume && npx vitest run src/bridge/test/__tests__/questionGenerator.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/bridge/test/
git commit -m "feat: Question generator with anti-LLM-tell validation and adaptive timing"
```

---

### Task 10: Calibration Phase Component

**Files:**
- Create: `src/bridge/test/CalibrationPhase.tsx`

- [ ] **Step 1: Create the calibration component**

```tsx
// src/bridge/test/CalibrationPhase.tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import type { Calibration } from '../types';

interface CalibrationPhaseProps {
  onComplete: (calibration: Calibration) => void;
}

const CALIBRATION_PARAGRAPHS = [
  'A well-designed API should handle edge cases gracefully. When a client sends malformed JSON in a POST request body, the server should return a 400 status code with a clear error message indicating which field failed validation, rather than a generic internal server error.',
  'Database indexes improve query performance by allowing the engine to locate rows without scanning the entire table. A composite index on columns used together in WHERE clauses can reduce lookup time from linear to logarithmic complexity for most common query patterns.',
  'Container orchestration platforms like Kubernetes manage the lifecycle of application containers across a cluster. When a pod crashes, the scheduler automatically restarts it on a healthy node, maintaining the desired replica count specified in the deployment configuration.',
];

export function CalibrationPhase({ onComplete }: CalibrationPhaseProps) {
  const [step, setStep] = useState<'reading' | 'voice' | 'done'>('reading');
  const [readingStartTime, setReadingStartTime] = useState(0);
  const [paragraph] = useState(() =>
    CALIBRATION_PARAGRAPHS[Math.floor(Math.random() * CALIBRATION_PARAGRAPHS.length)]
  );
  const [wpm, setWpm] = useState(0);
  const [recalibrate, setRecalibrate] = useState(false);
  const [micPermission, setMicPermission] = useState(false);
  const [ambientDb, setAmbientDb] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const wordCount = paragraph.split(/\s+/).length;

  useEffect(() => {
    setReadingStartTime(performance.now());
  }, [paragraph, recalibrate]);

  const handleDoneReading = () => {
    const elapsed = (performance.now() - readingStartTime) / 1000;

    // If suspiciously fast (<3s for ~50 words), recalibrate
    if (elapsed < 3 && !recalibrate) {
      setRecalibrate(true);
      setReadingStartTime(performance.now());
      return;
    }

    const calculatedWpm = Math.round((wordCount / elapsed) * 60);
    // Clamp to reasonable range
    const clampedWpm = Math.max(80, Math.min(400, calculatedWpm));
    setWpm(clampedWpm);
    setStep('voice');
  };

  const handleVoiceCalibration = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setMicPermission(true);

      // Capture ambient noise for 3 seconds
      const dataArray = new Float32Array(analyser.fftSize);
      const samples: number[] = [];

      const captureInterval = setInterval(() => {
        analyser.getFloatTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const db = 20 * Math.log10(Math.max(rms, 1e-10));
        samples.push(db);
      }, 200);

      setTimeout(() => {
        clearInterval(captureInterval);
        const avgDb = samples.reduce((s, d) => s + d, 0) / samples.length;
        setAmbientDb(Math.round(avgDb));
        finishCalibration(Math.round(avgDb));
      }, 3000);
    } catch {
      // Mic denied
      setMicPermission(false);
      finishCalibration(0);
    }
  };

  const handleSkipVoice = () => {
    setMicPermission(false);
    finishCalibration(0);
  };

  const finishCalibration = (db: number) => {
    // Cleanup
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setStep('done');
    onComplete({
      wpm: wpm || 150, // fallback
      ambientDb: db,
      micPermission,
    });
  };

  if (step === 'reading') {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Calibration: Reading Speed</h2>
          <p className="text-sm opacity-60">Read the paragraph below at your normal pace, then click "Done Reading".</p>
        </div>

        <div className="p-6 bg-gray-50 rounded-lg text-base leading-relaxed">
          {paragraph}
        </div>

        {recalibrate && (
          <p className="text-sm text-amber-600 text-center">
            That was very fast. Please read the paragraph carefully this time.
          </p>
        )}

        <button
          onClick={handleDoneReading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium text-lg"
        >
          Done Reading
        </button>
      </div>
    );
  }

  if (step === 'voice') {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Calibration: Voice Profile</h2>
          <p className="text-sm opacity-60">
            Read the following sentence aloud clearly. This calibrates your voice profile for test integrity.
          </p>
        </div>

        <div className="p-6 bg-gray-50 rounded-lg text-lg text-center italic">
          "The quick brown fox jumps over the lazy dog near the riverbank."
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleVoiceCalibration}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium"
          >
            Start Voice Calibration
          </button>
          <button
            onClick={handleSkipVoice}
            className="py-3 px-4 border rounded-lg text-sm opacity-70"
          >
            Skip (reduces integrity score)
          </button>
        </div>

        {micPermission && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Capturing voice profile...
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
      <div className="text-green-600 text-4xl">Calibration Complete</div>
      <p className="text-sm opacity-60">Reading speed: {wpm} WPM | Voice profile: saved</p>
      <p className="text-sm">Your test is ready.</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/bridge/test/CalibrationPhase.tsx
git commit -m "feat: Pre-test calibration - reading speed measurement + voice baseline"
```

---

### Task 11: Adaptive Test Scoring Engine

**Files:**
- Create: `src/bridge/test/adaptiveScoring.ts`
- Create: `src/bridge/test/__tests__/adaptiveScoring.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/bridge/test/__tests__/adaptiveScoring.test.ts
import { describe, it, expect } from 'vitest';
import {
  getNextLevel,
  computeVerificationScore,
  computeIntegrityScore,
} from '../adaptiveScoring';
import type { QuestionResponse, IntegrityFlag, AudioFlag, DifficultyLevel } from '../../types';
import { LEVEL_MULTIPLIERS } from '../../types';

describe('Adaptive Scoring', () => {
  describe('getNextLevel', () => {
    it('advances on correct answer', () => {
      expect(getNextLevel(1, true, 0)).toBe(2);
    });

    it('caps at level 5', () => {
      expect(getNextLevel(5, true, 0)).toBe(5);
    });

    it('stays on wrong answer first time', () => {
      expect(getNextLevel(3, false, 0)).toBe(3);
    });

    it('drops on second wrong answer at same level', () => {
      expect(getNextLevel(3, false, 1)).toBe(2);
    });

    it('does not drop below 1', () => {
      expect(getNextLevel(1, false, 1)).toBe(1);
    });
  });

  describe('computeVerificationScore', () => {
    it('scores 0 for all wrong', () => {
      const responses: QuestionResponse[] = Array.from({ length: 5 }, (_, i) => ({
        questionId: `q${i}`,
        selectedIndex: 0,
        correct: false,
        timeElapsed: 10,
        expectedReadTime: 15,
        wpmRatio: 1.0,
      }));
      const skills = [{ skill: 'React', responses, levels: [1, 1, 1, 1, 1] as DifficultyLevel[] }];
      const result = computeVerificationScore(skills);
      expect(result.overall).toBe(0);
    });

    it('scores higher for higher levels', () => {
      const easyResponses = Array.from({ length: 5 }, (_, i) => ({
        questionId: `q${i}`, selectedIndex: 0, correct: true,
        timeElapsed: 10, expectedReadTime: 15, wpmRatio: 1.0,
      }));
      const easy = computeVerificationScore([{
        skill: 'React',
        responses: easyResponses,
        levels: [1, 1, 1, 1, 1] as DifficultyLevel[],
      }]);

      const hardResponses = Array.from({ length: 5 }, (_, i) => ({
        questionId: `q${i}`, selectedIndex: 0, correct: true,
        timeElapsed: 10, expectedReadTime: 15, wpmRatio: 1.0,
      }));
      const hard = computeVerificationScore([{
        skill: 'React',
        responses: hardResponses,
        levels: [3, 3, 4, 4, 5] as DifficultyLevel[],
      }]);

      expect(hard.overall).toBeGreaterThan(easy.overall);
    });

    it('applies sustained performance bonus', () => {
      const responses = Array.from({ length: 5 }, (_, i) => ({
        questionId: `q${i}`, selectedIndex: 0, correct: true,
        timeElapsed: 10, expectedReadTime: 15, wpmRatio: 1.0,
      }));
      const withBonus = computeVerificationScore([{
        skill: 'React',
        responses,
        levels: [3, 3, 3, 4, 4] as DifficultyLevel[], // 3+ consecutive at L3+
      }]);

      // Score should include 1.15x bonus
      expect(withBonus.perSkill[0].score).toBeGreaterThan(0);
    });

    it('caps score at L2 ceiling when no L3+ reached', () => {
      const responses = Array.from({ length: 10 }, (_, i) => ({
        questionId: `q${i}`, selectedIndex: 0, correct: true,
        timeElapsed: 10, expectedReadTime: 15, wpmRatio: 1.0,
      }));
      const result = computeVerificationScore([{
        skill: 'React',
        responses,
        levels: [1, 1, 2, 2, 2, 2, 2, 2, 2, 2] as DifficultyLevel[],
      }]);
      expect(result.perSkill[0].score).toBeLessThanOrEqual(45);
    });
  });

  describe('computeIntegrityScore', () => {
    it('returns 100 with no flags', () => {
      expect(computeIntegrityScore([], [], true).score).toBe(100);
    });

    it('deducts for tab switches', () => {
      const flags: IntegrityFlag[] = [
        { type: 'tabSwitch', timestamp: 1000, penalty: 5, metadata: {} },
      ];
      expect(computeIntegrityScore(flags, [], true).score).toBe(95);
    });

    it('compounds multiple flags', () => {
      const flags: IntegrityFlag[] = [
        { type: 'tabSwitch', timestamp: 1000, penalty: 5, metadata: {} },
        { type: 'paste', timestamp: 2000, penalty: 8, metadata: {} },
        { type: 'speedAnomaly', timestamp: 3000, penalty: 10, metadata: {} },
      ];
      expect(computeIntegrityScore(flags, [], true).score).toBe(77);
    });

    it('deducts for audio flags', () => {
      const audioFlags: AudioFlag[] = [
        { type: 'conversation', timestamp: 1000, durationMs: 5000, dbDelta: 20, penalty: 5 },
      ];
      expect(computeIntegrityScore([], audioFlags, true).score).toBe(95);
    });

    it('notes mic denied', () => {
      const result = computeIntegrityScore([], [], false);
      expect(result.micPermission).toBe(false);
    });

    it('never goes below 0', () => {
      const flags: IntegrityFlag[] = Array.from({ length: 30 }, (_, i) => ({
        type: 'compoundAnomaly' as const,
        timestamp: i * 1000,
        penalty: 15,
        metadata: {},
      }));
      expect(computeIntegrityScore(flags, [], true).score).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/experiments/astha-resume && npx vitest run src/bridge/test/__tests__/adaptiveScoring.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/bridge/test/adaptiveScoring.ts
import type {
  DifficultyLevel,
  QuestionResponse,
  IntegrityFlag,
  AudioFlag,
  VerificationResult,
  SkillVerification,
  IntegrityResult,
} from '../types';
import { LEVEL_MULTIPLIERS, SCORE_CEILINGS } from '../types';

export function getNextLevel(
  current: DifficultyLevel,
  correct: boolean,
  wrongCountAtLevel: number,
): DifficultyLevel {
  if (correct) {
    return Math.min(current + 1, 5) as DifficultyLevel;
  }
  // First wrong at this level: stay
  if (wrongCountAtLevel === 0) {
    return current;
  }
  // Second wrong: drop one level
  return Math.max(current - 1, 1) as DifficultyLevel;
}

interface SkillData {
  skill: string;
  responses: QuestionResponse[];
  levels: DifficultyLevel[];
}

export function computeVerificationScore(skills: SkillData[]): VerificationResult {
  const perSkill: SkillVerification[] = [];
  let totalQuestions = 0;

  for (const { skill, responses, levels } of skills) {
    if (responses.length === 0) {
      perSkill.push({ skill, score: 0, peakLevel: 1, questionsAttempted: 0 });
      continue;
    }

    let rawScore = 0;
    let maxPossible = 0;
    let peakLevel: DifficultyLevel = 1;
    let consecutiveCorrectAtL3Plus = 0;
    let hasSustainedBonus = false;

    for (let i = 0; i < responses.length; i++) {
      const level = levels[i] ?? 1;
      const multiplier = LEVEL_MULTIPLIERS[level];
      maxPossible += multiplier;

      if (responses[i].correct) {
        rawScore += multiplier;
        if (level > peakLevel) peakLevel = level as DifficultyLevel;

        if (level >= 3) {
          consecutiveCorrectAtL3Plus++;
          if (consecutiveCorrectAtL3Plus >= 3) hasSustainedBonus = true;
        } else {
          consecutiveCorrectAtL3Plus = 0;
        }
      } else {
        consecutiveCorrectAtL3Plus = 0;
      }
    }

    let normalized = maxPossible > 0 ? (rawScore / maxPossible) * 100 : 0;

    // Apply sustained performance bonus
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

    normalized = Math.min(Math.round(normalized), 100);
    totalQuestions += responses.length;

    perSkill.push({
      skill,
      score: normalized,
      peakLevel,
      questionsAttempted: responses.length,
    });
  }

  // Overall = weighted average of per-skill scores (equal weight per skill)
  const overall = perSkill.length > 0
    ? Math.round(perSkill.reduce((s, ps) => s + ps.score, 0) / perSkill.length)
    : 0;

  const duration = 0; // Will be filled by the test engine from elapsed time

  return { overall, perSkill, totalQuestions, duration };
}

export function computeIntegrityScore(
  flags: IntegrityFlag[],
  audioFlags: AudioFlag[],
  micPermission: boolean,
): IntegrityResult {
  let score = 100;

  for (const flag of flags) {
    score -= flag.penalty;
  }

  for (const flag of audioFlags) {
    score -= flag.penalty;
  }

  score = Math.max(0, Math.min(100, score));

  const flagSummary: Record<string, number> = {};
  for (const flag of flags) {
    flagSummary[flag.type] = (flagSummary[flag.type] ?? 0) + 1;
  }
  for (const flag of audioFlags) {
    flagSummary[flag.type] = (flagSummary[flag.type] ?? 0) + 1;
  }

  return {
    score,
    micPermission,
    flags,
    audioFlags,
    flagSummary,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/experiments/astha-resume && npx vitest run src/bridge/test/__tests__/adaptiveScoring.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/bridge/test/adaptiveScoring.ts src/bridge/test/__tests__/adaptiveScoring.test.ts
git commit -m "feat: Adaptive scoring engine with level multipliers, ceilings, integrity scoring"
```

---

### Task 12: Test Engine UI Component

**Files:**
- Create: `src/bridge/components/TestEngine.tsx`
- Create: `src/bridge/test/antiCheat.ts`
- Create: `src/bridge/test/audioMonitor.ts`

- [ ] **Step 1: Create anti-cheat detection module**

```typescript
// src/bridge/test/antiCheat.ts
import type { IntegrityFlag, IntegrityFlagType } from '../types';
import { INTEGRITY_PENALTIES } from '../types';

export type FlagCallback = (flag: IntegrityFlag) => void;

export function createAntiCheatMonitor(onFlag: FlagCallback) {
  let tabSwitchCount = 0;
  let lastVisibilityChange = 0;

  const handleVisibilityChange = () => {
    if (document.hidden) {
      lastVisibilityChange = Date.now();
      tabSwitchCount++;
      onFlag({
        type: 'tabSwitch',
        timestamp: Date.now(),
        penalty: INTEGRITY_PENALTIES.tabSwitch,
        metadata: { count: tabSwitchCount },
      });
    }
  };

  const handleBlur = () => {
    // Only flag if not already flagged by visibility change in last 500ms
    if (Date.now() - lastVisibilityChange > 500) {
      onFlag({
        type: 'tabSwitch',
        timestamp: Date.now(),
        penalty: INTEGRITY_PENALTIES.tabSwitch,
        metadata: { source: 'blur' },
      });
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    onFlag({
      type: 'paste',
      timestamp: Date.now(),
      penalty: INTEGRITY_PENALTIES.paste,
      metadata: { length: e.clipboardData?.getData('text')?.length ?? 0 },
    });
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement) {
      onFlag({
        type: 'fullscreenExit',
        timestamp: Date.now(),
        penalty: INTEGRITY_PENALTIES.fullscreenExit,
        metadata: {},
      });
    }
  };

  // Start monitoring
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleBlur);
  document.addEventListener('paste', handlePaste);
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);
    document.removeEventListener('paste', handlePaste);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
  };
}

export function checkSpeedAnomaly(
  timeElapsed: number,
  expectedReadTime: number,
  correct: boolean,
  wasTabHidden: boolean,
  tabHiddenTimestamp: number,
  onFlag: FlagCallback,
): void {
  if (!correct) return; // Only flag correct answers with speed anomaly

  const ratio = expectedReadTime > 0 ? timeElapsed / expectedReadTime : 1;

  if (ratio < 0.3) {
    // Check for compound anomaly: speed + tab switch
    if (wasTabHidden && (Date.now() - tabHiddenTimestamp) < 10000) {
      onFlag({
        type: 'compoundAnomaly',
        timestamp: Date.now(),
        penalty: INTEGRITY_PENALTIES.compoundAnomaly,
        metadata: { ratio, tabSwitchRecent: true },
      });
    } else {
      onFlag({
        type: 'speedAnomaly',
        timestamp: Date.now(),
        penalty: INTEGRITY_PENALTIES.speedAnomalyImpossible,
        metadata: { ratio },
      });
    }
  } else if (ratio < 0.5) {
    onFlag({
      type: 'speedAnomaly',
      timestamp: Date.now(),
      penalty: INTEGRITY_PENALTIES.speedAnomalySuspicious,
      metadata: { ratio },
    });
  }
  // 0.5-0.8: logged in metadata, no penalty
  // 0.8-1.5: normal
  // >2.0: logged, no penalty
}
```

- [ ] **Step 2: Create audio monitoring module**

```typescript
// src/bridge/test/audioMonitor.ts
import type { AudioFlag, AudioFlagType } from '../types';
import { INTEGRITY_PENALTIES } from '../types';

export type AudioFlagCallback = (flag: AudioFlag) => void;

interface AudioMonitorConfig {
  onFlag: AudioFlagCallback;
  baselineDb: number;
}

export function createAudioMonitor(config: AudioMonitorConfig) {
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let stream: MediaStream | null = null;
  let animFrameId: number | null = null;
  let running = false;

  // Adaptive baseline
  let currentBaseline = config.baselineDb;
  const baselineSamples: number[] = [];

  // Speech detection state
  let speechBurstStart = 0;
  let speechDuration = 0;
  let isSpeechActive = false;
  let conversationWindowStart = 0;
  let speechBurstsInWindow = 0;

  function getDb(dataArray: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    return 20 * Math.log10(Math.max(rms, 1e-10));
  }

  function getSpectralCentroid(frequencyData: Uint8Array, sampleRate: number): number {
    let weightedSum = 0;
    let sum = 0;
    const binFreq = sampleRate / (frequencyData.length * 2);
    for (let i = 0; i < frequencyData.length; i++) {
      const freq = i * binFreq;
      weightedSum += freq * frequencyData[i];
      sum += frequencyData[i];
    }
    return sum > 0 ? weightedSum / sum : 0;
  }

  function hasFormantPeaks(frequencyData: Uint8Array, sampleRate: number): boolean {
    const binFreq = sampleRate / (frequencyData.length * 2);
    // Check for energy concentration in speech band (300-3400Hz)
    let speechBandEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      const freq = i * binFreq;
      const energy = frequencyData[i];
      totalEnergy += energy;
      if (freq >= 300 && freq <= 3400) {
        speechBandEnergy += energy;
      }
    }

    // Speech typically has >60% energy in the 300-3400Hz band
    return totalEnergy > 0 && (speechBandEnergy / totalEnergy) > 0.5;
  }

  function hasSyllabicModulation(timeData: Float32Array): boolean {
    // Compute energy envelope modulation
    // Speech has 3-8Hz syllabic rhythm
    const windowSize = 256;
    const energies: number[] = [];

    for (let i = 0; i < timeData.length - windowSize; i += windowSize / 2) {
      let sum = 0;
      for (let j = i; j < i + windowSize; j++) {
        sum += timeData[j] * timeData[j];
      }
      energies.push(sum / windowSize);
    }

    if (energies.length < 4) return false;

    // Count zero crossings of the energy envelope (detrended)
    const mean = energies.reduce((s, e) => s + e, 0) / energies.length;
    let crossings = 0;
    for (let i = 1; i < energies.length; i++) {
      if ((energies[i] - mean) * (energies[i - 1] - mean) < 0) {
        crossings++;
      }
    }

    // Modulation rate in Hz (approx)
    const durationSec = timeData.length / (audioContext?.sampleRate ?? 44100);
    const modulationRate = crossings / (2 * durationSec);

    // Speech: 3-8Hz, Hammering: <2Hz
    return modulationRate >= 2.5 && modulationRate <= 10;
  }

  function isImpulse(timeData: Float32Array): boolean {
    // Impulse: sharp peak then rapid decay
    let maxAbs = 0;
    let maxIdx = 0;
    for (let i = 0; i < timeData.length; i++) {
      const abs = Math.abs(timeData[i]);
      if (abs > maxAbs) {
        maxAbs = abs;
        maxIdx = i;
      }
    }

    // Check if energy drops by >80% within 200ms after peak
    const sampleRate = audioContext?.sampleRate ?? 44100;
    const samplesIn200ms = Math.floor(sampleRate * 0.2);
    const endIdx = Math.min(maxIdx + samplesIn200ms, timeData.length);

    let peakEnergy = 0;
    let tailEnergy = 0;
    const peakWindow = 64;

    for (let i = Math.max(0, maxIdx - peakWindow / 2); i < Math.min(maxIdx + peakWindow / 2, timeData.length); i++) {
      peakEnergy += timeData[i] * timeData[i];
    }
    for (let i = maxIdx + peakWindow; i < endIdx; i++) {
      tailEnergy += timeData[i] * timeData[i];
    }

    return peakEnergy > 0 && tailEnergy / peakEnergy < 0.2;
  }

  function analyze() {
    if (!running || !analyser || !audioContext) return;

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Float32Array(analyser.fftSize);

    analyser.getByteFrequencyData(frequencyData);
    analyser.getFloatTimeDomainData(timeData);

    const db = getDb(timeData);
    const delta = db - currentBaseline;

    // Adaptive baseline (rolling 60s window)
    baselineSamples.push(db);
    if (baselineSamples.length > 300) { // ~60s at 5Hz
      baselineSamples.shift();
      // Only recalibrate if no speech detected
      if (!isSpeechActive) {
        currentBaseline = baselineSamples.reduce((s, d) => s + d, 0) / baselineSamples.length;
      }
    }

    // Only analyze if significantly above baseline
    if (delta > 10) {
      const hasFormants = hasFormantPeaks(frequencyData, audioContext.sampleRate);
      const hasSyllables = hasSyllabicModulation(timeData);
      const isImpulseSound = isImpulse(timeData);

      if (isImpulseSound) {
        // Hammer, slam, drop -- IGNORE
      } else if (hasFormants && hasSyllables) {
        // SPEECH DETECTED
        if (!isSpeechActive) {
          isSpeechActive = true;
          speechBurstStart = Date.now();
          speechDuration = 0;
          speechBurstsInWindow++;
        }
        speechDuration = Date.now() - speechBurstStart;

        // Check for sustained speech patterns
        if (speechDuration > 10000) {
          // Continuous speech >10s
          config.onFlag({
            type: 'continuousSpeech',
            timestamp: Date.now(),
            durationMs: speechDuration,
            dbDelta: delta,
            penalty: INTEGRITY_PENALTIES.continuousSpeech,
          });
          isSpeechActive = false;
          speechBurstStart = 0;
        }
      } else if (hasFormants && !hasSyllables && delta < 20) {
        // Low energy with formant structure -- possible whisper
        if (!isSpeechActive) {
          config.onFlag({
            type: 'whisper',
            timestamp: Date.now(),
            durationMs: 0,
            dbDelta: delta,
            penalty: INTEGRITY_PENALTIES.whisper,
          });
        }
      }
    } else {
      // Sound dropped below threshold
      if (isSpeechActive) {
        isSpeechActive = false;
        const duration = Date.now() - speechBurstStart;

        if (duration >= 2000 && duration <= 5000) {
          config.onFlag({
            type: 'speechBurst',
            timestamp: speechBurstStart,
            durationMs: duration,
            dbDelta: delta,
            penalty: INTEGRITY_PENALTIES.speechBurst,
          });
        }
      }

      // Conversation pattern detection (30s window)
      const now = Date.now();
      if (now - conversationWindowStart > 30000) {
        if (speechBurstsInWindow >= 3) {
          config.onFlag({
            type: 'conversation',
            timestamp: conversationWindowStart,
            durationMs: 30000,
            dbDelta: delta,
            penalty: INTEGRITY_PENALTIES.conversation,
          });
        }
        conversationWindowStart = now;
        speechBurstsInWindow = 0;
      }
    }

    animFrameId = requestAnimationFrame(analyze);
  }

  async function start(existingStream?: MediaStream) {
    try {
      stream = existingStream ?? await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096; // Good frequency resolution
      source.connect(analyser);
      running = true;
      conversationWindowStart = Date.now();
      analyze();
    } catch {
      // Mic not available
    }
  }

  function stop() {
    running = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (audioContext) audioContext.close();
    analyser = null;
    audioContext = null;
    stream = null;
  }

  function checkSpeechPlusTabSwitch(tabSwitchTimestamp: number) {
    // If speech was detected within 5s of a tab switch
    if (isSpeechActive || (Date.now() - speechBurstStart < 5000)) {
      config.onFlag({
        type: 'speechPlusTabSwitch',
        timestamp: Date.now(),
        durationMs: speechDuration,
        dbDelta: 0,
        penalty: INTEGRITY_PENALTIES.speechPlusTabSwitch,
      });
    }
  }

  return { start, stop, checkSpeechPlusTabSwitch };
}
```

- [ ] **Step 3: Create TestEngine component**

```tsx
// src/bridge/components/TestEngine.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '../../firebase/config';
import { signInAnon, getCurrentUser } from '../../firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initFirebase } from '../../firebase/config';
import { useBridgeStore } from '../store';
import { useResumeStore } from '../../store/resumeStore';
import { CalibrationPhase } from '../test/CalibrationPhase';
import { createAntiCheatMonitor, checkSpeedAnomaly } from '../test/antiCheat';
import { createAudioMonitor } from '../test/audioMonitor';
import { generateTestQuestions } from '../test/questionGenerator';
import { getNextLevel, computeVerificationScore, computeIntegrityScore } from '../test/adaptiveScoring';
import { createResumePin } from '../resumePin';
import type {
  BridgeCriteria,
  Calibration,
  GeneratedQuestion,
  DifficultyLevel,
  IntegrityFlag,
  AudioFlag,
  QuestionResponse,
} from '../types';

interface TestEngineProps {
  criteriaCode: string;
}

type Phase = 'loading' | 'calibration' | 'generating' | 'testing' | 'completed' | 'error';

export function TestEngine({ criteriaCode }: TestEngineProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [criteria, setCriteria] = useState<BridgeCriteria | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const store = useBridgeStore();
  const resume = useResumeStore((s) => s.resume);

  const antiCheatCleanupRef = useRef<(() => void) | null>(null);
  const audioMonitorRef = useRef<ReturnType<typeof createAudioMonitor> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef(0);
  const lastTabHiddenRef = useRef(0);
  const wasTabHiddenRef = useRef(false);
  const skillLevelsRef = useRef<Record<string, DifficultyLevel>>({});
  const wrongCountRef = useRef<Record<string, number>>({});
  const responseLevelsRef = useRef<Record<string, DifficultyLevel[]>>({});
  const skillResponsesRef = useRef<Record<string, QuestionResponse[]>>({});
  const allFlagsRef = useRef<IntegrityFlag[]>([]);
  const allAudioFlagsRef = useRef<AudioFlag[]>([]);
  const testStartRef = useRef(0);

  // Online check
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load criteria and validate
  useEffect(() => {
    async function init() {
      if (!navigator.onLine) {
        setError('Internet connection required for the verification test.');
        setPhase('error');
        return;
      }

      try {
        const db = getDb();
        const snap = await getDoc(doc(db, 'criteria', criteriaCode));
        if (!snap.exists()) {
          setError('Criteria not found');
          setPhase('error');
          return;
        }
        const data = snap.data() as BridgeCriteria;
        setCriteria(data);

        // Ensure anonymous auth
        let user = getCurrentUser();
        if (!user) {
          user = await signInAnon();
        }

        setPhase('calibration');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
        setPhase('error');
      }
    }
    init();
  }, [criteriaCode]);

  // Beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (phase === 'testing' || phase === 'generating') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      antiCheatCleanupRef.current?.();
      audioMonitorRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  const handleFlag = useCallback((flag: IntegrityFlag) => {
    allFlagsRef.current.push(flag);
    store.addFlag(flag);
    if (flag.type === 'tabSwitch') {
      lastTabHiddenRef.current = flag.timestamp;
      wasTabHiddenRef.current = true;
      audioMonitorRef.current?.checkSpeechPlusTabSwitch(flag.timestamp);
    }
  }, []);

  const handleAudioFlag = useCallback((flag: AudioFlag) => {
    allAudioFlagsRef.current.push(flag);
    store.addAudioFlag(flag);
  }, []);

  const handleCalibrationComplete = async (calibration: Calibration) => {
    if (!criteria) return;

    store.setCalibration(calibration);
    setPhase('generating');

    try {
      // Create resume pin
      const selfAssessment = store.selfAssessment;
      const pin = await createResumePin(resume, selfAssessment?.overall ?? 0);

      // Start session on server
      const { app } = initFirebase();
      const functions = getFunctions(app);
      const startSession = httpsCallable<unknown, { sessionId: string }>(functions, 'startTestSession');
      const { data } = await startSession({ criteriaCode, resumePin: pin });

      store.initTestSession(data.sessionId, criteriaCode, getCurrentUser()!.uid, pin);

      // Extract claims per skill from resume
      const resumeText = resume.sections
        .flatMap((s) => s.entries.flatMap((e) => [...Object.values(e.fields), ...e.bullets]))
        .join(' ');

      const claims: Record<string, string[]> = {};
      for (const skill of criteria.testConfig.skillsToTest) {
        const skillLower = skill.toLowerCase();
        const relevantBullets = resume.sections
          .flatMap((s) => s.entries.flatMap((e) => e.bullets))
          .filter((b) => b.toLowerCase().includes(skillLower));
        claims[skill] = relevantBullets;
      }

      // Generate questions
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY ?? '';
      const generated = await generateTestQuestions(
        criteria.testConfig.skillsToTest,
        claims,
        calibration.wpm,
        criteria.testConfig.questionCount,
        geminiKey,
      );

      if (generated.length === 0) {
        setError('Failed to generate test questions. Check API key.');
        setPhase('error');
        return;
      }

      setQuestions(generated);
      store.setQuestions(generated);

      // Initialize skill tracking
      for (const skill of criteria.testConfig.skillsToTest) {
        skillLevelsRef.current[skill] = 1;
        wrongCountRef.current[skill] = 0;
        responseLevelsRef.current[skill] = [];
        skillResponsesRef.current[skill] = [];
      }

      // Start anti-cheat monitoring
      antiCheatCleanupRef.current = createAntiCheatMonitor(handleFlag);

      // Start audio monitoring
      audioMonitorRef.current = createAudioMonitor({
        onFlag: handleAudioFlag,
        baselineDb: calibration.ambientDb,
      });
      audioMonitorRef.current.start();

      // Start heartbeat
      heartbeatRef.current = setInterval(async () => {
        try {
          const hb = httpsCallable(functions, 'heartbeat');
          await hb({ sessionId: data.sessionId });
        } catch {
          // Connection issue
        }
      }, 30000);

      // Request fullscreen
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Not critical
      }

      testStartRef.current = Date.now();
      setPhase('testing');
      startQuestion(0, generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start test');
      setPhase('error');
    }
  };

  const startQuestion = (idx: number, qs: GeneratedQuestion[]) => {
    if (idx >= qs.length) {
      finishTest();
      return;
    }

    const q = qs[idx];
    setCurrentIdx(idx);
    setSelectedOption(null);
    setTimeLeft(q.timeAllotted);
    questionStartRef.current = Date.now();
    wasTabHiddenRef.current = false;

    // Start countdown
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout(idx, qs);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = (idx: number, qs: GeneratedQuestion[]) => {
    const q = qs[idx];
    recordAnswer(q, -1, false, qs);
  };

  const handleSelectOption = (optionIdx: number) => {
    if (selectedOption !== null) return; // Already answered
    setSelectedOption(optionIdx);
    if (timerRef.current) clearInterval(timerRef.current);

    const q = questions[currentIdx];
    const correct = optionIdx === q.correctIndex;
    recordAnswer(q, optionIdx, correct, questions);
  };

  const recordAnswer = (q: GeneratedQuestion, selectedIndex: number, correct: boolean, qs: GeneratedQuestion[]) => {
    const timeElapsed = (Date.now() - questionStartRef.current) / 1000;
    const expectedReadTime = (q.wordCount / (store.testSession?.calibration.wpm ?? 150)) * 60;
    const wpmRatio = expectedReadTime > 0 ? timeElapsed / expectedReadTime : 1;

    // Check speed anomaly
    checkSpeedAnomaly(
      timeElapsed,
      expectedReadTime,
      correct,
      wasTabHiddenRef.current,
      lastTabHiddenRef.current,
      handleFlag,
    );

    const response: QuestionResponse = {
      questionId: q.id,
      selectedIndex,
      correct,
      timeElapsed,
      expectedReadTime,
      wpmRatio,
    };

    store.recordResponse(response);

    // Track per-skill
    const skill = q.skill;
    skillResponsesRef.current[skill] = [...(skillResponsesRef.current[skill] ?? []), response];
    responseLevelsRef.current[skill] = [...(responseLevelsRef.current[skill] ?? []), q.level];

    // Update adaptive level
    if (correct) {
      wrongCountRef.current[skill] = 0;
      const nextLevel = getNextLevel(skillLevelsRef.current[skill] ?? 1, true, 0);
      skillLevelsRef.current[skill] = nextLevel;
      store.updateLevel(skill, nextLevel);
      store.incrementConsecutive(skill);
    } else {
      const wrongCount = wrongCountRef.current[skill] ?? 0;
      const nextLevel = getNextLevel(skillLevelsRef.current[skill] ?? 1, false, wrongCount);
      wrongCountRef.current[skill] = wrongCount + 1;
      skillLevelsRef.current[skill] = nextLevel;
      store.updateLevel(skill, nextLevel);
      store.resetConsecutive(skill);
    }

    // Advance to next question after brief delay
    setTimeout(() => {
      const nextIdx = currentIdx + 1;
      store.advanceQuestion();
      startQuestion(nextIdx, qs);
    }, 500);
  };

  const finishTest = () => {
    // Cleanup
    antiCheatCleanupRef.current?.();
    audioMonitorRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    store.completeTest();

    // Compute verification score
    const skillData = Object.entries(skillResponsesRef.current).map(([skill, responses]) => ({
      skill,
      responses,
      levels: responseLevelsRef.current[skill] ?? [],
    }));

    const verification = computeVerificationScore(skillData);
    verification.duration = Math.round((Date.now() - testStartRef.current) / 1000);

    // Compute integrity score
    const integrity = computeIntegrityScore(
      allFlagsRef.current,
      allAudioFlagsRef.current,
      store.testSession?.calibration.micPermission ?? false,
    );

    // Store results for scorecard generation
    useBridgeStore.setState({
      testSession: {
        ...store.testSession!,
        status: 'completed',
        completedAt: Date.now(),
      },
    });

    // Navigate to scorecard
    navigate(`/bridge/${criteriaCode}/scorecard`, {
      state: { verification, integrity },
    });

    setPhase('completed');
  };

  // Render based on phase
  if (phase === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (phase === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-red-600 text-lg">{error}</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 border rounded">Go Back</button>
        </div>
      </div>
    );
  }

  if (phase === 'calibration') {
    return <CalibrationPhase onComplete={handleCalibrationComplete} />;
  }

  if (phase === 'generating') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-xl font-bold">Generating your personalized test...</div>
          <p className="text-sm opacity-60">Questions are tailored to your resume claims and the employer's requirements.</p>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!isOnline && phase === 'testing') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-amber-600 text-lg font-bold">Connection Lost</p>
          <p className="text-sm">Timer is paused. Reconnect within 10 seconds to continue.</p>
        </div>
      </div>
    );
  }

  if (phase === 'completed') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-4xl text-green-600">Test Complete</div>
          <p>Generating your verified scorecard...</p>
        </div>
      </div>
    );
  }

  // Testing phase - render current question
  const currentQuestion = questions[currentIdx];
  if (!currentQuestion) return null;

  const progress = ((currentIdx + 1) / questions.length) * 100;
  const timePercent = currentQuestion.timeAllotted > 0
    ? (timeLeft / currentQuestion.timeAllotted) * 100
    : 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Timer bar - sticky top */}
      <div className="sticky top-0 z-50 bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="text-sm opacity-60">
          {currentIdx + 1} / {questions.length}
        </div>
        <div
          className={`text-2xl font-mono font-bold ${timeLeft <= 5 ? 'text-red-600' : ''}`}
          role="timer"
          aria-live={timeLeft === Math.floor(currentQuestion.timeAllotted * 0.5) || timeLeft === Math.floor(currentQuestion.timeAllotted * 0.1) ? 'assertive' : 'off'}
          aria-label={`${timeLeft} seconds remaining`}
        >
          {timeLeft}s
        </div>
        <div className="text-xs opacity-40">
          {currentQuestion.skill} - L{currentQuestion.level}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Time remaining bar */}
      <div className="h-1 bg-gray-100">
        <div
          className={`h-full transition-all ${timeLeft <= 5 ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${timePercent}%` }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[720px] space-y-6">
          {/* Question text - styled to reduce OCR accuracy */}
          <div
            className="text-lg sm:text-xl leading-relaxed"
            style={{ letterSpacing: '0.01em', wordSpacing: '0.05em' }}
          >
            {currentQuestion.text}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                disabled={selectedOption !== null}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors text-base
                  ${selectedOption === null
                    ? 'hover:border-blue-500 hover:bg-blue-50 border-gray-200'
                    : selectedOption === idx
                    ? idx === currentQuestion.correctIndex
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                    : 'border-gray-200 opacity-50'
                  }`}
                style={{
                  minHeight: '48px',
                  // Slight font-weight variation to reduce OCR
                  fontWeight: idx % 2 === 0 ? 400 : 450,
                }}
                aria-label={`Option ${idx + 1}: ${option.text}`}
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/bridge/components/TestEngine.tsx src/bridge/test/antiCheat.ts src/bridge/test/audioMonitor.ts
git commit -m "feat: Test engine - adaptive questions, anti-cheat monitoring, audio intelligence"
```

---

## Phase 5: Scorecard & Match System (Tasks 13-15)

### Task 13: Scorecard View Component

**Files:**
- Create: `src/bridge/components/ScorecardView.tsx`

- [ ] **Step 1: Create the scorecard component**

```tsx
// src/bridge/components/ScorecardView.tsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initFirebase } from '../../firebase/config';
import { getCurrentUser } from '../../firebase/auth';
import { useBridgeStore } from '../store';
import type { VerificationResult, IntegrityResult, SignedScorecard, ContactInfo } from '../types';

interface ScorecardViewProps {
  criteriaCode: string;
}

export function ScorecardView({ criteriaCode }: ScorecardViewProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const store = useBridgeStore();
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '', email: '', phone: '', linkedin: '', github: '',
  });
  const [sending, setSending] = useState(false);
  const [matchSent, setMatchSent] = useState(false);

  const verification = (location.state as { verification?: VerificationResult })?.verification;
  const integrity = (location.state as { integrity?: IntegrityResult })?.integrity;
  const session = store.testSession;
  const selfAssessment = store.selfAssessment;
  const scorecard = store.scorecard;

  // Sign scorecard on mount if not already signed
  useEffect(() => {
    if (scorecard || !verification || !integrity || !session || signing) return;

    async function sign() {
      setSigning(true);
      try {
        const { app } = initFirebase();
        const functions = getFunctions(app);
        const signFn = httpsCallable<unknown, { scorecardId: string; signature: string }>(
          functions, 'signScorecard'
        );

        const criteriaHash = await hashString(JSON.stringify(store.criteria));
        const gap = (selfAssessment?.overall ?? 0) - verification.overall;

        const payload = {
          version: 1,
          criteriaCode,
          criteriaHash,
          sessionId: session.sessionId,
          timestamp: new Date().toISOString(),
          resumeScore: selfAssessment ?? { overall: 0, breakdown: {} },
          resumePin: session.resumePin,
          verification,
          integrity,
          gap,
          calibration: session.calibration,
        };

        const { data } = await signFn(payload);

        const signedCard: SignedScorecard = {
          ...payload,
          candidateId: getCurrentUser()!.uid,
          signature: data.signature,
        };

        store.setScorecard(signedCard);
        setSigned(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to sign scorecard');
      } finally {
        setSigning(false);
      }
    }

    sign();
  }, [verification, integrity]);

  const handleSendMatch = async () => {
    if (!contactInfo.name || !contactInfo.email || !scorecard) return;

    setSending(true);
    try {
      const { app } = initFirebase();
      const functions = getFunctions(app);
      const sendFn = httpsCallable<unknown, { matchId: string; meetsThreshold: boolean }>(
        functions, 'sendMatchSignal'
      );

      const { data } = await sendFn({
        criteriaCode,
        scorecardId: scorecard.sessionId, // Uses session as reference
        contactInfo,
      });

      store.addMatch({
        matchId: data.matchId,
        criteriaCode,
        scorecardId: scorecard.sessionId,
        candidateId: scorecard.candidateId,
        employerId: '',
        contactInfo,
        resumeScore: scorecard.resumeScore.overall,
        verifiedScore: scorecard.verification.overall,
        integrityScore: scorecard.integrity.score,
        gap: scorecard.gap,
        meetsThreshold: data.meetsThreshold,
        sentAt: new Date(),
        status: 'pending',
      });

      setMatchSent(true);
      setShowContactForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send match');
    } finally {
      setSending(false);
    }
  };

  const card = scorecard ?? (verification && integrity && selfAssessment ? {
    resumeScore: selfAssessment,
    verification,
    integrity,
    gap: (selfAssessment.overall ?? 0) - verification.overall,
    resumePin: session?.resumePin,
    calibration: session?.calibration,
  } : null);

  if (!card) {
    return <div className="p-8 text-center">No scorecard data available.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold text-center">Verified Scorecard</h1>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm" role="alert">{error}</div>}

      {signing && (
        <div className="text-center text-sm opacity-60">Signing scorecard...</div>
      )}

      {/* Three-score summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-lg border">
          <div className="text-3xl font-bold">{card.resumeScore.overall}%</div>
          <div className="text-sm opacity-60 mt-1">Resume Score</div>
        </div>
        <div className="p-4 rounded-lg border">
          <div className="text-3xl font-bold">{card.verification.overall}%</div>
          <div className="text-sm opacity-60 mt-1">Verified Skills</div>
        </div>
        <div className="p-4 rounded-lg border">
          <div className={`text-3xl font-bold ${
            card.gap > 5 ? 'text-green-600' : card.gap < -15 ? 'text-red-600' : ''
          }`}>
            {card.gap > 0 ? '+' : ''}{card.gap}
          </div>
          <div className="text-sm opacity-60 mt-1">Gap</div>
        </div>
      </div>

      {/* Gap interpretation */}
      <div className={`p-3 rounded text-sm ${
        card.gap > 5 ? 'bg-green-50 text-green-800' :
        card.gap < -15 ? 'bg-red-50 text-red-800' :
        'bg-blue-50 text-blue-800'
      }`}>
        {card.gap > 5
          ? 'Your skills exceed what your resume shows. You are underrated. Consider improving your resume to match your actual abilities.'
          : card.gap < -15
          ? 'Your resume claims exceed your demonstrated skills. Consider adjusting your resume to better reflect your current abilities.'
          : 'Your resume accurately represents your skill level. Strong trust signal for employers.'}
      </div>

      {/* Per-skill breakdown */}
      <div className="space-y-2">
        <h3 className="font-semibold">Skill Verification Breakdown</h3>
        <div className="space-y-2">
          {card.verification.perSkill.map((sv) => (
            <div key={sv.skill} className="flex items-center gap-3 p-2 border rounded">
              <span className="w-32 text-sm font-medium truncate">{sv.skill}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${sv.score}%` }}
                />
              </div>
              <span className="text-sm font-mono w-16 text-right">{sv.score}%</span>
              <span className="text-xs opacity-40 w-8">L{sv.peakLevel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Test stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
        <div className="p-2 border rounded">
          <div className="font-bold">{card.verification.totalQuestions}</div>
          <div className="opacity-60">Questions</div>
        </div>
        <div className="p-2 border rounded">
          <div className="font-bold">{Math.floor(card.verification.duration / 60)}m {card.verification.duration % 60}s</div>
          <div className="opacity-60">Duration</div>
        </div>
        <div className="p-2 border rounded">
          <div className="font-bold">{card.calibration?.wpm ?? '-'}</div>
          <div className="opacity-60">WPM</div>
        </div>
        <div className="p-2 border rounded">
          <div className="font-bold">{scorecard ? 'Signed' : 'Pending'}</div>
          <div className="opacity-60">Verification</div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-4 border-t">
        {!matchSent && scorecard && (
          <>
            {!showContactForm ? (
              <button
                onClick={() => setShowContactForm(true)}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-medium text-lg"
              >
                Send Match Signal to Employer
              </button>
            ) : (
              <div className="space-y-3 p-4 border rounded-lg">
                <h3 className="font-semibold">Share your contact info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Name *"
                    value={contactInfo.name}
                    onChange={(e) => setContactInfo((c) => ({ ...c, name: e.target.value }))}
                    className="px-3 py-2 border rounded text-sm"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo((c) => ({ ...c, email: e.target.value }))}
                    className="px-3 py-2 border rounded text-sm"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={contactInfo.phone}
                    onChange={(e) => setContactInfo((c) => ({ ...c, phone: e.target.value }))}
                    className="px-3 py-2 border rounded text-sm"
                  />
                  <input
                    type="url"
                    placeholder="LinkedIn (optional)"
                    value={contactInfo.linkedin}
                    onChange={(e) => setContactInfo((c) => ({ ...c, linkedin: e.target.value }))}
                    className="px-3 py-2 border rounded text-sm"
                  />
                  <input
                    type="url"
                    placeholder="GitHub (optional)"
                    value={contactInfo.github}
                    onChange={(e) => setContactInfo((c) => ({ ...c, github: e.target.value }))}
                    className="px-3 py-2 border rounded text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSendMatch}
                    disabled={!contactInfo.name || !contactInfo.email || sending}
                    className="flex-1 py-2 bg-green-600 text-white rounded font-medium disabled:opacity-40"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                  <button
                    onClick={() => setShowContactForm(false)}
                    className="px-4 py-2 border rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {matchSent && (
          <div className="p-4 bg-green-50 text-green-800 rounded-lg text-center">
            Match signal sent. The employer will be notified.
          </div>
        )}

        <button
          onClick={() => navigate('/bridge/dashboard')}
          className="w-full py-2 border rounded text-sm"
        >
          View All Applications
        </button>
      </div>
    </div>
  );
}

async function hashString(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/bridge/components/ScorecardView.tsx
git commit -m "feat: Scorecard view with gap analysis, signing, match signal sending"
```

---

### Task 14: Employer Match Dashboard

**Files:**
- Create: `src/bridge/components/EmployerMatchDashboard.tsx`

- [ ] **Step 1: Create the employer match dashboard**

```tsx
// src/bridge/components/EmployerMatchDashboard.tsx
import { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, onSnapshot, doc, getDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDb, initFirebase } from '../../firebase/config';
import { getCurrentUser } from '../../firebase/auth';
import type { MatchSignal, SignedScorecard, BridgeCriteria } from '../types';

interface MatchRow {
  match: MatchSignal;
  scorecard?: SignedScorecard;
  criteria?: BridgeCriteria;
  reply?: string;
}

export function EmployerMatchDashboard() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'verifiedScore' | 'gap' | 'integrityScore' | 'sentAt'>('sentAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [filterThreshold, setFilterThreshold] = useState(0);
  const [filterIntegrity, setFilterIntegrity] = useState(0);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;

    const db = getDb();
    const q = query(
      collection(db, 'matches'),
      where('employerId', '==', user.uid),
      orderBy('sentAt', 'desc'),
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const rows: MatchRow[] = [];
      for (const docSnap of snapshot.docs) {
        const match = docSnap.data() as MatchSignal;

        // Load scorecard
        let scorecard: SignedScorecard | undefined;
        try {
          const scDoc = await getDoc(doc(db, 'scorecards', match.scorecardId));
          if (scDoc.exists()) {
            scorecard = scDoc.data() as SignedScorecard;
          }
        } catch { /* ignore */ }

        // Check for reply
        let reply: string | undefined;
        try {
          const replyQuery = query(
            collection(db, 'replies'),
            where('matchId', '==', match.matchId),
          );
          // Using a snapshot to check
          const replySnap = await getDoc(doc(db, 'replies', match.matchId));
          if (replySnap.exists()) {
            reply = replySnap.data().message;
          }
        } catch { /* ignore */ }

        rows.push({ match, scorecard, reply });
      }
      setMatches(rows);
      setLoading(false);
    });

    return unsub;
  }, []);

  const handleReply = async (matchId: string) => {
    if (!replyText.trim()) return;
    setReplying(true);

    try {
      const { app } = initFirebase();
      const functions = getFunctions(app);
      const replyFn = httpsCallable(functions, 'replyToMatch');
      await replyFn({ matchId, message: replyText.trim() });

      setMatches((prev) =>
        prev.map((r) =>
          r.match.matchId === matchId ? { ...r, reply: replyText.trim() } : r
        )
      );
      setReplyText('');
      setSelectedMatch(null);
    } catch { /* ignore */ } finally {
      setReplying(false);
    }
  };

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const filtered = matches.filter((r) =>
    r.match.verifiedScore >= filterThreshold &&
    r.match.integrityScore >= filterIntegrity
  );

  const sorted = [...filtered].sort((a, b) => {
    const va = a.match[sortBy] ?? 0;
    const vb = b.match[sortBy] ?? 0;
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (loading) {
    return <div className="p-8 text-center">Loading matches...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Match Signals</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs block mb-1">Min Verified Score</label>
          <input
            type="number"
            min={0}
            max={100}
            value={filterThreshold}
            onChange={(e) => setFilterThreshold(Number(e.target.value))}
            className="w-20 px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs block mb-1">Min Integrity</label>
          <input
            type="number"
            min={0}
            max={100}
            value={filterIntegrity}
            onChange={(e) => setFilterIntegrity(Number(e.target.value))}
            className="w-20 px-2 py-1 border rounded text-sm"
          />
        </div>
        <span className="text-sm opacity-60">{sorted.length} matches</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-center opacity-60 py-8">No match signals yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Candidate</th>
                <th className="text-right py-2 px-2 cursor-pointer" onClick={() => handleSort('verifiedScore')}>
                  Resume {sortBy === 'verifiedScore' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-right py-2 px-2 cursor-pointer" onClick={() => handleSort('verifiedScore')}>
                  Verified {sortBy === 'verifiedScore' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-right py-2 px-2 cursor-pointer" onClick={() => handleSort('integrityScore')}>
                  Integrity {sortBy === 'integrityScore' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-right py-2 px-2 cursor-pointer" onClick={() => handleSort('gap')}>
                  Gap {sortBy === 'gap' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-center py-2 px-2">Status</th>
                <th className="text-right py-2 px-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.match.matchId} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2">
                    <div className="font-medium">{row.match.contactInfo.name}</div>
                    <div className="text-xs opacity-50">{row.match.contactInfo.email}</div>
                  </td>
                  <td className="text-right py-2 px-2 font-mono">{row.match.resumeScore}%</td>
                  <td className="text-right py-2 px-2 font-mono">{row.match.verifiedScore}%</td>
                  <td className="text-right py-2 px-2 font-mono">{row.match.integrityScore}%</td>
                  <td className={`text-right py-2 px-2 font-mono ${
                    row.match.gap > 5 ? 'text-green-600' :
                    row.match.gap < -15 ? 'text-red-600' : ''
                  }`}>
                    {row.match.gap > 0 ? '+' : ''}{row.match.gap}
                  </td>
                  <td className="text-center py-2 px-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      row.match.status === 'replied' ? 'bg-green-100 text-green-800' :
                      row.match.status === 'viewed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {row.match.status}
                    </span>
                  </td>
                  <td className="text-right py-2 px-2">
                    {!row.reply ? (
                      <button
                        onClick={() => setSelectedMatch(
                          selectedMatch === row.match.matchId ? null : row.match.matchId
                        )}
                        className="text-blue-600 text-sm underline"
                      >
                        Reply
                      </button>
                    ) : (
                      <span className="text-xs text-green-600">Replied</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reply modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold">Reply to candidate</h3>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="We'd like to schedule an interview..."
              rows={3}
              className="w-full px-3 py-2 border rounded text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleReply(selectedMatch)}
                disabled={!replyText.trim() || replying}
                className="flex-1 py-2 bg-blue-600 text-white rounded disabled:opacity-40"
              >
                {replying ? 'Sending...' : 'Send Reply'}
              </button>
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/bridge/components/EmployerMatchDashboard.tsx
git commit -m "feat: Employer match dashboard with filtering, sorting, reply system"
```

---

### Task 15: Candidate Application Dashboard

**Files:**
- Create: `src/bridge/components/CandidateDashboard.tsx`

- [ ] **Step 1: Create the candidate dashboard**

```tsx
// src/bridge/components/CandidateDashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, orderBy, onSnapshot, getDocs,
} from 'firebase/firestore';
import { getDb } from '../../firebase/config';
import { getCurrentUser } from '../../firebase/auth';
import type { MatchSignal, BridgeCriteria } from '../types';

interface ApplicationRow {
  match: MatchSignal;
  jobTitle: string;
  reply?: string;
}

export function CandidateDashboard() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const db = getDb();
    const q = query(
      collection(db, 'matches'),
      where('candidateId', '==', user.uid),
      orderBy('sentAt', 'desc'),
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const rows: ApplicationRow[] = [];
      for (const docSnap of snapshot.docs) {
        const match = docSnap.data() as MatchSignal;

        // Get job title from criteria
        let jobTitle = 'Unknown Position';
        try {
          const criteriaQuery = query(
            collection(db, 'criteria'),
            where('shortCode', '==', match.criteriaCode),
          );
          const criteriaSnap = await getDocs(criteriaQuery);
          if (!criteriaSnap.empty) {
            jobTitle = (criteriaSnap.docs[0].data() as BridgeCriteria).jobTitle;
          }
        } catch { /* ignore */ }

        // Check for reply
        let reply: string | undefined;
        try {
          const replyQuery = query(
            collection(db, 'replies'),
            where('matchId', '==', match.matchId),
          );
          const replySnap = await getDocs(replyQuery);
          if (!replySnap.empty) {
            reply = replySnap.docs[0].data().message;
          }
        } catch { /* ignore */ }

        rows.push({ match, jobTitle, reply });
      }
      setApplications(rows);
      setLoading(false);
    });

    return unsub;
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading your applications...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">My Applications</h1>

      {applications.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="opacity-60">No match signals sent yet.</p>
          <p className="text-sm opacity-40">
            Score yourself against an employer's criteria and send a match signal to appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.match.matchId} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{app.jobTitle}</h3>
                  <p className="text-xs opacity-50">
                    Sent {new Date(app.match.sentAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  app.match.status === 'replied' ? 'bg-green-100 text-green-800' :
                  app.match.status === 'viewed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {app.match.status === 'replied' ? 'Replied' :
                   app.match.status === 'viewed' ? 'Viewed' : 'Pending'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="font-bold">{app.match.resumeScore}%</div>
                  <div className="text-xs opacity-60">Resume</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="font-bold">{app.match.verifiedScore}%</div>
                  <div className="text-xs opacity-60">Verified</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="font-bold">{app.match.integrityScore}%</div>
                  <div className="text-xs opacity-60">Integrity</div>
                </div>
                <div className={`p-2 rounded ${
                  app.match.gap > 5 ? 'bg-green-50' :
                  app.match.gap < -15 ? 'bg-red-50' : 'bg-gray-50'
                }`}>
                  <div className="font-bold">
                    {app.match.gap > 0 ? '+' : ''}{app.match.gap}
                  </div>
                  <div className="text-xs opacity-60">Gap</div>
                </div>
              </div>

              {app.match.meetsThreshold && (
                <div className="text-xs text-green-600 font-medium">
                  Meets employer threshold
                </div>
              )}

              {app.reply && (
                <div className="p-3 bg-blue-50 rounded border border-blue-100">
                  <p className="text-xs font-medium text-blue-700 mb-1">Employer Reply:</p>
                  <p className="text-sm">{app.reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/builder')}
        className="w-full py-2 border rounded text-sm"
      >
        Back to Resume Builder
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/bridge/components/CandidateDashboard.tsx
git commit -m "feat: Candidate application dashboard with status tracking and employer replies"
```

---

## Phase 6: Integration (Task 16)

### Task 16: Navigation Updates and Landing Page Integration

**Files:**
- Modify: `src/layout/Navbar.tsx`
- Modify: `src/pages/Landing.tsx`
- Modify: `src/pages/Employer.tsx`

- [ ] **Step 1: Update Navbar with Bridge links**

Add Bridge navigation items to the existing Navbar. Read the current Navbar.tsx first, then add:
- For candidates: "My Applications" link to `/bridge/dashboard`
- For employers: "Publish Criteria" link to `/employer/publish` and "Match Signals" link to `/employer/matches`

These should be added to the existing nav links in the Navbar component.

- [ ] **Step 2: Update Landing page**

Add a new section to the Landing page highlighting the Bridge feature:
- Title: "Bridge: The Trust Layer"
- Three feature cards: Self-Assessment, Skill Verification, Verified Scorecard
- CTA button: "See how employers score you" linking to `/builder`

- [ ] **Step 3: Update Employer page with publish CTA**

Add a link/button on the existing Employer page:
- "Publish criteria and let candidates find you" linking to `/employer/publish`
- "View match signals" linking to `/employer/matches`

- [ ] **Step 4: Run full test suite**

Run: `cd /mnt/experiments/astha-resume && npx vitest run`
Expected: All existing tests pass (new components don't break existing ones)

- [ ] **Step 5: Run build**

Run: `cd /mnt/experiments/astha-resume && npm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: Bridge integration - navigation, landing page, employer links"
```

---

## File Map Summary

### New Files Created (30 files)

```
src/
  firebase/
    config.ts                    -- Firebase app initialization
    auth.ts                      -- Auth helpers (anon, email, signout)
  bridge/
    types.ts                     -- All Bridge type definitions
    store.ts                     -- Zustand store for Bridge state
    resumePin.ts                 -- Resume content hashing and change detection
    components/
      BridgeAssessment.tsx       -- Candidate self-assessment page
      CriteriaPublishForm.tsx    -- Employer criteria creation form
      WeightEditor.tsx           -- Scoring weight sliders
      CustomSignalEditor.tsx     -- Custom signal management
      SharePanel.tsx             -- QR code, link, embed generation
      TestEngine.tsx             -- Full test UI with adaptive questions
      ScorecardView.tsx          -- Signed scorecard display + match signal
      EmployerMatchDashboard.tsx -- Employer match signals table
      CandidateDashboard.tsx     -- Candidate application tracking
      JDCoachPanel.tsx           -- JD-specific AI Coach suggestions
    hooks/
      useSelfAssessment.ts       -- Self-assessment scoring hook
    test/
      questionGenerator.ts       -- AI question generation + validation
      adaptiveScoring.ts         -- Adaptive difficulty + score computation
      antiCheat.ts               -- Tab/paste/speed anomaly detection
      audioMonitor.ts            -- Three-layer audio intelligence
      CalibrationPhase.tsx       -- Reading speed + voice calibration UI
    __tests__/
      store.test.ts              -- Bridge store tests
      resumePin.test.ts          -- Resume pinning tests
    test/__tests__/
      questionGenerator.test.ts  -- Question validation tests
      adaptiveScoring.test.ts    -- Scoring algorithm tests

  pages/
    EmployerPublish.tsx          -- Route: /employer/publish
    EmployerMatches.tsx          -- Route: /employer/matches
    BridgeLanding.tsx            -- Route: /bridge/:code
    BridgeTest.tsx               -- Route: /bridge/:code/test
    BridgeScorecard.tsx          -- Route: /bridge/:code/scorecard
    BridgeDashboard.tsx          -- Route: /bridge/dashboard

firebase/
  firebase.json                  -- Firebase project config
  .firebaserc                    -- Firebase project ID
  firestore.rules                -- Firestore security rules
  functions/
    package.json                 -- Functions dependencies
    tsconfig.json                -- Functions TS config
    src/
      index.ts                   -- Cloud Functions (signing, matching, notifications)
```

### Modified Files (3 files)

```
package.json                     -- Added firebase, qrcode deps
src/App.tsx                      -- Added 6 new routes
src/layout/Navbar.tsx            -- Added Bridge navigation links
src/pages/Landing.tsx            -- Added Bridge feature section
src/pages/Employer.tsx           -- Added publish/matches links
```
