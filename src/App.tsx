import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './layout/Layout';
import { Landing } from './pages/Landing';
import { Builder } from './pages/Builder';
import { PrintPreview } from './pages/PrintPreview';

const Employer = lazy(() =>
  import('./pages/Employer').then((m) => ({ default: m.Employer })),
);
const CandidateDetail = lazy(() =>
  import('./pages/CandidateDetail').then((m) => ({
    default: m.CandidateDetail,
  })),
);
const PitchDeck = lazy(() =>
  import('./pages/PitchDeck').then((m) => ({ default: m.PitchDeck })),
);

function Loading() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <div
        className="animate-pulse text-lg"
        style={{ color: 'var(--text-muted)' }}
      >
        Loading...
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="builder" element={<Builder />} />
            <Route path="builder/preview" element={<PrintPreview />} />
            <Route path="employer" element={<Employer />} />
            <Route path="employer/:id" element={<CandidateDetail />} />
            <Route path="pitch" element={<PitchDeck />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
