import EmployerMatchDashboard from '../bridge/components/EmployerMatchDashboard';

export default function EmployerMatches() {
  return (
    <main id="main-content" className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Match Signals</h1>
        <EmployerMatchDashboard />
      </div>
    </main>
  );
}
