-- CreateEnum
CREATE TYPE "OdometerLogType" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'REFUEL');

-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "odometerDistanceKm" DOUBLE PRECISION,
ADD COLUMN     "odometerEndKm" DOUBLE PRECISION,
ADD COLUMN     "odometerEndPhotoUrl" TEXT,
ADD COLUMN     "odometerStartKm" DOUBLE PRECISION,
ADD COLUMN     "odometerStartPhotoUrl" TEXT,
ADD COLUMN     "vehicleId" TEXT;

-- AlterTable
ALTER TABLE "TravelClaim" ADD COLUMN     "distanceVariancePercent" DOUBLE PRECISION,
ADD COLUMN     "odometerDistanceKm" DOUBLE PRECISION,
ADD COLUMN     "odometerEndKm" DOUBLE PRECISION,
ADD COLUMN     "odometerStartKm" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "OdometerLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "checkInId" TEXT,
    "type" "OdometerLogType" NOT NULL,
    "odometerKm" DOUBLE PRECISION NOT NULL,
    "photoUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OdometerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fueledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "odometerKm" DOUBLE PRECISION NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,
    "pricePerLiter" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "receiptPhotoUrl" TEXT,
    "odometerPhotoUrl" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OdometerLog_userId_createdAt_idx" ON "OdometerLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "OdometerLog_vehicleId_createdAt_idx" ON "OdometerLog"("vehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "OdometerLog_checkInId_idx" ON "OdometerLog"("checkInId");

-- CreateIndex
CREATE INDEX "FuelLog_vehicleId_fueledAt_idx" ON "FuelLog"("vehicleId", "fueledAt");

-- CreateIndex
CREATE INDEX "FuelLog_userId_fueledAt_idx" ON "FuelLog"("userId", "fueledAt");

-- CreateIndex
CREATE INDEX "CheckIn_vehicleId_checkedAt_idx" ON "CheckIn"("vehicleId", "checkedAt");

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdometerLog" ADD CONSTRAINT "OdometerLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdometerLog" ADD CONSTRAINT "OdometerLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdometerLog" ADD CONSTRAINT "OdometerLog_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
