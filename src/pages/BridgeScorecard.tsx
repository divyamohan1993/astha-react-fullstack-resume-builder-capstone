import { useParams } from 'react-router-dom';

export default function BridgeScorecard() {
  const { code } = useParams<{ code: string }>();
  if (!code) return <div className="p-8 text-center">Invalid criteria code</div>;
  return (
    <main id="main-content" className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-center">Verified Scorecard</h1>
      </div>
    </main>
  );
}
