CREATE TYPE "FieldWorkSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED');

ALTER TYPE "OdometerLogType" ADD VALUE 'DAY_START';
ALTER TYPE "OdometerLogType" ADD VALUE 'DAY_END';

CREATE TABLE "FieldWorkSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "status" "FieldWorkSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "startLatitude" DOUBLE PRECISION NOT NULL,
    "startLongitude" DOUBLE PRECISION NOT NULL,
    "startAccuracy" DOUBLE PRECISION,
    "endLatitude" DOUBLE PRECISION,
    "endLongitude" DOUBLE PRECISION,
    "endAccuracy" DOUBLE PRECISION,
    "odometerStartKm" DOUBLE PRECISION NOT NULL,
    "odometerStartPhotoUrl" TEXT NOT NULL,
    "odometerEndKm" DOUBLE PRECISION,
    "odometerEndPhotoUrl" TEXT,
    "gpsDistanceKm" DOUBLE PRECISION,
    "odometerDistanceKm" DOUBLE PRECISION,
    "distanceVariancePercent" DOUBLE PRECISION,
    "endNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FieldWorkSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TripSession" ADD COLUMN "fieldWorkSessionId" TEXT;

CREATE INDEX "FieldWorkSession_userId_status_startedAt_idx" ON "FieldWorkSession"("userId", "status", "startedAt");
CREATE INDEX "FieldWorkSession_vehicleId_startedAt_idx" ON "FieldWorkSession"("vehicleId", "startedAt");
CREATE UNIQUE INDEX "FieldWorkSession_one_active_per_user_key" ON "FieldWorkSession"("userId") WHERE "status" = 'ACTIVE';
CREATE INDEX "TripSession_fieldWorkSessionId_startedAt_idx" ON "TripSession"("fieldWorkSessionId", "startedAt");

ALTER TABLE "FieldWorkSession" ADD CONSTRAINT "FieldWorkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FieldWorkSession" ADD CONSTRAINT "FieldWorkSession_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TripSession" ADD CONSTRAINT "TripSession_fieldWorkSessionId_fkey" FOREIGN KEY ("fieldWorkSessionId") REFERENCES "FieldWorkSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
