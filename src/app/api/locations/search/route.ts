import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NominatimResult = {
  place_id?: number | string;
  osm_id?: number | string;
  osm_type?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
};

let requestQueue = Promise.resolve();
let lastRequestStartedAt = 0;

function fetchAtPublicRateLimit(url: string, init: RequestInit & { next?: { revalidate: number } }) {
  const request = requestQueue.then(async () => {
    const delay = Math.max(0, 1_000 - (Date.now() - lastRequestStartedAt));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    lastRequestStartedAt = Date.now();
    return fetch(url, init);
  });
  requestQueue = request.then(() => undefined, () => undefined);
  return request;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const query = requestUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 160) {
    return Response.json({ error: "คำค้นหาต้องมีความยาว 2-160 ตัวอักษร" }, { status: 400 });
  }

  const baseUrl = process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org/";
  const searchUrl = new URL("search", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("format", "jsonv2");
  searchUrl.searchParams.set("limit", "5");
  searchUrl.searchParams.set("addressdetails", "0");
  searchUrl.searchParams.set("accept-language", "th,en");
  searchUrl.searchParams.set("viewbox", "97.3,20.5,105.7,5.6");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetchAtPublicRateLimit(searchUrl.toString(), {
      headers: {
        Accept: "application/json",
        Referer: requestUrl.origin,
        "User-Agent": process.env.NOMINATIM_USER_AGENT || "direct-field-checkin/0.1"
      },
      next: { revalidate: 86_400 },
      signal: controller.signal
    });

    if (!response.ok) {
      return Response.json({ error: "บริการค้นหาสถานที่ไม่พร้อมใช้งานชั่วคราว" }, { status: 502 });
    }

    const payload = await response.json() as unknown;
    const results = Array.isArray(payload)
      ? payload.flatMap((item: NominatimResult, index) => {
          const latitude = Number(item.lat);
          const longitude = Number(item.lon);
          if (!item.display_name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
          if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return [];
          return [{
            id: `${item.osm_type ?? "place"}-${item.osm_id ?? item.place_id ?? index}`,
            label: item.display_name,
            latitude,
            longitude
          }];
        })
      : [];

    return Response.json(
      { results },
      { headers: { "Cache-Control": "private, max-age=300" } }
    );
  } catch {
    return Response.json({ error: "ไม่สามารถเชื่อมต่อบริการค้นหาสถานที่ได้" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
