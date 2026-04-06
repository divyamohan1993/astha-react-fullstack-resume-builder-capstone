import { useParams } from 'react-router-dom';
import { BridgeAssessment } from '../bridge/components/BridgeAssessment';

export default function BridgeLanding() {
  const { code } = useParams<{ code: string }>();
  if (!code) return <div className="p-8 text-center">Invalid criteria code</div>;
  return (
    <main id="main-content" className="min-h-screen py-8">
      <BridgeAssessment criteriaCode={code} />
    </main>
  );
}
