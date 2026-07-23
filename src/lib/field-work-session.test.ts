import { describe, expect, it } from "vitest";
import { summarizeFieldWorkDistance } from "@/lib/field-work-session";

describe("summarizeFieldWorkDistance", () => {
  it("compares one day odometer distance with all GPS legs", () => {
    expect(summarizeFieldWorkDistance({
      odometerStartKm: 1000,
      odometerEndKm: 1120,
      gpsDistanceKm: 100
    })).toEqual({ odometerDistanceKm: 120, distanceVariancePercent: 20 });
  });

  it("does not calculate variance when no GPS leg was recorded", () => {
    expect(summarizeFieldWorkDistance({
      odometerStartKm: 1000,
      odometerEndKm: 1005,
      gpsDistanceKm: 0
    })).toEqual({ odometerDistanceKm: 5, distanceVariancePercent: undefined });
  });

  it("rejects an odometer that goes backward", () => {
    expect(() => summarizeFieldWorkDistance({
      odometerStartKm: 1000,
      odometerEndKm: 999,
      gpsDistanceKm: 1
    })).toThrow("ODOMETER_REVERSED");
  });
});
