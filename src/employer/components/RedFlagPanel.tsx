import type { RedFlag } from '../../store/types';
import { CitationTooltip } from './CitationTooltip';

interface RedFlagPanelProps {
  flags: RedFlag[];
}

const TYPE_ICONS: Record<RedFlag['type'], string> = {
  contradiction: '\u26A0',
  framing: '\uD83D\uDD0D',
  'date-inconsistency': '\uD83D\uDCC5',
  'skill-inflation': '\uD83D\uDCC8',
  'hidden-text': '\uD83D\uDC41',
};

const DIMENSION_COLORS: Record<RedFlag['dimension'], string> = {
  fabrication: '#ff4136',
  embellishment: '#ff851b',
  omission: '#ffdc00',
};

export function RedFlagPanel({ flags }: RedFlagPanelProps) {
  const sorted = [...flags].sort((a, b) => b.penalty - a.penalty);

  return (
    <section
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
      aria-labelledby="redflag-heading"
    >
      <h3
        id="redflag-heading"
        className="mb-3 text-base font-bold"
        style={{ color: 'var(--accent-navy)' }}
      >
        Red Flags ({flags.length})
      </h3>

      {sorted.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No red flags detected.
        </p>
      ) : (
        <div className="space-y-3" role="list" aria-label="Red flags">
          {sorted.map((flag, i) => (
            <div
              key={`${flag.type}-${i}`}
              role="listitem"
              className="rounded-md p-3"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="text-lg"
                  role="img"
                  aria-label={flag.type}
                >
                  {TYPE_ICONS[flag.type]}
                </span>
                <span
                  className="rounded px-2 py-0.5 text-xs font-bold capitalize text-white"
                  style={{
                    backgroundColor: DIMENSION_COLORS[flag.dimension],
                    color:
                      flag.dimension === 'omission' ? '#333' : '#fff',
                  }}
                >
                  {flag.dimension}
                </span>
                <span
                  className="ml-auto text-xs font-bold"
                  style={{ color: '#ff4136' }}
                >
                  -{flag.penalty}pts
                </span>
              </div>

              <p
                className="mb-1 text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {flag.description}
              </p>

              {flag.evidence && (
                <blockquote
                  className="mb-1 border-l-2 pl-3 text-xs italic"
                  style={{
                    borderColor: 'var(--accent-red)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  "{flag.evidence}"
                </blockquote>
              )}

              {flag.citation && (
                <div className="mt-1">
                  <CitationTooltip citation={flag.citation}>
                    <span className="text-xs">Source</span>
                  </CitationTooltip>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
