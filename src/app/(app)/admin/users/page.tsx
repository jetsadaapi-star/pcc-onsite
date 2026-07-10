import { Filter, RotateCcw, Search, ShieldCheck, UserCheck, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminUsersManagementClient, type AdminUserRow } from "@/components/admin-users-management-client";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

type AdminUsersSearchParams = {
  q?: string;
  role?: string;
  status?: string;
  page?: string;
};

const PAGE_SIZE = 10;
const roles = ["ADMIN", "EMPLOYEE", "SALES", "ENGINEER"];
const roleLabels: Record<string, string> = {
  ADMIN: "แอดมิน",
  EMPLOYEE: "พนักงาน",
  SALES: "ผู้แทนขาย",
  ENGINEER: "วิศวกร"
};

function clean(value?: string | null) {
  const text = value?.trim();
  return text || undefined;
}

function parsePage(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function buildHref(params: AdminUsersSearchParams, patch: Partial<AdminUsersSearchParams>) {
  const next = new URLSearchParams();
  const merged = { ...params, ...patch };

  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }

  const query = next.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

function pageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<AdminUsersSearchParams>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const q = clean(params.q);
  const role = clean(params.role);
  const status = clean(params.status);
  const currentPage = parsePage(params.page);

  const where: Prisma.UserWhereInput = {};
  const and: Prisma.UserWhereInput[] = [];

  if (role && roles.includes(role)) where.role = role as Prisma.EnumRoleFilter["equals"];
  if (status === "active") where.active = true;
  if (status === "inactive") where.active = false;

  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } }
      ]
    });
  }

  if (and.length) where.AND = and;

  const [users, total, totalUsers, activeUsers, roleGroups] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        phone: true,
        lineUserId: true,
        checkoutReminderEnabled: true,
        profilePhotoUrl: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            checkIns: true,
            createdProjects: true,
            vehicles: true,
            travelClaims: true
          }
        }
      }
    }),
    prisma.user.count({ where }),
    prisma.user.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.user.groupBy({ by: ["role"], _count: true })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total > 0 && currentPage > totalPages) {
    redirect(buildHref(params, { page: totalPages === 1 ? undefined : String(totalPages) }));
  }

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const resultStart = total === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const resultEnd = Math.min(total, resultStart + users.length - 1);
  const activeFilterCount = [q, role, status].filter(Boolean).length;
  const fieldUsers = roleGroups
    .filter((item) => item.role !== "ADMIN")
    .reduce((sum, item) => sum + item._count, 0);

  const rows: AdminUserRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    phone: user.phone,
    lineUserId: user.lineUserId,
    checkoutReminderEnabled: user.checkoutReminderEnabled,
    profilePhotoUrl: user.profilePhotoUrl,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    counts: {
      checkIns: user._count.checkIns,
      createdProjects: user._count.createdProjects,
      vehicles: user._count.vehicles,
      travelClaims: user._count.travelClaims
    }
  }));

  return (
    <div className="content-stack admin-users-page">
      <section className="admin-users-hero">
        <div>
          <span className="hero-label">
            <UsersRound size={15} />
            User Management
          </span>
          <h1>จัดการผู้ใช้งาน</h1>
          <p>ดูแลบัญชี สิทธิ์การใช้งาน บทบาททีมภาคสนาม และสถานะผู้ใช้จากหน้าจัดการเดียว</p>
        </div>
        <div className="admin-users-hero-badges">
          <span><ShieldCheck size={15} /> {roleGroups.find((item) => item.role === "ADMIN")?._count ?? 0} แอดมิน</span>
          <span><UserCheck size={15} /> {activeUsers} ใช้งานอยู่</span>
        </div>
      </section>

      <section className="admin-users-summary">
        <div>
          <span><UsersRound size={16} /> ผู้ใช้ทั้งหมด</span>
          <strong>{totalUsers}</strong>
        </div>
        <div>
          <span><UserCheck size={16} /> เปิดใช้งาน</span>
          <strong>{activeUsers}</strong>
        </div>
        <div>
          <span><UserRound size={16} /> ทีมภาคสนาม</span>
          <strong>{fieldUsers}</strong>
        </div>
        <div>
          <span><ShieldCheck size={16} /> บทบาท</span>
          <strong>{roleGroups.length}</strong>
        </div>
      </section>

      <section className="admin-users-filter-card">
        <div className="admin-users-card-head">
          <div>
            <span><Filter size={15} /> ตัวกรองผู้ใช้</span>
            <h2>ค้นหาและจำกัดผลลัพธ์</h2>
            <p>
              แสดง {resultStart}-{resultEnd} จาก {total} รายการ
              {activeFilterCount ? ` · ใช้ตัวกรอง ${activeFilterCount} รายการ` : ""}
            </p>
          </div>
          <span className="projects-page-size-pill">{PAGE_SIZE} รายการ/หน้า</span>
        </div>

        <form className="admin-users-filter-form">
          <label className="admin-users-search">
            <Search size={17} />
            <input name="q" defaultValue={q ?? ""} placeholder="ค้นหาชื่อ อีเมล แผนก หรือเบอร์โทร" />
          </label>
          <select name="role" defaultValue={role ?? ""} aria-label="กรองบทบาท">
            <option value="">ทุกบทบาท</option>
            {roles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}
          </select>
          <select name="status" defaultValue={status ?? ""} aria-label="กรองสถานะ">
            <option value="">ทุกสถานะ</option>
            <option value="active">ใช้งานอยู่</option>
            <option value="inactive">ปิดใช้งาน</option>
          </select>
          <button className="button" type="submit">
            <Filter size={17} />
            กรองข้อมูล
          </button>
          <Link className="button secondary" href="/admin/users">
            <RotateCcw size={16} />
            ล้างตัวกรอง
          </Link>
        </form>
      </section>

      <section className="admin-users-table-card">
        <AdminUsersManagementClient users={rows} currentAdminId={admin.id} />

        {totalPages > 1 ? (
          <div className="admin-users-pagination">
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
        ) : null}
      </section>
    </div>
  );
}
