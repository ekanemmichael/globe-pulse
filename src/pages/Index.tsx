import { useMemo, useState } from "react";
import { PulseGlobe } from "@/components/PulseGlobe";
import { ActivityFeed } from "@/components/ActivityFeed";
import { HudOverlay } from "@/components/HudOverlay";
import { useGlobalEvents } from "@/hooks/useGlobalEvents";

const Index = () => {
  const { events, loading, fetchedAt } = useGlobalEvents();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const countryCount = useMemo(
    () => new Set(events.map((e) => e.countryCode)).size,
    [events]
  );

  return (
    <main className="hud-grid relative h-screen w-screen overflow-hidden bg-background">
      {/* Globe layer */}
      <div className="absolute inset-0 z-0 lg:right-[400px]">
        <PulseGlobe
          events={events}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* HUD overlay */}
      <HudOverlay signalCount={events.length} countryCount={countryCount} />

      {/* Side feed */}
      <div className="absolute bottom-6 right-6 top-24 z-20 w-[380px] max-w-[calc(100vw-3rem)]">
        <ActivityFeed
          events={events}
          selectedId={selectedId}
          onSelect={setSelectedId}
          loading={loading}
          fetchedAt={fetchedAt}
        />
      </div>
    </main>
  );
};

export default Index;
