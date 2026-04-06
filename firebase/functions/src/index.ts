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

  const { title, criteria, weights } = request.data as {
    title: string;
    criteria: Record<string, number>;
    weights: Record<string, number>;
  };

  if (!title || !criteria || !weights) {
    throw new HttpsError('invalid-argument', 'title, criteria, and weights required.');
  }

  const code = shortCode();
  const signingSecret = randomBytes(32).toString('hex');

  await db.collection('criteria').doc(code).set({
    code,
    title,
    criteria,
    weights,
    signingSecret,
    employerId: uid,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { code };
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

  const { sessionId, scores, summary } = request.data as {
    sessionId: string;
    scores: Record<string, number>;
    summary: string;
  };

  if (!sessionId || !scores) {
    throw new HttpsError('invalid-argument', 'sessionId and scores required.');
  }

  // Validate session
  const sessionRef = db.collection('sessions').doc(sessionId);
  const session = await sessionRef.get();

  if (!session.exists) throw new HttpsError('not-found', 'Session not found.');
  const sessionData = session.data()!;
  if (sessionData.candidateId !== uid) {
    throw new HttpsError('permission-denied', 'Not your session.');
  }
  if (sessionData.status !== 'active') {
    throw new HttpsError('failed-precondition', 'Session not active.');
  }

  // Get criteria for signing secret and employer ID
  const criteriaDoc = await db.collection('criteria').doc(sessionData.criteriaCode).get();
  if (!criteriaDoc.exists) throw new HttpsError('not-found', 'Criteria not found.');
  const criteriaData = criteriaDoc.data()!;

  // Build payload and sign with HMAC-SHA256
  const payload = {
    sessionId,
    candidateId: uid,
    criteriaCode: sessionData.criteriaCode,
    scores,
    summary: summary || '',
    timestamp: Date.now(),
  };

  const signature = createHmac('sha256', criteriaData.signingSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  const scorecardRef = db.collection('scorecards').doc();
  await scorecardRef.set({
    ...payload,
    signature,
    employerId: criteriaData.employerId,
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

  const { scorecardId, message } = request.data as {
    scorecardId: string;
    message?: string;
  };

  if (!scorecardId) throw new HttpsError('invalid-argument', 'scorecardId required.');

  // Validate scorecard ownership
  const scorecardDoc = await db.collection('scorecards').doc(scorecardId).get();
  if (!scorecardDoc.exists) throw new HttpsError('not-found', 'Scorecard not found.');
  if (scorecardDoc.data()?.candidateId !== uid) {
    throw new HttpsError('permission-denied', 'Not your scorecard.');
  }

  const matchRef = db.collection('matches').doc();
  await matchRef.set({
    scorecardId,
    candidateId: uid,
    employerId: scorecardDoc.data()!.employerId,
    criteriaCode: scorecardDoc.data()!.criteriaCode,
    message: message || '',
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { matchId: matchRef.id };
});

/**
 * replyToMatch - Employer responds to a match signal.
 */
export const replyToMatch = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

  const { matchId, accepted, message } = request.data as {
    matchId: string;
    accepted: boolean;
    message?: string;
  };

  if (!matchId || typeof accepted !== 'boolean') {
    throw new HttpsError('invalid-argument', 'matchId and accepted required.');
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
    accepted,
    message: message || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update match status
  await db.collection('matches').doc(matchId).update({
    status: accepted ? 'accepted' : 'declined',
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
