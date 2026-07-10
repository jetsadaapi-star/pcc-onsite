CREATE TABLE "OfficeLocation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfficeLocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OfficeLocation_active_isDefault_idx" ON "OfficeLocation"("active", "isDefault");

ALTER TABLE "TripSession"
  ADD COLUMN "cancelReason" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

ALTER TABLE "FuelLog"
  ADD COLUMN "receiptPhotoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "odometerPhotoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
