import { describe, expect, it } from "vitest";
import { canManageProject, canViewProjectTeamActivity } from "@/lib/project-access";

const project = {
  ownerId: "owner",
  createdById: "creator"
};

describe("project access", () => {
  it.each(["EMPLOYEE", "SALES", "ENGINEER"])("allows a %s owner to manage the project", (role) => {
    expect(canManageProject({ id: "owner", role }, project)).toBe(true);
  });

  it("allows the creator and admin to manage the project", () => {
    expect(canManageProject({ id: "creator", role: "SALES" }, project)).toBe(true);
    expect(canManageProject({ id: "admin", role: "ADMIN" }, project)).toBe(true);
  });

  it("keeps unrelated field users from team activity and management", () => {
    const user = { id: "other", role: "ENGINEER" };
    expect(canManageProject(user, project)).toBe(false);
    expect(canViewProjectTeamActivity(user, project)).toBe(false);
  });
});
