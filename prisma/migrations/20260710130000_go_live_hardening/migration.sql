-- Support travel legs that end at an office instead of a project.
ALTER TABLE "TravelLeg" ALTER COLUMN "toCheckInId" DROP NOT NULL;
ALTER TABLE "TravelLeg" ALTER COLUMN "toProjectId" DROP NOT NULL;
ALTER TABLE "TravelLeg" ADD COLUMN "destinationType" "TripDestinationType" NOT NULL DEFAULT 'PROJECT';
ALTER TABLE "TravelLeg" ADD COLUMN "destinationLabel" TEXT;

UPDATE "TravelLeg" leg
SET "destinationLabel" = project."name"
FROM "Project" project
WHERE leg."toProjectId" = project."id" AND leg."destinationLabel" IS NULL;

-- Enforce one open field visit and one active trip per user at database level.
CREATE UNIQUE INDEX "CheckIn_one_open_per_user_key"
ON "CheckIn"("userId") WHERE "checkedOutAt" IS NULL;

CREATE UNIQUE INDEX "TripSession_one_active_per_user_key"
ON "TripSession"("userId") WHERE "status" = 'ACTIVE';

-- Persistent login throttling works across multiple application instances.
CREATE TABLE "LoginThrottle" (
  "key" TEXT NOT NULL,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "blockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "LoginThrottle_blockedUntil_idx" ON "LoginThrottle"("blockedUntil");

-- Keep one delivery state per visit and channel so failed channels can retry independently.
DELETE FROM "NotificationLog" older
USING "NotificationLog" newer
WHERE older."checkInId" = newer."checkInId"
  AND older."type" = newer."type"
  AND older."channel" = newer."channel"
  AND (older."createdAt", older."id") < (newer."createdAt", newer."id");

DROP INDEX IF EXISTS "NotificationLog_checkInId_type_channel_idx";
CREATE UNIQUE INDEX "NotificationLog_checkInId_type_channel_key"
ON "NotificationLog"("checkInId", "type", "channel");
