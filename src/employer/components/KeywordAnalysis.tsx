import type { CandidateScores, Job } from '../../store/types';

interface KeywordAnalysisProps {
  scores: CandidateScores;
  requirements: Job['extractedRequirements'];
}

interface TagProps {
  label: string;
  color: string;
  bg: string;
  source?: string;
}

function Tag({ label, color, bg, source }: TagProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
      style={{ backgroundColor: bg, color }}
      title={source}
    >
      {label}
      {source && (
        <span className="text-[10px] opacity-70" aria-hidden="true">
          ({source})
        </span>
      )}
    </span>
  );
}

export function KeywordAnalysis({ scores, requirements }: KeywordAnalysisProps) {
  const { matched, missing, semantic } = scores.skillsMatch;

  const missingRequired = missing.filter((s) =>
    requirements.requiredSkills.includes(s),
  );
  const missingPreferred = missing.filter((s) =>
    requirements.preferredSkills.includes(s),
  );

  return (
    <section
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
      aria-labelledby="keyword-heading"
    >
      <h3
        id="keyword-heading"
        className="mb-3 text-base font-bold"
        style={{ color: 'var(--accent-navy)' }}
      >
        Keyword Analysis
      </h3>

      <div className="space-y-3">
        {matched.length > 0 && (
          <div>
            <p
              className="mb-1 text-xs font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              Matched ({matched.length})
            </p>
            <div className="flex flex-wrap gap-1" role="list" aria-label="Matched keywords">
              {matched.map((s) => (
                <Tag
                  key={s}
                  label={s}
                  color="#fff"
                  bg="#2ecc40"
                  source="resume"
                />
              ))}
            </div>
          </div>
        )}

        {missingRequired.length > 0 && (
          <div>
            <p
              className="mb-1 text-xs font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              Missing Required ({missingRequired.length})
            </p>
            <div className="flex flex-wrap gap-1" role="list" aria-label="Missing required keywords">
              {missingRequired.map((s) => (
                <Tag
                  key={s}
                  label={s}
                  color="#fff"
                  bg="#ff4136"
                  source="JD required"
                />
              ))}
            </div>
          </div>
        )}

        {missingPreferred.length > 0 && (
          <div>
            <p
              className="mb-1 text-xs font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              Missing Preferred ({missingPreferred.length})
            </p>
            <div className="flex flex-wrap gap-1" role="list" aria-label="Missing preferred keywords">
              {missingPreferred.map((s) => (
                <Tag
                  key={s}
                  label={s}
                  color="#333"
                  bg="#ffdc00"
                  source="JD preferred"
                />
              ))}
            </div>
          </div>
        )}

        {semantic.length > 0 && (
          <div>
            <p
              className="mb-1 text-xs font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              Semantic Matches ({semantic.length})
            </p>
            <div className="flex flex-wrap gap-1" role="list" aria-label="Semantic keyword matches">
              {semantic.map((s) => (
                <Tag
                  key={s}
                  label={s}
                  color="#fff"
                  bg="#0074d9"
                  source="semantic"
                />
              ))}
            </div>
          </div>
        )}

        {matched.length === 0 &&
          missingRequired.length === 0 &&
          semantic.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No keyword analysis available yet.
            </p>
          )}
      </div>
    </section>
  );
}
