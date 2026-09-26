export const BEYLIKDUZU_ROUTE_ORDER = [
  "Yakuplu",
  "Marmara",
  "Barış",
  "Cumhuriyet",
  "Büyükşehir",
  "Adnan Kahveci",
  "Gürpınar",
  "Dereağzı",
  "Kavaklı",
  "Sahil",
  "Beylikdüzü OSB",
];

export function extractCoordinates(address?: string): { lat: string; lon: string } | null {
  if (!address) return null;
  const match = address.match(/(?:GPS|Konum):\s*([0-9.]+),\s*([0-9.]+)/i);
  if (match) {
    return { lat: match[1], lon: match[2] };
  }
  return null;
}

export function getMapUrls(address: string) {
  const coords = extractCoordinates(address);
  const cleanAddress = address.replace(/\[📍\s*(?:GPS|Konum):[^\]]+\]/g, "").trim();
  const query = encodeURIComponent(`${cleanAddress}, Beylikdüzü, İstanbul`);

  if (coords) {
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`,
      apple: `https://maps.apple.com/?daddr=${coords.lat},${coords.lon}`,
      yandex: `https://yandex.com.tr/harita/?rtext=~${coords.lat}%2C${coords.lon}&rtt=auto`,
      coords,
    };
  }

  return {
    google: `https://www.google.com/maps/search/?api=1&query=${query}`,
    apple: `https://maps.apple.com/?q=${query}`,
    yandex: `https://yandex.com.tr/harita/?text=${query}`,
    coords: null,
  };
}
