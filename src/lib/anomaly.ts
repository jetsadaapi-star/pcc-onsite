import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { calculateHaversineKm } from "@/lib/distance";

type SettingSnapshot = {
  anomalyGpsThresholdMeters: number;
  anomalyDistanceVariancePercent: number;
};

async function getSettings(): Promise<SettingSnapshot> {
  const setting = await prisma.systemSetting.findFirst({
    orderBy: { updatedAt: "desc" },
    select: {
      anomalyGpsThresholdMeters: true,
      anomalyDistanceVariancePercent: true
    }
  });

  return {
    anomalyGpsThresholdMeters: setting?.anomalyGpsThresholdMeters ?? 500,
    anomalyDistanceVariancePercent: setting?.anomalyDistanceVariancePercent ?? 20
  };
}

async function upsertOpenAnomaly(input: {
  sourceKey: string;
  type: "GPS_FAR_FROM_PROJECT" | "ODOMETER_REVERSED" | "DISTANCE_VARIANCE_HIGH" | "FUEL_EFFICIENCY_OUTLIER";
  severity: "LOW" | "MEDIUM" | "HIGH";
  userId?: string | null;
  vehicleId?: string | null;
  checkInId?: string | null;
  travelLegId?: string | null;
  fuelLogId?: string | null;
  title: string;
  detail?: string;
  measuredValue?: number;
  expectedValue?: number;
  metadata?: Record<string, unknown>;
}) {
  const metadata = input.metadata ? (JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue) : undefined;

  await prisma.anomalyRecord.upsert({
    where: { sourceKey: input.sourceKey },
    create: {
      ...input,
      metadata
    },
    update: {
      severity: input.severity,
      status: "OPEN",
      title: input.title,
      detail: input.detail,
      measuredValue: input.measuredValue,
      expectedValue: input.expectedValue,
      metadata,
      resolvedAt: null
    }
  });
}

export async function detectCheckInGpsAnomaly(checkInId: string) {
  const [settings, checkIn] = await Promise.all([
    getSettings(),
    prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: {
        id: true,
        userId: true,
        latitude: true,
        longitude: true,
        project: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true
          }
        }
      }
    })
  ]);

  if (!checkIn?.project.latitude || !checkIn.project.longitude) return;

  const distanceMeters = calculateHaversineKm(
    { latitude: checkIn.latitude, longitude: checkIn.longitude },
    { latitude: checkIn.project.latitude, longitude: checkIn.project.longitude }
  ) * 1000;

  if (distanceMeters <= settings.anomalyGpsThresholdMeters) return;

  await upsertOpenAnomaly({
    sourceKey: `checkin:${checkIn.id}:gps-far`,
    type: "GPS_FAR_FROM_PROJECT",
    severity: distanceMeters > settings.anomalyGpsThresholdMeters * 3 ? "HIGH" : "MEDIUM",
    userId: checkIn.userId,
    checkInId: checkIn.id,
    title: "GPS is far from project location",
    detail: `${checkIn.project.name} is ${Math.round(distanceMeters)} m from the check-in GPS point.`,
    measuredValue: Math.round(distanceMeters),
    expectedValue: settings.anomalyGpsThresholdMeters,
    metadata: { projectId: checkIn.project.id }
  });
}

export async function detectOdometerReversed(input: {
  sourceKey: string;
  userId: string;
  vehicleId?: string | null;
  checkInId?: string | null;
  fuelLogId?: string | null;
  previousKm?: number | null;
  currentKm?: number | null;
  label?: string;
}) {
  if (input.previousKm === null || input.previousKm === undefined || input.currentKm === null || input.currentKm === undefined) return;
  if (input.currentKm >= input.previousKm) return;

  await upsertOpenAnomaly({
    sourceKey: `${input.sourceKey}:odometer-reversed`,
    type: "ODOMETER_REVERSED",
    severity: "HIGH",
    userId: input.userId,
    vehicleId: input.vehicleId,
    checkInId: input.checkInId,
    fuelLogId: input.fuelLogId,
    title: "Odometer number went backward",
    detail: `${input.label ?? "Odometer"} changed from ${input.previousKm} km to ${input.currentKm} km.`,
    measuredValue: input.currentKm,
    expectedValue: input.previousKm
  });
}

export async function detectDistanceVarianceAnomaly(input: {
  sourceKey: string;
  userId: string;
  vehicleId?: string | null;
  checkInId?: string | null;
  travelLegId?: string | null;
  variancePercent?: number | null;
  gpsDistanceKm?: number | null;
  odometerDistanceKm?: number | null;
}) {
  if (input.variancePercent === null || input.variancePercent === undefined) return;
  const settings = await getSettings();
  if (input.variancePercent <= settings.anomalyDistanceVariancePercent) return;

  await upsertOpenAnomaly({
    sourceKey: `${input.sourceKey}:distance-variance`,
    type: "DISTANCE_VARIANCE_HIGH",
    severity: input.variancePercent > settings.anomalyDistanceVariancePercent * 2 ? "HIGH" : "MEDIUM",
    userId: input.userId,
    vehicleId: input.vehicleId,
    checkInId: input.checkInId,
    travelLegId: input.travelLegId,
    title: "GPS distance and odometer distance differ",
    detail: `Variance ${input.variancePercent.toFixed(1)}%. GPS ${input.gpsDistanceKm ?? "-"} km, odometer ${input.odometerDistanceKm ?? "-"} km.`,
    measuredValue: input.variancePercent,
    expectedValue: settings.anomalyDistanceVariancePercent,
    metadata: {
      gpsDistanceKm: input.gpsDistanceKm,
      odometerDistanceKm: input.odometerDistanceKm
    }
  });
}

export async function detectFuelEfficiencyAnomaly(fuelLogId: string) {
  const current = await prisma.fuelLog.findUnique({
    where: { id: fuelLogId },
    include: { vehicle: true }
  });
  if (!current?.vehicle?.kmPerLiter || Number(current.liters) <= 0) return;

  const previous = await prisma.fuelLog.findFirst({
    where: {
      vehicleId: current.vehicleId,
      id: { not: current.id },
      fueledAt: { lte: current.fueledAt },
      odometerKm: { lt: current.odometerKm }
    },
    orderBy: { odometerKm: "desc" }
  });
  if (!previous) return;

  const distanceKm = current.odometerKm - previous.odometerKm;
  const actualKmPerLiter = distanceKm / Number(current.liters);
  if (!Number.isFinite(actualKmPerLiter) || actualKmPerLiter <= 0) return;

  const expected = current.vehicle.kmPerLiter;
  const low = expected * 0.55;
  const high = expected * 1.8;
  if (actualKmPerLiter >= low && actualKmPerLiter <= high) return;

  await upsertOpenAnomaly({
    sourceKey: `fuel:${current.id}:efficiency`,
    type: "FUEL_EFFICIENCY_OUTLIER",
    severity: actualKmPerLiter < low ? "HIGH" : "MEDIUM",
    userId: current.userId,
    vehicleId: current.vehicleId,
    fuelLogId: current.id,
    title: "Fuel efficiency is outside expected range",
    detail: `Actual ${actualKmPerLiter.toFixed(1)} km/l vs expected ${expected.toFixed(1)} km/l.`,
    measuredValue: Math.round(actualKmPerLiter * 10) / 10,
    expectedValue: expected,
    metadata: {
      previousFuelLogId: previous.id,
      distanceKm,
      liters: Number(current.liters)
    }
  });
}
