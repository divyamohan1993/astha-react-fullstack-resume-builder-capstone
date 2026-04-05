# ResumeAI Bridge - Design Specification

**Date:** 2026-04-05
**Status:** Approved
**Author:** Divya Mohan

## 1. Problem Statement

The hiring ecosystem has a broken feedback loop. 75% of applicants never hear back. 0.4% callback rate. 56% of applicants lie on resumes. No platform connects resume building, employer screening, and skill verification into a single trust layer.

Existing platforms serve one side only. Resume builders are candidate-only. ATS tools are employer-only. Assessment platforms don't connect to resumes. The gap between "what candidates claim" and "what candidates can do" has no bridge.

## 2. Solution: Bridge

A trust layer connecting the candidate and employer sides of ResumeAI through three mechanisms:

1. **Self-Assessment** -- candidate runs the full employer scoring pipeline on their own resume against a specific JD
2. **Skill Verification Test** -- adaptive, anti-cheat, timed test proving claimed skills are real
3. **Signed Scorecard** -- cryptographically verified proof of competence shared with employers

### 2.1 USP

No platform in the market combines resume building + employer screening + skill verification + cryptographic trust in one offline-first application. The Gap metric (Resume Score minus Verified Skill Score) is a novel signal that instantly exposes resume inflation and surfaces underrated candidates.

## 3. Architecture

### 3.1 Infrastructure

| Service | Purpose | Cost |
|---------|---------|------|
| Firebase Auth | Anonymous auth for candidates, email auth for employers | Free tier |
| Firebase Firestore | Criteria storage, scorecards, match signals | Free tier (50K reads/day) |
| Firebase Cloud Functions | Scorecard signing, email notifications, webhook relay | Free tier (2M invocations/month) |
| Firebase Hosting | Static PWA, embeddable widget | Free tier (10GB/month) |
| SendGrid (Firebase Extension) | Email notifications | Free tier (100/day) |

Total cost: $0 at moderate scale (1000 candidates/month).

### 3.2 Client-Server Split

| Runs Client-Side (offline OK) | Requires Internet |
|-------------------------------|-------------------|
| Resume building | Criteria publishing (employer) |
| Resume scoring against JD | Criteria loading (single fetch, then cached) |
| AI Coach suggestions | Skill verification test |
| Fix-it rewrites | Scorecard signing |
| PDF/print export | Match signal sending |
| All NLP/TF-IDF/scoring pipeline | Email/webhook notifications |

## 4. Employer Flow

### 4.1 Criteria Publishing

Employer creates job criteria consisting of:

- Job title and description
- Required skills (extracted from JD or manually added)
- Preferred skills
- Custom weights per scoring parameter (defaults to research-backed weights)
- Custom scoring signals beyond the 9 existing parameters (e.g., "open source contributions", "startup experience")
- Score threshold for match notifications
- Test configuration: which skills to test, question count, difficulty floor

Research-backed default weights are always shown alongside custom weights so employers understand how their priorities differ from industry norms.

### 4.2 Sharing

On publish, the system generates:

- **Short code**: 6-character alphanumeric (e.g., `R7Kx3m`)
- **Full URL**: `app.domain/bridge/R7Kx3m`
- **QR code**: generated client-side via `qrcode` library, downloadable as 300dpi PNG for print
- **Embed snippet**: `<iframe>` code for careers pages (~5KB static HTML widget showing job title, skills, "Score yourself" button)

### 4.3 Firestore Schema -- Criteria Document

```
/criteria/{shortCode}
  jobTitle: string
  description: string
  requiredSkills: string[]
  preferredSkills: string[]
  customSignals: {name: string, weight: number, description: string}[]
  weights: Record<string, number>
  threshold: number
  testConfig: {skillsToTest: string[], difficultyFloor: number, questionCount: number}
  employerId: string
  createdAt: timestamp
  expiresAt: timestamp (default 90 days)
  status: "active" | "paused" | "closed"
```

