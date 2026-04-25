import { corsHeaders } from "@supabase/supabase-js/cors";

// Country code → { name, lat, lng } for geo placement of news arcs.
const COUNTRIES: Record<string, { name: string; lat: number; lng: number }> = {
  us: { name: "United States", lat: 38.9, lng: -77.0 },
  gb: { name: "United Kingdom", lat: 51.5, lng: -0.12 },
  ca: { name: "Canada", lat: 45.42, lng: -75.7 },
  au: { name: "Australia", lat: -35.28, lng: 149.13 },
  de: { name: "Germany", lat: 52.52, lng: 13.4 },
  fr: { name: "France", lat: 48.85, lng: 2.35 },
  it: { name: "Italy", lat: 41.9, lng: 12.5 },
  es: { name: "Spain", lat: 40.42, lng: -3.7 },
  nl: { name: "Netherlands", lat: 52.37, lng: 4.9 },
  br: { name: "Brazil", lat: -15.78, lng: -47.93 },
  mx: { name: "Mexico", lat: 19.43, lng: -99.13 },
  ar: { name: "Argentina", lat: -34.6, lng: -58.38 },
  in: { name: "India", lat: 28.61, lng: 77.21 },
  jp: { name: "Japan", lat: 35.68, lng: 139.69 },
  cn: { name: "China", lat: 39.9, lng: 116.4 },
  kr: { name: "South Korea", lat: 37.57, lng: 126.98 },
  ru: { name: "Russia", lat: 55.75, lng: 37.62 },
  za: { name: "South Africa", lat: -25.75, lng: 28.19 },
  eg: { name: "Egypt", lat: 30.04, lng: 31.24 },
  ng: { name: "Nigeria", lat: 9.07, lng: 7.49 },
  ke: { name: "Kenya", lat: -1.29, lng: 36.82 },
  ma: { name: "Morocco", lat: 34.02, lng: -6.83 },
  tr: { name: "Turkey", lat: 39.93, lng: 32.86 },
  sa: { name: "Saudi Arabia", lat: 24.71, lng: 46.68 },
  ae: { name: "UAE", lat: 24.47, lng: 54.37 },
  il: { name: "Israel", lat: 31.77, lng: 35.21 },
  id: { name: "Indonesia", lat: -6.21, lng: 106.85 },
  th: { name: "Thailand", lat: 13.75, lng: 100.5 },
  sg: { name: "Singapore", lat: 1.35, lng: 103.82 },
  my: { name: "Malaysia", lat: 3.14, lng: 101.69 },
  ph: { name: "Philippines", lat: 14.6, lng: 120.98 },
  tw: { name: "Taiwan", lat: 25.03, lng: 121.57 },
  hk: { name: "Hong Kong", lat: 22.32, lng: 114.17 },
  no: { name: "Norway", lat: 59.91, lng: 10.75 },
  se: { name: "Sweden", lat: 59.33, lng: 18.07 },
  pl: { name: "Poland", lat: 52.23, lng: 21.01 },
  pt: { name: "Portugal", lat: 38.72, lng: -9.14 },
  gr: { name: "Greece", lat: 37.98, lng: 23.73 },
  ie: { name: "Ireland", lat: 53.35, lng: -6.26 },
  be: { name: "Belgium", lat: 50.85, lng: 4.35 },
  at: { name: "Austria", lat: 48.21, lng: 16.37 },
  ch: { name: "Switzerland", lat: 46.95, lng: 7.45 },
  ua: { name: "Ukraine", lat: 50.45, lng: 30.52 },
};

const COUNTRY_CODES = Object.keys(COUNTRIES);

// Hub points the arcs all flow to/from for a "global pulse" look.
const HUBS = [
  { lat: 0, lng: 0 }, // Gulf of Guinea — visually central
  { lat: 40.71, lng: -74.0 }, // NYC
  { lat: 51.5, lng: -0.12 }, // London
  { lat: 35.68, lng: 139.69 }, // Tokyo
];

function pickHub(lat: number, lng: number) {
  // Pick the hub farthest away to make a dramatic arc
  let best = HUBS[0];
  let bestD = -1;
  for (const h of HUBS) {
    const d = Math.hypot(h.lat - lat, h.lng - lng);
    if (d > bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GNEWS_API_KEY");
    if (!apiKey) {
      throw new Error("GNEWS_API_KEY is not configured");
    }

    // Fetch from a handful of countries in parallel for global coverage.
    const sample = COUNTRY_CODES
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);

    const results = await Promise.allSettled(
      sample.map(async (code) => {
        const url = `https://gnews.io/api/v4/top-headlines?country=${code}&max=3&lang=en&apikey=${apiKey}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`gnews ${code} ${r.status}`);
        const j = await r.json();
        return { code, articles: j.articles ?? [] };
      })
    );

    const events: Array<{
      id: string;
      title: string;
      description: string | null;
      url: string;
      image: string | null;
      source: string;
      publishedAt: string;
      country: string;
      countryCode: string;
      lat: number;
      lng: number;
      endLat: number;
      endLng: number;
    }> = [];

    for (const res of results) {
      if (res.status !== "fulfilled") continue;
      const { code, articles } = res.value;
      const geo = COUNTRIES[code];
      if (!geo) continue;
      for (const a of articles) {
        const hub = pickHub(geo.lat, geo.lng);
        // Tiny jitter so multiple arcs from the same country don't fully overlap.
        const jitterLat = (Math.random() - 0.5) * 4;
        const jitterLng = (Math.random() - 0.5) * 4;
        events.push({
          id: `${code}-${a.url}`,
          title: a.title,
          description: a.description,
          url: a.url,
          image: a.image,
          source: a.source?.name ?? "Unknown",
          publishedAt: a.publishedAt,
          country: geo.name,
          countryCode: code.toUpperCase(),
          lat: geo.lat + jitterLat,
          lng: geo.lng + jitterLng,
          endLat: hub.lat,
          endLng: hub.lng,
        });
      }
    }

    return new Response(
      JSON.stringify({ events, fetchedAt: new Date().toISOString() }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("gnews-feed error", message);
    return new Response(JSON.stringify({ error: message, events: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});