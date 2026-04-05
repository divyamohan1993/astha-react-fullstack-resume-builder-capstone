export function Slide02Problem() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-8 md:p-16"
      style={{ backgroundColor: '#182B49', color: '#ffffff' }}
    >
      <h2 className="mb-12 text-4xl font-extrabold md:text-5xl">
        The Problem
      </h2>

      <div className="grid max-w-5xl gap-10 md:grid-cols-3">
        <div className="flex flex-col items-center text-center">
          <span
            className="mb-4 text-7xl font-black"
            style={{ color: '#e41a1a' }}
          >
            75%
          </span>
          <p className="text-xl font-semibold leading-relaxed">
            of resumes rejected by ATS before human eyes
          </p>
          <cite className="mt-3 block text-sm not-italic opacity-60">
            Jobscan, 2023
          </cite>
        </div>

        <div className="flex flex-col items-center text-center">
          <span
            className="mb-4 text-7xl font-black"
            style={{ color: '#ffdc00' }}
          >
            0
          </span>
          <p className="text-xl font-semibold leading-relaxed">
            tools freshers have to build ATS-optimized resumes
          </p>
          <cite className="mt-3 block text-sm not-italic opacity-60">
            Lack of accessible, free tooling
          </cite>
        </div>

        <div className="flex flex-col items-center text-center">
          <span
            className="mb-4 text-7xl font-black"
            style={{ color: '#e41a1a' }}
          >
            100s
          </span>
          <p className="text-xl font-semibold leading-relaxed">
            of resumes manually screened by recruiters per role
          </p>
          <cite className="mt-3 block text-sm not-italic opacity-60">
            Manual screening burden
          </cite>
        </div>
      </div>
    </div>
  );
}
