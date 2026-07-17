import {
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Filter,
  Gauge,
  MapPin,
  Search,
  Trash2,
  UserRound,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { CheckInEvidenceGallery } from "@/components/check-in-evidence-gallery";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { deleteCheckInAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { bangkokDateRange, startOfCurrentBangkokDay } from "@/lib/bangkok-time";
import { prisma } from "@/lib/db";
import { buildCheckInEvidence } from "@/lib/check-in-evidence";
import { formatDateTime, formatNumber } from "@/lib/format";
import { checkoutStatusLabels, purposeLabels, roleLabels } from "@/lib/labels";

type AdminCheckInsSearchParams = {
  q?: string;
  userId?: string;
  projectId?: string;
  purpose?: string;
  visitStatus?: string;
  from?: string;
  to?: string;
  page?: string;
};

const PAGE_SIZE = 15;

function clean(value?: string | null) {
  const text = value?.trim();
  return text || undefined;
}

function parsePage(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function buildHref(params: AdminCheckInsSearchParams, patch: Partial<AdminCheckInsSearchParams>) {
  const next = new URLSearchParams();
  const merged = { ...params, ...patch };

  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }

  const query = next.toString();
  return query ? `/admin/check-ins?${query}` : "/admin/check-ins";
}

function pageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function dateRangeFilter(from?: string, to?: string) {
  return bangkokDateRange(from, to) as Prisma.DateTimeFilter | undefined;
}

function googleMapsHref(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export default async function AdminCheckInsPage({
  searchParams
}: {
  searchParams: Promise<AdminCheckInsSearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = clean(params.q);
  const userId = clean(params.userId);
  const projectId = clean(params.projectId);
  const purpose = clean(params.purpose);
  const visitStatus = params.visitStatus === "open" || params.visitStatus === "closed" ? params.visitStatus : undefined;
  const currentPage = parsePage(params.page);
  const dateFilter = dateRangeFilter(params.from, params.to);

  const and: Prisma.CheckInWhereInput[] = [];
  const where: Prisma.CheckInWhereInput = {};

  if (userId) where.userId = userId;
  if (projectId) where.projectId = projectId;
  if (purpose && purpose in purposeLabels) where.purpose = purpose as Prisma.EnumCheckInPurposeFilter["equals"];
  if (visitStatus === "open") where.checkedOutAt = null;
  if (visitStatus === "closed") where.checkedOutAt = { not: null };
  if (dateFilter) where.checkedAt = dateFilter;

  if (q) {
    and.push({
      OR: [
        { user: { is: { name: { contains: q, mode: "insensitive" } } } },
        { user: { is: { email: { contains: q, mode: "insensitive" } } } },
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

  const todayStart = startOfCurrentBangkokDay();

  const [checkIns, total, filteredOpen, todayTotal, openTotal, users, projects] = await Promise.all([
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
        accuracy: true,
        purpose: true,
        note: true,
        photoUrl: true,
        photoUrls: true,
        checkoutStatus: true,
        checkoutNote: true,
        checkoutPhotoUrl: true,
        checkoutPhotoUrls: true,
        odometerStartKm: true,
        odometerStartPhotoUrl: true,
        odometerEndKm: true,
        odometerEndPhotoUrl: true,
        odometerDistanceKm: true,
        user: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, code: true, name: true, customerName: true, province: true } },
        vehicle: { select: { name: true, licensePlate: true } }
      }
    }),
    prisma.checkIn.count({ where }),
    prisma.checkIn.count({ where: { ...where, checkedOutAt: null } }),
    prisma.checkIn.count({ where: { checkedAt: { gte: todayStart } } }),
    prisma.checkIn.count({ where: { checkedOutAt: null } }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true }
    }),
    prisma.project.findMany({
      where: { checkIns: { some: {} } },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, code: true, name: true }
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (total > 0 && currentPage > totalPages) {
    redirect(buildHref(params, { page: totalPages === 1 ? undefined : String(totalPages) }));
  }

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const resultStart = total === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const resultEnd = Math.min(total, resultStart + checkIns.length - 1);
  const activeFilterCount = [q, userId, projectId, purpose, visitStatus, params.from, params.to].filter(Boolean).length;

  return (
    <div className="content-stack admin-checkins-page">
      <section className="admin-checkins-hero">
        <div>
          <span className="hero-label">
            <ClipboardCheck size={15} />
            Check-in Audit
          </span>
          <h1>ตรวจสอบประวัติเช็คอิน</h1>
          <p>ดูภาพรวมว่าใครไปหน้างานไหน เข้าออกเวลาใด แนบหลักฐานครบไหม และมีงานใดที่ยังไม่ได้เช็คเอาท์</p>
        </div>
        <Link className="button secondary" href="/admin">
          กลับ Admin Overview
        </Link>
      </section>

      <section className="admin-checkins-summary">
        <div>
          <span><ClipboardCheck size={16} /> ผลลัพธ์ตามตัวกรอง</span>
          <strong>{total}</strong>
        </div>
        <div>
          <span><Clock3 size={16} /> ยังไม่เช็คเอาท์</span>
          <strong>{filteredOpen}</strong>
        </div>
        <div>
          <span><CalendarDays size={16} /> เช็คอินวันนี้</span>
          <strong>{todayTotal}</strong>
        </div>
        <div>
          <span><XCircle size={16} /> งานเปิดทั้งระบบ</span>
          <strong>{openTotal}</strong>
        </div>
      </section>

      <section className="admin-checkins-filter-card">
        <div className="admin-checkins-card-head">
          <div>
            <span><Filter size={15} /> ตัวกรองการตรวจสอบ</span>
            <h2>ค้นหาและจำกัดผลลัพธ์</h2>
            <p>
              แสดง {resultStart}-{resultEnd} จาก {total} รายการ
              {activeFilterCount ? ` · ใช้ตัวกรอง ${activeFilterCount} รายการ` : ""}
            </p>
          </div>
          <span className="projects-page-size-pill">{PAGE_SIZE} รายการ/หน้า</span>
        </div>

        <form className="admin-checkins-filter-form">
          <label className="admin-checkins-search">
            <Search size={17} />
            <input name="q" defaultValue={q ?? ""} placeholder="ค้นหาพนักงาน อีเมล โครงการ ลูกค้า รถ ทะเบียน หรือหมายเหตุ" />
          </label>

          <div className="field compact">
            <label htmlFor="checkins-from"><CalendarDays size={14} /> จากวันที่</label>
            <input className="input" id="checkins-from" name="from" type="date" defaultValue={params.from ?? ""} />
          </div>
          <div className="field compact">
            <label htmlFor="checkins-to"><CalendarDays size={14} /> ถึงวันที่</label>
            <input className="input" id="checkins-to" name="to" type="date" defaultValue={params.to ?? ""} />
          </div>

          <select name="visitStatus" defaultValue={visitStatus ?? ""} aria-label="สถานะเช็คเอาท์">
            <option value="">ทุกสถานะ</option>
            <option value="open">ยังไม่เช็คเอาท์</option>
            <option value="closed">เช็คเอาท์แล้ว</option>
          </select>
          <select name="purpose" defaultValue={purpose ?? ""} aria-label="ประเภทงาน">
            <option value="">ทุกประเภทงาน</option>
            {Object.entries(purposeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select name="userId" defaultValue={userId ?? ""} aria-label="ผู้ใช้">
            <option value="">ทุกผู้ใช้</option>
            {users.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {roleLabels[item.role]}</option>
            ))}
          </select>
          <select name="projectId" defaultValue={projectId ?? ""} aria-label="โครงการ">
            <option value="">ทุกโครงการ</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.code} · {project.name}</option>
            ))}
          </select>
          <button className="button" type="submit">
            <Filter size={17} />
            กรองข้อมูล
          </button>
        </form>
      </section>

      <section className="admin-checkins-table-card">
        <div className="admin-checkins-card-head">
          <div>
            <span><ClipboardCheck size={15} /> รายการตรวจสอบ</span>
            <h2>ประวัติเช็คอินหน้างาน</h2>
            <p>ข้อมูลถูกแบ่งหน้าและดึงเฉพาะ field ที่จำเป็น เพื่อลดโหลดเมื่อข้อมูลสะสมมากขึ้น</p>
          </div>
        </div>

        <div className="admin-checkins-table-wrap">
          <table className="admin-checkins-table">
            <thead>
              <tr>
                <th>เวลา</th>
                <th>ผู้ใช้</th>
                <th>โครงการ</th>
                <th>สถานะ</th>
                <th>งาน/หมายเหตุ</th>
                <th>หลักฐาน</th>
                <th>พิกัด</th>
              </tr>
            </thead>
            <tbody>
              {checkIns.map((item) => {
                const isOpen = !item.checkedOutAt;
                const evidence = buildCheckInEvidence(item);

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{formatDateTime(item.checkedAt)}</strong>
                      <div className="muted">{item.checkedOutAt ? `ออก ${formatDateTime(item.checkedOutAt)}` : "ยังไม่มีเวลาออก"}</div>
                    </td>
                    <td>
                      <span className="admin-checkins-user">
                        <UserRound size={14} />
                        {item.user.name}
                      </span>
                      <div className="muted">{roleLabels[item.user.role]} · {item.user.email}</div>
                    </td>
                    <td className="admin-checkins-project">
                      <Link href={`/projects/${item.project.id}`}>{item.project.code} · {item.project.name}</Link>
                      <span>{item.project.customerName}{item.project.province ? ` · ${item.project.province}` : ""}</span>
                    </td>
                    <td>
                      <span className={`badge ${isOpen ? "warning" : "success"}`}>
                        {isOpen ? "ยังไม่เช็คเอาท์" : "เช็คเอาท์แล้ว"}
                      </span>
                      {item.checkoutStatus ? <div className="muted">{checkoutStatusLabels[item.checkoutStatus]}</div> : null}
                    </td>
                    <td>
                      <strong>{purposeLabels[item.purpose]}</strong>
                      <div className="muted">{item.checkoutNote ?? item.note ?? "-"}</div>
                      {item.odometerDistanceKm !== null ? (
                        <div className="admin-checkins-odometer">
                          <Gauge size={13} />
                          {formatNumber(item.odometerDistanceKm, 1)} กม.
                        </div>
                      ) : null}
                      {item.odometerStartKm !== null || item.odometerEndKm !== null ? (
                        <div className="muted">เลขไมล์ {item.odometerStartKm ?? "-"} → {item.odometerEndKm ?? "-"}</div>
                      ) : null}
                    </td>
                    <td>
                      <CheckInEvidenceGallery items={evidence} />
                      {item.vehicle ? <div className="muted">{item.vehicle.name}{item.vehicle.licensePlate ? ` · ${item.vehicle.licensePlate}` : ""}</div> : null}
                    </td>
                    <td>
                      <a
                        className="admin-checkins-map-link"
                        href={googleMapsHref(item.latitude, item.longitude)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MapPin size={14} />
                        {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                      </a>
                      {item.accuracy ? <div className="muted">±{Math.round(item.accuracy)}m</div> : null}
                      <ConfirmActionForm action={deleteCheckInAction} fields={{ id: item.id }} message={`ยืนยันลบเช็กอินของ ${item.user.name} ใช่หรือไม่? ข้อมูลการเดินทางและเคลมที่เกี่ยวข้องจะถูกลบด้วย`}>
                        <button className="button danger small" type="submit"><Trash2 size={14} /> ลบ</button>
                      </ConfirmActionForm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="admin-checkins-mobile-list">
          {checkIns.map((item) => {
            const isOpen = !item.checkedOutAt;
            const evidence = buildCheckInEvidence(item);

            return (
              <article className="admin-checkins-mobile-card" key={item.id}>
                <div className="admin-checkins-mobile-head">
                  <div>
                    <strong>{item.user.name}</strong>
                    <span>{roleLabels[item.user.role]} · {formatDateTime(item.checkedAt)}</span>
                  </div>
                  <span className={`badge ${isOpen ? "warning" : "success"}`}>{isOpen ? "เปิดงาน" : "ปิดงาน"}</span>
                </div>
                <Link className="admin-checkins-mobile-project" href={`/projects/${item.project.id}`}>
                  {item.project.code} · {item.project.name}
                </Link>
                <div className="admin-checkins-mobile-meta">
                  <span><ClipboardCheck size={14} /> {purposeLabels[item.purpose]}</span>
                  <span>หลักฐาน {evidence.length} ไฟล์</span>
                  {item.odometerDistanceKm !== null ? <span><Gauge size={14} /> {formatNumber(item.odometerDistanceKm, 1)} กม.</span> : null}
                </div>
                <CheckInEvidenceGallery items={evidence} />
                <a
                  className="admin-checkins-map-link"
                  href={googleMapsHref(item.latitude, item.longitude)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={14} />
                  เปิดพิกัดในแผนที่
                </a>
                <ConfirmActionForm action={deleteCheckInAction} fields={{ id: item.id }} message={`ยืนยันลบเช็กอินของ ${item.user.name} ใช่หรือไม่? ข้อมูลการเดินทางและเคลมที่เกี่ยวข้องจะถูกลบด้วย`}>
                  <button className="button danger" type="submit"><Trash2 size={15} /> ลบเช็กอิน</button>
                </ConfirmActionForm>
              </article>
            );
          })}
        </div>

        {checkIns.length === 0 ? <div className="empty">ไม่พบประวัติเช็คอินตามตัวกรอง</div> : null}

        <div className="admin-checkins-pagination">
          <Link
            className={`projects-page-link ${safeCurrentPage <= 1 ? "disabled" : ""}`}
            href={safeCurrentPage <= 1 ? buildHref(params, { page: undefined }) : buildHref(params, { page: safeCurrentPage - 1 === 1 ? undefined : String(safeCurrentPage - 1) })}
            aria-disabled={safeCurrentPage <= 1}
          >
            ก่อนหน้า
          </Link>
          <div className="projects-page-numbers">
            {pageNumbers(safeCurrentPage, totalPages).map((page) => (
              <Link
                key={page}
                className={`projects-page-number ${page === safeCurrentPage ? "active" : ""}`}
                href={buildHref(params, { page: page === 1 ? undefined : String(page) })}
              >
                {page}
              </Link>
            ))}
          </div>
          <Link
            className={`projects-page-link ${safeCurrentPage >= totalPages ? "disabled" : ""}`}
            href={safeCurrentPage >= totalPages ? buildHref(params, { page: totalPages === 1 ? undefined : String(totalPages) }) : buildHref(params, { page: String(safeCurrentPage + 1) })}
            aria-disabled={safeCurrentPage >= totalPages}
          >
            ถัดไป
          </Link>
        </div>
      </section>
    </div>
  );
}
