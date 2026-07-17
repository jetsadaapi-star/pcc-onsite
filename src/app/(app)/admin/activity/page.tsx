import {
  Activity,
  CalendarDays,
  Database,
  Download,
  ExternalLink,
  Filter,
  History,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  activityActionLabels,
  activityEntityHref,
  activityEntityLabels,
  buildActivityQuery,
  buildActivityWhere,
  formatAuditMetadata,
  normalizeActivityFilters,
  type ActivityFilterInput
} from "@/lib/activity-log";
import { requireAdmin } from "@/lib/auth";
import { startOfCurrentBangkokDay } from "@/lib/bangkok-time";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

type AdminActivitySearchParams = ActivityFilterInput & { page?: string };

const PAGE_SIZE = 20;

function parsePage(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function buildHref(params: AdminActivitySearchParams, patch: Partial<AdminActivitySearchParams>) {
  const merged = { ...params, ...patch };
  const query = buildActivityQuery(merged);
  if (merged.page) query.set("page", merged.page);
  else query.delete("page");
  const text = query.toString();
  return text ? `/admin/activity?${text}` : "/admin/activity";
}

function pageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function actionTone(action: string) {
  if (action.startsWith("DELETE")) return "danger";
  if (action.startsWith("CREATE") || action.startsWith("ACTIVATE") || action.startsWith("RESOLVE")) return "success";
  if (action.startsWith("DEACTIVATE") || action.startsWith("CANCEL")) return "warning";
  if (action.startsWith("EXPORT")) return "violet";
  return "info";
}

function ActivityDetails({ metadata, entityId }: { metadata: unknown; entityId: string }) {
  return (
    <details className="activity-details">
      <summary>ดูรายละเอียด</summary>
      <div>
        <span>Entity ID</span>
        <code>{entityId}</code>
      </div>
      <pre>{formatAuditMetadata(metadata)}</pre>
    </details>
  );
}

export default async function AdminActivityPage({
  searchParams
}: {
  searchParams: Promise<AdminActivitySearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const filters = normalizeActivityFilters(params);
  const currentPage = parsePage(params.page);
  const where = buildActivityWhere(filters);
  const todayStart = startOfCurrentBangkokDay();

  const [logs, filteredTotal, metricsRows, users, entityTypes, actions] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { id: true, name: true, email: true, role: true, active: true } } }
    }),
    prisma.activityLog.count({ where }),
    prisma.$queryRaw<Array<{ allTotal: number; todayTotal: number; deletionTotal: number }>>`
      SELECT
        COUNT(*)::int AS "allTotal",
        COUNT(*) FILTER (WHERE "createdAt" >= ${todayStart})::int AS "todayTotal",
        COUNT(*) FILTER (WHERE "action" LIKE 'DELETE%')::int AS "deletionTotal"
      FROM "ActivityLog"
    `,
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, active: true }
    }),
    prisma.activityLog.findMany({
      distinct: ["entityType"],
      orderBy: { entityType: "asc" },
      select: { entityType: true }
    }),
    prisma.activityLog.findMany({
      distinct: ["action"],
      orderBy: { action: "asc" },
      select: { action: true }
    })
  ]);

  const metrics = metricsRows[0] ?? { allTotal: 0, todayTotal: 0, deletionTotal: 0 };

  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  if (filteredTotal > 0 && currentPage > totalPages) {
    redirect(buildHref(params, { page: totalPages === 1 ? undefined : String(totalPages) }));
  }

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const resultStart = filteredTotal === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const resultEnd = Math.min(filteredTotal, resultStart + logs.length - 1);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const exportQuery = buildActivityQuery(filters).toString();
  const exportHref = exportQuery ? `/admin/activity/export?${exportQuery}` : "/admin/activity/export";

  return (
    <div className="content-stack admin-checkins-page admin-activity-page">
      <section className="admin-checkins-hero admin-activity-hero">
        <div>
          <span className="hero-label"><History size={15} /> Audit &amp; Activity</span>
          <h1>ประวัติการทำงานของระบบ</h1>
          <p>ตรวจสอบว่าใครทำอะไร กับข้อมูลใด และเมื่อไร พร้อมรายละเอียดประกอบที่ตัดข้อมูลลับออกก่อนแสดงผล</p>
        </div>
        <Link className="button secondary" href={exportHref} prefetch={false}>
          <Download size={16} /> ส่งออก CSV
        </Link>
      </section>

      <section className="admin-checkins-summary activity-summary">
        <div><span><Database size={16} /> ทั้งหมด</span><strong>{metrics.allTotal}</strong></div>
        <div><span><CalendarDays size={16} /> วันนี้</span><strong>{metrics.todayTotal}</strong></div>
        <div><span><Filter size={16} /> ตามตัวกรอง</span><strong>{filteredTotal}</strong></div>
        <div><span><Trash2 size={16} /> การลบ</span><strong>{metrics.deletionTotal}</strong></div>
      </section>

      <section className="admin-checkins-filter-card">
        <div className="admin-checkins-card-head">
          <div>
            <span><Filter size={15} /> Filters</span>
            <h2>ค้นหาและกรองประวัติ</h2>
            <p>{activeFilterCount ? `ใช้ตัวกรอง ${activeFilterCount} รายการ` : "แสดงกิจกรรมล่าสุดจากทั้งระบบ"}</p>
          </div>
        </div>

        <form className="admin-checkins-filter-form activity-filter-form" action="/admin/activity">
          <label className="admin-checkins-search">
            <Search size={16} />
            <input name="q" maxLength={100} defaultValue={filters.q} placeholder="ค้นหาผู้ใช้ action ประเภท หรือ Entity ID" />
          </label>
          <select name="actorId" defaultValue={filters.actorId ?? ""} aria-label="ผู้ดำเนินการ">
            <option value="">ผู้ดำเนินการทั้งหมด</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name}{user.active ? "" : " (ปิดใช้งาน)"}</option>
            ))}
          </select>
          <select name="entityType" defaultValue={filters.entityType ?? ""} aria-label="ประเภทข้อมูล">
            <option value="">ข้อมูลทุกประเภท</option>
            {entityTypes.map(({ entityType }) => (
              <option key={entityType} value={entityType}>{activityEntityLabels[entityType] ?? entityType}</option>
            ))}
          </select>
          <select name="action" defaultValue={filters.action ?? ""} aria-label="การดำเนินการ">
            <option value="">ทุกการดำเนินการ</option>
            {actions.map(({ action }) => (
              <option key={action} value={action}>{activityActionLabels[action] ?? action}</option>
            ))}
          </select>
          <label className="activity-date-field"><span>ตั้งแต่</span><input type="date" name="from" defaultValue={filters.from} /></label>
          <label className="activity-date-field"><span>ถึง</span><input type="date" name="to" defaultValue={filters.to} /></label>
          <button className="button primary" type="submit"><Search size={15} /> ค้นหา</button>
          <Link className="button secondary" href="/admin/activity"><RotateCcw size={15} /> ล้างตัวกรอง</Link>
        </form>
      </section>

      <section className="admin-checkins-table-card">
        <div className="admin-checkins-card-head">
          <div>
            <span><Activity size={15} /> Results</span>
            <h2>ลำดับเหตุการณ์</h2>
            <p>แสดง {resultStart}-{resultEnd} จาก {filteredTotal} รายการ</p>
          </div>
          <span className="activity-integrity-note"><ShieldCheck size={15} /> เก็บประวัติแม้ข้อมูลต้นทางถูกลบ</span>
        </div>

        <div className="admin-checkins-table-wrap">
          <table className="admin-checkins-table activity-table">
            <thead><tr><th>เวลา</th><th>ผู้ดำเนินการ</th><th>กิจกรรม</th><th>ข้อมูล</th><th>รายละเอียด</th></tr></thead>
            <tbody>
              {logs.map((log) => {
                const href = activityEntityHref(log.entityType, log.entityId);
                return (
                  <tr key={log.id}>
                    <td><strong>{formatDateTime(log.createdAt)}</strong></td>
                    <td>
                      <span className="admin-checkins-user"><UserRound size={14} /> {log.actor?.name ?? "บัญชีที่ถูกลบ/ระบบ"}</span>
                      <span className="activity-secondary">{log.actor?.email ?? "ไม่พบข้อมูลบัญชี"}</span>
                    </td>
                    <td>
                      <span className={`activity-action-pill ${actionTone(log.action)}`}>{activityActionLabels[log.action] ?? log.action}</span>
                      <code className="activity-action-code">{log.action}</code>
                    </td>
                    <td>
                      <strong>{activityEntityLabels[log.entityType] ?? log.entityType}</strong>
                      {href ? <Link className="activity-entity-link" href={href}><ExternalLink size={13} /> เปิดหน้าที่เกี่ยวข้อง</Link> : null}
                    </td>
                    <td><ActivityDetails metadata={log.metadata} entityId={log.entityId} /></td>
                  </tr>
                );
              })}
              {logs.length === 0 ? <tr><td colSpan={5}>ไม่พบประวัติตามตัวกรองนี้</td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="admin-checkins-mobile-list activity-mobile-list">
          {logs.map((log) => {
            const href = activityEntityHref(log.entityType, log.entityId);
            return (
              <article className="admin-checkins-mobile-card activity-mobile-card" key={log.id}>
                <div className="admin-checkins-mobile-head">
                  <div><strong>{activityActionLabels[log.action] ?? log.action}</strong><span>{formatDateTime(log.createdAt)}</span></div>
                  <span className={`activity-action-pill ${actionTone(log.action)}`}>{activityEntityLabels[log.entityType] ?? log.entityType}</span>
                </div>
                <div className="admin-checkins-mobile-meta">
                  <span><UserRound size={13} /> {log.actor?.name ?? "บัญชีที่ถูกลบ/ระบบ"}</span>
                  <code>{log.action}</code>
                </div>
                <ActivityDetails metadata={log.metadata} entityId={log.entityId} />
                {href ? <Link className="button secondary" href={href}><ExternalLink size={14} /> เปิดหน้าที่เกี่ยวข้อง</Link> : null}
              </article>
            );
          })}
        </div>

        <div className="admin-checkins-pagination">
          <span>หน้า {safeCurrentPage} จาก {totalPages}</span>
          <div className="projects-page-numbers">
            {safeCurrentPage > 1 ? <Link className="projects-page-link" href={buildHref(params, { page: String(safeCurrentPage - 1) })}>ก่อนหน้า</Link> : null}
            {pageNumbers(safeCurrentPage, totalPages).map((page) => (
              <Link key={page} className={`projects-page-link ${page === safeCurrentPage ? "active" : ""}`} href={buildHref(params, { page: page === 1 ? undefined : String(page) })}>{page}</Link>
            ))}
            {safeCurrentPage < totalPages ? <Link className="projects-page-link" href={buildHref(params, { page: String(safeCurrentPage + 1) })}>ถัดไป</Link> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
