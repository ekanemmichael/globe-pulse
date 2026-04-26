const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

// Extra "virtual" hotspots: major metro areas to scatter additional jittered
// signals around the globe so the visualization feels denser even when the
// underlying news API only indexes by country.
const EXTRA_HOTSPOTS: Array<{ code: string; name: string; lat: number; lng: number; parent: string }> = [
  { code: "us-la", name: "Los Angeles", lat: 34.05, lng: -118.24, parent: "us" },
  { code: "us-ny", name: "New York", lat: 40.71, lng: -74.0, parent: "us" },
  { code: "us-ch", name: "Chicago", lat: 41.88, lng: -87.63, parent: "us" },
  { code: "us-mi", name: "Miami", lat: 25.76, lng: -80.19, parent: "us" },
  { code: "us-sf", name: "San Francisco", lat: 37.77, lng: -122.42, parent: "us" },
  { code: "ca-to", name: "Toronto", lat: 43.65, lng: -79.38, parent: "ca" },
  { code: "ca-va", name: "Vancouver", lat: 49.28, lng: -123.12, parent: "ca" },
  { code: "br-sp", name: "São Paulo", lat: -23.55, lng: -46.63, parent: "br" },
  { code: "br-rj", name: "Rio de Janeiro", lat: -22.91, lng: -43.17, parent: "br" },
  { code: "cl", name: "Chile", lat: -33.45, lng: -70.67, parent: "ar" },
  { code: "co", name: "Colombia", lat: 4.71, lng: -74.07, parent: "ar" },
  { code: "pe", name: "Peru", lat: -12.05, lng: -77.04, parent: "ar" },
  { code: "ve", name: "Venezuela", lat: 10.49, lng: -66.88, parent: "br" },
  { code: "uk-mn", name: "Manchester", lat: 53.48, lng: -2.24, parent: "gb" },
  { code: "de-mu", name: "Munich", lat: 48.14, lng: 11.58, parent: "de" },
  { code: "fr-ly", name: "Lyon", lat: 45.76, lng: 4.84, parent: "fr" },
  { code: "es-bc", name: "Barcelona", lat: 41.39, lng: 2.17, parent: "es" },
  { code: "it-ml", name: "Milan", lat: 45.46, lng: 9.19, parent: "it" },
  { code: "ro", name: "Romania", lat: 44.43, lng: 26.1, parent: "ua" },
  { code: "cz", name: "Czechia", lat: 50.08, lng: 14.43, parent: "de" },
  { code: "hu", name: "Hungary", lat: 47.5, lng: 19.04, parent: "at" },
  { code: "fi", name: "Finland", lat: 60.17, lng: 24.94, parent: "se" },
  { code: "dk", name: "Denmark", lat: 55.68, lng: 12.57, parent: "se" },
  { code: "is", name: "Iceland", lat: 64.13, lng: -21.82, parent: "no" },
  { code: "ru-no", name: "Novosibirsk", lat: 55.0, lng: 82.93, parent: "ru" },
  { code: "in-mu", name: "Mumbai", lat: 19.08, lng: 72.88, parent: "in" },
  { code: "in-ba", name: "Bengaluru", lat: 12.97, lng: 77.59, parent: "in" },
  { code: "pk", name: "Pakistan", lat: 33.68, lng: 73.05, parent: "in" },
  { code: "bd", name: "Bangladesh", lat: 23.81, lng: 90.41, parent: "in" },
  { code: "lk", name: "Sri Lanka", lat: 6.93, lng: 79.86, parent: "in" },
  { code: "vn", name: "Vietnam", lat: 21.03, lng: 105.85, parent: "th" },
  { code: "kh", name: "Cambodia", lat: 11.56, lng: 104.92, parent: "th" },
  { code: "mm", name: "Myanmar", lat: 16.87, lng: 96.2, parent: "th" },
  { code: "cn-sh", name: "Shanghai", lat: 31.23, lng: 121.47, parent: "cn" },
  { code: "cn-gz", name: "Guangzhou", lat: 23.13, lng: 113.26, parent: "cn" },
  { code: "jp-os", name: "Osaka", lat: 34.69, lng: 135.5, parent: "jp" },
  { code: "au-sy", name: "Sydney", lat: -33.87, lng: 151.21, parent: "au" },
  { code: "au-me", name: "Melbourne", lat: -37.81, lng: 144.96, parent: "au" },
  { code: "nz", name: "New Zealand", lat: -41.29, lng: 174.78, parent: "au" },
  { code: "za-cp", name: "Cape Town", lat: -33.92, lng: 18.42, parent: "za" },
  { code: "et", name: "Ethiopia", lat: 9.03, lng: 38.74, parent: "ke" },
  { code: "tz", name: "Tanzania", lat: -6.79, lng: 39.21, parent: "ke" },
  { code: "gh", name: "Ghana", lat: 5.6, lng: -0.19, parent: "ng" },
  { code: "sn", name: "Senegal", lat: 14.69, lng: -17.44, parent: "ng" },
  { code: "dz", name: "Algeria", lat: 36.75, lng: 3.04, parent: "ma" },
  { code: "tn", name: "Tunisia", lat: 36.8, lng: 10.18, parent: "ma" },
  { code: "qa", name: "Qatar", lat: 25.29, lng: 51.53, parent: "ae" },
  { code: "kw", name: "Kuwait", lat: 29.38, lng: 47.99, parent: "sa" },
  { code: "jo", name: "Jordan", lat: 31.95, lng: 35.93, parent: "il" },
  { code: "lb", name: "Lebanon", lat: 33.89, lng: 35.5, parent: "il" },
  { code: "ir", name: "Iran", lat: 35.69, lng: 51.39, parent: "tr" },
  { code: "iq", name: "Iraq", lat: 33.31, lng: 44.36, parent: "tr" },
];

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

