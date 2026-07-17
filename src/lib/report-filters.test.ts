import { describe, expect, it } from "vitest";
import { buildBangkokReportDateFilter, buildTravelClaimWhere } from "@/lib/report-filters";

describe("Bangkok report date filters", () => {
  it("uses Bangkok month boundaries regardless of the server timezone", () => {
    expect(buildBangkokReportDateFilter({ month: "2026-07" })).toEqual({
      gte: new Date("2026-06-30T17:00:00.000Z"),
      lt: new Date("2026-07-31T17:00:00.000Z")
    });
  });

  it("uses an exclusive next-day boundary for a selected date range", () => {
    expect(buildBangkokReportDateFilter({ from: "2026-07-01", to: "2026-07-17" })).toEqual({
      gte: new Date("2026-06-30T17:00:00.000Z"),
      lt: new Date("2026-07-17T17:00:00.000Z")
    });
  });

  it("applies the same boundary to travel claims", () => {
    const where = buildTravelClaimWhere({ month: "2026-07" }, { id: "user-1", role: "FIELD" });
    expect(where).toMatchObject({
      userId: "user-1",
      submittedAt: {
        gte: new Date("2026-06-30T17:00:00.000Z"),
        lt: new Date("2026-07-31T17:00:00.000Z")
      }
    });
  });

  it("ignores impossible calendar dates", () => {
    expect(buildBangkokReportDateFilter({ from: "2026-02-30" })).toBeUndefined();
  });
});
