import { useEffect, useMemo, useRef } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { GlobalEvent } from "@/types/event";

interface PulseGlobeProps {
  events: GlobalEvent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Animation tempo — "calm" slows arcs/rings, "live" speeds them up. */
  speed?: "calm" | "live";
}

/**
 * Holographic wireframe earth.
 * - Dark transparent surface with cyan country polygons
 * - Animated arcs from event origin to a hub
 * - Pulsing rings at each event endpoint
 */
export function PulseGlobe({
  events,
  selectedId,
  onSelect,
  speed = "live",
}: PulseGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [, force] = useReducerTick();

  // Speed multipliers — "calm" is slower & gentler, "live" is the punchy default.
  const tempo = useMemo(
    () =>
      speed === "calm"
        ? {
            arcDashTime: 7000,
            ringPropagation: 1.2,
            ringPeriod: 2400,
            blinkHz: 900,
            blinkAmp: 0.18,
          }
        : {
            arcDashTime: 3600,
            ringPropagation: 2.6,
            ringPeriod: 1300,
            blinkHz: 480,
            blinkAmp: 0.3,
          },
    [speed]
  );

  // Read CSS tokens once for theming the globe (computed at runtime).
  const colors = useMemo(() => readDesignTokens(), []);

  // Country polygons: load Natural Earth countries GeoJSON once.
  // These give us labeled country borders that glow on hover.
  const countriesRef = useRef<{ features: object[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json"
    )
      .then((r) => r.json())
      .then(async (topo) => {
        const ts = await import("topojson-client");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gj = ts.feature(topo as any, (topo as any).objects.countries) as unknown as { features: object[] };
        if (cancelled) return;
        countriesRef.current = gj;
        force();
      })
      .catch((e) => console.error("countries load failed", e));
    return () => {
      cancelled = true;
    };
  }, [force]);

  // Configure controls and start auto-rotation.
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls() as unknown as {
      autoRotate: boolean;
      autoRotateSpeed: number;
      enableZoom: boolean;
      enablePan: boolean;
      minDistance: number;
      maxDistance: number;
      addEventListener: (t: string, cb: () => void) => void;
      removeEventListener: (t: string, cb: () => void) => void;
    };
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 180;
    controls.maxDistance = 600;

    let resumeTimer: number | undefined;
    const onStart = () => {
      controls.autoRotate = false;
      if (resumeTimer) window.clearTimeout(resumeTimer);
    };
    const onEnd = () => {
      if (resumeTimer) window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        controls.autoRotate = true;
      }, 2500);
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);

    g.pointOfView({ lat: 25, lng: 10, altitude: 2.4 }, 0);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      if (resumeTimer) window.clearTimeout(resumeTimer);
    };
  }, []);

  // Track container size so the globe scales with the viewport.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        sizeRef.current = {
          w: e.contentRect.width,
          h: e.contentRect.height,
        };
        force();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [force]);

  // Drive the point-blink animation by ticking the component a few times
  // a second. Cheap because react-globe.gl diffs its scene internally.
  useEffect(() => {
    const id = window.setInterval(() => force(), 120);
    return () => window.clearInterval(id);
  }, [force]);

  // Fly to the selected event.
  useEffect(() => {
    if (!selectedId) return;
    const ev = events.find((e) => e.id === selectedId);
    if (!ev || !globeRef.current) return;
    globeRef.current.pointOfView(
      { lat: ev.lat, lng: ev.lng, altitude: 1.6 },
      1200
    );
  }, [selectedId, events]);

  // Custom HTML markers — pulsing dot for each event endpoint.
  const htmlElements = useMemo(
    () =>
      events.map((e) => ({
        ...e,
        __type: "marker" as const,
      })),
    [events]
  );

  const arcs = useMemo(
    () => buildArcs(events, selectedId, colors),
    [events, selectedId, colors]
  );

  // Direction markers: drop a small "→" label at ~70% along each arc so the
  // viewer can tell which way the signal is flowing toward the hub.
  const arrowLabels = useMemo(
    () => buildArrowLabels(events, colors, selectedId),
    [events, colors, selectedId]
  );

  // Hub glow: subtle synchronized pulse at every endpoint (the receiving hub).
  // Uses a second ring layer with a slightly different cadence so it visually
  // "answers" the incoming arc without competing with the source blink.
  const hubs = useMemo(() => collectHubs(events), [events]);
  const hubPulse = useMemo(() => {
    const t = (Date.now() / tempo.blinkHz) % (Math.PI * 2);
    return 0.6 + tempo.blinkAmp * (0.5 + 0.5 * Math.sin(t));
  }, [tempo, /* re-eval on tick */ Math.floor(Date.now() / 120)]);

  // Hovered country highlight state (keeps re-render cost low via ref + tick).
  const hoveredCountryRef = useRef<object | null>(null);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <Globe
        ref={globeRef}
        width={sizeRef.current.w || undefined}
        height={sizeRef.current.h || undefined}
        backgroundColor="rgba(0,0,0,0)"
        // Realistic Earth: day-time texture + bump map for terrain relief.
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        showAtmosphere
        atmosphereColor={colors.primary}
        atmosphereAltitude={0.22}
        // Country polygons overlay — invisible by default, glow cyan on hover.
        polygonsData={countriesRef.current?.features ?? []}
        polygonCapColor={(d: object) =>
          d === hoveredCountryRef.current
            ? `${colors.primary}55`
            : "rgba(0,0,0,0)"
        }
        polygonSideColor={() => "rgba(0,0,0,0)"}
        polygonStrokeColor={() => `${colors.primaryGlow}`}
        polygonAltitude={(d: object) =>
          d === hoveredCountryRef.current ? 0.01 : 0.005
        }
        polygonLabel={(d: object) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const name = (d as any)?.properties?.name ?? "";
          const count = events.filter((e) =>
            countryMatches(name, e.country)
          ).length;
          return `
            <div style="
              font-family:'JetBrains Mono',monospace;
              background:hsl(220 50% 4% / 0.9);
              border:1px solid ${colors.primary};
              padding:6px 10px;border-radius:2px;
              color:${colors.primary};
              text-transform:uppercase;letter-spacing:0.15em;font-size:11px;
              box-shadow:0 0 16px ${colors.primary}80;
            ">
              <div style="font-weight:600;">${name}</div>
              <div style="color:hsl(200 15% 60%);font-size:10px;margin-top:2px;">
                ${count} signal${count === 1 ? "" : "s"}
              </div>
            </div>
          `;
        }}
        onPolygonHover={(d) => {
          hoveredCountryRef.current = (d as object) ?? null;
          force();
        }}
        // Arcs
        arcsData={arcs}
        arcStartLat={(d: object) => (d as ArcDatum).startLat}
        arcStartLng={(d: object) => (d as ArcDatum).startLng}
        arcEndLat={(d: object) => (d as ArcDatum).endLat}
        arcEndLng={(d: object) => (d as ArcDatum).endLng}
        arcColor={(d: object) =>
          (d as { color: string[] }).color
        }
        arcStroke={(d: object) =>
          (d as ArcDatum).id === selectedId ? 0.9 : 0.5
        }
        arcAltitude={(d: object) => (d as ArcDatum).altitude}
        arcDashLength={0.35}
        arcDashGap={1.6}
        arcDashInitialGap={(d: object) =>
          (d as ArcDatum).dashOffset
        }
        arcDashAnimateTime={tempo.arcDashTime}
        arcsTransitionDuration={0}
        // Direction arrows along arcs.
        labelsData={arrowLabels}
        labelLat={(d: object) => (d as ArrowLabel).lat}
        labelLng={(d: object) => (d as ArrowLabel).lng}
        labelText={(d: object) => (d as ArrowLabel).text}
        labelSize={(d: object) => (d as ArrowLabel).size}
        labelDotRadius={0}
        labelColor={(d: object) => (d as ArrowLabel).color}
        labelResolution={2}
        labelAltitude={0.02}
        labelIncludeDot={false}
        // Pulsing event markers — using built-in points layer (3D, robust)
        // plus a separate "ring" layer for the animated halo.
        pointsData={htmlElements}
        pointLat={(d: object) => (d as GlobalEvent).lat}
        pointLng={(d: object) => (d as GlobalEvent).lng}
        pointColor={(d: object) =>
          (d as GlobalEvent).id === selectedId
            ? colors.secondary
            : colors.primary
        }
        pointAltitude={0.012}
        pointRadius={(d: object) => {
          const isSel = (d as GlobalEvent).id === selectedId;
          // Subtle blink driven by time — modulate radius with a sine wave,
          // tempo-aware so "calm" mode breathes more slowly.
          const t = (Date.now() / tempo.blinkHz) % (Math.PI * 2);
          const blink =
            1 - tempo.blinkAmp +
            tempo.blinkAmp * Math.sin(t + ((d as GlobalEvent).lat || 0));
          return (isSel ? 0.5 : 0.3) * blink;
        }}
        pointsTransitionDuration={0}
        pointResolution={10}
        onPointClick={(d) => onSelect((d as GlobalEvent).id)}
        // Source pulse rings + hub pulse rings, merged into one layer so
        // react-globe.gl renders both with consistent timing. Hubs use a
        // slightly larger radius so the "receive" halo synchronises visually
        // with the incoming arc.
        ringsData={[
          ...htmlElements.map((e) => ({
            id: e.id,
            lat: e.lat,
            lng: e.lng,
            kind: "source" as const,
            isSelected: e.id === selectedId,
          })),
          ...hubs.map((h) => ({
            id: `hub-${h.lat}-${h.lng}`,
            lat: h.lat,
            lng: h.lng,
            kind: "hub" as const,
            isSelected: false,
          })),
        ]}
        ringLat={(d: object) => (d as RingDatum).lat}
        ringLng={(d: object) => (d as RingDatum).lng}
        ringColor={(d: object) => {
          const r = d as RingDatum;
          if (r.kind === "hub") return colorWithAlpha(colors.primaryGlow, hubPulse);
          return r.isSelected
            ? colorWithAlpha(colors.secondary, 0.85)
            : colorWithAlpha(colors.primary, 0.85);
        }}
        ringMaxRadius={(d: object) => {
          const r = d as RingDatum;
          if (r.kind === "hub") return 6;
          return r.isSelected ? 5 : 3.5;
        }}
        ringPropagationSpeed={tempo.ringPropagation}
        ringRepeatPeriod={(d: object) => {
          const r = d as RingDatum;
          if (r.kind === "hub") return tempo.ringPeriod * 0.85;
          return r.isSelected ? tempo.ringPeriod * 0.65 : tempo.ringPeriod;
        }}
        ringAltitude={0.012}
      />
    </div>
  );
}