### 4.4 Employer Dashboard -- Match Signals View

Columns: Name, Resume Score, Verified Score, Integrity Score, Gap, Per-Skill Breakdown, Attempt Count, Timestamp, Actions (View Scorecard, Reply).

Filters: score thresholds, integrity minimum, gap range.

Sort: by any column.

Reply: single one-way message stored in Firestore. Not a chat system.

Attempt history: when a candidate has multiple attempts (due to resume modification), all attempts are visible with resume change percentage and pattern flags.

## 5. Candidate Flow

### 5.1 Self-Assessment

1. Candidate scans QR or clicks link
2. Criteria loaded from Firestore (single read, cached in IndexedDB)
3. Full employer scoring pipeline runs locally on candidate's resume
4. Candidate sees the exact breakdown an employer would see: overall score, per-parameter scores with weights, keyword analysis (matched/missing/semantic), red flags

### 5.2 AI Coach -- JD-Specific Fix-It Mode

The existing AI Coach is enhanced to generate suggestions targeted to the specific JD:

- For each gap identified in self-assessment, the coach generates specific bullet point rewrites using the candidate's actual experience
- Suggestions are accept/reject inline -- candidate taps to apply a rewrite directly into their resume
- Coach prioritizes by impact: which fix would increase the score the most
- After applying fixes, candidate re-runs self-assessment to see the improvement

### 5.3 Skill Verification Test

See sections 6-9 below for full test engine specification.

### 5.4 Match Signal

When candidate's verified score crosses the employer's threshold:

1. Candidate sees: "Your verified score meets this employer's threshold. Send match signal?"
2. Candidate chooses contact info to share: name + email (required), phone/LinkedIn/GitHub (optional)
3. Match signal written to Firestore
4. Employer notified via in-app dashboard + email + optional webhook

### 5.5 Candidate Dashboard

Shows all sent match signals with:

- Employer/job title
- Resume score, verified score, integrity score at time of signal
- Signal status: Pending / Employer Viewed / Replied
- Employer reply message (if any)

## 6. Skill Verification Test Engine

### 6.1 Test Generation

Questions generated via Gemini API based on two inputs:

- Employer's required skills from criteria
- Candidate's specific resume claims (pinned at test start)

Three question types:

- **Concept**: "What happens when..." / "Why would you..." -- tests understanding
- **Scenario**: "Given this code/situation, what's wrong?" -- tests applied skill
- **Micro-challenge**: small code/logic problem inline -- tests hands-on ability

Questions are personalized to the resume. If candidate claims "built a REST API with Node.js", questions probe that specific claim.

Difficulty scales with claimed experience level: fresher gets fundamentals, 3+ years gets architecture and edge cases.

### 6.2 Question Design Constraints

Rules enforced in the generation prompt and validated post-generation:

1. **Character count variance < 20%** across all 4 options
2. **No qualifier stacking** -- correct answer cannot contain more adjectives/qualifiers than distractors
3. **Randomized verbosity** -- sometimes a distractor is longest, sometimes correct answer is shortest. Uniform distribution.
4. **No "all of the above" / "none of the above"**
5. **Distractor quality** -- wrong options target specific misconceptions, not absurd answers
6. **Plain language** -- simplest phrasing that's technically accurate

Post-generation validation pass rejects questions where:

- Option character count variance > 20%
- Correct option is the longest
- Correct option has more commas/semicolons than any distractor

Failed questions are regenerated.

Questions rendered as styled HTML with slight letter-spacing variation and mixed font weights on non-critical words to reduce OCR accuracy. Option positions shuffled per session.

### 6.3 Adaptive Difficulty

```
Level 1 (Fundamentals)
  Correct -> Level 2 (Applied)
    Correct -> Level 3 (Architecture/Edge Cases)
      Correct -> Level 4 (Expert/Tradeoffs)
        Correct -> Level 5 (Novel Problem)
        Wrong -> stay L4, one more chance
      Wrong -> stay L3, one more chance
    Wrong -> stay L2, one more chance
  Wrong -> stay L1, one more chance
```

