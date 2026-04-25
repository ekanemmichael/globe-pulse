export interface GlobalEvent {
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
}