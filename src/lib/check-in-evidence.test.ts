import { describe, expect, it } from "vitest";
import { buildCheckInEvidence } from "@/lib/check-in-evidence";

describe("check-in evidence", () => {
  it("groups all proof types and removes duplicate URLs", () => {
    expect(buildCheckInEvidence({
      photoUrl: "/in.jpg",
      photoUrls: ["/in.jpg", "/site.jpg"],
      checkoutPhotoUrl: "/out.jpg",
      checkoutPhotoUrls: ["/out.jpg"],
      odometerStartPhotoUrl: "/start.jpg",
      odometerEndPhotoUrl: "/end.jpg"
    })).toEqual([
      { url: "/in.jpg", label: "หลักฐานเช็กอิน 1" },
      { url: "/site.jpg", label: "หลักฐานเช็กอิน 2" },
      { url: "/out.jpg", label: "หลักฐานเช็กเอาท์ 1" },
      { url: "/start.jpg", label: "เลขไมล์ตอนเข้า" },
      { url: "/end.jpg", label: "เลขไมล์ตอนออก" }
    ]);
  });
});
