import CandidateDashboard from '../bridge/components/CandidateDashboard';

export default function BridgeDashboard() {
  return (
    <main id="main-content" className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">My Applications</h1>
        <CandidateDashboard />
      </div>
    </main>
  );
}
