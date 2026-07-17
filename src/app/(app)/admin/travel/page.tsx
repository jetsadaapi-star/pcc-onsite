import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Filter,
  Fuel,
  Gauge,
  ReceiptText,
  Route,
  Search,
  Settings2,
  Trash2,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionFeedbackForm } from "@/components/action-feedback-form";
import { TravelRateModal } from "@/components/travel-rate-modal";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import type { Prisma } from "@/generated/prisma/client";
import { deleteTravelClaimAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { bangkokDateRange } from "@/lib/bangkok-time";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { reviewTravelClaimFormAction } from "@/lib/form-actions";
import { claimStatusLabels, claimTone, roleLabels } from "@/lib/labels";

type AdminTravelSearchParams = {
  q?: string;
  status?: string;
  userId?: string;
  distanceStatus?: string;
  from?: string;
  to?: string;
  page?: string;
};

const PAGE_SIZE = 15;
const claimStatuses = Object.keys(claimStatusLabels);
const distanceStatusLabels: Record<string, string> = {
  CALCULATED: "คำนวณแล้ว",
  PENDING_REVIEW: "รอตรวจระยะทาง",
  MANUAL: "กำหนดเอง"
};

function clean(value?: string | null) {
  const text = value?.trim();
  return text || undefined;
}

function parsePage(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function dateRangeFilter(from?: string, to?: string) {
  return bangkokDateRange(from, to) as Prisma.DateTimeFilter | undefined;
}

function buildHref(params: AdminTravelSearchParams, patch: Partial<AdminTravelSearchParams>) {
  const next = new URLSearchParams();
  const merged = { ...params, ...patch };

  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }

  const query = next.toString();
  return query ? `/admin/travel?${query}` : "/admin/travel";
}

function pageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function TravelReviewActions({
  claim,
  compact = false
}: {
  claim: { id: string; status: string; totalAmount: number | { toString(): string }; adminNote: string | null };
  compact?: boolean;
}) {
  return (
    <div className={compact ? "admin-travel-actions compact" : "admin-travel-actions"}>
      <div className="admin-travel-quick-actions">
        {claim.status === "PENDING_REVIEW" ? (
          <>
            <ActionFeedbackForm action={reviewTravelClaimFormAction}>
              <input type="hidden" name="id" value={claim.id} />
              <input type="hidden" name="status" value="APPROVED" />
              <button className="admin-travel-action approve" type="submit">
                <CheckCircle2 size={14} />
                อนุมัติ
              </button>
            </ActionFeedbackForm>
            <ActionFeedbackForm action={reviewTravelClaimFormAction}>
              <input type="hidden" name="id" value={claim.id} />
              <input type="hidden" name="status" value="REJECTED" />
              <button className="admin-travel-action reject" type="submit">
                <AlertTriangle size={14} />
                ปฏิเสธ
              </button>
            </ActionFeedbackForm>
          </>
        ) : null}
        {claim.status === "APPROVED" ? (
          <ActionFeedbackForm action={reviewTravelClaimFormAction}>
            <input type="hidden" name="id" value={claim.id} />
            <input type="hidden" name="status" value="PAID" />
            <button className="admin-travel-action paid" type="submit">
              <CircleDollarSign size={14} />
              จ่ายแล้ว
            </button>
          </ActionFeedbackForm>
        ) : null}
      </div>

      {claim.status === "PENDING_REVIEW" ? <details className="admin-travel-adjust-panel">
        <summary>
          <Settings2 size={14} />
          ปรับยอด/หมายเหตุ
        </summary>
        <ActionFeedbackForm action={reviewTravelClaimFormAction} className="admin-travel-adjust-form">
          <input type="hidden" name="id" value={claim.id} />
          <select className="select" name="status" defaultValue={claim.status === "PENDING_REVIEW" ? "APPROVED" : claim.status}>
            <option value="APPROVED">อนุมัติ</option>
            <option value="REJECTED">ปฏิเสธ</option>
          </select>
          <input className="input" name="overrideTotalAmount" type="number" min="0" step="0.01" placeholder={`ยอดปัจจุบัน ${formatMoney(claim.totalAmount)}`} />
          <input className="input" name="overrideReason" placeholder="เหตุผลเมื่อปรับยอด" />
          <input className="input" name="adminNote" placeholder="หมายเหตุแอดมิน" defaultValue={claim.adminNote ?? ""} />
          <button className="button secondary" type="submit">บันทึกรายละเอียด</button>
        </ActionFeedbackForm>
      </details> : null}
      {claim.status !== "APPROVED" && claim.status !== "PAID" ? (
        <ConfirmActionForm action={deleteTravelClaimAction} fields={{ id: claim.id }} message="ยืนยันลบรายการเบิกเดินทางนี้ใช่หรือไม่?">
          <button className="admin-travel-action reject" type="submit"><Trash2 size={14} /> ลบรายการ</button>
        </ConfirmActionForm>
      ) : null}
    </div>
  );
}

export default async function AdminTravelPage({
  searchParams
}: {
  searchParams: Promise<AdminTravelSearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = clean(params.q);
  const status = clean(params.status);
  const userId = clean(params.userId);
  const distanceStatus = clean(params.distanceStatus);
  const currentPage = parsePage(params.page);
  const submittedAt = dateRangeFilter(params.from, params.to);

  const where: Prisma.TravelClaimWhereInput = {};
  const and: Prisma.TravelClaimWhereInput[] = [];

  if (status && claimStatuses.includes(status)) where.status = status as Prisma.EnumClaimStatusFilter["equals"];
  if (userId) where.userId = userId;
  if (submittedAt) where.submittedAt = submittedAt;
  if (distanceStatus && distanceStatus in distanceStatusLabels) {
    where.travelLeg = { is: { distanceStatus: distanceStatus as Prisma.EnumDistanceStatusFilter["equals"] } };
  }

  if (q) {
    and.push({
      OR: [
        { user: { is: { name: { contains: q, mode: "insensitive" } } } },
        { user: { is: { email: { contains: q, mode: "insensitive" } } } },
        { vehicleName: { contains: q, mode: "insensitive" } },
        { vehicleLicensePlate: { contains: q, mode: "insensitive" } },
        { adminNote: { contains: q, mode: "insensitive" } },
        { overrideReason: { contains: q, mode: "insensitive" } },
        { travelLeg: { is: { fromProject: { is: { name: { contains: q, mode: "insensitive" } } } } } },
        { travelLeg: { is: { toProject: { is: { name: { contains: q, mode: "insensitive" } } } } } },
        { travelLeg: { is: { toProject: { is: { customerName: { contains: q, mode: "insensitive" } } } } } },
        { travelLeg: { is: { destinationLabel: { contains: q, mode: "insensitive" } } } }
      ]
    });
  }

  if (and.length) where.AND = and;

  const [claims, total, summary, pendingAll, distancePendingAll, users, rate] = await Promise.all([
    prisma.travelClaim.findMany({
      where,
      orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        distanceKm: true,
        ratePerKm: true,
        mileageAmount: true,
        kmPerLiter: true,
        fuelPricePerLiter: true,
        fuelEstimate: true,
        odometerDistanceKm: true,
        distanceVariancePercent: true,
        tollAmount: true,
        parkingAmount: true,
        otherAmount: true,
        totalAmount: true,
        vehicleName: true,
        vehicleLicensePlate: true,
        adminNote: true,
        overrideReason: true,
        submittedAt: true,
        reviewedAt: true,
        paidAt: true,
        user: { select: { id: true, name: true, email: true, role: true } },
        vehicle: { select: { name: true, licensePlate: true } },
        travelLeg: {
          select: {
            routeProvider: true,
            distanceStatus: true,
            destinationLabel: true,
            fromProject: { select: { name: true } },
            toProject: { select: { name: true, customerName: true } }
          }
        }
      }
    }),
    prisma.travelClaim.count({ where }),
    prisma.travelClaim.aggregate({
      where,
      _count: true,
      _sum: {
        totalAmount: true,
        fuelEstimate: true,
        mileageAmount: true,
        distanceKm: true
      }
    }),
    prisma.travelClaim.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.travelClaim.count({ where: { travelLeg: { is: { distanceStatus: "PENDING_REVIEW" } } } }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true }
    }),
    prisma.reimbursementRate.findFirst({ where: { active: true }, orderBy: { activeFrom: "desc" } })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total > 0 && currentPage > totalPages) {
    redirect(buildHref(params, { page: totalPages === 1 ? undefined : String(totalPages) }));
  }

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const resultStart = total === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const resultEnd = Math.min(total, resultStart + claims.length - 1);
  const activeFilterCount = [q, status, userId, distanceStatus, params.from, params.to].filter(Boolean).length;

  return (
    <div className="content-stack admin-travel-page">
      <section className="admin-travel-hero">
        <div>
          <span className="hero-label">
            <ReceiptText size={15} />
            Travel Approval
          </span>
          <h1>จัดการค่าเดินทาง</h1>
          <p>ตรวจระยะทาง ค่าน้ำมัน ค่าสึกหรอ ยอดรวม และอนุมัติรายการเบิกของทุกทีมจากหน้าจัดการเดียว</p>
        </div>
        <div className="admin-travel-hero-actions">
          <Link className="button secondary" href="/reports">
            ดูรายงานทั้งระบบ
          </Link>
          <span className="badge warning">{pendingAll} รอตรวจ</span>
        </div>
      </section>

      <section className="admin-travel-summary">
        <div>
          <span><CircleDollarSign size={16} /> ยอดรวมตามตัวกรอง</span>
          <strong>{formatMoney(summary._sum.totalAmount ?? 0)}</strong>
        </div>
        <div>
          <span><Route size={16} /> ระยะทางรวม</span>
          <strong>{formatNumber(summary._sum.distanceKm ?? 0, 1)} กม.</strong>
        </div>
        <div>
          <span><Fuel size={16} /> ค่าน้ำมัน</span>
          <strong>{formatMoney(summary._sum.fuelEstimate ?? 0)}</strong>
        </div>
        <div>
          <span><AlertTriangle size={16} /> ระยะทางรอตรวจ</span>
          <strong>{distancePendingAll}</strong>
        </div>
      </section>

      <section className="admin-travel-layout">
        <div className="admin-travel-main">
          <section className="admin-travel-filter-card">
            <div className="admin-travel-card-head">
              <div>
                <span><Filter size={15} /> ตัวกรองรายการเบิก</span>
                <h2>ค้นหาและจำกัดผลลัพธ์</h2>
                <p>
                  แสดง {resultStart}-{resultEnd} จาก {total} รายการ
                  {activeFilterCount ? ` · ใช้ตัวกรอง ${activeFilterCount} รายการ` : ""}
                </p>
              </div>
              <span className="projects-page-size-pill">{PAGE_SIZE} รายการ/หน้า</span>
            </div>

            <form className="admin-travel-filter-form">
              <label className="admin-travel-search">
                <Search size={17} />
                <input name="q" defaultValue={q ?? ""} placeholder="ค้นหาพนักงาน อีเมล รถ ทะเบียน โครงการ ลูกค้า หรือหมายเหตุ" />
              </label>
              <div className="field compact">
                <label htmlFor="travel-from"><CalendarDays size={14} /> จากวันที่</label>
                <input className="input" id="travel-from" name="from" type="date" defaultValue={params.from ?? ""} />
              </div>
              <div className="field compact">
                <label htmlFor="travel-to"><CalendarDays size={14} /> ถึงวันที่</label>
                <input className="input" id="travel-to" name="to" type="date" defaultValue={params.to ?? ""} />
              </div>
              <select name="status" defaultValue={status ?? ""} aria-label="สถานะเคลม">
                <option value="">ทุกสถานะ</option>
                {Object.entries(claimStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select name="distanceStatus" defaultValue={distanceStatus ?? ""} aria-label="สถานะระยะทาง">
                <option value="">ทุกสถานะระยะทาง</option>
                {Object.entries(distanceStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select name="userId" defaultValue={userId ?? ""} aria-label="ผู้ใช้">
                <option value="">ทุกผู้ใช้</option>
                {users.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {roleLabels[item.role]}</option>
                ))}
              </select>
              <button className="button" type="submit">
                <Filter size={17} />
                กรองข้อมูล
              </button>
            </form>
          </section>

          <section className="admin-travel-claims-card">
            <div className="admin-travel-card-head">
              <div>
                <span><ClipboardCheck size={15} /> รายการรอตรวจและอนุมัติ</span>
                <h2>รายการเบิกเดินทาง</h2>
                <p>ตรวจยอด ค่าคำนวณ ระยะทาง และบันทึกผลการอนุมัติในแต่ละรายการ</p>
              </div>
            </div>

            <div className="admin-travel-table-wrap">
              <table className="admin-travel-table">
                <thead>
                  <tr>
                    <th>วันที่/ผู้ใช้</th>
                    <th>เส้นทาง</th>
                    <th>รถ/ระยะทาง</th>
                    <th>ยอดคำนวณ</th>
                    <th>สถานะ</th>
                    <th>ตรวจรายการ</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr key={claim.id}>
                      <td>
                        <strong>{formatDateTime(claim.submittedAt)}</strong>
                        <span className="admin-travel-user">
                          <UserRound size={14} />
                          {claim.user.name}
                        </span>
                        <div className="muted">{roleLabels[claim.user.role]} · {claim.user.email}</div>
                      </td>
                      <td className="admin-travel-route">
                        <strong>{claim.travelLeg.fromProject?.name ?? "จุดก่อนหน้า"}</strong>
                        <span>→ {claim.travelLeg.toProject?.name ?? claim.travelLeg.destinationLabel ?? "สำนักงาน"}</span>
                        <small>{claim.travelLeg.toProject?.customerName ?? "ปลายทางสำนักงาน"}</small>
                        <em className={claim.travelLeg.distanceStatus === "PENDING_REVIEW" ? "warning" : ""}>
                          {claim.travelLeg.routeProvider} · {distanceStatusLabels[claim.travelLeg.distanceStatus]}
                        </em>
                      </td>
                      <td>
                        <strong>{claim.vehicleName ?? claim.vehicle?.name ?? "ใช้ค่าเริ่มต้น"}</strong>
                        <div className="muted">{claim.vehicleLicensePlate ?? claim.vehicle?.licensePlate ?? "ไม่ระบุทะเบียน"}</div>
                        <span className="admin-travel-pill">
                          <Route size={14} />
                          {formatNumber(claim.distanceKm, 1)} กม.
                        </span>
                        <span className="admin-travel-pill subtle">
                          <Gauge size={14} />
                          {formatNumber(claim.kmPerLiter, 1)} กม./ลิตร
                        </span>
                        {claim.distanceVariancePercent !== null ? (
                          <div className="muted">ต่างจากเข็มไมล์ {formatNumber(claim.distanceVariancePercent, 1)}%</div>
                        ) : null}
                      </td>
                      <td>
                        <strong>{formatMoney(claim.totalAmount)}</strong>
                        <div className="muted">น้ำมัน {formatMoney(claim.fuelEstimate)}</div>
                        <div className="muted">สึกหรอ {formatMoney(claim.mileageAmount)}</div>
                        {claim.overrideReason ? <div className="admin-travel-override">Override: {claim.overrideReason}</div> : null}
                      </td>
                      <td>
                        <span className={`badge ${claimTone(claim.status)}`}>{claimStatusLabels[claim.status]}</span>
                        {claim.reviewedAt ? <div className="muted">ตรวจ {formatDateTime(claim.reviewedAt)}</div> : null}
                        {claim.paidAt ? <div className="muted">จ่าย {formatDateTime(claim.paidAt)}</div> : null}
                      </td>
                      <td>
                        <TravelReviewActions claim={claim} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-travel-mobile-list">
              {claims.map((claim) => (
                <article className="admin-travel-mobile-card" key={claim.id}>
                  <div className="admin-travel-mobile-head">
                    <div>
                      <strong>{formatMoney(claim.totalAmount)}</strong>
                      <span>{claim.user.name} · {formatDateTime(claim.submittedAt)}</span>
                    </div>
                    <span className={`badge ${claimTone(claim.status)}`}>{claimStatusLabels[claim.status]}</span>
                  </div>
                  <div className="admin-travel-route">
                    <strong>{claim.travelLeg.fromProject?.name ?? "จุดก่อนหน้า"}</strong>
                    <span>→ {claim.travelLeg.toProject?.name ?? claim.travelLeg.destinationLabel ?? "สำนักงาน"}</span>
                    <em className={claim.travelLeg.distanceStatus === "PENDING_REVIEW" ? "warning" : ""}>
                      {formatNumber(claim.distanceKm, 1)} กม. · {distanceStatusLabels[claim.travelLeg.distanceStatus]}
                    </em>
                  </div>
                  <TravelReviewActions claim={claim} compact />
                </article>
              ))}
            </div>

            {claims.length === 0 ? <div className="empty">ไม่พบรายการเบิกเดินทางตามตัวกรอง</div> : null}

            <div className="admin-travel-pagination">
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

        <aside className="admin-travel-rate-card">
          <div className="admin-travel-card-head compact">
            <div>
              <span><Settings2 size={15} /> อัตรากลาง</span>
              <h2>ตั้งค่าเรตเดินทาง</h2>
              <p>ใช้เป็นค่าเริ่มต้นเมื่อรถยังไม่มีอัตราสิ้นเปลืองเฉพาะคัน</p>
            </div>
          </div>
          <div className="admin-travel-rate-summary">
            <div>
              <span>ค่าสึกหรอ/กม.</span>
              <strong>{formatMoney(rate?.ratePerKm ?? 1.5)}</strong>
            </div>
            <div>
              <span>กม./ลิตร เริ่มต้น</span>
              <strong>{formatNumber(rate?.kmPerLiter ?? 12, 1)}</strong>
            </div>
            <div>
              <span>ราคาน้ำมัน/ลิตร</span>
              <strong>{formatMoney(rate?.fuelPricePerLiter ?? 36)}</strong>
            </div>
          </div>
          <div className="admin-travel-rate-controls">
            <TravelRateModal
              rate={rate ? {
                ratePerKm: Number(rate.ratePerKm),
                kmPerLiter: rate.kmPerLiter,
                fuelPricePerLiter: Number(rate.fuelPricePerLiter)
              } : null}
            />
          </div>
          <div className="admin-travel-rate-note">
            ระบบจะใช้ กม./ลิตร ของรถพนักงานก่อน หากรถยังไม่ผ่านอนุมัติหรือไม่มีค่า ระบบจึงใช้ค่าเริ่มต้นนี้
          </div>
        </aside>
      </section>
    </div>
  );
}
