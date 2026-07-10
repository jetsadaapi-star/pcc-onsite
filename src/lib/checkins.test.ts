import { describe, expect, it } from "vitest";
import { findPreviousCheckIn } from "./checkins";

describe("findPreviousCheckIn", () => {
  it("returns the latest check-in before the target time for the same user", () => {
    const previous = findPreviousCheckIn(
      [
        { id: "old", userId: "u1", checkedAt: new Date("2026-07-01T08:00:00Z") },
        { id: "other-user", userId: "u2", checkedAt: new Date("2026-07-01T11:00:00Z") },
        { id: "latest", userId: "u1", checkedAt: new Date("2026-07-01T10:00:00Z") },
        { id: "future", userId: "u1", checkedAt: new Date("2026-07-01T12:00:00Z") }
      ],
      "u1",
      new Date("2026-07-01T11:00:00Z")
    );

    expect(previous?.id).toBe("latest");
  });
});
