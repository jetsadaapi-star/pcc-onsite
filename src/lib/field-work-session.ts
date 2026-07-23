export function summarizeFieldWorkDistance(input: {
  odometerStartKm: number;
  odometerEndKm: number;
  gpsDistanceKm: number;
}) {
  if (input.odometerEndKm < input.odometerStartKm) {
    throw new Error("ODOMETER_REVERSED");
  }

  const odometerDistanceKm = input.odometerEndKm - input.odometerStartKm;
  const distanceVariancePercent = input.gpsDistanceKm > 0
    ? Math.abs(odometerDistanceKm - input.gpsDistanceKm) / input.gpsDistanceKm * 100
    : undefined;

  return { odometerDistanceKm, distanceVariancePercent };
}
