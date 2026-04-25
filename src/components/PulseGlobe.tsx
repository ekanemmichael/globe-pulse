import { useEffect, useMemo, useRef } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
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
  const countriesRef = useRef<{ features: object[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json"
    )
      .then((r) => r.json())
      .then(async (topo) => {
        // Convert TopoJSON to GeoJSON via topojson-client (loaded dynamically)
        const ts = await import("topojson-client");
        const gj = ts.feature(
          topo,
          (topo as { objects: { countries: object } }).objects.countries
        ) as unknown as { features: object[] };
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

    g.pointOfView({ lat: 25, lng: 10, altitude: 2.6 }, 0);
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

  return (
    <div ref={containerRef} className="absolute inset-0">
      <Globe
        ref={globeRef}
        width={sizeRef.current.w || undefined}
        height={sizeRef.current.h || undefined}
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere
        atmosphereColor={colors.primary}
        atmosphereAltitude={0.18}
        globeMaterial={
          new THREE.MeshPhongMaterial({
            color: new THREE.Color(colors.surface),
            emissive: new THREE.Color(colors.surface),
            emissiveIntensity: 0.05,
            transparent: true,
            opacity: 0.85,
            shininess: 4,
          })
        }
        // Country polygons (wireframe-ish look)
        polygonsData={countriesRef.current?.features ?? []}
        polygonCapColor={() => `${colors.primary}10`}
        polygonSideColor={() => `${colors.primary}05`}
        polygonStrokeColor={() => colors.primaryGlow}
        polygonAltitude={0.005}
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
        // HTML markers (pulsing rings)
        htmlElementsData={htmlElements}
        htmlLat={(d: object) => (d as GlobalEvent).lat}
        htmlLng={(d: object) => (d as GlobalEvent).lng}
        htmlAltitude={0.01}
        htmlElement={(d: object) => {
          const ev = d as GlobalEvent;
          const isSelected = ev.id === selectedId;
          const wrap = document.createElement("div");
          wrap.style.cssText = `pointer-events:auto;cursor:pointer;width:0;height:0;`;
          const accent = isSelected ? colors.secondary : colors.primary;
          wrap.innerHTML = `
            <div style="position:relative;transform:translate(-50%,-50%);">
              <div style="
                position:absolute;left:0;top:0;transform:translate(-50%,-50%);
                width:8px;height:8px;border-radius:9999px;
                background:${accent};
                box-shadow:0 0 8px ${accent},0 0 16px ${accent};
              "></div>
              <div style="
                position:absolute;left:0;top:0;transform:translate(-50%,-50%);
                width:24px;height:24px;border-radius:9999px;
                border:1.5px solid ${accent};
                animation:pulse-ring 2s ease-out infinite;
                opacity:0.9;
              "></div>
            </div>
          `;
          wrap.addEventListener("click", (e) => {
            e.stopPropagation();
            onSelect(ev.id);
          });
          return wrap;
        }}
      />
    </div>
  );
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