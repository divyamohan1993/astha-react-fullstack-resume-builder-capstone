const mockCandidates = [
  { name: 'Priya Sharma', score: 92, skills: 95, exp: 88, flags: 0 },
  { name: 'Rahul Verma', score: 85, skills: 82, exp: 90, flags: 1 },
  { name: 'Anika Gupta', score: 78, skills: 80, exp: 72, flags: 0 },
  { name: 'Vikram Singh', score: 61, skills: 55, exp: 70, flags: 2 },
  { name: 'Meera Joshi', score: 45, skills: 40, exp: 52, flags: 3 },
];

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#d4a800';
  return '#e41a1a';
}

export function Slide06DemoEmployer() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-8 md:p-16"
      style={{ backgroundColor: '#f5f5f5', color: '#182B49' }}
    >
      <h2 className="mb-2 text-4xl font-extrabold md:text-5xl">
        Employer Dashboard
      </h2>
      <p className="mb-10 text-xl" style={{ color: '#666666' }}>
        Paste JD. Upload 100+ resumes. AI scores in seconds.
      </p>

      {/* Table mockup */}
      <div
        className="w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl"
        style={{ backgroundColor: '#ffffff' }}
      >
        <table className="w-full text-left">
          <thead>
            <tr style={{ backgroundColor: '#182B49', color: '#ffffff' }}>
              <th className="px-6 py-4 text-sm font-bold">#</th>
              <th className="px-6 py-4 text-sm font-bold">Candidate</th>
              <th className="px-6 py-4 text-sm font-bold">Overall</th>
              <th className="px-6 py-4 text-sm font-bold">Skills</th>
              <th className="px-6 py-4 text-sm font-bold">Experience</th>
              <th className="px-6 py-4 text-sm font-bold">Red Flags</th>
            </tr>
          </thead>
          <tbody>
            {mockCandidates.map((c, i) => (
              <tr
                key={c.name}
                className="border-b"
                style={{ borderColor: '#e0e0e0' }}
              >
                <td className="px-6 py-3 text-sm font-semibold">{i + 1}</td>
                <td className="px-6 py-3 text-sm font-semibold">{c.name}</td>
                <td className="px-6 py-3">
                  <span
                    className="inline-block rounded-full px-3 py-1 text-sm font-bold text-white"
                    style={{ backgroundColor: scoreColor(c.score) }}
                  >
                    {c.score}
                  </span>
                </td>
                <td
                  className="px-6 py-3 text-sm font-semibold"
                  style={{ color: scoreColor(c.skills) }}
                >
                  {c.skills}
                </td>
                <td
                  className="px-6 py-3 text-sm font-semibold"
                  style={{ color: scoreColor(c.exp) }}
                >
                  {c.exp}
                </td>
                <td className="px-6 py-3 text-sm">
                  {c.flags > 0 ? (
                    <span
                      className="inline-block rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        backgroundColor: 'rgba(228, 26, 26, 0.1)',
                        color: '#e41a1a',
                      }}
                    >
                      {c.flags} flag{c.flags > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span style={{ color: '#22c55e' }}>Clear</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
