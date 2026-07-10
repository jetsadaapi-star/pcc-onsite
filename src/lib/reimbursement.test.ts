import { describe, expect, it } from "vitest";
import { calculateReimbursement } from "./reimbursement";

describe("calculateReimbursement", () => {
  it("calculates wear allowance, fuel estimate, and total amount", () => {
    const result = calculateReimbursement({
      distanceKm: 120,
      ratePerKm: 1.5,
      kmPerLiter: 12,
      fuelPricePerLiter: 36,
      tollAmount: 50,
      parkingAmount: 20
    });

    expect(result.mileageAmount).toBe(180);
    expect(result.fuelEstimate).toBe(360);
    expect(result.totalAmount).toBe(610);
  });
});
