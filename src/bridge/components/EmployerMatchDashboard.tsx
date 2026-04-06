import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDb, initFirebase } from '../../firebase/config';
import { getCurrentUser } from '../../firebase/auth';
import type { MatchSignal } from '../types';

type SortKey = 'candidateName' | 'resumeScore' | 'verifiedScore' | 'integrityScore' | 'gap' | 'status' | 'sentAt';
type SortDir = 'asc' | 'desc';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-200 text-gray-700',
  viewed: 'bg-blue-100 text-blue-800',
  replied: 'bg-green-100 text-green-800',
};

export default function EmployerMatchDashboard() {
  const [matches, setMatches] = useState<MatchSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minVerified, setMinVerified] = useState(0);
  const [minIntegrity, setMinIntegrity] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('sentAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [replyModalMatch, setReplyModalMatch] = useState<MatchSignal | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [repliedIds, setRepliedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      setError('Sign in to view match signals.');
      setLoading(false);
      return;
    }

    const db = getDb();
    const q = query(
      collection(db, 'matchSignals'),
      where('employerId', '==', user.uid),
      orderBy('sentAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ ...d.data(), matchId: d.id } as MatchSignal));
      setMatches(data);
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return unsub;
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    setSortDir((prev) => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'));
    setSortKey(key);
  }, [sortKey]);

  const filtered = useMemo(() => {
    let list = matches.filter(
      (m) => m.verifiedScore >= minVerified && m.integrityScore >= minIntegrity
    );

    list.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case 'candidateName': av = a.contactInfo.name.toLowerCase(); bv = b.contactInfo.name.toLowerCase(); break;
        case 'resumeScore': av = a.resumeScore; bv = b.resumeScore; break;
        case 'verifiedScore': av = a.verifiedScore; bv = b.verifiedScore; break;
        case 'integrityScore': av = a.integrityScore; bv = b.integrityScore; break;
        case 'gap': av = a.gap; bv = b.gap; break;
        case 'status': av = a.status; bv = b.status; break;
        case 'sentAt':
        default:
          av = a.sentAt instanceof Date ? a.sentAt.getTime() : new Date(a.sentAt as unknown as string).getTime();
          bv = b.sentAt instanceof Date ? b.sentAt.getTime() : new Date(b.sentAt as unknown as string).getTime();
          break;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [matches, minVerified, minIntegrity, sortKey, sortDir]);

  const sendReply = useCallback(async () => {
    if (!replyModalMatch || !replyText.trim()) return;
    setReplying(true);
    setReplyError(null);
    try {
      const { app } = initFirebase();
      const functions = getFunctions(app);
      const replyToMatch = httpsCallable(functions, 'replyToMatch');
      await replyToMatch({ matchId: replyModalMatch.matchId, message: replyText.trim() });
      setRepliedIds((prev) => new Set(prev).add(replyModalMatch.matchId));
      setReplyModalMatch(null);
      setReplyText('');
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : 'Failed to send reply.');
    } finally {
      setReplying(false);
    }
  }, [replyModalMatch, replyText]);

  const gapColor = (gap: number) => {
    if (gap > 5) return 'text-green-700 font-semibold';
    if (gap < -15) return 'text-red-700 font-semibold';
    return 'text-gray-700';
  };

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  const colBtn = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className="font-semibold text-left w-full hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label={`Sort by ${label}`}
    >
      {label}{sortArrow(key)}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-label="Loading matches">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="sr-only">Loading matches</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6" role="alert">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Incoming Match Signals</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6" role="search" aria-label="Filter matches">
        <label className="flex items-center gap-2 text-sm">
          <span>Min Verified Score</span>
          <input
            type="number"
            min={0}
            max={100}
            value={minVerified}
            onChange={(e) => setMinVerified(Number(e.target.value) || 0)}
            className="w-20 border rounded px-2 py-1 text-sm"
            aria-label="Minimum verified score filter"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span>Min Integrity Score</span>
          <input
            type="number"
            min={0}
            max={100}
            value={minIntegrity}
            onChange={(e) => setMinIntegrity(Number(e.target.value) || 0)}
            className="w-20 border rounded px-2 py-1 text-sm"
            aria-label="Minimum integrity score filter"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No match signals found. Candidates who meet your criteria will appear here.</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm" aria-label="Match signals table">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left">{colBtn('candidateName', 'Candidate')}</th>
                <th className="px-3 py-2 text-left">{colBtn('resumeScore', 'Resume')}</th>
                <th className="px-3 py-2 text-left">{colBtn('verifiedScore', 'Verified')}</th>
                <th className="px-3 py-2 text-left">{colBtn('integrityScore', 'Integrity')}</th>
                <th className="px-3 py-2 text-left">{colBtn('gap', 'Gap')}</th>
                <th className="px-3 py-2 text-left">{colBtn('status', 'Status')}</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const hasReplied = m.status === 'replied' || repliedIds.has(m.matchId);
                return (
                  <tr key={m.matchId} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium">{m.contactInfo.name}</div>
                      <div className="text-xs text-gray-500">{m.contactInfo.email}</div>
                    </td>
                    <td className="px-3 py-2">{Math.round(m.resumeScore)}</td>
                    <td className="px-3 py-2">{Math.round(m.verifiedScore)}</td>
                    <td className="px-3 py-2">{Math.round(m.integrityScore)}</td>
                    <td className={`px-3 py-2 ${gapColor(m.gap)}`}>{m.gap > 0 ? '+' : ''}{Math.round(m.gap)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs capitalize ${STATUS_STYLES[m.status] || STATUS_STYLES.pending}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={hasReplied}
                        onClick={() => { setReplyModalMatch(m); setReplyText(''); setReplyError(null); }}
                        className={`px-3 py-1 rounded text-xs font-medium ${hasReplied ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500'}`}
                        aria-label={hasReplied ? `Already replied to ${m.contactInfo.name}` : `Reply to ${m.contactInfo.name}`}
                      >
                        {hasReplied ? 'Replied' : 'Reply'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reply Modal */}
      {replyModalMatch && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reply to candidate"
          onClick={(e) => { if (e.target === e.currentTarget) { setReplyModalMatch(null); } }}
          onKeyDown={(e) => { if (e.key === 'Escape') setReplyModalMatch(null); }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-1">Reply to {replyModalMatch.contactInfo.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{replyModalMatch.contactInfo.email}</p>

            <label className="block text-sm font-medium mb-1" htmlFor="reply-message">
              Your message
            </label>
            <textarea
              id="reply-message"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={5}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Write your reply to this candidate..."
              autoFocus
            />

            {replyError && <p className="text-red-600 text-sm mt-2" role="alert">{replyError}</p>}

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setReplyModalMatch(null)}
                className="px-4 py-2 text-sm rounded border hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendReply}
                disabled={replying || !replyText.trim()}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {replying ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
