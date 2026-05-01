import { useEffect, useState } from "react";

interface HudOverlayProps {
  signalCount: number;
  countryCount: number;
}

/**
 * Editorial HUD — minimal, lots of negative space, refined typography.
 * Two thin rules at top/bottom act as masthead / footer instead of panels.
 * Stats are inline metadata, not boxed widgets.
 */
export function HudOverlay({ signalCount, countryCount }: HudOverlayProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const time = now.toUTCString().slice(17, 25);
  const date = now
    .toUTCString()
    .slice(5, 16)
    .toUpperCase();

  return (
    <>
      {/* Globe framing — quiet vignette + soft ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 35% 50%, hsl(var(--primary) / 0.08) 0%, transparent 55%), radial-gradient(ellipse at center, transparent 55%, hsl(var(--background)) 100%)",
        }}
      />

      {/* Top masthead — single hairline rule, brand left, time right */}
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-10 select-none">
        <div className="mx-6 flex items-baseline justify-between border-b border-primary/15 pb-3 pt-5 lg:mr-[400px]">
          <div className="flex items-baseline gap-3">
            <span className="relative inline-block h-1.5 w-1.5 translate-y-[-2px]">
              <span className="absolute inset-0 animate-blink rounded-full bg-primary" />
            </span>
            <h1 className="font-display text-[13px] font-semibold uppercase tracking-[0.45em] text-foreground">
              Pulse<span className="mx-2 text-primary">/</span>Earth
            </h1>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:inline">
              global signal monitor
            </span>
          </div>
          <div className="flex items-baseline gap-4 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground tabular-nums">
            <span className="hidden md:inline">{date}</span>
            <span className="text-foreground">
              {time}
              <span className="ml-1.5 text-muted-foreground">UTC</span>
            </span>
          </div>
        </div>
      </header>

      {/* Bottom footer — inline stats, hairline rule, no boxes */}
      <footer className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 select-none">
        <div className="mx-6 flex items-baseline justify-between border-t border-primary/15 pb-5 pt-3 lg:mr-[400px]">
          <div className="flex items-baseline gap-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <InlineStat label="Signals" value={pad(signalCount, 3)} />
            <InlineStat label="Regions" value={pad(countryCount, 2)} />
            <InlineStat label="Status" value="LIVE" pulse />
          </div>
          <div className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:block">
            drag · scroll · click
          </div>
        </div>
      </footer>
    </>
  );
}

function pad(n: number, len: number) {
  return n.toString().padStart(len, "0");
}

function InlineStat({
  label,
  value,
  pulse,
}: {
  label: string;
  value: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span>{label}</span>
      <span
        className={
          "font-display text-sm font-semibold tabular-nums tracking-widest " +
          (pulse ? "text-primary" : "text-foreground")
        }
      >
        {value}
      </span>
      {pulse && (
        <span className="ml-0.5 inline-block h-1.5 w-1.5 animate-blink rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
      )}
    </div>
  );
}