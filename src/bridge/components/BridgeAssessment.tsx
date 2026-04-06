/**
 * Bridge Assessment -- self-score your resume against employer criteria.
 *
 * Flow: load criteria from Firestore -> run scoring pipeline -> show breakdown.
 * Offline-capable: criteria cached in bridge store, scoring runs client-side.
 */

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getDb, isFirebaseConfigured } from '../../firebase/config';
import { useBridgeStore } from '../store';
import { useResumeStore } from '@/store/resumeStore';
import { useSelfAssessment } from '../hooks/useSelfAssessment';
import { JDCoachPanel } from './JDCoachPanel';
import type { BridgeCriteria } from '../types';

interface Props {
  criteriaCode: string;
}

export function BridgeAssessment({ criteriaCode }: Props) {
  const { assess, loading, result, keywordAnalysis } = useSelfAssessment();
  const criteria = useBridgeStore((s) => s.criteria);
  const setCriteria = useBridgeStore((s) => s.setCriteria);
  const resume = useResumeStore((s) => s.resume);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [criteriaLoading, setCriteriaLoading] = useState(false);

  // Check if resume has meaningful content
  const hasResume =
    resume.personal.name.trim().length > 0 ||
    resume.summary.trim().length > 0 ||
    resume.sections.some((s) => s.entries.length > 0);

  // Load criteria from Firestore on mount (cache in bridge store)
  useEffect(() => {
    if (criteria?.shortCode === criteriaCode) return;

    async function loadCriteria() {
      setCriteriaLoading(true);
      setLoadError(null);

      if (!isFirebaseConfigured()) {
        setLoadError('Firebase not configured. Set VITE_FIREBASE_* environment variables.');
        setCriteriaLoading(false);
        return;
      }

      try {
        const db = getDb();
        const snap = await getDoc(doc(db, 'criteria', criteriaCode));
        if (!snap.exists()) {
          setLoadError('Criteria not found. Check the code and try again.');
          setCriteriaLoading(false);
          return;
        }
        const data = snap.data() as BridgeCriteria;
        setCriteria({ ...data, shortCode: criteriaCode });
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load criteria.',
        );
      } finally {
        setCriteriaLoading(false);
      }
    }

    loadCriteria();
  }, [criteriaCode, criteria?.shortCode, setCriteria]);

  function handleRescore() {
    if (criteria) assess(criteria);
  }

  // Loading state
  if (criteriaLoading) {
    return (
      <div className="flex items-center justify-center p-12" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <span className="sr-only">Loading criteria...</span>
        <span className="ml-3 text-gray-600">Loading criteria...</span>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div
        className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 text-center"
        role="alert"
      >
        <h2 className="mb-2 text-lg font-semibold text-red-800">
          Could not load criteria
        </h2>
        <p className="text-red-700">{loadError}</p>
      </div>
    );
  }

  // No resume built
  if (!hasResume) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
        <h2 className="mb-2 text-xl font-bold text-amber-900">
          Build your resume first
        </h2>
        <p className="mb-4 text-amber-800">
          You need a resume before scoring it against this job.
        </p>
        <a
          href="/builder"
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
        >
          Go to Resume Builder
        </a>
      </div>
    );
  }

  // Waiting for criteria
  if (!criteria) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">{criteria.jobTitle}</h2>
        <p className="mt-1 text-sm text-gray-600">{criteria.description}</p>

        {/* Score button */}
        {!result && (
          <button
            type="button"
            onClick={() => assess(criteria)}
            disabled={loading}
            className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600 disabled:opacity-50"
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Scoring...
              </>
            ) : (
              'Score My Resume'
            )}
          </button>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Overall score */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Overall Score
            </p>
            <p
              className={`mt-2 text-5xl font-black ${
                result.overall >= 70
                  ? 'text-green-600'
                  : result.overall >= 40
                    ? 'text-amber-600'
                    : 'text-red-600'
              }`}
              aria-label={`Overall score: ${result.overall} out of 100`}
            >
              {result.overall.toFixed(1)}
            </p>
            <p className="mt-1 text-sm text-gray-500">out of 100</p>
          </div>

          {/* Score breakdown table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm" aria-label="Score breakdown">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold text-gray-700">
                    Parameter
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-700">
                    Weight
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-700">
                    Raw
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-700">
                    Weighted
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.breakdown).map(([param, scores]) => (
                  <tr key={param} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium capitalize text-gray-900">
                      {param.replace(/([A-Z])/g, ' $1').trim()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {scores.weight}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {(scores.raw * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {scores.weighted.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Keyword analysis */}
          {keywordAnalysis && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">
                Keyword Analysis
              </h3>

              {keywordAnalysis.matched.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-sm font-medium text-gray-700">
                    Matched
                  </p>
                  <div className="flex flex-wrap gap-2" role="list" aria-label="Matched keywords">
                    {keywordAnalysis.matched.map((kw) => (
                      <span
                        key={kw}
                        role="listitem"
                        className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {keywordAnalysis.missing.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-sm font-medium text-gray-700">
                    Missing
                  </p>
                  <div className="flex flex-wrap gap-2" role="list" aria-label="Missing keywords">
                    {keywordAnalysis.missing.map((kw) => (
                      <span
                        key={kw}
                        role="listitem"
                        className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {keywordAnalysis.semantic.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-700">
                    Semantic Matches
                  </p>
                  <div className="flex flex-wrap gap-2" role="list" aria-label="Semantic matches">
                    {keywordAnalysis.semantic.map((kw) => (
                      <span
                        key={kw}
                        role="listitem"
                        className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <a
              href="/builder"
              className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
            >
              Improve Resume
            </a>
            <a
              href={`/bridge/${criteriaCode}/test`}
              className="inline-block rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
            >
              Take Skill Verification Test
            </a>
          </div>

          {/* JD Coach Panel */}
          <JDCoachPanel criteria={criteria} onRescore={handleRescore} />
        </>
      )}
    </div>
  );
}
