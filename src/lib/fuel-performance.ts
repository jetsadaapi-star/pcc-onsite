import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type FuelPerformanceRow = {
  vehicleId: string;
  vehicleName: string;
  licensePlate: string | null;
  expectedKmPerLiter: number | null;
  owner: string;
  fillCount: number;
  totalAmount: number;
  distanceKm: number;
  liters: number;
};

type FuelPerformanceFilters = {
  userId?: string;
  vehicleId?: string;
  from?: Date;
  to?: Date;
};

export function getFuelPerformanceRows(filters: FuelPerformanceFilters) {
  const conditions: Prisma.Sql[] = [];
  if (filters.userId) conditions.push(Prisma.sql`f."userId" = ${filters.userId}`);
  if (filters.vehicleId) conditions.push(Prisma.sql`f."vehicleId" = ${filters.vehicleId}`);
  if (filters.from) conditions.push(Prisma.sql`f."fueledAt" >= ${filters.from}`);
  if (filters.to) conditions.push(Prisma.sql`f."fueledAt" < ${filters.to}`);
  const whereSql = conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;

  return prisma.$queryRaw<FuelPerformanceRow[]>(Prisma.sql`
    WITH ordered AS (
      SELECT
        f."vehicleId",
        f."odometerKm",
        f."liters",
        f."totalAmount",
        LAG(f."odometerKm") OVER (
          PARTITION BY f."vehicleId"
          ORDER BY f."odometerKm" ASC, f."fueledAt" ASC, f."id" ASC
        ) AS "previousOdometerKm"
      FROM "FuelLog" f
      ${whereSql}
    )
    SELECT
      o."vehicleId" AS "vehicleId",
      v."name" AS "vehicleName",
      v."licensePlate" AS "licensePlate",
      v."kmPerLiter" AS "expectedKmPerLiter",
      u."name" AS "owner",
      COUNT(*)::int AS "fillCount",
      COALESCE(SUM(o."totalAmount"), 0)::double precision AS "totalAmount",
      COALESCE(SUM(
        CASE
          WHEN o."previousOdometerKm" IS NOT NULL AND o."odometerKm" > o."previousOdometerKm"
            THEN o."odometerKm" - o."previousOdometerKm"
          ELSE 0
        END
      ), 0)::double precision AS "distanceKm",
      COALESCE(SUM(
        CASE
          WHEN o."previousOdometerKm" IS NOT NULL AND o."odometerKm" > o."previousOdometerKm"
            THEN o."liters"
          ELSE 0
        END
      ), 0)::double precision AS "liters"
    FROM ordered o
    JOIN "Vehicle" v ON v."id" = o."vehicleId"
    JOIN "User" u ON u."id" = v."userId"
    GROUP BY o."vehicleId", v."name", v."licensePlate", v."kmPerLiter", u."name"
    ORDER BY "totalAmount" DESC
  `);
}
