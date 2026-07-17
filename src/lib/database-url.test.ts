import { describe, expect, it } from "vitest";
import { getRequiredDatabaseUrl } from "@/lib/database-url";

describe("getRequiredDatabaseUrl", () => {
  it("returns a trimmed configured URL", () => {
    expect(getRequiredDatabaseUrl({ DATABASE_URL: "  postgresql://localhost/direct  " })).toBe(
      "postgresql://localhost/direct"
    );
  });

  it.each([undefined, "", "   "])("rejects a missing or blank URL (%s)", (databaseUrl) => {
    expect(() => getRequiredDatabaseUrl({ DATABASE_URL: databaseUrl })).toThrow(/DATABASE_URL is required/);
  });
});
