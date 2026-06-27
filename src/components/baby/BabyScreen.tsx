import { BabyEvolutionIcon } from './BabyEvolutionIcon';
import { BreastfeedingCard } from './BreastfeedingCard';
import { SleepCard } from './SleepCard';
import { DiaperCard } from './DiaperCard';
import { BabyTimeline } from './BabyTimeline';

export function BabyScreen() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="px-4 pt-4">
        <h1 className="text-base font-semibold text-graphite">Rotina do Bebê</h1>
        <p className="text-xs text-graphite-muted">Registre e acompanhe o dia do seu bebê</p>
      </div>

      <BabyEvolutionIcon />

      <div className="grid grid-cols-2 gap-3 px-4">
        <div className="col-span-2">
          <BreastfeedingCard />
        </div>
        <SleepCard />
        <DiaperCard />
      </div>

      <BabyTimeline />
    </div>
  );
}