Each skill tested independently with its own adaptive ladder.

### 6.4 Scoring Formula

Level multipliers: L1=1x, L2=1.5x, L3=2.5x, L4=4x, L5=6x.

Raw score = sum of (level_multiplier * correctness) across all questions.

Normalized to 0-100 against maximum possible if all correct at escalating levels.

Sustained performance bonus: 3+ consecutive correct at L3+ triggers 1.15x multiplier.

Score ceilings:

| Max Reachable Score | Requires |
|---------------------|----------|
| ~45% | All L1-L2 correct, fail at L3 |
| ~75% | Sustained L3, some L4 |
| ~90% | Sustained L4, some L5 |
| 100% | Sustained L5 performance |

Score bands:

| Range | Interpretation |
|-------|---------------|
| 0-30% | Fundamentals shaky. Claims likely inflated. |
| 31-50% | Knows basics. Can do guided work. |
| 51-75% | Solid applied knowledge. Resume claims credible. |
| 76-90% | Strong. Exceeded claimed skill level. |
| 91-100% | Exceptional. Deep expertise demonstrated. |

### 6.5 Dynamic Timing

Pre-test calibration measures candidate's reading speed (WPM). See section 7.

Per-question time = `(total_word_count / candidate_wpm * 60) + answer_buffer`

Answer buffer by type: Concept 3s, Scenario 5s, Micro-challenge 8s. Floor: 10s minimum.

Time scales with difficulty:

| Level | Time Modifier |
|-------|--------------|
| L1 | 1.0x (calibrated time) |
| L2 | 0.9x |
| L3 | 1.0x (harder content, fair time) |
| L4-L5 | 1.1x (hard questions need thought, not Google) |

Total test duration: 15-25 minutes.

## 7. Pre-Test Calibration Phase (30 seconds)

### 7.1 Reading Speed (15s)

1. Display a 40-60 word technical paragraph relevant to the test domain
2. Candidate clicks "Done Reading"
3. Calculate personal WPM = word_count / time_elapsed * 60
4. All subsequent timers use this WPM
5. If click is suspiciously fast (<3s for 50 words), show a second calibration paragraph

### 7.2 Voice Baseline (15s)

1. Prompt: "Read the following sentence aloud clearly. This calibrates your voice profile for test integrity."
2. Candidate reads a neutral sentence into the microphone
3. What actually happens:
   - Capture ambient noise baseline (dB level)
   - NO voice fingerprint is created. NO voice data is stored. NO biometrics.
   - The psychological deterrent: candidate believes voice is fingerprinted
4. If mic permission denied: test proceeds, integrity score notes "mic denied"

## 8. Anti-Cheat System

### 8.1 Design Philosophy

Make cheating slower than knowing. No invasive proctoring, no webcam, no screen recording. Pressure-based deterrence + silent logging. Candidate is never told they're being flagged.

### 8.2 Silent Flag Events

All flags logged with timestamp, event type, and contextual data. No UI indication.

| Signal | Detection Method | Integrity Impact |
|--------|-----------------|-----------------|
| Tab switch / window blur | `visibilitychange` + `blur` events | -5% per occurrence |
| Paste into answer | `paste` event | -8% per occurrence |
| Fullscreen exit (if was fullscreen) | `fullscreenchange` event | -3% per occurrence |
| Speed anomaly (<0.3x calibrated read time, correct answer) | WPM ratio calculation | -10% per occurrence |
| Speed anomaly (0.3x-0.5x, correct answer) | WPM ratio calculation | -4% per occurrence |
| Speed anomaly + tab invisible in prior 10s + correct | Compound correlation | -15% per occurrence |
| Speech detected (single burst 2-5s) | Audio spectral analysis | -1% per occurrence |
| Conversational speech pattern (repeated bursts with pauses) | Audio temporal analysis | -5% per 30s window |
| Continuous speech >10s | Audio energy + formant detection | -8% per occurrence |
| Whisper-level speech (low energy, formant structure) | Low-energy formant detection | -6% per occurrence |
| Speech + tab switch within 5s | Compound correlation | -12% per occurrence |
| Background music with vocals | Sustained formant pattern | -1% flat, no compounding |

