-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'LINE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('CHECKOUT_REMINDER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AnomalyType" AS ENUM ('GPS_FAR_FROM_PROJECT', 'ODOMETER_REVERSED', 'DISTANCE_VARIANCE_HIGH', 'FUEL_EFFICIENCY_OUTLIER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AnomalyStatus" AS ENUM ('OPEN', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExportDocumentType" AS ENUM ('ACCOUNTING_TRAVEL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExportDocumentFormat" AS ENUM ('CSV', 'EXCEL', 'PDF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lineUserId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "checkoutReminderEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "checkoutReminderEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "checkoutReminderAfterMinutes" INTEGER NOT NULL DEFAULT 480;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "checkoutReminderEmailEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "checkoutReminderLineEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "anomalyGpsThresholdMeters" INTEGER NOT NULL DEFAULT 500;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "anomalyDistanceVariancePercent" DOUBLE PRECISION NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE IF NOT EXISTS "NotificationLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "checkInId" TEXT,
  "channel" "NotificationChannel" NOT NULL,
  "type" "NotificationType" NOT NULL,
  "status" "NotificationStatus" NOT NULL,
  "destination" TEXT,
  "message" TEXT NOT NULL,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnomalyRecord" (
  "id" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "type" "AnomalyType" NOT NULL,
  "severity" "AnomalySeverity" NOT NULL DEFAULT 'MEDIUM',
  "status" "AnomalyStatus" NOT NULL DEFAULT 'OPEN',
  "userId" TEXT,
  "vehicleId" TEXT,
  "checkInId" TEXT,
  "travelLegId" TEXT,
  "fuelLogId" TEXT,
  "title" TEXT NOT NULL,
  "detail" TEXT,
  "measuredValue" DOUBLE PRECISION,
  "expectedValue" DOUBLE PRECISION,
  "metadata" JSONB,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnomalyRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExportDocument" (
  "id" TEXT NOT NULL,
  "documentNo" TEXT NOT NULL,
  "type" "ExportDocumentType" NOT NULL,
  "format" "ExportDocumentFormat" NOT NULL,
  "generatedById" TEXT,
  "filters" JSONB,
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fileName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExportDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NotificationLog_type_status_createdAt_idx" ON "NotificationLog"("type", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationLog_checkInId_type_channel_idx" ON "NotificationLog"("checkInId", "type", "channel");
CREATE INDEX IF NOT EXISTS "NotificationLog_userId_createdAt_idx" ON "NotificationLog"("userId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AnomalyRecord_sourceKey_key" ON "AnomalyRecord"("sourceKey");
CREATE INDEX IF NOT EXISTS "AnomalyRecord_status_severity_createdAt_idx" ON "AnomalyRecord"("status", "severity", "createdAt");
CREATE INDEX IF NOT EXISTS "AnomalyRecord_type_status_idx" ON "AnomalyRecord"("type", "status");
CREATE INDEX IF NOT EXISTS "AnomalyRecord_userId_createdAt_idx" ON "AnomalyRecord"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AnomalyRecord_vehicleId_createdAt_idx" ON "AnomalyRecord"("vehicleId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ExportDocument_documentNo_key" ON "ExportDocument"("documentNo");
CREATE INDEX IF NOT EXISTS "ExportDocument_type_createdAt_idx" ON "ExportDocument"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "ExportDocument_generatedById_createdAt_idx" ON "ExportDocument"("generatedById", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AnomalyRecord" ADD CONSTRAINT "AnomalyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AnomalyRecord" ADD CONSTRAINT "AnomalyRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AnomalyRecord" ADD CONSTRAINT "AnomalyRecord_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AnomalyRecord" ADD CONSTRAINT "AnomalyRecord_travelLegId_fkey" FOREIGN KEY ("travelLegId") REFERENCES "TravelLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AnomalyRecord" ADD CONSTRAINT "AnomalyRecord_fuelLogId_fkey" FOREIGN KEY ("fuelLogId") REFERENCES "FuelLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ExportDocument" ADD CONSTRAINT "ExportDocument_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
