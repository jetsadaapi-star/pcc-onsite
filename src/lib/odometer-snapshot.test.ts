import { describe, expect, it } from "vitest";
import { resolveOdometerSnapshot } from "@/lib/odometer-snapshot";

describe("resolveOdometerSnapshot", () => {
  it("prefers the daily field session over legacy per-record values", () => {
    expect(resolveOdometerSnapshot({
      odometerStartKm: 10,
      odometerEndKm: 20,
      odometerDistanceKm: 10,
      fieldWorkSession: {
        id: "day-1",
        status: "COMPLETED",
        odometerStartKm: 1000,
        odometerEndKm: 1120,
        odometerDistanceKm: 120,
        gpsDistanceKm: 115,
        distanceVariancePercent: 4.35
      }
    })).toMatchObject({
      source: "FIELD_DAY",
      sessionId: "day-1",
      startKm: 1000,
      endKm: 1120,
      distanceKm: 120
    });
  });

  it("falls back to legacy values for historical records", () => {
    expect(resolveOdometerSnapshot({
      odometerStartKm: 10,
      odometerEndKm: 20,
      odometerDistanceKm: 10
    })).toMatchObject({ source: "LEGACY", startKm: 10, endKm: 20, distanceKm: 10 });
  });

  it("returns NONE when no odometer source exists", () => {
    expect(resolveOdometerSnapshot({})).toMatchObject({ source: "NONE", distanceKm: null });
  });
});
