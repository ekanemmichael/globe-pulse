import { useMemo, useState } from "react";
import { PulseGlobe } from "@/components/PulseGlobe";
import { ActivityFeed } from "@/components/ActivityFeed";
import { HudOverlay } from "@/components/HudOverlay";
import { useGlobalEvents } from "@/hooks/useGlobalEvents";

const Index = () => {
  const { events, loading, fetchedAt } = useGlobalEvents();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [speed, setSpeed] = useState<"calm" | "live">("live");

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
          speed={speed}
        />
      </div>

      {/* HUD overlay */}
      <HudOverlay signalCount={events.length} countryCount={countryCount} />

      {/* Animation tempo toggle */}
      <div className="absolute left-6 bottom-6 z-30 flex items-center gap-1 rounded-sm border border-primary/40 bg-background/70 p-1 font-mono text-[10px] uppercase tracking-[0.2em] backdrop-blur">
        <span className="px-2 text-muted-foreground">Tempo</span>
        {(["calm", "live"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={
              "px-3 py-1 transition-colors " +
              (speed === s
                ? "bg-primary/20 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {s}
          </button>
        ))}
      </div>

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
