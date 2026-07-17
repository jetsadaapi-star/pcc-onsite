import { describe, expect, it } from "vitest";
import {
  bangkokDateRange,
  bangkokMonthRange,
  getBangkokHour,
  startOfCurrentBangkokDay
} from "@/lib/bangkok-time";

describe("Bangkok time helpers", () => {
  it("builds an exclusive Bangkok date range", () => {
    expect(bangkokDateRange("2026-07-01", "2026-07-17")).toEqual({
      gte: new Date("2026-06-30T17:00:00.000Z"),
      lt: new Date("2026-07-17T17:00:00.000Z")
    });
  });

  it("builds Bangkok month boundaries", () => {
    expect(bangkokMonthRange("2026-07")).toEqual({
      gte: new Date("2026-06-30T17:00:00.000Z"),
      lt: new Date("2026-07-31T17:00:00.000Z")
    });
  });

  it("calculates today's start and hour in Bangkok", () => {
    const now = new Date("2026-07-17T18:30:00.000Z");
    expect(startOfCurrentBangkokDay(now)).toEqual(new Date("2026-07-17T17:00:00.000Z"));
    expect(getBangkokHour(now)).toBe(1);
  });
});
