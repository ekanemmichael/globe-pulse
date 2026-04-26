import { useEffect, useMemo, useRef } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { GlobalEvent } from "@/types/event";

interface PulseGlobeProps {
  events: GlobalEvent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * Holographic wireframe earth.
 * - Dark transparent surface with cyan country polygons
 * - Animated arcs from event origin to a hub
 * - Pulsing rings at each event endpoint
 */
export function PulseGlobe({ events, selectedId, onSelect }: PulseGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [, force] = useReducerTick();

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
    () =>
      events.map((e) => ({
        ...e,
        color:
          e.id === selectedId
            ? [colors.secondary, colors.secondary]
            : [colors.primary, colors.primaryGlow],
      })),
    [events, selectedId, colors]
  );

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
        arcStartLat={(d: object) => (d as GlobalEvent).lat}
        arcStartLng={(d: object) => (d as GlobalEvent).lng}
        arcEndLat={(d: object) => (d as GlobalEvent).endLat}
        arcEndLng={(d: object) => (d as GlobalEvent).endLng}
        arcColor={(d: object) =>
          (d as { color: string[] }).color
        }
        arcStroke={0.4}
        arcAltitudeAutoScale={0.5}
        arcDashLength={0.5}
        arcDashGap={1}
        arcDashAnimateTime={3500}
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
        pointAltitude={0.01}
        pointRadius={(d: object) =>
          (d as GlobalEvent).id === selectedId ? 0.45 : 0.3
        }
        pointResolution={8}
        onPointClick={(d) => onSelect((d as GlobalEvent).id)}
        ringsData={htmlElements}
        ringLat={(d: object) => (d as GlobalEvent).lat}
        ringLng={(d: object) => (d as GlobalEvent).lng}
        ringColor={(d: object) =>
          (d as GlobalEvent).id === selectedId
            ? colors.secondary
            : colors.primary
        }
        ringMaxRadius={3}
        ringPropagationSpeed={2}
        ringRepeatPeriod={1500}
        ringAltitude={0.011}
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

/* ---------------- helpers ---------------- */

function readDesignTokens() {
  if (typeof window === "undefined") {
    return {
      primary: "#2af0ff",
      primaryGlow: "#7ff8ff",
      secondary: "#ff3fb1",
      surface: "#08121f",
    };
  }
  const styles = getComputedStyle(document.documentElement);
  const hsl = (name: string) => `hsl(${styles.getPropertyValue(name).trim()})`;
  return {
    primary: hsl("--primary"),
    primaryGlow: hsl("--primary-glow"),
    secondary: hsl("--secondary"),
    surface: hsl("--surface"),
  };
}

import { useReducer } from "react";
function useReducerTick() {
  return useReducer((x: number) => x + 1, 0);
}