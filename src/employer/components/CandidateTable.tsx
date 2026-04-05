import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployerStore } from '../../store/employerStore';
import { ScoreBadge } from './ScoreBadge';
import type { Candidate } from '../../store/types';

type SortKey =
  | 'rank'
  | 'name'
  | 'overall'
  | 'skills'
  | 'experience'
  | 'education'
  | 'distance'
  | 'redFlags';
type SortDir = 'asc' | 'desc';

function getSortValue(c: Candidate, key: SortKey): number | string {
  switch (key) {
    case 'rank':
    case 'overall':
      return c.scores.overall;
    case 'name':
      return c.name.toLowerCase();
    case 'skills':
      return c.scores.skillsMatch.score;
    case 'experience':
      return c.scores.experience.score;
    case 'education':
      return c.scores.education.score;
    case 'distance':
      return c.scores.distance?.km ?? Infinity;
    case 'redFlags':
      return c.redFlags.length;
  }
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'rank', label: 'Rank' },
  { key: 'name', label: 'Name' },
  { key: 'overall', label: 'ATS Score' },
  { key: 'skills', label: 'Skills Match' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'distance', label: 'Distance' },
  { key: 'redFlags', label: 'Red Flags' },
];

export function CandidateTable() {
  const { job } = useEmployerStore();
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('overall');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

  const candidates = job?.candidates ?? [];

  const sorted = useMemo(() => {
    let filtered = candidates.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()),
    );

    filtered.sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc'
          ? va.localeCompare(vb)
          : vb.localeCompare(va);
      }
      const na = va as number;
      const nb = vb as number;
      return sortDir === 'asc' ? na - nb : nb - na;
    });

    return filtered;
  }, [candidates, sortKey, sortDir, search]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  if (candidates.length === 0) return null;

  return (
    <section
      className="rounded-lg"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
      aria-labelledby="table-heading"
    >
      <div className="flex items-center justify-between p-4">
        <h2
          id="table-heading"
          className="text-lg font-bold"
          style={{ color: 'var(--accent-navy)' }}
        >
          Candidates ({candidates.length})
        </h2>
        <input
          type="search"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-[44px] rounded-md px-3 py-2 text-sm"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          aria-label="Search candidates by name"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--accent-navy)',
                color: '#fff',
              }}
            >
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="cursor-pointer px-4 py-3 text-left font-semibold select-none"
                  onClick={() => handleSort(col.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort(col.key);
                    }
                  }}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  aria-label={`Sort by ${col.label}`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1" aria-hidden="true">
                      {sortDir === 'asc' ? '\u25B2' : '\u25BC'}
                    </span>
                  )}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-left font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const skillsTotal =
                c.scores.skillsMatch.matched.length +
                c.scores.skillsMatch.missing.length;
              return (
                <tr
                  key={c.id}
                  className="cursor-pointer transition-colors hover:opacity-90"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    backgroundColor:
                      i % 2 === 0
                        ? 'var(--bg-primary)'
                        : 'var(--bg-secondary)',
                  }}
                  onClick={() => navigate(`/employer/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={c.scores.overall} label="ATS Score" />
                  </td>
                  <td className="px-4 py-3">
                    {c.scores.skillsMatch.matched.length}/{skillsTotal}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded px-2 py-1 text-xs font-medium capitalize"
                      style={{
                        backgroundColor:
                          c.scores.experience.level === 'high'
                            ? '#2ecc4020'
                            : c.scores.experience.level === 'medium'
                              ? '#ffdc0020'
                              : '#ff413620',
                        color:
                          c.scores.experience.level === 'high'
                            ? '#2ecc40'
                            : c.scores.experience.level === 'medium'
                              ? '#b8a000'
                              : '#ff4136',
                      }}
                    >
                      {c.scores.experience.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {c.scores.education.relevance}
                  </td>
                  <td className="px-4 py-3">
                    {c.scores.distance
                      ? `${c.scores.distance.km} km`
                      : 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    {c.redFlags.length > 0 ? (
                      <span
                        className="inline-flex min-h-[24px] min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-bold text-white"
                        style={{ backgroundColor: '#ff4136' }}
                      >
                        {c.redFlags.length}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="min-h-[44px] min-w-[44px] rounded-md px-3 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: 'var(--accent-red)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/employer/${c.id}`);
                      }}
                      aria-label={`View details for ${c.name}`}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
