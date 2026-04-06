import { useParams } from 'react-router-dom';
import { TestEngine } from '../bridge/components/TestEngine';

export default function BridgeTest() {
  const { code } = useParams<{ code: string }>();
  if (!code) return <div className="p-8 text-center">Invalid criteria code</div>;
  return (
    <main id="main-content" className="min-h-screen">
      <TestEngine criteriaCode={code} />
    </main>
  );
}
