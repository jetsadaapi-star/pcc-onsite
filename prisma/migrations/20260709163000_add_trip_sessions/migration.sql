-- CreateEnum
CREATE TYPE "TripOriginType" AS ENUM ('OFFICE', 'HOME', 'CURRENT_LOCATION', 'PREVIOUS_SITE');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN "tripSessionId" TEXT;

-- AlterTable
ALTER TABLE "TravelLeg" ADD COLUMN "tripSessionId" TEXT;

-- CreateTable
CREATE TABLE "TripSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "originType" "TripOriginType" NOT NULL,
    "originLabel" TEXT,
    "originLatitude" DOUBLE PRECISION NOT NULL,
    "originLongitude" DOUBLE PRECISION NOT NULL,
    "originAccuracy" DOUBLE PRECISION,
    "fromProjectId" TEXT,
    "destinationProjectId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivedAt" TIMESTAMP(3),
    "odometerStartKm" DOUBLE PRECISION,
    "odometerStartPhotoUrl" TEXT,
    "status" "TripStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_tripSessionId_key" ON "CheckIn"("tripSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelLeg_tripSessionId_key" ON "TravelLeg"("tripSessionId");

-- CreateIndex
CREATE INDEX "TripSession_userId_status_startedAt_idx" ON "TripSession"("userId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "TripSession_destinationProjectId_status_idx" ON "TripSession"("destinationProjectId", "status");

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_tripSessionId_fkey" FOREIGN KEY ("tripSessionId") REFERENCES "TripSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSession" ADD CONSTRAINT "TripSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSession" ADD CONSTRAINT "TripSession_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSession" ADD CONSTRAINT "TripSession_fromProjectId_fkey" FOREIGN KEY ("fromProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSession" ADD CONSTRAINT "TripSession_destinationProjectId_fkey" FOREIGN KEY ("destinationProjectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelLeg" ADD CONSTRAINT "TravelLeg_tripSessionId_fkey" FOREIGN KEY ("tripSessionId") REFERENCES "TripSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
