import { useParams } from 'react-router-dom';

export default function BridgeLanding() {
  const { code } = useParams<{ code: string }>();
  if (!code) return <div className="p-8 text-center">Invalid criteria code</div>;
  return (
    <main id="main-content" className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold">Bridge Assessment</h1>
        <p className="mt-2 opacity-60">Code: {code}</p>
        <p className="mt-4">Assessment component loading...</p>
      </div>
    </main>
  );
}
