export type OdometerSnapshotInput = {
  odometerStartKm?: number | null;
  odometerEndKm?: number | null;
  odometerDistanceKm?: number | null;
  distanceVariancePercent?: number | null;
  fieldWorkSession?: {
    id?: string;
    status?: string;
    odometerStartKm: number;
    odometerEndKm?: number | null;
    odometerDistanceKm?: number | null;
    gpsDistanceKm?: number | null;
    distanceVariancePercent?: number | null;
  } | null;
};

export function resolveOdometerSnapshot(input: OdometerSnapshotInput) {
  if (input.fieldWorkSession) {
    return {
      source: "FIELD_DAY" as const,
      sessionId: input.fieldWorkSession.id ?? null,
      status: input.fieldWorkSession.status ?? null,
      startKm: input.fieldWorkSession.odometerStartKm,
      endKm: input.fieldWorkSession.odometerEndKm ?? null,
      distanceKm: input.fieldWorkSession.odometerDistanceKm ?? null,
      gpsDistanceKm: input.fieldWorkSession.gpsDistanceKm ?? null,
      variancePercent: input.fieldWorkSession.distanceVariancePercent ?? null
    };
  }

  const hasLegacy = input.odometerStartKm !== null && input.odometerStartKm !== undefined
    || input.odometerEndKm !== null && input.odometerEndKm !== undefined
    || input.odometerDistanceKm !== null && input.odometerDistanceKm !== undefined;

  return {
    source: hasLegacy ? "LEGACY" as const : "NONE" as const,
    sessionId: null,
    status: null,
    startKm: input.odometerStartKm ?? null,
    endKm: input.odometerEndKm ?? null,
    distanceKm: input.odometerDistanceKm ?? null,
    gpsDistanceKm: null,
    variancePercent: input.distanceVariancePercent ?? null
  };
}
