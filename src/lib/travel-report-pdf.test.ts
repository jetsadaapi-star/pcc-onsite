import { describe, expect, it } from "vitest";
import { createTravelReportPdf } from "@/lib/travel-report-pdf";

describe("createTravelReportPdf", () => {
  it("creates a PDF with the packaged Thai font without Helvetica AFM lookup", async () => {
    const buffer = await createTravelReportPdf({
      documentNo: "TRV-TEST-001",
      generatedAt: "17 ก.ค. 2569 12:00",
      header: Array.from({ length: 25 }, (_, index) => `คอลัมน์ ${index + 1}`),
      rows: [Array.from({ length: 25 }, (_, index) => `ข้อมูล ${index + 1}`)],
      totalAmount: 1234.5
    });

    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1_000);
  });
});