### 8.3 What Is Never Flagged

- Coughs, sneezes, throat clearing (impulse, no formant rhythm)
- Keyboard/mouse clicks (wrong frequency band, 2000-8000Hz)
- Construction, hammering (broadband impulse, strong <200Hz, no syllabic modulation)
- Traffic (continuous low-frequency rumble, no formant peaks)
- Door slams (single impulse, immediate decay)
- Fan/AC (narrow band, continuous)
- Rain, wind (broadband continuous, no modulation)

### 8.4 Audio Intelligence -- Three-Layer Classification

All processing runs client-side in an AudioWorklet. Zero audio data leaves the device. Only flag events (timestamp + type + dB delta) are stored.

**Layer 1 -- Spectral Analysis:**
Human speech: 300-3400Hz with formant peaks at ~500/1500/2500Hz.
Environmental noise: different spectral signatures (hammer = broadband + strong <200Hz; traffic = 50-500Hz rumble; typing = 2000-8000Hz clicks).

**Layer 2 -- Temporal Pattern Recognition:**
Speech has syllabic rhythm: energy peaks at 3-8Hz modulation rate (universal across languages).
Compute modulation spectrum over 2-second sliding windows.
Peak modulation in 3-8Hz band AND energy in 300-3400Hz band = likely speech.
Hammering: impulse/silence/impulse pattern, modulation below 2Hz, irregular.

**Layer 3 -- Adaptive Baseline:**
Initial baseline from 15s calibration.
Rolling 60-second window recalibrates baseline continuously.
Construction starts mid-test? Baseline rises within 60s. No false flags.
Distinguishes environment change (sustained non-speech elevation) from cheating (burst speech patterns).

Decision matrix:

```
Sound event detected
  -> Spectral: formant peaks in 300-3400Hz?
      YES -> Temporal: syllabic modulation 3-8Hz?
          YES -> Speech detected -> FLAG (silent)
          NO  -> Non-speech vocalization (cough) -> IGNORE
      NO  -> Environmental sound
          Impulse (<200ms)? -> Hammer/slam -> IGNORE
          Continuous (>30s)? -> Ambient shift -> RECALIBRATE baseline
          Intermittent non-speech? -> LOG, no penalty
```

### 8.5 Speed Anomaly Detection

Uses calibrated WPM as the baseline for anomaly detection:

```
Calibrated WPM: 120
Question total words: 160
Expected read time: 80s
Candidate submits in: 5s
Actual WPM: 1920
Ratio: 1920/120 = 16x calibrated speed
Classification: Impossible without external tool (-10%)
```

Thresholds:

| Ratio (actual vs calibrated) | Classification | Penalty |
|------------------------------|---------------|---------|
| < 0.3x expected read time | Impossible without external tool | -10% |
| 0.3x - 0.5x | Highly suspicious | -4% |
| 0.5x - 0.8x | Fast but plausible | Logged, no penalty |
| 0.8x - 1.5x | Normal range | Clean |
| > 2.0x | Unusually slow | Logged, no penalty |

### 8.6 Online-Only Enforcement

- Test requires active internet. `navigator.onLine` check + heartbeat ping to Firebase every 30s.
- Connection drop: timer pauses for 10s grace, then test suspended. Can resume once.
- Prevents offline rehearsal / online replay attack. Questions generated fresh per session, server-validated.
- Self-assessment (resume scoring + AI coach) remains fully offline.

## 9. Resume Pinning -- Anti-Gaming Lock

### 9.1 Content Hash

