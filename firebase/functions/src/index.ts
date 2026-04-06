import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { createHmac, randomBytes } from 'crypto';

admin.initializeApp();
const db = admin.firestore();

/**
 * Generate a short alphanumeric code (6 chars, uppercase).
 */
function shortCode(): string {
  return randomBytes(4).toString('base64url').slice(0, 6).toUpperCase();
}

/**
 * publishCriteria - Employer publishes hiring criteria.
 * Generates a short code and signing secret, stores criteria doc.
 */
export const publishCriteria = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

  const data = request.data as {
    jobTitle: string;
    description: string;
    requiredSkills: string[];
    preferredSkills: string[];
    customSignals: { name: string; weight: number; description: string }[];
    weights: Record<string, number>;
    threshold: number;
    testConfig: { skillsToTest: string[]; difficultyFloor: number; questionCount: number };
  };

  if (!data.jobTitle || !data.requiredSkills?.length || !data.weights) {
    throw new HttpsError('invalid-argument', 'jobTitle, requiredSkills, and weights required.');
  }

  const sc = shortCode();
  const signingSecret = randomBytes(32).toString('hex');

  await db.collection('criteria').doc(sc).set({
    shortCode: sc,
    jobTitle: data.jobTitle,
    description: data.description || '',
    requiredSkills: data.requiredSkills,
    preferredSkills: data.preferredSkills || [],
    customSignals: data.customSignals || [],
    weights: data.weights,
    threshold: data.threshold ?? 70,
    testConfig: data.testConfig ?? { skillsToTest: data.requiredSkills.slice(0, 5), difficultyFloor: 1, questionCount: 5 },
    signingSecret,
    employerId: uid,
    employerEmail: request.auth?.token?.email || '',
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });

  return { shortCode: sc };
});

/**
 * startTestSession - Candidate starts a scored session.
 * Validates criteria code, checks resume pin for anti-gaming, creates session.
 */
export const startTestSession = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

  const { criteriaCode, resumePin } = request.data as {
    criteriaCode: string;
    resumePin: string;
  };

  if (!criteriaCode || !resumePin) {
    throw new HttpsError('invalid-argument', 'criteriaCode and resumePin required.');
  }

  // Validate criteria exists and is active
  const criteriaDoc = await db.collection('criteria').doc(criteriaCode).get();
  if (!criteriaDoc.exists || !criteriaDoc.data()?.active) {
    throw new HttpsError('not-found', 'Criteria not found or inactive.');
  }

  // Anti-gaming: block same resume retest for this criteria
  const existing = await db
    .collection('sessions')
    .where('criteriaCode', '==', criteriaCode)
    .where('resumePin', '==', resumePin)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new HttpsError('already-exists', 'This resume was already tested against these criteria.');
  }

  const sessionRef = db.collection('sessions').doc();
  await sessionRef.set({
    candidateId: uid,
    criteriaCode,
    resumePin,
    status: 'active',
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastHeartbeat: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { sessionId: sessionRef.id };
});

/**
 * heartbeat - Keep session alive.
 */
