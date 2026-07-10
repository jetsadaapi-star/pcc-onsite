import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Filter,
  MapPin,
  MapPinOff,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { getProjectStatusTone, projectStatusLabels, projectStatusOptions, type ProjectStatus } from "@/lib/project-status";

type ProjectSearchParams = {
  q?: string;
  status?: string;
  location?: string;
  owner?: string;
  page?: string;
};

const PAGE_SIZE = 10;
const CLOSED_STATUSES: ProjectStatus[] = ["COMPLETED", "CLOSED_LOST", "CANCELLED"];
const SALES_STATUSES: ProjectStatus[] = ["CONTACTED", "SURVEY_SCHEDULED", "SURVEYED", "QUOTING", "QUOTED", "NEGOTIATING"];

function parsePage(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function isProjectStatus(value?: string): value is ProjectStatus {
  return Boolean(value && value in projectStatusLabels);
}

function buildProjectsHref(basePath: string, params: ProjectSearchParams, patch: Partial<ProjectSearchParams>) {
  const next = new URLSearchParams();
  const merged: ProjectSearchParams = { ...params, ...patch };

  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }

  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const windowSize = 5;
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - windowSize + 1));
  const end = Math.min(totalPages, start + windowSize - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default async function ProjectsPage({
  searchParams,
  basePath = "/projects"
}: {
  searchParams: Promise<ProjectSearchParams>;
  basePath?: string;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const currentPage = parsePage(params.page);
  const status = isProjectStatus(params.status) ? params.status : undefined;
  const location = params.location === "with" || params.location === "missing" ? params.location : undefined;
  const owner = params.owner?.trim() || undefined;

  const and: Prisma.ProjectWhereInput[] = [];
  const where: Prisma.ProjectWhereInput = {};

  if (q) {
    and.push({
      OR: [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { contactName: { contains: q, mode: "insensitive" } },
        { contactPhone: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { province: { contains: q, mode: "insensitive" } }
      ]
    });
  }

  if (status) where.status = status;
  if (owner) and.push({ OR: [{ ownerId: owner }, { createdById: owner }] });
  if (location === "with") {
    where.latitude = { not: null };
    where.longitude = { not: null };
  }
  if (location === "missing") {
    and.push({ OR: [{ latitude: null }, { longitude: null }] });
  }
  if (and.length) where.AND = and;

  const [projects, total, active, inSalesFlow, missingLocation, owners] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { code: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        code: true,
        name: true,
        customerName: true,
        contactName: true,
        contactPhone: true,
        address: true,
        province: true,
        latitude: true,
        longitude: true,
        status: true,
        updatedAt: true,
        owner: { select: { id: true, name: true, role: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        _count: { select: { checkIns: true } }
      }
    }),
    prisma.project.count({ where }),
    prisma.project.count({ where: { status: { notIn: CLOSED_STATUSES } } }),
    prisma.project.count({ where: { status: { in: SALES_STATUSES } } }),
    prisma.project.count({ where: { OR: [{ latitude: null }, { longitude: null }] } }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true }
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (total > 0 && currentPage > totalPages) {
    redirect(buildProjectsHref(basePath, params, { page: totalPages === 1 ? undefined : String(totalPages) }));
  }

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const resultStart = total === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const resultEnd = Math.min(total, resultStart + projects.length - 1);
  const activeFilters = [q, status, location, owner].filter(Boolean).length;

  return (
    <div className="content-stack projects-management-page">
      <section className="projects-management-hero">
        <div className="projects-hero-copy">
          <span className="hero-label">
            <BriefcaseBusiness size={15} />
            Project Management
          </span>
          <h1>จัดการโครงการ/หน้างาน</h1>
          <p>ค้นหา กรอง ติดตามสถานะ และเปิดรายละเอียดหน้างานได้เร็วขึ้น โดยแสดงผลทีละ 10 รายการต่อหน้า</p>
        </div>
        <div className="projects-hero-actions">
          <Link className="button secondary" href={buildProjectsHref(basePath, {}, {})}>
            <RotateCcw size={17} />
            ล้างตัวกรอง
          </Link>
          <Link className="button" href="/projects/new">
            <Plus size={17} />
            เพิ่มหน้างานใหม่
          </Link>
        </div>
      </section>

      <section className="project-kpi-grid">
        <div className="project-kpi-card">
          <span className="kpi-icon blue"><BriefcaseBusiness size={18} /></span>
          <div><small>ผลลัพธ์ตามตัวกรอง</small><strong>{total}</strong></div>
        </div>
        <div className="project-kpi-card">
          <span className="kpi-icon teal"><CheckCircle2 size={18} /></span>
          <div><small>โครงการที่ยังเดินอยู่</small><strong>{active}</strong></div>
        </div>
        <div className="project-kpi-card">
          <span className="kpi-icon amber"><SlidersHorizontal size={18} /></span>
          <div><small>งานขาย/สำรวจ</small><strong>{inSalesFlow}</strong></div>
        </div>
        <div className="project-kpi-card">
          <span className="kpi-icon rose"><MapPinOff size={18} /></span>
          <div><small>ยังไม่มีพิกัด</small><strong>{missingLocation}</strong></div>
        </div>
      </section>

      <section className="projects-toolbar-card">
        <div className="projects-toolbar-head">
          <div>
            <span>
              <Filter size={15} />
              ตัวกรองและการค้นหา
            </span>
            <h2>รายการโครงการทั้งหมด</h2>
            <p>แสดง {resultStart}-{resultEnd} จาก {total} รายการ {activeFilters ? `· ใช้ตัวกรอง ${activeFilters} รายการ` : ""}</p>
          </div>
          <span className="projects-page-size-pill">10 รายการ/หน้า</span>
        </div>

        <form className="projects-filter-form">
          <label className="projects-search-field">
            <Search size={17} />
            <input name="q" defaultValue={q} placeholder="ค้นหารหัส ชื่อโครงการ ลูกค้า ผู้ติดต่อ เบอร์โทร ที่อยู่ หรือจังหวัด" />
          </label>
          <select name="status" defaultValue={status ?? ""} aria-label="สถานะ">
            <option value="">ทุกสถานะ</option>
            {projectStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select name="owner" defaultValue={owner ?? ""} aria-label="ผู้รับผิดชอบ">
            <option value="">ทุกผู้รับผิดชอบ</option>
            {owners.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {item.role}</option>
            ))}
          </select>
          <select name="location" defaultValue={location ?? ""} aria-label="พิกัด">
            <option value="">ทุกพิกัด</option>
            <option value="with">มีพิกัดแล้ว</option>
            <option value="missing">ยังไม่มีพิกัด</option>
          </select>
          <button className="button" type="submit">
            <Filter size={17} />
            ค้นหา
          </button>
        </form>
      </section>

      <section className="projects-table-card">
        <div className="projects-table-top">
          <div>
            <h2>ตารางจัดการโครงการ</h2>
            <p>กดดูเพื่อเปิดรายละเอียด แผนที่ สถานะ และประวัติการเช็คอิน</p>
          </div>
          <Link className="row-view-button" href="/projects/new">
            เพิ่มใหม่
            <Plus size={15} />
          </Link>
        </div>

        <div className="projects-table-wrap">
          <table className="projects-management-table">
            <thead>
              <tr>
                <th>โครงการ</th>
                <th>ลูกค้า/ผู้ติดต่อ</th>
                <th>สถานะ</th>
                <th>ผู้รับผิดชอบ</th>
                <th>พิกัด</th>
                <th>อัปเดตล่าสุด</th>
                <th>ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const projectStatus = project.status as ProjectStatus;
                const hasLocation = project.latitude !== null && project.longitude !== null;
                const responsibleName = project.owner?.name ?? project.createdBy.name;

                return (
                  <tr key={project.id}>
                    <td className="project-name-cell">
                      <div className="project-code-row">
                        <span className="project-code">{project.code}</span>
                        <span className="project-checkin-count">{project._count.checkIns} เช็คอิน</span>
                      </div>
                      <strong>{project.name}</strong>
                      <p>{project.address}</p>
                    </td>
                    <td>
                      <strong>{project.customerName}</strong>
                      <div className="projects-muted-line">
                        {project.contactName || "ไม่ระบุผู้ติดต่อ"}
                        {project.contactPhone ? ` · ${project.contactPhone}` : ""}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getProjectStatusTone(projectStatus)}`}>
                        {projectStatusLabels[projectStatus]}
                      </span>
                    </td>
                    <td>
                      <span className="projects-owner-pill">
                        <UsersRound size={14} />
                        {responsibleName}
                      </span>
                    </td>
                    <td>
                      {hasLocation ? (
                        <span className="location-pill">
                          <MapPin size={14} />
                          {project.province || "มีพิกัด"}
                        </span>
                      ) : (
                        <span className="location-pill missing">
                          <MapPinOff size={14} />
                          รอพิกัด
                        </span>
                      )}
                    </td>
                    <td className="projects-date-cell">{formatDateTime(project.updatedAt)}</td>
                    <td>
                      <Link className="row-view-button" href={`/projects/${project.id}`}>
                        ดู
                        <ArrowRight size={15} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="projects-mobile-list">
          {projects.map((project) => {
            const projectStatus = project.status as ProjectStatus;
            const hasLocation = project.latitude !== null && project.longitude !== null;

            return (
              <article className="projects-mobile-card" key={project.id}>
                <div className="project-code-row">
                  <span className="project-code">{project.code}</span>
                  <span className={`badge ${getProjectStatusTone(projectStatus)}`}>
                    {projectStatusLabels[projectStatus]}
                  </span>
                </div>
                <h3>{project.name}</h3>
                <p>{project.customerName}</p>
                <div className="projects-mobile-meta">
                  <span>{project.owner?.name ?? project.createdBy.name}</span>
                  <span>{hasLocation ? project.province || "มีพิกัด" : "รอพิกัด"}</span>
                </div>
                <Link className="row-view-button" href={`/projects/${project.id}`}>
                  ดูรายละเอียด
                  <ArrowRight size={15} />
                </Link>
              </article>
            );
          })}
        </div>

        {projects.length === 0 ? (
          <div className="empty">
            ไม่พบโครงการตามตัวกรอง ลองล้างตัวกรองหรือเพิ่มหน้างานใหม่
          </div>
        ) : null}

        <div className="projects-pagination">
          <Link
            className={`projects-page-link ${safeCurrentPage <= 1 ? "disabled" : ""}`}
            href={
              safeCurrentPage <= 1
                ? buildProjectsHref(basePath, params, { page: undefined })
                : buildProjectsHref(basePath, params, { page: safeCurrentPage - 1 === 1 ? undefined : String(safeCurrentPage - 1) })
            }
            aria-disabled={safeCurrentPage <= 1}
          >
            <ArrowLeft size={15} />
            ก่อนหน้า
          </Link>

          <div className="projects-page-numbers">
            {pageNumbers.map((page) => (
              <Link
                key={page}
                className={`projects-page-number ${page === safeCurrentPage ? "active" : ""}`}
                href={buildProjectsHref(basePath, params, { page: page === 1 ? undefined : String(page) })}
              >
                {page}
              </Link>
            ))}
          </div>

          <Link
            className={`projects-page-link ${safeCurrentPage >= totalPages ? "disabled" : ""}`}
            href={
              safeCurrentPage >= totalPages
                ? buildProjectsHref(basePath, params, { page: totalPages === 1 ? undefined : String(totalPages) })
                : buildProjectsHref(basePath, params, { page: String(safeCurrentPage + 1) })
            }
            aria-disabled={safeCurrentPage >= totalPages}
          >
            ถัดไป
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
