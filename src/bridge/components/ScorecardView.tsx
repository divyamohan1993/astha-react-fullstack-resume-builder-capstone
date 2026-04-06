/**
 * Scorecard View -- post-test results with signed scorecard, gap analysis, and match signal.
 *
 * Rendered after TestEngine completes. Receives verification + integrity from location.state.
 * Signs scorecard via Cloud Function, displays three-score summary, per-skill breakdown,
 * and match signal flow for candidates to share results with employers.
 */

import { useEffect, useState, useCallback, useRef, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initFirebase, isFirebaseConfigured } from '../../firebase/config';
import { getCurrentUser } from '../../firebase/auth';
import { useBridgeStore } from '../store';
import type {
  VerificationResult,
  IntegrityResult,
  ContactInfo,
  SignedScorecard,
  DifficultyLevel,
} from '../types';

interface Props {
  criteriaCode: string;
}

interface LocationState {
  verification: VerificationResult;
  integrity: IntegrityResult;
}

async function hashString(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const LEVEL_LABELS: Record<DifficultyLevel, string> = {
  1: 'Foundational',
  2: 'Applied',
  3: 'Proficient',
  4: 'Advanced',
  5: 'Expert',
};

function gapColor(gap: number): string {
  if (gap >= 0) return 'text-green-700';
  if (gap > -15) return 'text-yellow-700';
  return 'text-red-700';
}

function gapBg(gap: number): string {
  if (gap >= 0) return 'bg-green-50 border-green-200';
  if (gap > -15) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

function gapInterpretation(gap: number): string {
  if (gap > 5)
    return 'Your skills exceed what your resume shows. You are underrated.';
  if (gap >= -5)
    return 'Your resume accurately represents your skill level. Strong trust signal.';
  return 'Your resume claims exceed your demonstrated skills.';
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec}s`;
}

export function ScorecardView({ criteriaCode }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | undefined;

  const criteria = useBridgeStore((s) => s.criteria);
  const selfAssessment = useBridgeStore((s) => s.selfAssessment);
  const testSession = useBridgeStore((s) => s.testSession);
  const scorecard = useBridgeStore((s) => s.scorecard);
  const setScorecard = useBridgeStore((s) => s.setScorecard);

  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [matchExpanded, setMatchExpanded] = useState(false);
  const [matchSending, setMatchSending] = useState(false);
  const [matchSent, setMatchSent] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const signAttempted = useRef(false);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactLinkedin, setContactLinkedin] = useState('');
  const [contactGithub, setContactGithub] = useState('');

  // Derived values
  const verification = scorecard?.verification ?? state?.verification;
  const resumeScore = selfAssessment?.overall ?? scorecard?.resumeScore?.overall ?? 0;
  const verifiedScore = verification?.overall ?? 0;
  const gap = resumeScore - verifiedScore;

  // Sign scorecard on mount
  useEffect(() => {
    if (scorecard) return;
    if (signAttempted.current) return;
    if (!state?.verification || !state?.integrity) return;
    if (!criteria || !testSession || !selfAssessment) return;

    signAttempted.current = true;

    async function sign() {
      setSigning(true);
      setSignError(null);

      try {
        if (!isFirebaseConfigured()) {
          setSignError('Firebase not configured. Scorecard cannot be signed.');
          setSigning(false);
          return;
        }
        const criteriaHash = await hashString(JSON.stringify(criteria));
        const user = getCurrentUser();
        const payload = {
          version: 1,
          criteriaCode,
          criteriaHash,
          candidateId: user?.uid ?? testSession!.candidateId,
          sessionId: testSession!.sessionId,
          timestamp: new Date().toISOString(),
          resumeScore: selfAssessment!,
          resumePin: testSession!.resumePin,
          verification: state!.verification,
          integrity: state!.integrity,
          gap: selfAssessment!.overall - state!.verification.overall,
          calibration: testSession!.calibration,
        };

        const { app } = initFirebase();
        const functions = getFunctions(app);
        const signFn = httpsCallable<typeof payload, { signature: string }>(
          functions,
          'signScorecard',
        );
        const result = await signFn(payload);

        const signed: SignedScorecard = {
          ...payload,
          signature: result.data.signature,
        };
        setScorecard(signed);
      } catch (err) {
        setSignError(
          err instanceof Error ? err.message : 'Failed to sign scorecard.',
        );
      } finally {
        setSigning(false);
      }
    }

    sign();
  }, [scorecard, state, criteria, testSession, selfAssessment, criteriaCode, setScorecard]);

  const handleMatchSignal = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!scorecard || !criteria) return;

      setMatchSending(true);
      setMatchError(null);

      try {
        const contactInfo: ContactInfo = {
          name: contactName.trim(),
          email: contactEmail.trim(),
          ...(contactPhone.trim() && { phone: contactPhone.trim() }),
          ...(contactLinkedin.trim() && { linkedin: contactLinkedin.trim() }),
          ...(contactGithub.trim() && { github: contactGithub.trim() }),
        };

        const { app } = initFirebase();
        const functions = getFunctions(app);
        const sendFn = httpsCallable(functions, 'sendMatchSignal');
        await sendFn({
          criteriaCode,
          scorecardSignature: scorecard.signature,
          contactInfo,
          resumeScore: scorecard.resumeScore.overall,
          verifiedScore: scorecard.verification.overall,
          integrityScore: scorecard.integrity.score,
          gap: scorecard.gap,
        });

        setMatchSent(true);
      } catch (err) {
        setMatchError(
          err instanceof Error ? err.message : 'Failed to send match signal.',
        );
      } finally {
        setMatchSending(false);
      }
    },
    [scorecard, criteria, criteriaCode, contactName, contactEmail, contactPhone, contactLinkedin, contactGithub],
  );

  // Missing data guard
  if (!verification || !selfAssessment) {
    return (
      <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-6" role="alert">
        <h2 className="text-lg font-semibold text-yellow-800">Scorecard unavailable</h2>
        <p className="mt-2 text-sm text-yellow-700">
          Test results not found. Complete a test first to view your scorecard.
        </p>
        <button
          type="button"
          onClick={() => navigate(`/bridge/${criteriaCode}`)}
          className="mt-4 rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
        >
          Back to assessment
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" role="main" aria-label="Test scorecard">
      {/* Signing status */}
      {signing && (
        <div className="flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-700" role="status">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Signing scorecard...
        </div>
      )}
      {signError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {signError}
        </div>
      )}

      {/* Three-score summary */}
      <section aria-labelledby="score-summary-heading">
        <h2 id="score-summary-heading" className="text-xl font-bold text-gray-900">
          Score Summary
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
            <p className="text-sm font-medium text-blue-600">Resume Score</p>
            <p className="mt-1 text-3xl font-bold text-blue-800">
              {Math.round(resumeScore)}
            </p>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-center">
            <p className="text-sm font-medium text-purple-600">Verified Skills</p>
            <p className="mt-1 text-3xl font-bold text-purple-800">
              {Math.round(verifiedScore)}
            </p>
          </div>
          <div className={`rounded-lg border p-4 text-center ${gapBg(gap)}`}>
            <p className="text-sm font-medium text-gray-600">Gap</p>
            <p className={`mt-1 text-3xl font-bold ${gapColor(gap)}`}>
              {gap > 0 ? '+' : ''}{Math.round(gap)}
            </p>
          </div>
        </div>
      </section>

      {/* Gap interpretation */}
      <section
        className={`rounded-lg border p-4 ${gapBg(gap)}`}
        aria-label="Gap interpretation"
      >
        <p className={`text-sm font-medium ${gapColor(gap)}`}>
          {gapInterpretation(gap)}
        </p>
      </section>

      {/* Per-skill breakdown */}
      <section aria-labelledby="skill-breakdown-heading">
        <h2 id="skill-breakdown-heading" className="text-lg font-semibold text-gray-900">
          Skill Breakdown
        </h2>
        <div className="mt-3 space-y-3">
          {verification.perSkill.map((sv) => {
            const pct = Math.min(100, Math.max(0, sv.score));
            const barColor =
              sv.score >= 70
                ? 'bg-green-500'
                : sv.score >= 40
                  ? 'bg-yellow-500'
                  : 'bg-red-500';
            return (
              <div key={sv.skill}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{sv.skill}</span>
                  <span className="flex items-center gap-2 text-gray-500">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium">
                      {LEVEL_LABELS[sv.peakLevel]}
                    </span>
                    {Math.round(sv.score)}
                  </span>
                </div>
                <div
                  className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200"
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${sv.skill} score: ${Math.round(sv.score)} out of 100`}
                >
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Test stats */}
      <section aria-labelledby="test-stats-heading">
        <h2 id="test-stats-heading" className="text-lg font-semibold text-gray-900">
          Test Stats
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
            <p className="text-xs font-medium text-gray-500">Questions</p>
            <p className="mt-1 text-lg font-bold text-gray-800">
              {verification.totalQuestions}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
            <p className="text-xs font-medium text-gray-500">Duration</p>
            <p className="mt-1 text-lg font-bold text-gray-800">
              {formatDuration(verification.duration)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
            <p className="text-xs font-medium text-gray-500">WPM</p>
            <p className="mt-1 text-lg font-bold text-gray-800">
              {testSession?.calibration.wpm ?? '--'}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
            <p className="text-xs font-medium text-gray-500">Status</p>
            <p className="mt-1 text-lg font-bold text-gray-800">
              {scorecard ? (
                <span className="text-green-700">Signed</span>
              ) : (
                <span className="text-yellow-700">Pending</span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Match signal flow */}
      <section aria-labelledby="match-signal-heading">
        <h2 id="match-signal-heading" className="text-lg font-semibold text-gray-900">
          Match Signal
        </h2>

        {matchSent ? (
          <div className="mt-3 rounded-lg border border-green-300 bg-green-50 p-4">
            <p className="font-medium text-green-800">Match signal sent.</p>
            <p className="mt-1 text-sm text-green-700">
              The employer will review your scorecard and reach out if there is a fit.
            </p>
            <button
              type="button"
              onClick={() => navigate('/bridge/dashboard')}
              className="mt-3 text-sm font-medium text-green-700 underline hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              View All Applications
            </button>
          </div>
        ) : matchExpanded ? (
          <form
            onSubmit={handleMatchSignal}
            className="mt-3 space-y-4 rounded-lg border border-gray-200 bg-white p-4"
            aria-label="Contact information for match signal"
          >
            <div>
              <label htmlFor="match-name" className="block text-sm font-medium text-gray-700">
                Name <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="match-name"
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="match-email" className="block text-sm font-medium text-gray-700">
                Email <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="match-email"
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="match-phone" className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                id="match-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoComplete="tel"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="match-linkedin" className="block text-sm font-medium text-gray-700">
                  LinkedIn
                </label>
                <input
                  id="match-linkedin"
                  type="url"
                  value={contactLinkedin}
                  onChange={(e) => setContactLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="match-github" className="block text-sm font-medium text-gray-700">
                  GitHub
                </label>
                <input
                  id="match-github"
                  type="url"
                  value={contactGithub}
                  onChange={(e) => setContactGithub(e.target.value)}
                  placeholder="https://github.com/..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {matchError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
                {matchError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={matchSending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {matchSending ? 'Sending...' : 'Send Match Signal'}
              </button>
              <button
                type="button"
                onClick={() => setMatchExpanded(false)}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setMatchExpanded(true)}
              disabled={!scorecard}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              aria-describedby={!scorecard ? 'match-disabled-hint' : undefined}
            >
              Send Match Signal
            </button>
            {!scorecard && (
              <p id="match-disabled-hint" className="mt-1 text-xs text-gray-500">
                Waiting for scorecard to be signed before sending.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
