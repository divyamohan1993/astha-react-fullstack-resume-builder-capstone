import { useParams } from 'react-router-dom';
import { ScorecardView } from '../bridge/components/ScorecardView';

export default function BridgeScorecard() {
  const { code } = useParams<{ code: string }>();
  if (!code) return <div className="p-8 text-center">Invalid criteria code</div>;
  return (
    <main id="main-content" className="min-h-screen py-8">
      <ScorecardView criteriaCode={code} />
    </main>
  );
}