At test start, the system captures a SHA-256 hash of normalized resume content (lowercase, whitespace-collapsed, punctuation-stripped). This hash is embedded in the test session and signed scorecard.

The resume score on the scorecard is the score AT THE TIME OF THE TEST.

### 9.2 Pinned Data

```json
{
  "resumePin": {
    "hash": "sha256 of normalized resume content",
    "scoreAtTest": 65,
    "sections": ["education", "experience", "projects", "skills"],
    "skillsClaimed": ["React", "Node.js", "SQL", "Docker"]
  }
}
```

### 9.3 Retest Rules

Content similarity computed via Jaccard on word-level trigrams.

| Change | Treatment |
|--------|----------|
| < 10% content change | Same resume. Retest blocked. |
| 10-30% change | Moderate edit. Retest allowed. Employer sees "Resume modified, retested" badge. Both scorecards visible. |
| > 30% change | Substantial rewrite. New test. Old scorecard marked "superseded." Full history visible. |

### 9.4 Pattern Detection

Employer sees all attempts with flags:

- Resume score increased significantly but verified score dropped or stayed flat -> "Resume inflation without skill growth" flag
- Resume score increased AND verified score increased -> legitimate improvement, no flag
- New skills added to resume after test -> "X skills added post-test, not verified" annotation

### 9.5 Gap Analysis

Gap = Resume Score - Verified Skill Score.

| Gap | Signal |
|-----|--------|
| Large negative (e.g., -30) | Resume claims far exceed demonstrated ability. Red flag. |
| Near zero (e.g., -5 to +5) | Candidate is who they say they are. Trust signal. |
| Positive (e.g., +15) | Candidate is better than their resume shows. Hidden gem. |

## 10. Cryptographically Signed Scorecard

### 10.1 Payload

```json
{
  "version": 1,
  "criteriaCode": "R7Kx3m",
  "criteriaHash": "sha256 of criteria JSON at time of test",
  "candidateId": "firebase anonymous UID",
  "sessionId": "unique per test session, generated server-side",
  "timestamp": "ISO 8601",
  "resumeScore": {
    "overall": 72,
    "breakdown": {
      "skillsMatch": {"raw": 80, "weighted": 24, "weight": 30},
      "experience": {"raw": 65, "weighted": 13, "weight": 20}
    }
  },
  "resumePin": {
    "hash": "sha256",
    "scoreAtTest": 72,
    "skillsClaimed": ["React", "Node.js", "SQL"]
  },
  "verification": {
    "overall": 85,
    "perSkill": [
      {"skill": "React", "score": 82, "peakLevel": 3, "questionsAttempted": 6},
      {"skill": "Node.js", "score": 88, "peakLevel": 4, "questionsAttempted": 7}
    ],
    "totalQuestions": 25,
    "duration": 1080
  },
  "integrity": {
    "score": 94,
    "micPermission": true,
    "flags": [
      {"type": "tabSwitch", "timestamp": "...", "penalty": 5},
      {"type": "speedAnomaly", "timestamp": "...", "ratio": 3.2, "penalty": 4}
    ],
    "flagSummary": {"tabSwitch": 1, "speedAnomaly": 1, "audioEvent": 0}
  },
  "gap": -13,
  "calibration": {"wpm": 134},
  "signature": "HMAC-SHA256"
}
```

### 10.2 Signing Flow

1. Client assembles scorecard JSON (without signature)
2. Client sends payload to Firebase Cloud Function
3. Cloud Function validates: criteriaCode exists and is active, criteriaHash matches current criteria, test session exists and timestamps are consistent
4. Cloud Function signs with per-criteria HMAC-SHA256 secret
5. Signed scorecard stored in Firestore
6. Returned to client, cached in IndexedDB

### 10.3 Anti-Replay

- Each test session gets a unique `sessionId` generated server-side at test start
- A session produces exactly one scorecard. Second attempt rejected.
- Criteria hash pins scorecard to the exact criteria version. If employer updates criteria, old scorecards annotated with "scored against v1, current is v2"

