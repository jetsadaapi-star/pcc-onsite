import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Fuel,
  LogOut,
  MapPinned,
  Navigation,
  Plus,
  ReceiptText,
  Route,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { claimStatusLabels, claimTone, purposeLabels } from "@/lib/labels";
import { getProjectStatusTone, projectStatusLabels, type ProjectStatus } from "@/lib/project-status";

type TimelineItem = {
  id: string;
  at: Date;
  title: string;
  description: string;
  tone: "info" | "success" | "warning" | "danger" | "fuel";
};

function durationText(start: Date) {
  const minutes = Math.max(0, Math.round((Date.now() - start.getTime()) / 60000));
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ชม. ${rest} นาที` : `${hours} ชม.`;
}

function greeting(name: string) {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? "สวัสดีตอนเช้า" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
  return `${prefix} ${name}`;
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/admin");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    todayCheckIns,
    totalDistance,
    latestCheckIn,
    activeTrip,
    latestClaims,
    recentProjects,
    todayTrips,
    todayFuelLogs,
    todayCheckInRows,
    pendingClaims,
    activeProjectCount
  ] = await Promise.all([
    prisma.checkIn.count({
      where: { userId: user.id, checkedAt: { gte: todayStart } }
    }),
    prisma.travelLeg.aggregate({
      where: { userId: user.id },
      _sum: { distanceKm: true }
    }),
    prisma.checkIn.findFirst({
      where: { userId: user.id },
      orderBy: { checkedAt: "desc" },
      select: {
        id: true,
        checkedAt: true,
        checkedOutAt: true,
        purpose: true,
        project: { select: { id: true, name: true } }
      }
    }),
    prisma.tripSession.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        startedAt: true,
        originLabel: true,
        destinationType: true,
        destinationLabel: true,
        destinationProject: { select: { name: true } }
      }
    }),
    prisma.travelClaim.findMany({
      where: { userId: user.id },
      orderBy: { submittedAt: "desc" },
      take: 3,
      select: {
        id: true,
        status: true,
        totalAmount: true,
        submittedAt: true,
        travelLeg: {
          select: {
            destinationLabel: true,
            fromProject: { select: { name: true } },
            toProject: { select: { name: true } }
          }
        }
      }
    }),
    prisma.project.findMany({
      where: { OR: [{ ownerId: user.id }, { createdById: user.id }] },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true,
        code: true,
        name: true,
        customerName: true,
        status: true,
        updatedAt: true
      }
    }),
    prisma.tripSession.findMany({
      where: { userId: user.id, startedAt: { gte: todayStart } },
      orderBy: { startedAt: "asc" },
      take: 8,
      select: {
        id: true,
        startedAt: true,
        status: true,
        originLabel: true,
        destinationType: true,
        destinationLabel: true,
        destinationProject: { select: { name: true } }
      }
    }),
    prisma.fuelLog.findMany({
      where: { userId: user.id, fueledAt: { gte: todayStart } },
      orderBy: { fueledAt: "asc" },
      take: 6,
      select: {
        id: true,
        fueledAt: true,
        totalAmount: true,
        vehicle: { select: { name: true } }
      }
    }),
    prisma.checkIn.findMany({
      where: { userId: user.id, checkedAt: { gte: todayStart } },
      orderBy: { checkedAt: "asc" },
      take: 8,
      select: {
        id: true,
        checkedAt: true,
        checkedOutAt: true,
        project: { select: { name: true } }
      }
    }),
    prisma.travelClaim.count({
      where: { userId: user.id, status: "PENDING_REVIEW" }
    }),
    prisma.project.count({
      where: {
        OR: [{ ownerId: user.id }, { createdById: user.id }],
        status: { notIn: ["COMPLETED", "CLOSED_LOST", "CANCELLED"] }
      }
    })
  ]);

  const activeVisit = latestCheckIn && !latestCheckIn.checkedOutAt ? latestCheckIn : null;
  const activeTripDestinationLabel = activeTrip?.destinationType === "OFFICE"
    ? "บริษัท/สำนักงาน"
    : activeTrip?.destinationProject?.name ?? activeTrip?.destinationLabel ?? "ปลายทาง";
  // The warning intentionally reflects request time in this server-rendered page.
  // eslint-disable-next-line react-hooks/purity
  const checkoutWarning = activeVisit ? Date.now() - activeVisit.checkedAt.getTime() > 6 * 60 * 60 * 1000 : false;
  const totalDistanceKm = totalDistance._sum.distanceKm ?? 0;
  const claimTotal = latestClaims.reduce((sum, claim) => sum + Number(claim.totalAmount), 0);
  const mainActionLabel = activeVisit ? "เช็คเอาท์หน้างาน" : activeTrip ? "เช็คอินปลายทาง" : "เริ่มเดินทาง";
  const mainActionHelp = activeVisit
    ? "ปิดงานพร้อม GPS และสรุปงาน"
    : activeTrip
      ? `ถึง ${activeTripDestinationLabel} แล้วให้บันทึกงาน`
      : "เลือกต้นทาง ปลายทาง และเริ่มคำนวณระยะทาง";

  const timelineItems: TimelineItem[] = [
    ...todayTrips.map<TimelineItem>((trip) => ({
      id: `trip-${trip.id}`,
      at: trip.startedAt,
      title: trip.status === "CANCELLED" ? "ยกเลิกทริป" : trip.destinationType === "OFFICE" ? "เดินทางไปบริษัท" : "เริ่มเดินทาง",
      description: `${trip.originLabel ?? "จุดเริ่มต้น"} -> ${trip.destinationType === "OFFICE" ? "บริษัท/สำนักงาน" : trip.destinationProject?.name ?? trip.destinationLabel ?? "ปลายทาง"}`,
      tone: trip.status === "CANCELLED" ? "danger" : trip.status === "COMPLETED" ? "success" : "info"
    })),
    ...todayCheckInRows.flatMap<TimelineItem>((checkIn) => [
      {
        id: `checkin-${checkIn.id}`,
        at: checkIn.checkedAt,
        title: "เช็คอินหน้างาน",
        description: checkIn.project.name,
        tone: checkIn.checkedOutAt ? "success" : "warning"
      },
      ...(checkIn.checkedOutAt ? [{
        id: `checkout-${checkIn.id}`,
        at: checkIn.checkedOutAt,
        title: "เช็คเอาท์หน้างาน",
        description: checkIn.project.name,
        tone: "success" as const
      }] : [])
    ]),
    ...todayFuelLogs.map<TimelineItem>((log) => ({
      id: `fuel-${log.id}`,
      at: log.fueledAt,
      title: "เติมน้ำมัน",
      description: `${log.vehicle.name} · ${formatMoney(log.totalAmount)}`,
      tone: "fuel"
    }))
  ].sort((a, b) => a.at.getTime() - b.at.getTime()).slice(-7);

  return (
    <div className="mobile-home dashboard-home">
      <section className="dashboard-focus">
        <div className="dashboard-focus-copy">
          <span className={activeVisit ? "mobile-home-eyebrow active" : "mobile-home-eyebrow"}>
            {activeVisit ? "กำลังเปิดงาน" : activeTrip ? "กำลังเดินทาง" : greeting(user.name)}
          </span>
          <h1>{activeVisit ? "อย่าลืมเช็คเอาท์ก่อนออกจากหน้างาน" : activeTrip ? `กำลังไป ${activeTripDestinationLabel}` : "พร้อมออกหน้างานวันนี้"}</h1>
          <p>
            {activeVisit
              ? `คุณอยู่ที่ ${activeVisit.project.name} มาแล้ว ${durationText(activeVisit.checkedAt)}`
              : activeTrip
                ? `เริ่มจาก ${activeTrip.originLabel ?? "จุดเริ่มต้น"} เมื่อ ${formatDateTime(activeTrip.startedAt)}`
                : "เริ่มเดินทาง เติมน้ำมัน หรือเพิ่มหน้างานใหม่ได้จากปุ่มหลักด้านล่าง"}
          </p>
        </div>
        <div className="dashboard-focus-status">
          {checkoutWarning ? (
            <span className="danger"><AlertTriangle size={16} /> เปิดงานนาน</span>
          ) : activeVisit || activeTrip ? (
            <span className="active"><Navigation size={16} /> กำลังทำงาน</span>
          ) : (
            <span><Sparkles size={16} /> พร้อมใช้งาน</span>
          )}
        </div>
      </section>

      <section className="dashboard-action-grid">
        <Link className={activeVisit ? "mobile-action-card checkout main-action" : "mobile-action-card checkin main-action"} href="/check-in">
          <span>{activeVisit ? <LogOut size={30} /> : <MapPinned size={30} />}</span>
          <div>
            <strong>{mainActionLabel}</strong>
            <small>{mainActionHelp}</small>
          </div>
          <ArrowRight size={18} />
        </Link>
        <Link className="mobile-action-card fuel dashboard-secondary-action" href="/fuel">
          <span><Fuel size={28} /></span>
          <div>
            <strong>เติมน้ำมัน</strong>
            <small>จดบิล เลขไมล์ และรูปหลักฐาน</small>
          </div>
          <ArrowRight size={18} />
        </Link>
        <Link className="mobile-action-card project dashboard-secondary-action" href="/projects/new">
          <span><Plus size={28} /></span>
          <div>
            <strong>เพิ่มหน้างานใหม่</strong>
            <small>สร้างโครงการพร้อมพิกัดปัจจุบัน</small>
          </div>
          <ArrowRight size={18} />
        </Link>
      </section>

      {checkoutWarning ? (
        <section className="field-alert-card danger dashboard-alert">
          <strong>คุณเปิดงานไว้นานแล้ว</strong>
          <p>หากออกจาก {activeVisit?.project.name} แล้ว ควรกดเช็คเอาท์เพื่อให้ timeline และระยะทางถัดไปถูกต้อง</p>
          <Link className="button danger" href="/check-in">ไปเช็คเอาท์</Link>
        </section>
      ) : null}

      <section className="dashboard-kpi-grid">
        <div>
          <span><CalendarClock size={16} /> เช็คอินวันนี้</span>
          <strong>{todayCheckIns}</strong>
        </div>
        <div>
          <span><Route size={16} /> ระยะทางรวม</span>
          <strong>{formatNumber(totalDistanceKm, 1)} กม.</strong>
        </div>
        <div>
          <span><ReceiptText size={16} /> รอตรวจเบิก</span>
          <strong>{pendingClaims}</strong>
        </div>
        <div>
          <span><MapPinned size={16} /> งานที่ดูแล</span>
          <strong>{activeProjectCount}</strong>
        </div>
      </section>

      <section className="dashboard-content-grid">
        <div className="mobile-panel daily-timeline-panel dashboard-timeline">
          <div className="mobile-panel-heading">
            <div>
              <h2>Timeline วันนี้</h2>
              <p>ลำดับเดินทาง เช็คอิน และเติมน้ำมันล่าสุด</p>
            </div>
            <Link href="/check-in">บันทึกงาน</Link>
          </div>
          <div className="daily-timeline-list">
            {timelineItems.map((item) => (
              <article className={`daily-timeline-item ${item.tone}`} key={item.id}>
                <span />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <small>{formatDateTime(item.at)}</small>
                </div>
              </article>
            ))}
          </div>
          {timelineItems.length === 0 ? <div className="empty">วันนี้ยังไม่มีรายการ</div> : null}
        </div>

        <div className="dashboard-side-stack">
          <div className="mobile-panel">
            <div className="mobile-panel-heading">
              <div>
                <h2>เช็คอินล่าสุด</h2>
                <p>จุดล่าสุดที่คุณบันทึกไว้</p>
              </div>
              <Link href="/reports">รายงาน</Link>
            </div>

            {latestCheckIn ? (
              <Link className={activeVisit ? "last-checkin-card active" : "last-checkin-card"} href={`/projects/${latestCheckIn.project.id}`}>
                <span>{activeVisit ? <LogOut size={20} /> : <MapPinned size={20} />}</span>
                <div>
                  <strong>{latestCheckIn.project.name}</strong>
                  <small>{purposeLabels[latestCheckIn.purpose]} · {formatDateTime(latestCheckIn.checkedAt)}</small>
                </div>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <div className="empty">ยังไม่มีประวัติเช็คอิน</div>
            )}
          </div>

          <div className="mobile-panel">
            <div className="mobile-panel-heading">
              <div>
                <h2>รายการเบิกล่าสุด</h2>
                <p>ยอดจากรายการล่าสุดของคุณ</p>
              </div>
              <Link href="/reports">ทั้งหมด</Link>
            </div>

            <div className="mobile-claim-list">
              {latestClaims.map((claim) => (
                <article className="mobile-claim-item" key={claim.id}>
                  <div>
                    <strong>{formatMoney(claim.totalAmount)}</strong>
                    <small>{claim.travelLeg.fromProject?.name ?? "จุดก่อนหน้า"} &rarr; {claim.travelLeg.toProject?.name ?? claim.travelLeg.destinationLabel ?? "สำนักงาน"}</small>
                  </div>
                  <span className={`badge ${claimTone(claim.status)}`}>{claimStatusLabels[claim.status]}</span>
                </article>
              ))}
            </div>
            {latestClaims.length === 0 ? <div className="empty">ยังไม่มีรายการค่าเดินทาง</div> : null}
            {latestClaims.length > 0 ? <div className="dashboard-claim-total">รวมล่าสุด {formatMoney(claimTotal)}</div> : null}
          </div>
        </div>

        <div className="mobile-panel dashboard-projects">
          <div className="mobile-panel-heading">
            <div>
              <h2>โครงการของฉัน</h2>
              <p>งานที่คุณสร้างหรือรับผิดชอบ</p>
            </div>
            <Link href="/projects">ทั้งหมด</Link>
          </div>

          <div className="mobile-project-list">
            {recentProjects.map((project) => {
              const status = project.status as ProjectStatus;
              return (
                <Link href={`/projects/${project.id}`} className="mobile-project-item" key={project.id}>
                  <div>
                    <span>{project.code}</span>
                    <strong>{project.name}</strong>
                    <small>{project.customerName}</small>
                  </div>
                  <em className={getProjectStatusTone(status)}>{projectStatusLabels[status]}</em>
                </Link>
              );
            })}
          </div>
          {recentProjects.length === 0 ? <div className="empty">ยังไม่มีโครงการที่เกี่ยวข้อง</div> : null}
        </div>
      </section>
    </div>
  );
}
