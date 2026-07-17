import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { describe, expect, it, vi } from "vitest";
import { getFuelPerformanceRows } from "@/lib/fuel-performance";

vi.mock("server-only", () => ({}));

const runDatabaseTests = process.env.RUN_DB_TESTS === "true";

describe.skipIf(!runDatabaseTests)("production database invariants", () => {
  it("preserves activity history when an actor account is deleted", async () => {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query("BEGIN");

    try {
      const suffix = randomUUID();
      const userId = `audit-user-${suffix}`;
      const logId = `audit-log-${suffix}`;
      await client.query(
        `INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "active", "createdAt", "updatedAt")
         VALUES ($1, $2, 'test-only', 'Audit Integration Test', 'EMPLOYEE', true, NOW(), NOW())`,
        [userId, `audit-${suffix}@example.invalid`]
      );
      await client.query(
        `INSERT INTO "ActivityLog" ("id", "actorId", "entityType", "entityId", "action", "metadata", "createdAt")
         VALUES ($1, $2, 'User', $2, 'UPDATE_USER', '{"source":"integration-test"}'::jsonb, NOW())`,
        [logId, userId]
      );

      await client.query(`DELETE FROM "User" WHERE "id" = $1`, [userId]);
      const preserved = await client.query(
        `SELECT "id", "actorId", "entityType", "entityId", "action" FROM "ActivityLog" WHERE "id" = $1`,
        [logId]
      );

      expect(preserved.rows).toHaveLength(1);
      expect(preserved.rows[0]).toMatchObject({
        id: logId,
        actorId: null,
        entityType: "User",
        entityId: userId,
        action: "UPDATE_USER"
      });
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  });

  it("executes the fuel performance aggregate against the current schema", async () => {
    const rows = await getFuelPerformanceRows({});
    expect(Array.isArray(rows)).toBe(true);
    for (const row of rows) {
      expect(row.fillCount).toBeGreaterThan(0);
      expect(Number.isFinite(row.totalAmount)).toBe(true);
      expect(Number.isFinite(row.distanceKm)).toBe(true);
      expect(Number.isFinite(row.liters)).toBe(true);
    }
  });

  it("enforces one open visit, one active trip, and supports office travel legs", async () => {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query("BEGIN");

    try {
      const suffix = randomUUID();
      const userId = `test-user-${suffix}`;
      const projectId = `test-project-${suffix}`;
      await client.query(
        `INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "active", "createdAt", "updatedAt")
         VALUES ($1, $2, 'test-only', 'Integration Test', 'EMPLOYEE', true, NOW(), NOW())`,
        [userId, `integration-${suffix}@example.invalid`]
      );
      await client.query(
        `INSERT INTO "Project" ("id", "code", "name", "customerName", "address", "status", "createdById", "createdAt", "updatedAt")
         VALUES ($1, $2, 'Test site', 'Test customer', 'Test address', 'NEW', $3, NOW(), NOW())`,
        [projectId, `TEST-${suffix}`, userId]
      );

      const firstCheckInId = `checkin-a-${suffix}`;
      await client.query(
        `INSERT INTO "CheckIn" ("id", "userId", "projectId", "latitude", "longitude", "purpose", "checkedAt", "createdAt")
         VALUES ($1, $2, $3, 13.7, 100.5, 'SITE_SURVEY', NOW(), NOW())`,
        [firstCheckInId, userId, projectId]
      );
      await client.query("SAVEPOINT duplicate_checkin");
      let duplicateCheckInBlocked = false;
      try {
        await client.query(
          `INSERT INTO "CheckIn" ("id", "userId", "projectId", "latitude", "longitude", "purpose", "checkedAt", "createdAt")
           VALUES ($1, $2, $3, 13.7, 100.5, 'SITE_SURVEY', NOW(), NOW())`,
          [`checkin-b-${suffix}`, userId, projectId]
        );
      } catch {
        duplicateCheckInBlocked = true;
        await client.query("ROLLBACK TO SAVEPOINT duplicate_checkin");
      }
      expect(duplicateCheckInBlocked).toBe(true);

      const firstTripId = `trip-a-${suffix}`;
      await client.query(
        `INSERT INTO "TripSession" ("id", "userId", "originType", "originLatitude", "originLongitude", "destinationType", "status", "startedAt", "createdAt", "updatedAt")
         VALUES ($1, $2, 'CURRENT_LOCATION', 13.7, 100.5, 'OFFICE', 'ACTIVE', NOW(), NOW(), NOW())`,
        [firstTripId, userId]
      );
      await client.query("SAVEPOINT duplicate_trip");
      let duplicateTripBlocked = false;
      try {
        await client.query(
          `INSERT INTO "TripSession" ("id", "userId", "originType", "originLatitude", "originLongitude", "destinationType", "status", "startedAt", "createdAt", "updatedAt")
           VALUES ($1, $2, 'CURRENT_LOCATION', 13.7, 100.5, 'OFFICE', 'ACTIVE', NOW(), NOW(), NOW())`,
          [`trip-b-${suffix}`, userId]
        );
      } catch {
        duplicateTripBlocked = true;
        await client.query("ROLLBACK TO SAVEPOINT duplicate_trip");
      }
      expect(duplicateTripBlocked).toBe(true);

      const officeLeg = await client.query(
        `INSERT INTO "TravelLeg" (
          "id", "userId", "tripSessionId", "destinationType", "destinationLabel",
          "originLatitude", "originLongitude", "destinationLatitude", "destinationLongitude",
          "distanceKm", "routeProvider", "distanceStatus", "createdAt"
        ) VALUES ($1, $2, $3, 'OFFICE', 'Head office', 13.7, 100.5, 13.71, 100.51, 2.5, 'HAVERSINE', 'PENDING_REVIEW', NOW())
        RETURNING "toProjectId", "toCheckInId", "destinationType"`,
        [`office-leg-${suffix}`, userId, firstTripId]
      );
      expect(officeLeg.rows[0]).toMatchObject({
        toProjectId: null,
        toCheckInId: null,
        destinationType: "OFFICE"
      });
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  });
});
