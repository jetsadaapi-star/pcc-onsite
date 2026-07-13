CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");
CREATE INDEX "CheckIn_checkedAt_idx" ON "CheckIn"("checkedAt");
CREATE INDEX "TripSession_status_startedAt_idx" ON "TripSession"("status", "startedAt");
CREATE INDEX "TravelClaim_status_submittedAt_idx" ON "TravelClaim"("status", "submittedAt");
CREATE INDEX "FuelLog_fueledAt_idx" ON "FuelLog"("fueledAt");

-- Global reminder/admin queries only need visits that have not checked out.
CREATE INDEX "CheckIn_open_checkedAt_idx"
ON "CheckIn"("checkedAt")
WHERE "checkedOutAt" IS NULL;
