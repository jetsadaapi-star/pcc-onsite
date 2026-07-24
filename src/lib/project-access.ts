export type ProjectAccessUser = {
  id: string;
  role: string;
};

export type ProjectAccessRecord = {
  ownerId: string | null;
  createdById: string;
};

export function canManageProject(user: ProjectAccessUser, project: ProjectAccessRecord) {
  return user.role === "ADMIN" || project.ownerId === user.id || project.createdById === user.id;
}

export function canViewProjectTeamActivity(user: ProjectAccessUser, project: ProjectAccessRecord) {
  return canManageProject(user, project);
}
