export type CheckInEvidenceSource = {
  photoUrl?: string | null;
  photoUrls?: string[];
  checkoutPhotoUrl?: string | null;
  checkoutPhotoUrls?: string[];
  odometerStartPhotoUrl?: string | null;
  odometerEndPhotoUrl?: string | null;
  tripSession?: {
    fieldWorkSession?: {
      odometerStartPhotoUrl?: string | null;
      odometerEndPhotoUrl?: string | null;
    } | null;
  } | null;
};

export function buildCheckInEvidence(source: CheckInEvidenceSource) {
  const items: Array<{ url: string; label: string }> = [];
  const seen = new Set<string>();

  function add(url: string | null | undefined, label: string) {
    if (!url || seen.has(url)) return;
    seen.add(url);
    items.push({ url, label });
  }

  const checkInUrls = Array.from(new Set([source.photoUrl, ...(source.photoUrls ?? [])].filter((url): url is string => Boolean(url))));
  const checkoutUrls = Array.from(new Set([source.checkoutPhotoUrl, ...(source.checkoutPhotoUrls ?? [])].filter((url): url is string => Boolean(url))));
  checkInUrls.forEach((url, index) => add(url, `หลักฐานเช็กอิน ${index + 1}`));
  checkoutUrls.forEach((url, index) => add(url, `หลักฐานเช็กเอาท์ ${index + 1}`));
  add(source.odometerStartPhotoUrl, "เลขไมล์ตอนเข้า");
  add(source.odometerEndPhotoUrl, "เลขไมล์ตอนออก");
  add(source.tripSession?.fieldWorkSession?.odometerStartPhotoUrl, "เลขไมล์ต้นวัน");
  add(source.tripSession?.fieldWorkSession?.odometerEndPhotoUrl, "เลขไมล์ปลายวัน");
  return items;
}