### 10.4 Candidate Privacy

- `candidateId` is a Firebase anonymous auth UID -- not name/email/phone
- Contact info revealed ONLY when candidate explicitly sends a match signal
- Candidate controls what to share: name + email (required), phone/LinkedIn/GitHub (optional)

## 11. Match Notification System

### 11.1 Trigger

Candidate's verified score crosses employer's configured threshold AND candidate opts to send the signal.

### 11.2 Notification Channels

| Channel | Mechanism |
|---------|-----------|
| In-app dashboard | Firestore `onSnapshot` real-time listener |
| Email | Cloud Function triggered on Firestore write, sends via SendGrid |
| Webhook | Cloud Function POSTs to employer-configured URL |

### 11.3 Employer Reply

Single one-way message stored in Firestore per match signal. Not a chat system. "We'd like to schedule an interview" or "Not a fit right now." One reply per match signal, one direction. Employer can reply to different match signals from the same candidate independently.

### 11.4 Candidate Dashboard

Shows all sent signals with: employer/job title, scores at time of signal, status (Pending / Viewed / Replied), employer reply if any.

## 12. Cross-Device Responsive Design

### 12.1 Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| Phone | < 640px | Full-width question, stacked options, sticky top timer |
| Tablet | 640-1024px | Centered column (max 680px), 2-col options if short |
| Desktop | > 1024px | Centered column (max 720px), single-col options |

### 12.2 Universal Constraints

- All touch targets >= 48x48px (WCAG 2.2 AAA)
- Font size: 18px minimum on phone, 20px on desktop
- High contrast mode (`prefers-contrast` media query)
- Reduced motion: no animations on timer, just numbers
- Screen reader: timer announced at 50% and 10% via `aria-live`
- Works in portrait and landscape, no orientation lock
- `beforeunload` handler warns on close during test
- Fullscreen API requested (not required), exiting logged

## 13. Data Model Additions

### 13.1 New Firestore Collections

```
/criteria/{shortCode}          -- employer published criteria (see 4.3)
/sessions/{sessionId}          -- test sessions with question hashes, timing data
/scorecards/{scorecardId}      -- signed scorecards
/matches/{matchId}             -- match signals with contact info
/replies/{replyId}             -- employer replies to match signals
```

### 13.2 New Client-Side Types (TypeScript)

