import { useEffect, useState } from "react";

interface HudOverlayProps {
  signalCount: number;
  countryCount: number;
}

export function HudOverlay({ signalCount, countryCount }: HudOverlayProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      {/* Top-left brand */}
      <div className="pointer-events-none absolute left-6 top-5 z-10 select-none">
        <div className="flex items-center gap-3">
          <div className="relative h-3 w-3">
            <span className="absolute inset-0 animate-blink rounded-full bg-primary shadow-glow" />
            <span className="absolute inset-[-4px] animate-pulse-ring rounded-full border border-primary" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold uppercase tracking-[0.3em] text-primary text-glow">
              Pulse · Earth
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              global signal monitor
            </p>
          </div>
        </div>
      </div>

      {/* Top-right clock + status */}
      <div className="pointer-events-none absolute right-6 top-5 z-10 select-none text-right">
        <div className="font-mono text-2xl font-semibold text-primary text-glow tabular-nums">
          {now.toUTCString().slice(17, 25)}
          <span className="ml-2 text-xs text-muted-foreground">UTC</span>
        </div>
        <div className="mt-1 flex items-center justify-end gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent))]" />
          system online
        </div>
      </div>

      {/* Bottom-left stats */}
      <div className="pointer-events-none absolute bottom-6 left-6 z-10 flex gap-4 select-none">
        <Stat label="Signals" value={signalCount.toString().padStart(3, "0")} />
        <Stat label="Regions" value={countryCount.toString().padStart(2, "0")} />
        <Stat label="Mode" value="LIVE" accent />
      </div>

      {/* Bottom-right hint */}
      <div className="pointer-events-none absolute bottom-6 right-6 z-10 select-none text-right font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        drag to rotate · scroll to zoom · click pings
      </div>

      {/* Scan line */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-0 right-0 h-px animate-scan-line bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      </div>

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, hsl(var(--background)) 100%)",
        }}
      />
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="hud-corner panel rounded-sm px-3 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`font-mono text-base font-semibold tabular-nums ${
          accent ? "text-secondary" : "text-primary text-glow"
        }`}
      >
        {value}
      </div>
    </div>
  );
}