type Event = {
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
};

// In-memory cache shared across invocations of the same edge worker.
// GNews free tier is ~1 req/sec and small daily quota, so we cache aggressively
// and rotate which countries we refresh on each call.
const cache: { events: Event[]; fetchedAt: string } = {
  events: [],
  fetchedAt: new Date(0).toISOString(),
};
let rotationIndex = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GNEWS_API_KEY");
    if (!apiKey) {
      throw new Error("GNEWS_API_KEY is not configured");
    }

    // Rotate through 6 countries per request, sequentially with 1.2s spacing
    // to respect GNews free tier rate limits (1 req/sec).
    const batchSize = 6;
    const batch: string[] = [];
    for (let i = 0; i < batchSize; i++) {
      batch.push(COUNTRY_CODES[(rotationIndex + i) % COUNTRY_CODES.length]);
    }
    rotationIndex = (rotationIndex + batchSize) % COUNTRY_CODES.length;

    const newEvents: Event[] = [];
    for (let i = 0; i < batch.length; i++) {
      const code = batch[i];
      if (i > 0) await sleep(1200);
      try {
        const url = `https://gnews.io/api/v4/top-headlines?country=${code}&max=8&lang=en&apikey=${apiKey}`;
        const r = await fetch(url);
        if (!r.ok) {
          const text = await r.text();
          console.error(`gnews ${code} ${r.status}: ${text}`);
          continue;
        }
        const j = await r.json();
        const geo = COUNTRIES[code];
        // Build the candidate hotspot pool: parent country + linked extras.
        const spots = [
          { code, name: geo.name, lat: geo.lat, lng: geo.lng },
          ...EXTRA_HOTSPOTS.filter((h) => h.parent === code).map((h) => ({
            code: h.code,
            name: h.name,
            lat: h.lat,
            lng: h.lng,
          })),
        ];
        const articles = j.articles ?? [];
        for (let ai = 0; ai < articles.length; ai++) {
          const a = articles[ai];
          // Distribute articles round-robin across the country + its hotspots
          const spot = spots[ai % spots.length];
          const hub = pickHub(spot.lat, spot.lng);
          const jitterLat = (Math.random() - 0.5) * 3;
          const jitterLng = (Math.random() - 0.5) * 3;
          newEvents.push({
            id: `${spot.code}-${a.url}`,
            title: a.title,
            description: a.description,
            url: a.url,
            image: a.image,
            source: a.source?.name ?? "Unknown",
            publishedAt: a.publishedAt,
            country: spot.name,
            countryCode: spot.code.toUpperCase(),
            lat: spot.lat + jitterLat,
            lng: spot.lng + jitterLng,
            endLat: hub.lat,
            endLng: hub.lng,
          });
        }
      } catch (e) {
        console.error(`gnews ${code} fetch failed`, e);
      }
    }

    // Merge new events into cache, dedupe by id, cap at ~200 for a denser globe.
    const merged = new Map<string, Event>();
    for (const e of newEvents) merged.set(e.id, e);
    for (const e of cache.events) if (!merged.has(e.id)) merged.set(e.id, e);
    const events = Array.from(merged.values())
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
      .slice(0, 200);

    cache.events = events;
    cache.fetchedAt = new Date().toISOString();

    return new Response(
      JSON.stringify({ events, fetchedAt: cache.fetchedAt }),
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