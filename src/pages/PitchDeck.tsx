import { PitchNav } from '../pitch/PitchNav';
import { Slide01Title } from '../pitch/slides/Slide01Title';
import { Slide02Problem } from '../pitch/slides/Slide02Problem';
import { Slide03Solution } from '../pitch/slides/Slide03Solution';
import { Slide04Architecture } from '../pitch/slides/Slide04Architecture';
import { Slide05DemoBuilder } from '../pitch/slides/Slide05DemoBuilder';
import { Slide06DemoEmployer } from '../pitch/slides/Slide06DemoEmployer';
import { Slide07Research } from '../pitch/slides/Slide07Research';
import { Slide08TechDeep } from '../pitch/slides/Slide08TechDeep';
import { Slide09Accessibility } from '../pitch/slides/Slide09Accessibility';
import { Slide10ThankYou } from '../pitch/slides/Slide10ThankYou';

export function PitchDeck() {
  return (
    <main className="pitch-fullscreen h-screen w-screen overflow-hidden print:h-auto print:overflow-visible">
      <PitchNav>
        <Slide01Title />
        <Slide02Problem />
        <Slide03Solution />
        <Slide04Architecture />
        <Slide05DemoBuilder />
        <Slide06DemoEmployer />
        <Slide07Research />
        <Slide08TechDeep />
        <Slide09Accessibility />
        <Slide10ThankYou />
      </PitchNav>
    </main>
  );
}
