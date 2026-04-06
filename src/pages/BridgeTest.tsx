import { useParams } from 'react-router-dom';

export default function BridgeTest() {
  const { code } = useParams<{ code: string }>();
  if (!code) return <div className="p-8 text-center">Invalid criteria code</div>;
  return (
    <main id="main-content" className="min-h-screen">
      <div className="flex items-center justify-center min-h-screen">
        <p>Test engine loading...</p>
      </div>
    </main>
  );
}