function countryMatches(geoName: string, eventCountry: string) {
  if (!geoName || !eventCountry) return false;
  const a = geoName.toLowerCase();
  const b = eventCountry.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

/* ---------------- arc / hub shaping ---------------- */

interface ArcDatum {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  altitude: number;
  dashOffset: number;
  color: string[];
}

interface ArrowLabel {
  lat: number;
  lng: number;
  text: string;
  size: number;
  color: string;
}

interface RingDatum {
  id: string;
  lat: number;
  lng: number;
  kind: "source" | "hub";
  isSelected: boolean;
}

/**
 * Build arc geometry with a small "collision-avoidance" altitude bump.
 * Arcs that share a similar route get progressively higher arcs so they
 * fan out vertically instead of stacking on top of each other.
 */
function buildArcs(
  events: GlobalEvent[],
  selectedId: string | null,
  colors: ReturnType<typeof readDesignTokens>
): ArcDatum[] {
  // Bucket arcs by a coarse great-circle key (rounded endpoints).
  const buckets = new Map<string, number>();
  return events.map((e) => {
    const key = routeKey(e.lat, e.lng, e.endLat, e.endLng);
    const idx = buckets.get(key) ?? 0;
    buckets.set(key, idx + 1);
    // Each parallel arc gets a slightly higher altitude — readable separation.
    const altitude = 0.18 + idx * 0.06 + Math.min(0.25, distance(e) * 0.0007);
    return {
      id: e.id,
      startLat: e.lat,
      startLng: e.lng,
      endLat: e.endLat,
      endLng: e.endLng,
      altitude,
      dashOffset: ((e.lng + 180) / 360 + idx * 0.13) % 1,
      color:
        e.id === selectedId
          ? [colors.secondary, colors.secondaryGlow ?? colors.secondary]
          : [colors.primary, colors.primaryGlow, colors.secondary],
    };
  });
}

function routeKey(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (n: number) => Math.round(n / 4) * 4; // 4° buckets
  // Order-independent so A→B and B→A bucket together.
  const a = `${r(lat1)},${r(lng1)}`;
  const b = `${r(lat2)},${r(lng2)}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function distance(e: GlobalEvent) {
  const dLat = e.endLat - e.lat;
  const dLng = e.endLng - e.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Place a "→" marker near the receiving hub end of every arc, rotated
 * implicitly by the great-circle direction (we just pick a point ~75% along
 * the route — globe labels always face the camera, so a literal arrow glyph
 * still reads as "flow toward hub").
 */
function buildArrowLabels(
  events: GlobalEvent[],
  colors: ReturnType<typeof readDesignTokens>,
  selectedId: string | null
): ArrowLabel[] {
  return events.map((e) => {
    const t = 0.78; // closer to the hub
    return {
      lat: e.lat + (e.endLat - e.lat) * t,
      lng: e.lng + (e.endLng - e.lng) * t,
      text: "›",
      size: e.id === selectedId ? 0.55 : 0.4,
      color:
        e.id === selectedId
          ? colors.secondary
          : colors.primaryGlow,
    };
  });
}

/** Unique hub endpoints so we can glow each receiving location once. */
function collectHubs(events: GlobalEvent[]) {
  const seen = new Map<string, { lat: number; lng: number }>();
  for (const e of events) {
    const k = `${e.endLat.toFixed(2)},${e.endLng.toFixed(2)}`;
    if (!seen.has(k)) seen.set(k, { lat: e.endLat, lng: e.endLng });
  }
  return [...seen.values()];
}

/* ---------------- helpers ---------------- */

function readDesignTokens() {
  if (typeof window === "undefined") {
    return {
      primary: "#2af0ff",
      primaryGlow: "#7ff8ff",
      secondary: "#ff3fb1",
      secondaryGlow: "#ff8fd1",
      surface: "#08121f",
    };
  }
  const styles = getComputedStyle(document.documentElement);
  const hsl = (name: string) => `hsl(${styles.getPropertyValue(name).trim()})`;
  return {
    primary: hsl("--primary"),
    primaryGlow: hsl("--primary-glow"),
    secondary: hsl("--secondary"),
    secondaryGlow: hsl("--secondary"),
    surface: hsl("--surface"),
  };
}

/**
 * Convert an `hsl(H S% L%)` or `#rrggbb` color into an `hsla()` / `rgba()`
 * string with the supplied alpha. Used so animated rings can fade out
 * smoothly without producing colors that confuse the three.js tween engine.
 */
function colorWithAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const trimmed = color.trim();
  if (trimmed.startsWith("hsl")) {
    const inner = trimmed.replace(/^hsla?\(/, "").replace(/\)$/, "");
    const parts = inner.split(/[,\s/]+/).filter(Boolean).slice(0, 3);
    return `hsla(${parts.join(", ")}, ${a})`;
  }
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return trimmed;
}

import { useReducer } from "react";
function useReducerTick() {
  return useReducer((x: number) => x + 1, 0);
}