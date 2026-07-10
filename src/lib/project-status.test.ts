import { describe, expect, it } from "vitest";
import { canTransitionProjectStatus } from "./project-status";

describe("canTransitionProjectStatus", () => {
  it("allows normal sales and engineering flow", () => {
    expect(canTransitionProjectStatus("NEW", "CONTACTED")).toBe(true);
    expect(canTransitionProjectStatus("CONTACTED", "SURVEY_SCHEDULED")).toBe(true);
    expect(canTransitionProjectStatus("SURVEYED", "QUOTING")).toBe(true);
    expect(canTransitionProjectStatus("QUOTED", "WON")).toBe(true);
    expect(canTransitionProjectStatus("WON", "IN_CONSTRUCTION")).toBe(true);
  });

  it("blocks reopening completed projects in normal flow", () => {
    expect(canTransitionProjectStatus("COMPLETED", "IN_CONSTRUCTION")).toBe(false);
  });
});
