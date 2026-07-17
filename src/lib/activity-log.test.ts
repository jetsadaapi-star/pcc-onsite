import { describe, expect, it } from "vitest";
import {
  buildActivityQuery,
  buildActivityWhere,
  formatAuditMetadata,
  normalizeActivityFilters,
  sanitizeAuditMetadata
} from "@/lib/activity-log";

describe("activity log helpers", () => {
  it("normalizes filters and preserves them in an export query", () => {
    const filters = normalizeActivityFilters({ q: "  project  ", actorId: "user-1", entityType: "Project" });
    expect(filters.q).toBe("project");
    expect(buildActivityQuery(filters).toString()).toBe("q=project&actorId=user-1&entityType=Project");
  });

  it("uses Bangkok day boundaries", () => {
    const where = buildActivityWhere({ from: "2026-07-17", to: "2026-07-17" });
    expect(where.createdAt).toEqual({
      gte: new Date("2026-07-16T17:00:00.000Z"),
      lt: new Date("2026-07-17T17:00:00.000Z")
    });
  });

  it("redacts nested credentials before rendering or export", () => {
    const metadata = {
      email: "person@example.com",
      accessToken: "secret-value",
      nested: { passwordHash: "hash", value: 12 }
    };
    expect(sanitizeAuditMetadata(metadata)).toEqual({
      email: "person@example.com",
      accessToken: "[REDACTED]",
      nested: { passwordHash: "[REDACTED]", value: 12 }
    });
    expect(formatAuditMetadata(metadata)).not.toContain("secret-value");
    expect(formatAuditMetadata(metadata)).not.toContain("hash");
  });
});
