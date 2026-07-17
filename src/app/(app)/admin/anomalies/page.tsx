import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Fuel,
  Gauge,
  MapPin,
  Search,
  ShieldAlert,
  Trash2,
  UserRound
} from "lucide-react";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { ActionFeedbackForm } from "@/components/action-feedback-form";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { deleteAnomalyAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { resolveAnomalyFormAction } from "@/lib/form-actions";

type AdminAnomaliesSearchParams = {
  q?: string;
  type?: string;
  severity?: string;
  status?: string;
  page?: string;
};

const PAGE_SIZE = 15;

const typeLabels: Record<string, string> = {
  GPS_FAR_FROM_PROJECT: "GPS ห่างจากไซต์",
  ODOMETER_REVERSED: "เลขไมล์ย้อน",
  DISTANCE_VARIANCE_HIGH: "ระยะ GPS ต่างจากเลขไมล์",
  FUEL_EFFICIENCY_OUTLIER: "อัตราสิ้นเปลืองผิดปกติ"
};

const severityLabels: Record<string, string> = {
  LOW: "ต่ำ",
  MEDIUM: "กลาง",
  HIGH: "สูง"
};

const statusLabels: Record<string, string> = {
  OPEN: "รอตรวจสอบ",
  RESOLVED: "ปิดเคสแล้ว"
};

function clean(value?: string | null) {
  const text = value?.trim();
  return text || undefined;
}

function parsePage(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function buildHref(params: AdminAnomaliesSearchParams, patch: Partial<AdminAnomaliesSearchParams>) {
  const next = new URLSearchParams();
  const merged = { ...params, ...patch };

  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }

  const query = next.toString();
  return query ? `/admin/anomalies?${query}` : "/admin/anomalies";
}

function pageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function googleMapsHref(latitude?: number | null, longitude?: number | null) {
  if (typeof latitude !== "number" || typeof longitude !== "number") return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function metricText(value?: number | null, suffix = "") {
  return typeof value === "number" ? `${formatNumber(value)}${suffix}` : "-";
}

export default async function AdminAnomaliesPage({
  searchParams
}: {
  searchParams: Promise<AdminAnomaliesSearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = clean(params.q);
  const currentPage = parsePage(params.page);
  const type = params.type && params.type in typeLabels ? params.type : undefined;
  const severity = params.severity && params.severity in severityLabels ? params.severity : undefined;
  const status = params.status && params.status in statusLabels ? params.status : "OPEN";

  const and: Prisma.AnomalyRecordWhereInput[] = [];
  const where: Prisma.AnomalyRecordWhereInput = {};

  if (type) where.type = type as Prisma.EnumAnomalyTypeFilter["equals"];
  if (severity) where.severity = severity as Prisma.EnumAnomalySeverityFilter["equals"];
  if (status) where.status = status as Prisma.EnumAnomalyStatusFilter["equals"];

  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { detail: { contains: q, mode: "insensitive" } },
        { user: { is: { name: { contains: q, mode: "insensitive" } } } },
        { user: { is: { email: { contains: q, mode: "insensitive" } } } },
        { vehicle: { is: { name: { contains: q, mode: "insensitive" } } } },
        { vehicle: { is: { licensePlate: { contains: q, mode: "insensitive" } } } },
        { checkIn: { is: { project: { is: { name: { contains: q, mode: "insensitive" } } } } } },
        { checkIn: { is: { project: { is: { code: { contains: q, mode: "insensitive" } } } } } }
      ]
    });
  }

  if (and.length) where.AND = and;

  const [anomalies, total, openTotal, highTotal, gpsTotal, odometerTotal, fuelTotal] = await Promise.all([
    prisma.anomalyRecord.findMany({
      where,
      orderBy: [{ status: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true, email: true } },
        vehicle: { select: { name: true, licensePlate: true } },
        checkIn: {
          select: {
            latitude: true,
            longitude: true,
            checkedAt: true,
            project: { select: { code: true, name: true } }
          }
        },
        travelLeg: {
          select: {
            distanceKm: true,
            destinationLabel: true,
            toProject: { select: { code: true, name: true } },
            fromProject: { select: { code: true, name: true } }
          }
        },
        fuelLog: {
          select: {
            fueledAt: true,
            odometerKm: true,
            liters: true,
            totalAmount: true
          }
        }
      }
    }),
    prisma.anomalyRecord.count({ where }),
    prisma.anomalyRecord.count({ where: { status: "OPEN" } }),
    prisma.anomalyRecord.count({ where: { status: "OPEN", severity: "HIGH" } }),
    prisma.anomalyRecord.count({ where: { status: "OPEN", type: "GPS_FAR_FROM_PROJECT" } }),
    prisma.anomalyRecord.count({ where: { status: "OPEN", type: { in: ["ODOMETER_REVERSED", "DISTANCE_VARIANCE_HIGH"] } } }),
    prisma.anomalyRecord.count({ where: { status: "OPEN", type: "FUEL_EFFICIENCY_OUTLIER" } })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total > 0 && currentPage > totalPages) {
    redirect(buildHref(params, { page: totalPages === 1 ? undefined : String(totalPages) }));
  }

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const resultStart = total === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const resultEnd = Math.min(total, resultStart + anomalies.length - 1);
  const activeFilterCount = [q, type, severity, status && status !== "OPEN" ? status : undefined].filter(Boolean).length;

  return (
    <div className="content-stack admin-checkins-page admin-anomalies-page">
      <section className="admin-checkins-hero admin-anomalies-hero">
        <div>
          <span className="hero-label">
            <ShieldAlert size={15} />
            Anomaly Control
          </span>
          <h1>ตรวจความผิดปกติภาคสนาม</h1>
          <p>รวมเคส GPS ห่างจากไซต์ เลขไมล์ย้อน ระยะทาง GPS ต่างจากเลขไมล์ และรถที่มีอัตราสิ้นเปลืองผิดปกติ เพื่อให้แอดมินตรวจสอบก่อนจ่ายจริง</p>
        </div>
      </section>

      <section className="admin-checkins-summary">
        <div>
          <span><AlertTriangle size={16} /> รอตรวจสอบ</span>
          <strong>{openTotal}</strong>
        </div>
        <div>
          <span><ShieldAlert size={16} /> ความเสี่ยงสูง</span>
          <strong>{highTotal}</strong>
        </div>
        <div>
          <span><MapPin size={16} /> GPS ห่างไซต์</span>
          <strong>{gpsTotal}</strong>
        </div>
        <div>
          <span><Fuel size={16} /> รถ/น้ำมันผิดปกติ</span>
          <strong>{fuelTotal + odometerTotal}</strong>
        </div>
      </section>

      <section className="admin-checkins-filter-card">
        <div className="admin-checkins-card-head">
          <div>
            <span><Filter size={15} /> Filters</span>
            <h2>ค้นหาและคัดกรองเคส</h2>
            <p>{activeFilterCount ? `ใช้ตัวกรอง ${activeFilterCount} รายการ` : "ค่าเริ่มต้นจะแสดงเคสที่ยังรอตรวจสอบ"}</p>
          </div>
        </div>

        <form className="admin-checkins-filter-form" action="/admin/anomalies">
          <label className="admin-checkins-search">
            <Search size={16} />
            <input name="q" defaultValue={q} placeholder="ค้นหาผู้ใช้ รถ โครงการ หรือรายละเอียด" />
          </label>
          <select name="type" defaultValue={type ?? ""} aria-label="ประเภท">
            <option value="">ทุกประเภท</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select name="severity" defaultValue={severity ?? ""} aria-label="ระดับความเสี่ยง">
            <option value="">ทุกระดับ</option>
            {Object.entries(severityLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select name="status" defaultValue={status ?? ""} aria-label="สถานะ">
            <option value="">ทุกสถานะ</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button className="button primary" type="submit">ค้นหา</button>
          <a className="button secondary" href="/admin/anomalies">ล้างตัวกรอง</a>
        </form>
      </section>

      <section className="admin-checkins-table-card">
        <div className="admin-checkins-card-head">
          <div>
            <span><Gauge size={15} /> Results</span>
            <h2>รายการผิดปกติ</h2>
            <p>แสดง {resultStart}-{resultEnd} จาก {total} รายการ</p>
          </div>
        </div>

        <div className="admin-checkins-table-wrap">
          <table className="admin-checkins-table admin-anomalies-table">
            <thead>
              <tr>
                <th>ประเภท</th>
                <th>ผู้ใช้/รถ</th>
                <th>บริบท</th>
                <th>ค่าที่พบ</th>
                <th>ระดับ</th>
                <th>สถานะ</th>
                <th>เวลา</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((item) => {
                const mapHref = googleMapsHref(item.checkIn?.latitude, item.checkIn?.longitude);
                const context =
                  item.checkIn?.project ? `${item.checkIn.project.code} ${item.checkIn.project.name}` :
                  item.travelLeg ? `${item.travelLeg.fromProject?.name ?? "ต้นทาง"} -> ${item.travelLeg.toProject?.name ?? item.travelLeg.destinationLabel ?? "สำนักงาน"}` :
                  item.fuelLog ? `เติมน้ำมัน ${formatDateTime(item.fuelLog.fueledAt)}` :
                  "-";

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{typeLabels[item.type] ?? item.type}</strong>
                      <span className="admin-anomaly-detail">{item.title}</span>
                    </td>
                    <td>
                      <span className="admin-checkins-user"><UserRound size={14} /> {item.user?.name ?? "-"}</span>
                      <span className="admin-anomaly-detail">{item.vehicle ? `${item.vehicle.name} ${item.vehicle.licensePlate}` : item.user?.email}</span>
                    </td>
                    <td>
                      <span>{context}</span>
                      {mapHref ? <a className="admin-checkins-map-link" href={mapHref} target="_blank" rel="noreferrer"><MapPin size={14} /> เปิดพิกัด</a> : null}
                    </td>
                    <td>
                      <span>{metricText(item.measuredValue)}</span>
                      <span className="admin-anomaly-detail">อ้างอิง {metricText(item.expectedValue)}</span>
                    </td>
                    <td><span className={`admin-anomaly-severity severity-${item.severity.toLowerCase()}`}>{severityLabels[item.severity]}</span></td>
                    <td><span className={`status-pill ${item.status === "OPEN" ? "warning" : "success"}`}>{statusLabels[item.status]}</span></td>
                    <td>{formatDateTime(item.createdAt)}</td>
                    <td>
                      {item.status === "OPEN" ? (
                        <ActionFeedbackForm action={resolveAnomalyFormAction}>
                          <input type="hidden" name="id" value={item.id} />
                          <button className="button secondary small" type="submit"><CheckCircle2 size={14} /> ปิดเคส</button>
                        </ActionFeedbackForm>
                      ) : (
                        <span className="admin-anomaly-detail">{item.resolvedAt ? formatDateTime(item.resolvedAt) : "-"}</span>
                      )}
                      <ConfirmActionForm action={deleteAnomalyAction} fields={{ id: item.id }} message={`ยืนยันลบรายการผิดปกติ ${item.title} ใช่หรือไม่?`}>
                        <button className="button danger small" type="submit"><Trash2 size={14} /> ลบ</button>
                      </ConfirmActionForm>
                    </td>
                  </tr>
                );
              })}
              {anomalies.length === 0 ? (
                <tr>
                  <td colSpan={8}>ยังไม่พบรายการผิดปกติตามตัวกรองนี้</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="admin-checkins-mobile-list">
          {anomalies.map((item) => {
            const mapHref = googleMapsHref(item.checkIn?.latitude, item.checkIn?.longitude);
            const context = item.checkIn?.project ? `${item.checkIn.project.code} ${item.checkIn.project.name}` : item.vehicle?.licensePlate ?? "-";

            return (
              <article className="admin-checkins-mobile-card" key={item.id}>
                <div className="admin-checkins-mobile-head">
                  <div>
                    <strong>{typeLabels[item.type] ?? item.type}</strong>
                    <span>{item.title}</span>
                  </div>
                  <span className={`admin-anomaly-severity severity-${item.severity.toLowerCase()}`}>{severityLabels[item.severity]}</span>
                </div>
                <div className="admin-checkins-mobile-meta">
                  <span><UserRound size={13} /> {item.user?.name ?? "-"}</span>
                  <span>{context}</span>
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
                <p className="admin-anomaly-mobile-detail">{item.detail ?? `ค่าที่พบ ${metricText(item.measuredValue)} / อ้างอิง ${metricText(item.expectedValue)}`}</p>
                <div className="admin-anomaly-mobile-actions">
                  {mapHref ? <a className="button secondary" href={mapHref} target="_blank" rel="noreferrer"><MapPin size={15} /> เปิดพิกัด</a> : null}
                  {item.status === "OPEN" ? (
                    <ActionFeedbackForm action={resolveAnomalyFormAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button className="button primary" type="submit"><CheckCircle2 size={15} /> ปิดเคส</button>
                    </ActionFeedbackForm>
                  ) : (
                    <span className="status-pill success">{statusLabels[item.status]}</span>
                  )}
                  <ConfirmActionForm action={deleteAnomalyAction} fields={{ id: item.id }} message={`ยืนยันลบรายการผิดปกติ ${item.title} ใช่หรือไม่?`}>
                    <button className="button danger" type="submit"><Trash2 size={15} /> ลบ</button>
                  </ConfirmActionForm>
                </div>
              </article>
            );
          })}
        </div>

        <div className="admin-checkins-pagination">
          <span>หน้า {safeCurrentPage} จาก {totalPages}</span>
          <div className="projects-page-numbers">
            {safeCurrentPage > 1 ? <a className="projects-page-link" href={buildHref(params, { page: String(safeCurrentPage - 1) })}>ก่อนหน้า</a> : null}
            {pageNumbers(safeCurrentPage, totalPages).map((page) => (
              <a key={page} className={`projects-page-link ${page === safeCurrentPage ? "active" : ""}`} href={buildHref(params, { page: page === 1 ? undefined : String(page) })}>
                {page}
              </a>
            ))}
            {safeCurrentPage < totalPages ? <a className="projects-page-link" href={buildHref(params, { page: String(safeCurrentPage + 1) })}>ถัดไป</a> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
