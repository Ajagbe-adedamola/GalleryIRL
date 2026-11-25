/**
 * Privacy helper: home-based creatives can opt into an approximate location.
 * 0.0027° is roughly 300 m at Lagos' latitude.
 */
const APPROX_STEP = 0.0027;

function approximateCoordinate(value: number): number {
  return Math.round(value / APPROX_STEP) * APPROX_STEP;
}

export function approximateLocation(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Number(approximateCoordinate(lat).toFixed(4)),
    lng: Number(approximateCoordinate(lng).toFixed(4)),
  };
}

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isInsideLagos(lat: number, lng: number): boolean {
  return lat >= 6.3 && lat <= 6.75 && lng >= 3.1 && lng <= 3.75;
}