```typescript
interface BridgeCriteria {
  shortCode: string
  jobTitle: string
  description: string
  requiredSkills: string[]
  preferredSkills: string[]
  customSignals: CustomSignal[]
  weights: Record<string, number>
  threshold: number
  testConfig: TestConfig
  employerId: string
  createdAt: Date
  expiresAt: Date
  status: 'active' | 'paused' | 'closed'
}

interface CustomSignal {
  name: string
  weight: number
  description: string
}

interface TestConfig {
  skillsToTest: string[]
  difficultyFloor: number
  questionCount: number
}

interface TestSession {
  sessionId: string
  criteriaCode: string
  candidateId: string
  resumePin: ResumePin
  calibration: Calibration
  questions: GeneratedQuestion[]
  responses: QuestionResponse[]
  flags: IntegrityFlag[]
  audioFlags: AudioFlag[]
  startedAt: Date
  completedAt: Date | null
  status: 'calibrating' | 'in_progress' | 'suspended' | 'completed'
}

interface ResumePin {
  hash: string
  scoreAtTest: number
  sections: string[]
  skillsClaimed: string[]
}

interface Calibration {
  wpm: number
  ambientDb: number
  micPermission: boolean
}

interface GeneratedQuestion {
  id: string
  skill: string
  type: 'concept' | 'scenario' | 'micro-challenge'
  level: 1 | 2 | 3 | 4 | 5
  text: string
  options: QuestionOption[]
  correctIndex: number
  timeAllotted: number
  wordCount: number
}

interface QuestionOption {
  text: string
  charCount: number
}

interface QuestionResponse {
  questionId: string
  selectedIndex: number
  correct: boolean
  timeElapsed: number
  expectedReadTime: number
  wpmRatio: number
}

interface IntegrityFlag {
  type: 'tabSwitch' | 'paste' | 'fullscreenExit' | 'speedAnomaly' | 'compoundAnomaly'
  timestamp: Date
  penalty: number
  metadata: Record<string, unknown>
}

interface AudioFlag {
  type: 'speechBurst' | 'conversation' | 'continuousSpeech' | 'whisper' | 'speechPlusTabSwitch'
  timestamp: Date
  durationMs: number
  dbDelta: number
  penalty: number
}

interface SignedScorecard {
  version: number
  criteriaCode: string
  criteriaHash: string
  candidateId: string
  sessionId: string
  timestamp: Date
  resumeScore: ScoreBreakdown
  resumePin: ResumePin
  verification: VerificationResult
  integrity: IntegrityResult
  gap: number
  calibration: Calibration
  signature: string
}

interface VerificationResult {
  overall: number
  perSkill: SkillVerification[]
  totalQuestions: number
  duration: number
}

interface SkillVerification {
  skill: string
  score: number
  peakLevel: number
  questionsAttempted: number
}

interface IntegrityResult {
  score: number
  micPermission: boolean
  flags: IntegrityFlag[]
  audioFlags: AudioFlag[]
  flagSummary: Record<string, number>
}

interface MatchSignal {
  matchId: string
  criteriaCode: string
  scorecardId: string
  candidateId: string
  contactInfo: ContactInfo
  sentAt: Date
  status: 'pending' | 'viewed' | 'replied'
}

interface ContactInfo {
  name: string
  email: string
  phone?: string
  linkedin?: string
  github?: string
}

interface EmployerReply {
  replyId: string
  matchId: string
  message: string
  sentAt: Date
}
```

## 14. New Routes

| Route | Page | Mode |
|-------|------|------|
| `/bridge/:code` | Candidate: load criteria, self-assess, take test | Candidate |
| `/bridge/:code/test` | Skill verification test engine | Candidate |
| `/bridge/:code/scorecard` | View signed scorecard | Candidate |
| `/bridge/dashboard` | Candidate application tracking | Candidate |
| `/employer/publish` | Create and publish criteria | Employer |
| `/employer/matches` | Match signals dashboard | Employer |
| `/employer/matches/:id` | Individual scorecard view | Employer |

## 15. Security Considerations

- HMAC signing secrets stored only in Cloud Functions environment variables (not in Firestore), never client-accessible
- Firestore security rules: candidates can only read criteria documents, not write. Only Cloud Functions can write scorecards.
- No audio data stored or transmitted. Only numeric flag events.
- Candidate identity anonymous until explicit opt-in via match signal.
- Rate limiting on Cloud Functions: max 5 test sessions per candidate per criteria per 24 hours.
- Question generation prompts never expose correct answers in client-accessible logs.
- All Firestore queries scoped by authenticated user ID.

## 16. Competitive Position

| Feature | ResumeAI Bridge | Resume.io | Teal | LinkedIn | HackerRank |
|---------|----------------|-----------|------|----------|------------|
| Resume builder | Yes | Yes | Yes | Yes | No |
| Employer screening | Yes | No | No | Yes | No |
| Self-assessment against employer criteria | Yes | No | No | No | No |
| Research-cited scoring | Yes | No | No | No | No |
| Adaptive skill verification | Yes | No | No | No | Yes (but standalone) |
| Anti-cheat with audio intelligence | Yes | No | No | No | Partial |
| Cryptographic scorecard | Yes | No | No | No | No |
| Gap analysis (resume vs verified) | Yes | No | No | No | No |
| Resume pinning (anti-gaming) | Yes | No | No | No | No |
| Offline-first | Yes | No | No | No | No |
| Free forever | Yes | No | No | Freemium | No |
