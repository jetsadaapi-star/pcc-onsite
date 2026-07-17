import { CalendarDays, Download, Filter, Gauge, ReceiptText, RotateCcw, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { getFuelPerformanceRows } from "@/lib/fuel-performance";
import { claimStatusLabels, claimTone } from "@/lib/labels";
import { buildBangkokReportDateFilter, buildReportQuery, buildTravelClaimWhere, normalizeReportFilters, reportStatusOptions, type ReportFilterInput } from "@/lib/report-filters";

type ReportsSearchParams = ReportFilterInput;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<ReportsSearchParams> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const filters = normalizeReportFilters(params);
  const where = buildTravelClaimWhere(filters, user);
  const query = buildReportQuery(filters);

  const fueledAt = buildBangkokReportDateFilter(filters) as { gte?: Date; lt?: Date } | undefined;

  const [claims, summary, users, vehicles, fuelPerformanceRows, openAnomalies] = await Promise.all([
    prisma.travelClaim.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, role: true } },
        vehicle: { select: { id: true, name: true, licensePlate: true } },
        travelLeg: {
          select: {
            destinationLabel: true,
            fromProject: { select: { name: true } },
            toProject: { select: { name: true } }
          }
        }
      },
      take: 100
    }),
    prisma.travelClaim.aggregate({
      where,
      _count: true,
      _sum: {
        totalAmount: true,
        fuelEstimate: true,
        mileageAmount: true,
        distanceKm: true,
        tollAmount: true,
        parkingAmount: true,
        otherAmount: true
      }
    }),
    user.role === "ADMIN"
      ? prisma.user.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, role: true }
        })
      : Promise.resolve([]),
    prisma.vehicle.findMany({
      where: user.role === "ADMIN" ? { active: true } : { userId: user.id, active: true },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      select: { id: true, name: true, licensePlate: true, user: { select: { name: true } } }
    }),
    getFuelPerformanceRows({
      userId: user.role === "ADMIN" ? undefined : user.id,
      vehicleId: filters.vehicleId,
      from: fueledAt?.gte,
      to: fueledAt?.lt
    }),
    prisma.anomalyRecord.count({ where: { status: "OPEN", ...(user.role === "ADMIN" ? {} : { userId: user.id }) } })
  ]);

  const totalAmount = Number(summary._sum.totalAmount ?? 0);
  const fuelTotal = Number(summary._sum.fuelEstimate ?? 0);
  const mileageTotal = Number(summary._sum.mileageAmount ?? 0);
  const distanceTotal = summary._sum.distanceKm ?? 0;
  const extraTotal = Number(summary._sum.tollAmount ?? 0) + Number(summary._sum.parkingAmount ?? 0) + Number(summary._sum.otherAmount ?? 0);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const isAdmin = user.role === "ADMIN";
  const monthLabel = filters.month
    ? new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(`${filters.month}-01T00:00:00`))
    : "ทุกช่วงเวลา";
  const reportTitle = isAdmin ? "รายงานค่าเดินทางทั้งระบบ" : "รายงานค่าเดินทางของฉัน";
  const reportCopy = isAdmin
    ? "วิเคราะห์ค่าเดินทางของทุกทีม เลือกผู้ใช้ รถ สถานะ ช่วงเวลา และส่งออกข้อมูลตามตัวกรองเป็น CSV ได้ทันที"
    : "เลือกช่วงเวลา รถ สถานะ หรือคำค้นหา แล้วส่งออกข้อมูลค่าเดินทางของคุณตามตัวกรองเป็น CSV ได้ทันที";

  const vehiclePerformance = fuelPerformanceRows.map((row) => {
    const actualKmPerLiter = row.liters > 0 ? row.distanceKm / row.liters : null;
    const expected = row.expectedKmPerLiter;
    const status = actualKmPerLiter && expected
      ? actualKmPerLiter < expected * 0.55
        ? "ผิดปกติ"
        : actualKmPerLiter > expected * 1.8
          ? "สูงผิดปกติ"
          : "ปกติ"
      : "ข้อมูลไม่พอ";
    return {
      vehicle: { id: row.vehicleId, name: row.vehicleName, licensePlate: row.licensePlate, kmPerLiter: expected },
      owner: row.owner,
      fillCount: row.fillCount,
      totalAmount: row.totalAmount,
      distanceKm: row.distanceKm,
      liters: row.liters,
      actualKmPerLiter,
      status
    };
  });

  return (
    <div className="content-stack reports-page">
      <section className="reports-hero">
        <div className="reports-hero-copy">
          <span className="hero-label">
            <ReceiptText size={15} />
            {isAdmin ? "System Report" : "My Travel Report"}
          </span>
          <h1>{reportTitle}</h1>
          <p>{reportCopy}</p>
        </div>
        <div className="reports-hero-actions">
          <Link className="button secondary" href="/reports">
            <RotateCcw size={17} />
            ล้างตัวกรอง
          </Link>
          <Link className="button secondary" href={`/reports/export${query}${query ? "&" : "?"}format=csv`}>
            <Download size={17} />
            CSV
          </Link>
          <Link className="button secondary" href={`/reports/export${query}${query ? "&" : "?"}format=excel`}>
            <Download size={17} />
            Excel
          </Link>
          <Link className="button" href={`/reports/export${query}${query ? "&" : "?"}format=pdf`}>
            <Download size={17} />
            PDF
          </Link>
        </div>
      </section>

      <section className="reports-summary-grid">
        <div>
          <span>รอบรายงาน</span>
          <strong>{monthLabel}</strong>
        </div>
        <div>
          <span>ยอดรวมตามตัวกรอง</span>
          <strong>{formatMoney(totalAmount)}</strong>
        </div>
        <div>
          <span>ระยะทางรวม</span>
          <strong>{formatNumber(distanceTotal, 1)} กม.</strong>
        </div>
        <div>
          <span>ค่าน้ำมัน</span>
          <strong>{formatMoney(fuelTotal)}</strong>
        </div>
        <div>
          <span>ค่าสึกหรอ</span>
          <strong>{formatMoney(mileageTotal)}</strong>
        </div>
        <div>
          <span>ค่าทางด่วน/อื่น ๆ</span>
          <strong>{formatMoney(extraTotal)}</strong>
        </div>
      </section>

      <section className="reports-filter-card">
        <div className="reports-card-head">
          <div>
            <span><Filter size={15} /> ตัวกรองรายงาน</span>
            <h2>{isAdmin ? "เลือกข้อมูลทั้งระบบที่ต้องการวิเคราะห์" : "เลือกข้อมูลที่ต้องการวิเคราะห์"}</h2>
            <p>{summary._count} รายการตามเงื่อนไขปัจจุบัน {activeFilterCount ? `· ใช้ตัวกรอง ${activeFilterCount} รายการ` : ""}</p>
          </div>
        </div>

        <form className="reports-filter-form">
          <label className="reports-search">
            <Search size={17} />
            <input name="q" defaultValue={filters.q ?? ""} placeholder="ค้นหาผู้ใช้ รถ ทะเบียน หรือชื่อโครงการ" />
          </label>
          <div className="field compact">
            <label htmlFor="reports-month"><CalendarDays size={14} /> เดือนบัญชี</label>
            <input id="reports-month" className="input" type="month" name="month" defaultValue={filters.month ?? ""} />
          </div>
          <div className="field compact">
            <label htmlFor="reports-from"><CalendarDays size={14} /> จากวันที่</label>
            <input id="reports-from" className="input" type="date" name="from" defaultValue={filters.from ?? ""} />
          </div>
          <div className="field compact">
            <label htmlFor="reports-to"><CalendarDays size={14} /> ถึงวันที่</label>
            <input id="reports-to" className="input" type="date" name="to" defaultValue={filters.to ?? ""} />
          </div>
          <select name="status" defaultValue={filters.status ?? ""} aria-label="สถานะ">
            <option value="">ทุกสถานะ</option>
            {reportStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          {user.role === "ADMIN" ? (
            <select name="userId" defaultValue={filters.userId ?? ""} aria-label="ผู้ใช้">
              <option value="">ทุกผู้ใช้</option>
              {users.map((item) => (
                <option key={item.id} value={item.id}>{item.name} · {item.role}</option>
              ))}
            </select>
          ) : null}
          <select name="vehicleId" defaultValue={filters.vehicleId ?? ""} aria-label="รถ">
            <option value="">รถทุกคัน</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name}{vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ""}{user.role === "ADMIN" ? ` · ${vehicle.user.name}` : ""}
              </option>
            ))}
          </select>
          <button className="button" type="submit">
            <Filter size={17} />
            ดูรายงาน
          </button>
        </form>
      </section>

      <section className="reports-table-card vehicle-performance-card">
        <div className="reports-card-head">
          <div>
            <span><Gauge size={15} /> Vehicle Performance</span>
            <h2>ประสิทธิภาพรถและค่าน้ำมัน</h2>
            <p>คำนวณ กม./ลิตรจริงจากบันทึกเติมน้ำมันและเลขไมล์ในช่วงตัวกรองปัจจุบัน · open anomalies {openAnomalies}</p>
          </div>
          <span className="projects-page-size-pill">{vehiclePerformance.length} คัน</span>
        </div>
        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>รถ</th>
                <th>ผู้ใช้</th>
                <th>เติมน้ำมัน</th>
                <th>ระยะเลขไมล์</th>
                <th>กม./ลิตรจริง</th>
                <th>ค่าน้ำมัน</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {vehiclePerformance.map((item) => (
                <tr key={item.vehicle.id}>
                  <td>
                    <strong>{item.vehicle.name}</strong>
                    <div className="muted">{item.vehicle.licensePlate ?? "ไม่ระบุทะเบียน"} · มาตรฐาน {item.vehicle.kmPerLiter ? formatNumber(item.vehicle.kmPerLiter, 1) : "-"} กม./ลิตร</div>
                  </td>
                  <td>{item.owner}</td>
                  <td>{item.fillCount} ครั้ง</td>
                  <td>{formatNumber(item.distanceKm, 1)} กม.</td>
                  <td>{item.actualKmPerLiter ? `${formatNumber(item.actualKmPerLiter, 1)} กม./ลิตร` : "-"}</td>
                  <td>{formatMoney(item.totalAmount)}</td>
                  <td><span className={`badge ${item.status === "ปกติ" ? "success" : item.status === "ข้อมูลไม่พอ" ? "muted" : "warning"}`}>{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {vehiclePerformance.length === 0 ? <div className="empty">ยังไม่มีข้อมูลเติมน้ำมันในช่วงที่เลือก</div> : null}
      </section>

      <section className="reports-table-card">
        <div className="reports-card-head">
          <div>
            <span><ReceiptText size={15} /> ผลลัพธ์รายงาน</span>
            <h2>รายการเบิกเดินทาง</h2>
            <p>แสดง 100 รายการล่าสุดจากตัวกรอง ส่งออก CSV เพื่อดูรายการทั้งหมด</p>
          </div>
          <span className="projects-page-size-pill">{claims.length} แถวบนหน้าจอ</span>
        </div>

        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ผู้ใช้</th>
                <th>เส้นทาง</th>
                <th>รถ/อัตราสิ้นเปลือง</th>
                <th>ระยะทาง</th>
                <th>ยอดคำนวณ</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr key={claim.id}>
                  <td>{formatDateTime(claim.submittedAt)}</td>
                  <td>
                    <span className="reports-user-pill">
                      <UsersRound size={14} />
                      {claim.user.name}
                    </span>
                  </td>
                  <td className="reports-route-cell">
                    <strong>{claim.travelLeg.fromProject?.name ?? "จุดก่อนหน้า"}</strong>
                    <span>→ {claim.travelLeg.toProject?.name ?? claim.travelLeg.destinationLabel ?? "สำนักงาน"}</span>
                  </td>
                  <td>
                    <strong>{claim.vehicleName ?? claim.vehicle?.name ?? "ใช้ค่าเริ่มต้น"}</strong>
                    <div className="muted">
                      {claim.vehicleLicensePlate ? `${claim.vehicleLicensePlate} · ` : ""}
                      {formatNumber(claim.kmPerLiter, 1)} กม./ลิตร
                    </div>
                  </td>
                  <td>
                    <span className="vehicle-soft-pill">
                      <Gauge size={14} />
                      {formatNumber(claim.distanceKm, 1)} กม.
                    </span>
                    {claim.odometerDistanceKm !== null ? (
                      <div className="muted">เข็มไมล์ {formatNumber(claim.odometerDistanceKm, 1)} กม.</div>
                    ) : null}
                  </td>
                  <td>
                    <strong>{formatMoney(claim.totalAmount)}</strong>
                    <div className="muted">
                      น้ำมัน {formatMoney(claim.fuelEstimate)} · สึกหรอ {formatMoney(claim.mileageAmount)}
                    </div>
                  </td>
                  <td><span className={`badge ${claimTone(claim.status)}`}>{claimStatusLabels[claim.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="reports-mobile-list">
          {claims.map((claim) => (
            <article className="reports-mobile-card" key={claim.id}>
              <div className="reports-mobile-head">
                <div>
                  <strong>{formatMoney(claim.totalAmount)}</strong>
                  <span>{formatDateTime(claim.submittedAt)}</span>
                </div>
                <span className={`badge ${claimTone(claim.status)}`}>{claimStatusLabels[claim.status]}</span>
              </div>
              <div className="reports-mobile-route">
                <strong>{claim.travelLeg.fromProject?.name ?? "จุดก่อนหน้า"}</strong>
                <span>→ {claim.travelLeg.toProject?.name ?? claim.travelLeg.destinationLabel ?? "สำนักงาน"}</span>
              </div>
              <div className="reports-mobile-meta">
                <span><UsersRound size={14} /> {claim.user.name}</span>
                <span><Gauge size={14} /> {formatNumber(claim.distanceKm, 1)} กม.</span>
              </div>
              <div className="reports-mobile-sub">
                {claim.vehicleName ?? claim.vehicle?.name ?? "ใช้ค่าเริ่มต้น"} · น้ำมัน {formatMoney(claim.fuelEstimate)} · สึกหรอ {formatMoney(claim.mileageAmount)}
              </div>
            </article>
          ))}
        </div>

        {claims.length === 0 ? <div className="empty">ไม่พบรายงานตามตัวกรอง</div> : null}
      </section>
    </div>
  );
}
