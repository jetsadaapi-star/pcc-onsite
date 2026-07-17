import type { Prisma } from "@/generated/prisma/client";
import { bangkokDateRange } from "@/lib/bangkok-time";

export type ActivityFilterInput = {
  q?: string | null;
  actorId?: string | null;
  entityType?: string | null;
  action?: string | null;
  from?: string | null;
  to?: string | null;
};

export const activityEntityLabels: Record<string, string> = {
  ActivityLog: "Audit Log",
  AnomalyRecord: "รายการผิดปกติ",
  CheckIn: "เช็กอิน",
  ExportDocument: "เอกสารส่งออก",
  FuelLog: "บันทึกน้ำมัน",
  OfficeLocation: "ที่ตั้งสำนักงาน",
  Project: "โครงการ",
  ReimbursementRate: "อัตราค่าเดินทาง",
  SystemSetting: "ตั้งค่าระบบ",
  TravelClaim: "ค่าเดินทาง",
  TravelLeg: "เส้นทางเดินทาง",
  TripSession: "การเดินทาง",
  User: "ผู้ใช้",
  Vehicle: "รถ",
  VehicleEfficiencyPreset: "ค่าอ้างอิงรถ"
};

export const activityActionLabels: Record<string, string> = {
  ACTIVATE_USER: "เปิดใช้งานผู้ใช้",
  CANCEL_TRIP: "ยกเลิกการเดินทาง",
  CHANGE_OWN_PASSWORD: "เปลี่ยนรหัสผ่าน",
  CHECK_OUT: "เช็กเอาท์",
  COMPLETE_OFFICE_TRIP: "สิ้นสุดการเดินทางเข้าสำนักงาน",
  CREATE_CHECK_IN: "สร้างเช็กอิน",
  CREATE_FUEL_LOG: "บันทึกการเติมน้ำมัน",
  CREATE_OWN_VEHICLE: "เพิ่มรถส่วนตัว",
  CREATE_PROJECT: "สร้างโครงการ",
  CREATE_TRAVEL_LEG: "สร้างเส้นทางเดินทาง",
  CREATE_TRAVEL_LEG_FROM_TRIP: "สร้างเส้นทางจากทริป",
  CREATE_USER: "สร้างผู้ใช้",
  CREATE_VEHICLE: "เพิ่มรถ",
  CREATE_VEHICLE_EFFICIENCY_PRESET: "เพิ่มค่าอ้างอิงรถ",
  CREATE_OFFICE_LOCATION: "เพิ่มที่ตั้งสำนักงาน",
  DEACTIVATE_OWN_VEHICLE: "ปิดใช้งานรถส่วนตัว",
  DEACTIVATE_USER: "ปิดใช้งานผู้ใช้",
  DEACTIVATE_VEHICLE: "ปิดใช้งานรถ",
  DELETE_ANOMALY: "ลบรายการผิดปกติ",
  DELETE_CHECK_IN: "ลบเช็กอิน",
  DELETE_OFFICE_LOCATION: "ลบที่ตั้งสำนักงาน",
  DELETE_OWN_VEHICLE: "ลบรถส่วนตัว",
  DELETE_PROJECT: "ลบโครงการ",
  DELETE_TRAVEL_CLAIM: "ลบค่าเดินทาง",
  DELETE_USER: "ลบผู้ใช้",
  DELETE_VEHICLE: "ลบรถ",
  DELETE_VEHICLE_EFFICIENCY_PRESET: "ลบค่าอ้างอิงรถ",
  EXPORT_ACTIVITY_LOG: "ส่งออก Audit Log",
  LOGIN_SUCCESS: "เข้าสู่ระบบ",
  LOGOUT: "ออกจากระบบ",
  REMOVE_PROFILE_PHOTO: "ลบรูปโปรไฟล์",
  RESOLVE_ANOMALY: "ปิดรายการผิดปกติ",
  REVIEW_TRAVEL_CLAIM: "ตรวจสอบค่าเดินทาง",
  START_TRIP: "เริ่มเดินทาง",
  UPDATE_OFFICE_LOCATION: "แก้ไขที่ตั้งสำนักงาน",
  UPDATE_OPERATIONAL_SETTINGS: "แก้ไขการตั้งค่าปฏิบัติงาน",
  UPDATE_OWN_VEHICLE: "แก้ไขรถส่วนตัว",
  UPDATE_PROFILE_PHOTO: "เปลี่ยนรูปโปรไฟล์",
  UPDATE_PROJECT: "แก้ไขโครงการ",
  UPDATE_PROJECT_STATUS: "เปลี่ยนสถานะโครงการ",
  UPDATE_RATE: "แก้ไขอัตราค่าเดินทาง",
  UPDATE_SYSTEM_BRANDING: "แก้ไขชื่อและตราระบบ",
  UPDATE_USER: "แก้ไขผู้ใช้",
  UPDATE_VEHICLE: "แก้ไขรถ",
  UPDATE_VEHICLE_EFFICIENCY_PRESET: "แก้ไขค่าอ้างอิงรถ"
};

const sensitiveKeyPattern = /(password|secret|token|authorization|cookie|credential|private.?key)/i;

function clean(value?: string | null) {
  const text = value?.trim();
  return text || undefined;
}

export function normalizeActivityFilters(input: ActivityFilterInput) {
  return {
    q: clean(input.q)?.slice(0, 100),
    actorId: clean(input.actorId),
    entityType: clean(input.entityType),
    action: clean(input.action),
    from: clean(input.from),
    to: clean(input.to)
  };
}

export function buildActivityWhere(input: ActivityFilterInput): Prisma.ActivityLogWhereInput {
  const filters = normalizeActivityFilters(input);
  const where: Prisma.ActivityLogWhereInput = {};

  if (filters.actorId) where.actorId = filters.actorId;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.action) where.action = filters.action;

  const createdAt = bangkokDateRange(filters.from, filters.to);
  if (createdAt) where.createdAt = createdAt;

  if (filters.q) {
    where.OR = [
      { entityId: { contains: filters.q, mode: "insensitive" } },
      { entityType: { contains: filters.q, mode: "insensitive" } },
      { action: { contains: filters.q, mode: "insensitive" } },
      { actor: { is: { name: { contains: filters.q, mode: "insensitive" } } } },
      { actor: { is: { email: { contains: filters.q, mode: "insensitive" } } } }
    ];
  }

  return where;
}

export function buildActivityQuery(input: ActivityFilterInput) {
  const filters = normalizeActivityFilters(input);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params;
}

export function activityEntityHref(entityType: string, entityId: string) {
  const routes: Record<string, string> = {
    ActivityLog: "/admin/activity",
    AnomalyRecord: "/admin/anomalies",
    CheckIn: "/admin/check-ins",
    FuelLog: "/reports",
    OfficeLocation: "/admin/settings",
    Project: `/projects/${entityId}`,
    ReimbursementRate: "/admin/travel",
    SystemSetting: "/admin/settings",
    TravelClaim: "/admin/travel",
    TravelLeg: "/admin/travel",
    TripSession: "/admin/travel",
    User: "/admin/users",
    Vehicle: "/admin/vehicles",
    VehicleEfficiencyPreset: "/admin/vehicles"
  };
  return routes[entityType];
}

export function sanitizeAuditMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditMetadata);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [
    key,
    sensitiveKeyPattern.test(key) ? "[REDACTED]" : sanitizeAuditMetadata(nestedValue)
  ]));
}

export function formatAuditMetadata(value: unknown) {
  if (value === null || value === undefined) return "-";
  return JSON.stringify(sanitizeAuditMetadata(value), null, 2);
}
