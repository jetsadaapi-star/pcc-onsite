import { NextRequest } from "next/server";
import {
  activityActionLabels,
  activityEntityLabels,
  buildActivityWhere,
  sanitizeAuditMetadata,
  normalizeActivityFilters
} from "@/lib/activity-log";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function safeSpreadsheetText(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value: unknown) {
  return `"${safeSpreadsheetText(value).replace(/"/g, '""')}"`;
}

function thaiDate(value: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Bangkok"
  }).format(value);
}

function fileDate() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Bangkok"
  }).format(new Date()).replaceAll("-", "");
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  const filters = normalizeActivityFilters({
    q: request.nextUrl.searchParams.get("q"),
    actorId: request.nextUrl.searchParams.get("actorId"),
    entityType: request.nextUrl.searchParams.get("entityType"),
    action: request.nextUrl.searchParams.get("action"),
    from: request.nextUrl.searchParams.get("from"),
    to: request.nextUrl.searchParams.get("to")
  });
  const where = buildActivityWhere(filters);

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 10001,
    include: { actor: { select: { name: true, email: true, role: true } } }
  });

  if (logs.length > 10000) {
    return Response.json(
      { error: "ผลลัพธ์เกิน 10,000 รายการ กรุณาระบุช่วงเวลาหรือตัวกรองให้แคบลง" },
      { status: 413 }
    );
  }

  const header = [
    "วันเวลา",
    "ผู้ดำเนินการ",
    "อีเมล",
    "บทบาท",
    "Action",
    "คำอธิบาย",
    "ประเภทข้อมูล",
    "ชื่อประเภทข้อมูล",
    "Entity ID",
    "Metadata"
  ];
  const rows = logs.map((log) => [
    thaiDate(log.createdAt),
    log.actor?.name ?? "บัญชีที่ถูกลบ/ระบบ",
    log.actor?.email ?? "",
    log.actor?.role ?? "",
    log.action,
    activityActionLabels[log.action] ?? log.action,
    log.entityType,
    activityEntityLabels[log.entityType] ?? log.entityType,
    log.entityId,
    log.metadata === null ? "" : JSON.stringify(sanitizeAuditMetadata(log.metadata))
  ]);
  const csv = "\uFEFF" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const recordedFilters = Object.fromEntries(Object.entries(filters).filter(([, value]) => Boolean(value)));

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "ActivityLog",
      entityId: `export-${Date.now()}`,
      action: "EXPORT_ACTIVITY_LOG",
      metadata: { filters: recordedFilters, rowCount: rows.length }
    }
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${fileDate()}.csv"`,
      "Cache-Control": "private, no-store"
    }
  });
}
