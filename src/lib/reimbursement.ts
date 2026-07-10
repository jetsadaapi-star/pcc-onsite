export type ReimbursementInput = {
  distanceKm: number;
  ratePerKm: number;
  kmPerLiter: number;
  fuelPricePerLiter: number;
  tollAmount?: number;
  parkingAmount?: number;
  otherAmount?: number;
};

export type ReimbursementResult = {
  distanceKm: number;
  mileageAmount: number;
  fuelEstimate: number;
  totalAmount: number;
};

function money(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function calculateReimbursement(input: ReimbursementInput): ReimbursementResult {
  const distanceKm = Math.max(0, input.distanceKm);
  const mileageAmount = money(distanceKm * Math.max(0, input.ratePerKm));
  const fuelEstimate = input.kmPerLiter > 0
    ? money((distanceKm / input.kmPerLiter) * Math.max(0, input.fuelPricePerLiter))
    : 0;
  const totalAmount = money(
    mileageAmount +
      fuelEstimate +
      Math.max(0, input.tollAmount ?? 0) +
      Math.max(0, input.parkingAmount ?? 0) +
      Math.max(0, input.otherAmount ?? 0)
  );

  return {
    distanceKm: Math.round(distanceKm * 1000) / 1000,
    mileageAmount,
    fuelEstimate,
    totalAmount
  };
}
