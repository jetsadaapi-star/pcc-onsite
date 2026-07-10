export const projectStatusLabels = {
  NEW: "บันทึกใหม่",
  CONTACTED: "ติดต่อแล้ว",
  SURVEY_SCHEDULED: "นัดสำรวจแล้ว",
  SURVEYED: "สำรวจแล้ว",
  QUOTING: "กำลังทำราคา",
  QUOTED: "เสนอราคาแล้ว",
  NEGOTIATING: "เจรจา/รอตัดสินใจ",
  WON: "ได้งาน",
  IN_CONSTRUCTION: "กำลังก่อสร้าง",
  COMPLETED: "ส่งมอบแล้ว",
  ON_HOLD: "พักโครงการ",
  CLOSED_LOST: "ปิดโครงการ/ไม่ได้งาน",
  CANCELLED: "ยกเลิก"
} as const;

export type ProjectStatus = keyof typeof projectStatusLabels;

export const projectStatusOptions = Object.entries(projectStatusLabels).map(([value, label]) => ({
  value: value as ProjectStatus,
  label
}));

const allowedTransitions: Record<ProjectStatus, ProjectStatus[]> = {
  NEW: ["CONTACTED", "SURVEY_SCHEDULED", "SURVEYED", "ON_HOLD", "CANCELLED"],
  CONTACTED: ["SURVEY_SCHEDULED", "SURVEYED", "QUOTING", "ON_HOLD", "CLOSED_LOST"],
  SURVEY_SCHEDULED: ["SURVEYED", "CONTACTED", "ON_HOLD", "CANCELLED"],
  SURVEYED: ["QUOTING", "QUOTED", "ON_HOLD", "CLOSED_LOST"],
  QUOTING: ["QUOTED", "SURVEYED", "ON_HOLD", "CLOSED_LOST"],
  QUOTED: ["NEGOTIATING", "WON", "QUOTING", "ON_HOLD", "CLOSED_LOST"],
  NEGOTIATING: ["WON", "QUOTED", "ON_HOLD", "CLOSED_LOST"],
  WON: ["IN_CONSTRUCTION", "COMPLETED", "ON_HOLD"],
  IN_CONSTRUCTION: ["COMPLETED", "ON_HOLD"],
  COMPLETED: [],
  ON_HOLD: ["CONTACTED", "SURVEY_SCHEDULED", "SURVEYED", "QUOTING", "QUOTED", "IN_CONSTRUCTION", "CANCELLED"],
  CLOSED_LOST: ["CONTACTED", "SURVEY_SCHEDULED"],
  CANCELLED: ["NEW"]
};

export function canTransitionProjectStatus(from: ProjectStatus, to: ProjectStatus) {
  return from === to || allowedTransitions[from].includes(to);
}

export function getProjectStatusTone(status: ProjectStatus) {
  if (["WON", "COMPLETED"].includes(status)) return "success";
  if (["ON_HOLD", "CLOSED_LOST", "CANCELLED"].includes(status)) return "muted";
  if (["QUOTED", "NEGOTIATING", "IN_CONSTRUCTION"].includes(status)) return "warning";
  return "info";
}
