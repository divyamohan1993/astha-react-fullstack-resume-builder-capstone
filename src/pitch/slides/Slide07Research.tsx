const parameters = [
  { param: 'Skills Match', weight: '25%', source: 'NACE Job Outlook 2024' },
  { param: 'Semantic Skills', weight: '10%', source: 'MiniLM-L6-v2 embeddings' },
  { param: 'Experience Level', weight: '15%', source: 'SHRM Talent Acquisition' },
  { param: 'Education Relevance', weight: '8%', source: 'AAC&U VALUE Rubrics' },
  { param: 'Projects (Quantified)', weight: '8%', source: 'NACE Career Readiness' },
  { param: 'Certifications', weight: '5%', source: 'SHRM Credential Research' },
  { param: 'Extracurricular', weight: '4%', source: 'NACE First Destinations' },
  { param: 'GPA', weight: '5%', source: 'Jobscan Recruiter Survey 2023' },
  { param: 'Resume Parseability', weight: 'Pass/Fail', source: 'Jobscan ATS Research' },
  { param: 'Completeness', weight: '5%', source: 'Marinescu & Rathelot 2018' },
  { param: 'Contradiction Detection', weight: 'Penalty', source: 'Henle et al. 2019' },
  { param: 'Commute Distance', weight: '5%', source: 'Marinescu & Rathelot 2018' },
];

export function Slide07Research() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-8 md:p-12"
      style={{ backgroundColor: '#ffffff', color: '#182B49' }}
    >
      <h2 className="mb-2 text-4xl font-extrabold md:text-5xl">
        Research-Backed Scoring
      </h2>
      <p className="mb-8 text-lg" style={{ color: '#666666' }}>
        Every score traceable to published research
      </p>

      <div
        className="w-full max-w-4xl overflow-hidden rounded-2xl shadow-xl"
        style={{ border: '1px solid #e0e0e0' }}
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ backgroundColor: '#182B49', color: '#ffffff' }}>
              <th className="px-5 py-3 font-bold">Parameter</th>
              <th className="px-5 py-3 font-bold">Weight</th>
              <th className="px-5 py-3 font-bold">Citation</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((p, i) => (
              <tr
                key={p.param}
                style={{
                  backgroundColor: i % 2 === 0 ? '#ffffff' : '#f9f9f9',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <td className="px-5 py-2.5 font-semibold">{p.param}</td>
                <td
                  className="px-5 py-2.5 font-bold"
                  style={{ color: '#e41a1a' }}
                >
                  {p.weight}
                </td>
                <td className="px-5 py-2.5" style={{ color: '#666666' }}>
                  {p.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
