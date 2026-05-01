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

      {/* Animation tempo toggle — minimal pill, sits above footer rule */}
      <div className="absolute bottom-16 left-6 z-30 flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.3em]">
        <span className="text-muted-foreground">Tempo</span>
        <div className="flex items-center gap-1">
          {(["calm", "live"] as const).map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground/40">·</span>}
              <button
                onClick={() => setSpeed(s)}
                className={
                  "transition-colors " +
                  (speed === s
                    ? "text-primary text-glow"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {s}
              </button>
            </span>
          ))}
        </div>
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
