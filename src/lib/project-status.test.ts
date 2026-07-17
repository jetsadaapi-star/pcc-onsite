import { describe, expect, it } from "vitest";
import { canTransitionProjectStatus, getAvailableProjectStatusOptions, projectStatusOptions } from "./project-status";

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

  it("only offers transitions that a normal user can submit", () => {
    const newProjectOptions = getAvailableProjectStatusOptions("NEW").map((option) => option.value);
    expect(newProjectOptions).toContain("NEW");
    expect(newProjectOptions).toContain("CONTACTED");
    expect(newProjectOptions).not.toContain("IN_CONSTRUCTION");

    const wonProjectOptions = getAvailableProjectStatusOptions("WON").map((option) => option.value);
    expect(wonProjectOptions).toContain("IN_CONSTRUCTION");
  });

  it("offers every status to administrators", () => {
    expect(getAvailableProjectStatusOptions("NEW", true)).toEqual(projectStatusOptions);
  });
});
