import { CalendarDays, CheckCircle2, Clock3, Filter, Gauge, History, MapPin, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckInEvidenceGallery } from "@/components/check-in-evidence-gallery";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { bangkokDateRange } from "@/lib/bangkok-time";
import { buildCheckInEvidence } from "@/lib/check-in-evidence";
import { prisma } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { checkoutStatusLabels, purposeLabels } from "@/lib/labels";
import { resolveOdometerSnapshot } from "@/lib/odometer-snapshot";

type HistorySearchParams = {
  q?: string;
  projectId?: string;
  purpose?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: string;
};

const PAGE_SIZE = 12;

function clean(value?: string | null) {
  const text = value?.trim();
  return text || undefined;
}

function parsePage(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function buildHref(params: HistorySearchParams, patch: Partial<HistorySearchParams>) {
  const merged = { ...params, ...patch };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) query.set(key, value);
  }
  const text = query.toString();
  return text ? `/history?${text}` : "/history";
}

function pageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function durationText(start: Date, end?: Date | null) {
  if (!end) return "กำลังเปิดงาน";
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ชม. ${rest} นาที` : `${hours} ชม.`;
}

function mapsHref(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export default async function EmployeeCheckInHistoryPage({ searchParams }: { searchParams: Promise<HistorySearchParams> }) {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/admin/check-ins");

  const params = await searchParams;
  const q = clean(params.q)?.slice(0, 100);
  const projectId = clean(params.projectId);
  const purpose = params.purpose && params.purpose in purposeLabels ? params.purpose : undefined;
  const status = params.status === "open" || params.status === "closed" ? params.status : undefined;
  const currentPage = parsePage(params.page);
  const where: Prisma.CheckInWhereInput = { userId: user.id };
  const and: Prisma.CheckInWhereInput[] = [];

  if (projectId) where.projectId = projectId;
  if (purpose) where.purpose = purpose as Prisma.EnumCheckInPurposeFilter["equals"];
  if (status === "open") where.checkedOutAt = null;
  if (status === "closed") where.checkedOutAt = { not: null };
  const checkedAt = bangkokDateRange(params.from, params.to);
  if (checkedAt) where.checkedAt = checkedAt;
  if (q) {
    and.push({
      OR: [
        { project: { is: { code: { contains: q, mode: "insensitive" } } } },
        { project: { is: { name: { contains: q, mode: "insensitive" } } } },
        { project: { is: { customerName: { contains: q, mode: "insensitive" } } } },
        { vehicle: { is: { name: { contains: q, mode: "insensitive" } } } },
        { vehicle: { is: { licensePlate: { contains: q, mode: "insensitive" } } } },
        { note: { contains: q, mode: "insensitive" } },
        { checkoutNote: { contains: q, mode: "insensitive" } }
      ]
    });
  }
  if (and.length) where.AND = and;

  const [checkIns, filteredTotal, metricsRows, projects] = await Promise.all([
    prisma.checkIn.findMany({
      where,
      orderBy: [{ checkedAt: "desc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        checkedAt: true,
        checkedOutAt: true,
        latitude: true,
        longitude: true,
        checkoutLatitude: true,
        checkoutLongitude: true,
        purpose: true,
        note: true,
        checkoutStatus: true,
        checkoutNote: true,
        photoUrl: true,
        photoUrls: true,
        checkoutPhotoUrl: true,
        checkoutPhotoUrls: true,
        odometerStartKm: true,
        odometerStartPhotoUrl: true,
        odometerEndKm: true,
        odometerEndPhotoUrl: true,
        odometerDistanceKm: true,
        project: { select: { id: true, code: true, name: true, customerName: true, province: true } },
        vehicle: { select: { name: true, licensePlate: true } },
        tripSession: {
          select: {
            fieldWorkSession: {
              select: {
                id: true,
                status: true,
                odometerStartKm: true,
                odometerStartPhotoUrl: true,
                odometerEndKm: true,
                odometerEndPhotoUrl: true,
                odometerDistanceKm: true,
                gpsDistanceKm: true,
                distanceVariancePercent: true,
                vehicle: { select: { name: true, licensePlate: true } }
              }
            }
          }
        }
      }
    }),
    prisma.checkIn.count({ where }),
    prisma.$queryRaw<Array<{ total: number; openTotal: number; closedTotal: number; distanceKm: number }>>`
      SELECT
        COUNT(*)::int AS "total",
        COUNT(*) FILTER (WHERE "checkedOutAt" IS NULL)::int AS "openTotal",
        COUNT(*) FILTER (WHERE "checkedOutAt" IS NOT NULL)::int AS "closedTotal",
        (
          COALESCE((
            SELECT SUM(fws."odometerDistanceKm")
            FROM "FieldWorkSession" fws
            WHERE fws."userId" = ${user.id}
          ), 0)
          +
          COALESCE((
            SELECT SUM(ci_legacy."odometerDistanceKm")
            FROM "CheckIn" ci_legacy
            LEFT JOIN "TripSession" ts_legacy ON ts_legacy."id" = ci_legacy."tripSessionId"
            WHERE ci_legacy."userId" = ${user.id}
              AND ts_legacy."fieldWorkSessionId" IS NULL
          ), 0)
        )::double precision AS "distanceKm"
      FROM "CheckIn"
      WHERE "userId" = ${user.id}
    `,
    prisma.project.findMany({
      where: { checkIns: { some: { userId: user.id } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, code: true, name: true }
    })
  ]);
  const metrics = metricsRows[0] ?? { total: 0, openTotal: 0, closedTotal: 0, distanceKm: 0 };

  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  if (filteredTotal > 0 && currentPage > totalPages) {
    redirect(buildHref(params, { page: totalPages === 1 ? undefined : String(totalPages) }));
  }
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const resultStart = filteredTotal === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const resultEnd = Math.min(filteredTotal, resultStart + checkIns.length - 1);
  const activeFilterCount = [q, projectId, purpose, status, params.from, params.to].filter(Boolean).length;

  return (
    <div className="content-stack employee-history-page admin-checkins-page">
      <section className="admin-checkins-hero employee-history-hero">
        <div>
          <span className="hero-label"><History size={15} /> My Check-ins</span>
          <h1>ประวัติเช็กอินของฉัน</h1>
          <p>ดูเวลาเข้า-ออก โครงการ พิกัด และเลขไมล์รอบงานประจำวันจากแหล่งข้อมูลเดียวกับรายงานแอดมิน</p>
        </div>
        <Link className="button primary" href="/check-in">ไปหน้าเช็กอิน</Link>
      </section>

      <section className="admin-checkins-summary employee-history-summary">
        <div><span><History size={16} /> ทั้งหมด</span><strong>{metrics.total}</strong></div>
        <div><span><Clock3 size={16} /> กำลังเปิดงาน</span><strong>{metrics.openTotal}</strong></div>
        <div><span><CheckCircle2 size={16} /> เช็กเอาท์แล้ว</span><strong>{metrics.closedTotal}</strong></div>
        <div><span><Gauge size={16} /> ระยะเลขไมล์รวม</span><strong>{formatNumber(metrics.distanceKm, 1)} กม.</strong></div>
      </section>

      <section className="admin-checkins-filter-card">
        <div className="admin-checkins-card-head">
          <div><span><Filter size={15} /> Filters</span><h2>ค้นหาประวัติ</h2><p>{activeFilterCount ? `ใช้ตัวกรอง ${activeFilterCount} รายการ` : "แสดงรายการล่าสุดก่อน"}</p></div>
        </div>
        <form className="admin-checkins-filter-form" action="/history">
          <label className="admin-checkins-search"><Search size={16} /><input name="q" maxLength={100} defaultValue={q} placeholder="ค้นหาโครงการ ลูกค้า รถ หรือบันทึกงาน" /></label>
          <select name="projectId" defaultValue={projectId ?? ""} aria-label="โครงการ">
            <option value="">ทุกโครงการ</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}
          </select>
          <select name="purpose" defaultValue={purpose ?? ""} aria-label="ประเภทงาน">
            <option value="">ทุกประเภทงาน</option>
            {Object.entries(purposeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select name="status" defaultValue={status ?? ""} aria-label="สถานะ">
            <option value="">ทุกสถานะ</option><option value="open">กำลังเปิดงาน</option><option value="closed">เช็กเอาท์แล้ว</option>
          </select>
          <label className="activity-date-field"><span>ตั้งแต่</span><input type="date" name="from" defaultValue={params.from} /></label>
          <label className="activity-date-field"><span>ถึง</span><input type="date" name="to" defaultValue={params.to} /></label>
          <button className="button primary" type="submit"><Search size={15} /> ค้นหา</button>
          <Link className="button secondary" href="/history"><RotateCcw size={15} /> ล้างตัวกรอง</Link>
        </form>
      </section>

      <section className="employee-history-results">
        <div className="admin-checkins-card-head">
          <div><span><CalendarDays size={15} /> History</span><h2>รายการเช็กอิน</h2><p>แสดง {resultStart}-{resultEnd} จาก {filteredTotal} รายการ</p></div>
        </div>
        <div className="employee-history-list">
          {checkIns.map((item) => {
            const evidence = buildCheckInEvidence(item);
            const isOpen = !item.checkedOutAt;
            const fieldSession = item.tripSession?.fieldWorkSession;
            const odometer = resolveOdometerSnapshot({
              odometerStartKm: item.odometerStartKm,
              odometerEndKm: item.odometerEndKm,
              odometerDistanceKm: item.odometerDistanceKm,
              fieldWorkSession: fieldSession
            });
            const displayVehicle = item.vehicle ?? fieldSession?.vehicle ?? null;
            return (
              <article className="employee-history-card" key={item.id}>
                <header>
                  <div><Link href={`/projects/${item.project.id}`}>{item.project.code} · {item.project.name}</Link><span>{item.project.customerName}{item.project.province ? ` · ${item.project.province}` : ""}</span></div>
                  <span className={`badge ${isOpen ? "warning" : "success"}`}>{isOpen ? "กำลังเปิดงาน" : "เช็กเอาท์แล้ว"}</span>
                </header>
                <div className="employee-history-facts">
                  <div><span>เวลาเข้า</span><strong>{formatDateTime(item.checkedAt)}</strong></div>
                  <div><span>เวลาออก</span><strong>{item.checkedOutAt ? formatDateTime(item.checkedOutAt) : "-"}</strong></div>
                  <div><span>ระยะเวลา</span><strong>{durationText(item.checkedAt, item.checkedOutAt)}</strong></div>
                  <div><span>ประเภทงาน</span><strong>{purposeLabels[item.purpose]}</strong></div>
                  <div><span>รถ</span><strong>{displayVehicle ? `${displayVehicle.name}${displayVehicle.licensePlate ? ` · ${displayVehicle.licensePlate}` : ""}` : "ไม่ได้ระบุ"}</strong></div>
                  <div>
                    <span>{odometer.source === "FIELD_DAY" ? "เลขไมล์รอบวัน" : "เลขไมล์ข้อมูลเดิม"}</span>
                    <strong>{odometer.source !== "NONE" ? `${odometer.startKm ?? "-"} → ${odometer.endKm ?? "รอจบรอบ"}${odometer.distanceKm !== null ? ` · ${formatNumber(odometer.distanceKm, 1)} กม.` : ""}` : "-"}</strong>
                  </div>
                </div>
                {(item.note || item.checkoutNote || item.checkoutStatus) ? (
                  <div className="employee-history-notes">
                    {item.note ? <p><strong>ตอนเข้า:</strong> {item.note}</p> : null}
                    {item.checkoutNote ? <p><strong>สรุปตอนออก:</strong> {item.checkoutNote}</p> : null}
                    {item.checkoutStatus ? <span>{checkoutStatusLabels[item.checkoutStatus]}</span> : null}
                  </div>
                ) : null}
                <div className="employee-history-map-links">
                  <a href={mapsHref(item.latitude, item.longitude)} target="_blank" rel="noreferrer"><MapPin size={14} /> พิกัดตอนเข้า</a>
                  {item.checkoutLatitude !== null && item.checkoutLongitude !== null ? <a href={mapsHref(item.checkoutLatitude, item.checkoutLongitude)} target="_blank" rel="noreferrer"><MapPin size={14} /> พิกัดตอนออก</a> : null}
                </div>
                <CheckInEvidenceGallery items={evidence} />
              </article>
            );
          })}
          {checkIns.length === 0 ? <div className="empty">ไม่พบประวัติเช็กอินตามตัวกรองนี้</div> : null}
        </div>
        <div className="admin-checkins-pagination">
          <span>หน้า {safeCurrentPage} จาก {totalPages}</span>
          <div className="projects-page-numbers">
            {safeCurrentPage > 1 ? <Link className="projects-page-link" href={buildHref(params, { page: safeCurrentPage - 1 === 1 ? undefined : String(safeCurrentPage - 1) })}>ก่อนหน้า</Link> : null}
            {pageNumbers(safeCurrentPage, totalPages).map((page) => <Link key={page} className={`projects-page-link ${page === safeCurrentPage ? "active" : ""}`} href={buildHref(params, { page: page === 1 ? undefined : String(page) })}>{page}</Link>)}
            {safeCurrentPage < totalPages ? <Link className="projects-page-link" href={buildHref(params, { page: String(safeCurrentPage + 1) })}>ถัดไป</Link> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
