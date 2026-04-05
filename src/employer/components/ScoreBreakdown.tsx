import type { CandidateScores } from '../../store/types';
import { CitationTooltip } from './CitationTooltip';
import { ScoreBadge } from './ScoreBadge';

interface ScoreBreakdownProps {
  scores: CandidateScores;
}

interface Parameter {
  name: string;
  weight: number;
  raw: number;
  citation: string;
}

function buildParams(s: CandidateScores): Parameter[] {
  const params: Parameter[] = [
    {
      name: 'Skills Match',
      weight: 0.3,
      raw: s.skillsMatch.score,
      citation:
        'NACE Job Outlook 2024; Jaccard similarity + TF-IDF cosine (scikit-learn)',
    },
    {
      name: 'Experience Fit',
      weight: 0.2,
      raw: s.experience.score,
      citation:
        'NACE 2024 Internship Survey (56.1% intern-to-hire); O*NET Job Zone model',
    },
    {
      name: 'Education Relevance',
      weight: 0.15,
      raw: s.education.score,
      citation:
        'NCES CIP-SOC Crosswalk; NACE Job Outlook 2024 (73.4% screen by major)',
    },
    {
      name: 'Projects',
      weight: 0.1,
      raw: s.projects.score,
      citation:
        'AAC&U VALUE Rubrics (Problem Solving + Integrative Learning); Hart Research 2018',
    },
    {
      name: 'Certifications',
      weight: 0.05,
      raw: s.certifications.score,
      citation: 'SHRM "Value of Credentials" 2021 (87% HR confidence)',
    },
    {
      name: 'Distance',
      weight: s.distance ? 0.05 : 0,
      raw: s.distance?.score ?? 0,
      citation:
        'Marinescu & Rathelot (2018) AEJ:Macro; exp(-0.043 * miles)',
    },
    {
      name: 'Extracurricular',
      weight: 0.05,
      raw: s.extracurricular.score,
      citation:
        'Roulin & Bangerter (2013) J. Education and Work; Cole et al. (2007) J. Business Psych',
    },
    {
      name: 'GPA',
      weight: 0.03,
      raw: s.gpa?.score ?? 0.5,
      citation: 'NACE Job Outlook 2024 (38.3% use GPA, 3.0 median cutoff)',
    },
  ];

  if (!s.distance) {
    const withoutDist = params.filter((p) => p.name !== 'Distance');
    const totalWeight = withoutDist.reduce((sum, p) => sum + p.weight, 0);
    return withoutDist.map((p) => ({
      ...p,
      weight: p.weight / totalWeight,
    }));
  }

  return params;
}

export function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  const params = buildParams(scores);
  const weighted = params.map((p) => ({
    ...p,
    weighted: Math.round(p.raw * p.weight * 100),
  }));
  const total = weighted.reduce((sum, p) => sum + p.weighted, 0);

  return (
    <section
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
      aria-labelledby="score-heading"
    >
      <h3
        id="score-heading"
        className="mb-3 text-base font-bold"
        style={{ color: 'var(--accent-navy)' }}
      >
        Score Breakdown
      </h3>

      {!scores.parseability && (
        <div
          className="mb-3 rounded-md p-2 text-sm font-medium"
          style={{
            backgroundColor: '#ff413620',
            color: '#ff4136',
            border: '1px solid #ff4136',
          }}
          role="alert"
        >
          Resume failed parseability gate. Score set to 0.
        </div>
      )}

      <div className="overflow-x-auto">
        <table
          className="w-full text-sm"
          style={{ color: 'var(--text-primary)' }}
        >
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th scope="col" className="py-2 pr-4 text-left font-semibold">
                Parameter
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-semibold">
                Weight
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-semibold">
                Raw
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-semibold">
                Weighted
              </th>
              <th scope="col" className="py-2 text-left font-semibold">
                Citation
              </th>
            </tr>
          </thead>
          <tbody>
            {weighted.map((p) => (
              <tr
                key={p.name}
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <td className="py-2 pr-4 font-medium">{p.name}</td>
                <td className="py-2 pr-4 text-right">
                  {Math.round(p.weight * 100)}%
                </td>
                <td className="py-2 pr-4 text-right">
                  {Math.round(p.raw * 100)}
                </td>
                <td className="py-2 pr-4 text-right font-medium">
                  {p.weighted}
                </td>
                <td className="py-2">
                  <CitationTooltip citation={p.citation}>
                    <span className="text-xs">cite</span>
                  </CitationTooltip>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr
              className="font-bold"
              style={{ borderTop: '2px solid var(--accent-navy)' }}
            >
              <td className="py-2 pr-4">Total</td>
              <td className="py-2 pr-4 text-right">100%</td>
              <td className="py-2 pr-4" />
              <td className="py-2 pr-4 text-right">
                <ScoreBadge score={scores.overall} label="Overall ATS Score" />
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <p
        className="mt-3 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        Formula: overall = sum(weight_i * raw_i) for each parameter.
        {!scores.distance && ' Distance excluded (no data); weights redistributed.'}
        {!scores.parseability && ' Parseability gate failed: final score = 0.'}
      </p>
    </section>
  );
}
