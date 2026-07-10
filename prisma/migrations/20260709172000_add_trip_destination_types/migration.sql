CREATE TYPE "TripDestinationType" AS ENUM ('PROJECT', 'OFFICE');

ALTER TABLE "TripSession"
  ADD COLUMN "destinationType" "TripDestinationType" NOT NULL DEFAULT 'PROJECT',
  ADD COLUMN "destinationLabel" TEXT,
  ADD COLUMN "destinationLatitude" DOUBLE PRECISION,
  ADD COLUMN "destinationLongitude" DOUBLE PRECISION,
  ADD COLUMN "destinationAccuracy" DOUBLE PRECISION,
  ADD COLUMN "odometerEndKm" DOUBLE PRECISION,
  ADD COLUMN "odometerEndPhotoUrl" TEXT,
  ADD COLUMN "distanceKm" DOUBLE PRECISION,
  ADD COLUMN "durationMinutes" INTEGER,
  ADD COLUMN "routeProvider" "RouteProvider",
  ADD COLUMN "distanceStatus" "DistanceStatus";

ALTER TABLE "TripSession" ALTER COLUMN "destinationProjectId" DROP NOT NULL;

CREATE INDEX "TripSession_destinationType_status_idx" ON "TripSession"("destinationType", "status");
