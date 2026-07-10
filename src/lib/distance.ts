export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type DistanceResult = {
  distanceKm: number;
  durationMinutes: number | null;
  routeProvider: "OPENROUTESERVICE" | "HAVERSINE";
  distanceStatus: "CALCULATED" | "PENDING_REVIEW";
  routeSummary: string;
  providerPayload?: unknown;
};

const earthRadiusKm = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateHaversineKm(origin: Coordinate, destination: Coordinate) {
  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLon = toRadians(destination.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000) / 1000;
}

export async function getRouteDistance(origin: Coordinate, destination: Coordinate): Promise<DistanceResult> {
  const fallbackDistance = calculateHaversineKm(origin, destination);
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;

  if (!apiKey) {
    return {
      distanceKm: fallbackDistance,
      durationMinutes: null,
      routeProvider: "HAVERSINE",
      distanceStatus: "PENDING_REVIEW",
      routeSummary: "คำนวณแบบเส้นตรงเพราะยังไม่ได้ตั้งค่า openrouteservice"
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        coordinates: [
          [origin.longitude, origin.latitude],
          [destination.longitude, destination.latitude]
        ]
      }),
      next: { revalidate: 0 },
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      throw new Error(`openrouteservice ${response.status}`);
    }

    const payload = await response.json();
    const summary = payload?.routes?.[0]?.summary;
    const distanceMeters = Number(summary?.distance);
    const durationSeconds = Number(summary?.duration);

    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
      throw new Error("openrouteservice response missing distance");
    }

    return {
      distanceKm: Math.round((distanceMeters / 1000) * 1000) / 1000,
      durationMinutes: Number.isFinite(durationSeconds) ? Math.round(durationSeconds / 60) : null,
      routeProvider: "OPENROUTESERVICE",
      distanceStatus: "CALCULATED",
      routeSummary: "คำนวณจาก openrouteservice ตามเส้นทางถนน",
      providerPayload: payload
    };
  } catch (error) {
    return {
      distanceKm: fallbackDistance,
      durationMinutes: null,
      routeProvider: "HAVERSINE",
      distanceStatus: "PENDING_REVIEW",
      routeSummary: error instanceof Error ? `รอตรวจสอบ: ${error.message}` : "รอตรวจสอบระยะทาง",
      providerPayload: { error: String(error) }
    };
  }
}