export const heartbeat = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

  const { sessionId } = request.data as { sessionId: string };
  if (!sessionId) throw new HttpsError('invalid-argument', 'sessionId required.');

  const sessionRef = db.collection('sessions').doc(sessionId);
  const session = await sessionRef.get();

  if (!session.exists) {
    throw new HttpsError('not-found', 'Session not found.');
  }
  if (session.data()?.candidateId !== uid) {
    throw new HttpsError('permission-denied', 'Not your session.');
  }
  if (session.data()?.status !== 'active') {
    throw new HttpsError('failed-precondition', 'Session is not active.');
  }

  await sessionRef.update({
    lastHeartbeat: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

/**
 * signScorecard - Validates session + criteria, HMAC-SHA256 signs scorecard, stores it.
 */
export const signScorecard = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

  const data = request.data as {
    version: number;
    criteriaCode: string;
    criteriaHash: string;
    sessionId: string;
    timestamp: string;
    resumeScore: Record<string, unknown>;
    resumePin: Record<string, unknown>;
    verification: Record<string, unknown>;
    integrity: Record<string, unknown>;
    gap: number;
    calibration: Record<string, unknown>;
  };

  if (!data.sessionId || !data.criteriaCode) {
    throw new HttpsError('invalid-argument', 'sessionId and criteriaCode required.');
  }

  // Validate session
  const sessionRef = db.collection('sessions').doc(data.sessionId);
  const session = await sessionRef.get();

  if (!session.exists) throw new HttpsError('not-found', 'Session not found.');
  const sessionData = session.data()!;
  if (sessionData.candidateId !== uid) {
    throw new HttpsError('permission-denied', 'Not your session.');
  }
  if (sessionData.status === 'completed') {
    throw new HttpsError('failed-precondition', 'Session already scored.');
  }

  // Get criteria for signing secret
  const criteriaDoc = await db.collection('criteria').doc(data.criteriaCode).get();
  if (!criteriaDoc.exists) throw new HttpsError('not-found', 'Criteria not found.');
  const criteriaData = criteriaDoc.data()!;

  // Build canonical payload for signing (exclude signature field)
  const canonical = JSON.stringify({
    version: data.version,
    criteriaCode: data.criteriaCode,
    criteriaHash: data.criteriaHash,
    candidateId: uid,
    sessionId: data.sessionId,
    timestamp: data.timestamp,
    resumeScore: data.resumeScore,
    resumePin: data.resumePin,
    verification: data.verification,
    integrity: data.integrity,
    gap: data.gap,
    calibration: data.calibration,
  });

  const signature = createHmac('sha256', criteriaData.signingSecret)
    .update(canonical)
    .digest('hex');

  const scorecardRef = db.collection('scorecards').doc();
  await scorecardRef.set({
    ...JSON.parse(canonical),
    candidateId: uid,
    employerId: criteriaData.employerId,
    signature,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Mark session complete
  await sessionRef.update({ status: 'completed' });

  return { scorecardId: scorecardRef.id, signature };
});

/**
 * sendMatchSignal - Candidate signals interest after seeing their scorecard.
 */
export const sendMatchSignal = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

  const data = request.data as {
    criteriaCode: string;
    scorecardSignature: string;
    contactInfo: { name: string; email: string; phone?: string; linkedin?: string; github?: string };
    resumeScore: number;
    verifiedScore: number;
    integrityScore: number;
    gap: number;
  };

  if (!data.criteriaCode || !data.contactInfo?.name || !data.contactInfo?.email) {
    throw new HttpsError('invalid-argument', 'criteriaCode and contactInfo (name, email) required.');
  }

  // Validate criteria exists
  const criteriaDoc = await db.collection('criteria').doc(data.criteriaCode).get();
  if (!criteriaDoc.exists) throw new HttpsError('not-found', 'Criteria not found.');
  const criteriaData = criteriaDoc.data()!;

  const matchRef = db.collection('matches').doc();
  await matchRef.set({
    matchId: matchRef.id,
    criteriaCode: data.criteriaCode,
    scorecardSignature: data.scorecardSignature,
    candidateId: uid,
    employerId: criteriaData.employerId,
    contactInfo: data.contactInfo,
    resumeScore: data.resumeScore ?? 0,
    verifiedScore: data.verifiedScore ?? 0,
    integrityScore: data.integrityScore ?? 0,
    gap: data.gap ?? 0,
    meetsThreshold: (data.verifiedScore ?? 0) >= (criteriaData.threshold ?? 70),
    status: 'pending',
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { matchId: matchRef.id };
});

/**
 * replyToMatch - Employer responds to a match signal.
 */
export const replyToMatch = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

  const { matchId, message } = request.data as {
    matchId: string;
    message?: string;
  };

  if (!matchId) {
    throw new HttpsError('invalid-argument', 'matchId required.');
  }

  // Validate employer ownership
  const matchDoc = await db.collection('matches').doc(matchId).get();
  if (!matchDoc.exists) throw new HttpsError('not-found', 'Match not found.');
  if (matchDoc.data()?.employerId !== uid) {
    throw new HttpsError('permission-denied', 'Not your match.');
  }

  // One reply per match
  const existing = await db
    .collection('replies')
    .where('matchId', '==', matchId)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new HttpsError('already-exists', 'Already replied to this match.');
  }

  const replyRef = db.collection('replies').doc();
  await replyRef.set({
    matchId,
    employerId: uid,
    candidateId: matchDoc.data()!.candidateId,
    message: message || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update match status
  await db.collection('matches').doc(matchId).update({
    status: 'replied',
  });

  return { replyId: replyRef.id };
});

/**
 * Firestore trigger: when a match is created, notify the employer
 * and queue an email via SendGrid mail collection.
 */
export const onMatchCreated = onDocumentCreated('matches/{matchId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const match = snap.data();
  const matchId = event.params.matchId;

  // Create notification for employer
  await db.collection('notifications').doc().set({
    recipientId: match.employerId,
    type: 'new_match',
    matchId,
    candidateId: match.candidateId,
    criteriaCode: match.criteriaCode,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Queue email via SendGrid mail collection (firebase-extension-sendgrid-email)
  await db.collection('mail').doc().set({
    toUids: [match.employerId],
    message: {
      subject: 'New candidate match on ResumeAI Bridge',
      text: `A candidate has expressed interest via criteria ${match.criteriaCode}. Log in to review the match.`,
      html: `<p>A candidate has expressed interest via criteria <strong>${match.criteriaCode}</strong>.</p><p>Log in to review the match.</p>`,
    },
  });
});
