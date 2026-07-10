import { describe, expect, it } from "vitest";
import { calculateHaversineKm } from "./distance";

describe("calculateHaversineKm", () => {
  it("calculates a realistic Bangkok to Samut Prakan fallback distance", () => {
    const distance = calculateHaversineKm(
      { latitude: 13.725, longitude: 100.524 },
      { latitude: 13.602, longitude: 100.706 }
    );

    expect(distance).toBeGreaterThan(23);
    expect(distance).toBeLessThan(25);
  });
});
