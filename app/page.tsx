import { Footer } from "@/components/layout/Footer";
import { Navigation } from "@/components/layout/Navigation";
import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { CrystalOfConnection } from "@/components/sections/CrystalOfConnection";
import { GrimoireOfSpells } from "@/components/sections/GrimoireOfSpells";
import { HallOfLegends } from "@/components/sections/HallOfLegends";
import { HeroRoad } from "@/components/sections/HeroRoad";
import { TimelineOfJourneys } from "@/components/sections/TimelineOfJourneys";

export default function HomePage() {
  return (
    <div className="journey-shell">
      <div className="ambient-bg" aria-hidden="true">
        <div className="ambient-bg__stars" />
        <div className="ambient-bg__fog ambient-bg__fog--one" />
        <div className="ambient-bg__fog ambient-bg__fog--two" />
      </div>

      <Navigation />
      <ScrollProgress />

      <main className="journey-main">
        <HeroRoad />
        <GrimoireOfSpells />
        <HallOfLegends />
        <TimelineOfJourneys />
        <CrystalOfConnection />
      </main>

      <Footer />
    </div>
  );
}
