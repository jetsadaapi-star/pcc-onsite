import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  ClipboardCheck,
  MapPinOff,
  ReceiptText,
  Route,
  Settings,
  Users
} from "lucide-react";
import Link from "next/link";
import { AdminLiveMap, type AdminMapPoint } from "@/components/admin-live-map";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { claimStatusLabels, claimTone, purposeLabels, roleLabels } from "@/lib/labels";
import { getProjectStatusTone, projectStatusLabels, type ProjectStatus } from "@/lib/project-status";

export default async function AdminPage() {
  await requireAdmin();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    users,
    projectStatusCounts,
    missingLocation,
    todayCheckIns,
    pendingClaims,
    distance,
    recentCheckIns,
    latestClaims,
    latestProjects,
    mapCheckIns,
    mapProjects,
    mapTrips
  ] = await Promise.all([
    prisma.user.count({ where: { active: true } }),
    prisma.project.groupBy({ by: ["status"], _count: true }),
    prisma.project.count({ where: { OR: [{ latitude: null }, { longitude: null }] } }),
    prisma.checkIn.count({ where: { checkedAt: { gte: todayStart } } }),
    prisma.travelClaim.aggregate({
      where: { status: "PENDING_REVIEW" },
      _sum: { totalAmount: true },
      _count: true
    }),
    prisma.travelLeg.aggregate({ _sum: { distanceKm: true } }),
    prisma.checkIn.findMany({
      orderBy: { checkedAt: "desc" },
      take: 7,
      include: {
        user: { select: { name: true, role: true } },
        project: { select: { id: true, code: true, name: true } }
      }
    }),
    prisma.travelClaim.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: {
        user: { select: { name: true } },
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
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        code: true,
        name: true,
        customerName: true,
        status: true,
        updatedAt: true
      }
    }),
    prisma.checkIn.findMany({
      where: { checkedAt: { gte: todayStart } },
      orderBy: { checkedAt: "desc" },
      take: 80,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        user: { select: { name: true } },
        project: { select: { code: true, name: true } }
      }
    }),
    prisma.project.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        status: { notIn: ["COMPLETED", "CLOSED_LOST", "CANCELLED"] }
      },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: { id: true, code: true, name: true, latitude: true, longitude: true }
    }),
    prisma.tripSession.findMany({
      where: { status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
      take: 40,
      select: {
        id: true,
        originLatitude: true,
        originLongitude: true,
        originLabel: true,
        user: { select: { name: true } },
        destinationProject: { select: { code: true, name: true } }
      }
    })
  ]);

  const projectCount = (statuses: string[]) => projectStatusCounts
    .filter((item) => statuses.includes(item.status))
    .reduce((sum, item) => sum + item._count, 0);
  const projects = projectStatusCounts.reduce((sum, item) => sum + item._count, 0);
  const activeProjects = projectCount(["NEW", "CONTACTED", "SURVEY_SCHEDULED", "SURVEYED", "QUOTING", "QUOTED", "NEGOTIATING", "WON", "IN_CONSTRUCTION", "ON_HOLD"]);
  const quotedProjects = projectCount(["QUOTING", "QUOTED", "NEGOTIATING"]);
  const constructionProjects = projectCount(["IN_CONSTRUCTION"]);
  const pendingAmount = pendingClaims._sum.totalAmount ?? 0;
  const projectMix = [
    { label: "Active", value: activeProjects, tone: "blue" },
    { label: "กำลังขาย/ทำราคา", value: quotedProjects, tone: "amber" },
    { label: "ก่อสร้าง", value: constructionProjects, tone: "teal" },
    { label: "ขาดพิกัด", value: missingLocation, tone: "rose" }
  ];
  const mapPoints: AdminMapPoint[] = [
    ...mapCheckIns.map((item) => ({
      id: `checkin-${item.id}`,
      type: "checkin" as const,
      label: item.user.name,
      subLabel: `${item.project.code} ${item.project.name}`,
      latitude: item.latitude,
      longitude: item.longitude
    })),
    ...mapProjects.flatMap((item) => item.latitude !== null && item.longitude !== null ? [{
      id: `project-${item.id}`,
      type: "project" as const,
      label: `${item.code} ${item.name}`,
      subLabel: "โครงการ active",
      latitude: item.latitude,
      longitude: item.longitude
    }] : []),
    ...mapTrips.map((item) => ({
      id: `trip-${item.id}`,
      type: "trip" as const,
      label: item.user.name,
      subLabel: item.destinationProject ? `กำลังไป ${item.destinationProject.code} ${item.destinationProject.name}` : item.originLabel ?? "ทริป active",
      latitude: item.originLatitude,
      longitude: item.originLongitude
    }))
  ];

  return (
    <div className="admin-dashboard">
      <section className="admin-hero">
        <div>
          <span className="admin-eyebrow">Admin Control Center</span>
          <h1>ภาพรวมผู้ดูแลระบบ</h1>
          <p>ติดตามงานภาคสนาม โครงการ เช็คอิน และค่าเดินทางที่ต้องตรวจจากหน้าเดียว</p>
        </div>
        <div className="admin-hero-actions">
          <Link className="button" href="/admin/travel">
            <ReceiptText size={17} />
            ตรวจค่าเดินทาง
          </Link>
          <Link className="button secondary" href="/projects/new">
            <BriefcaseBusiness size={17} />
            เพิ่มโครงการ
          </Link>
        </div>
      </section>

      <section className="admin-metric-grid">
        <Link className="admin-metric-card primary" href="/admin/travel">
          <span><ReceiptText size={19} /></span>
          <small>ยอดรอตรวจ</small>
          <strong>{formatMoney(pendingAmount)}</strong>
          <em>{pendingClaims._count} รายการ</em>
        </Link>
        <Link className="admin-metric-card" href="/admin/check-ins">
          <span><ClipboardCheck size={19} /></span>
          <small>เช็คอินวันนี้</small>
          <strong>{todayCheckIns}</strong>
          <em>จากทุกทีม</em>
        </Link>
        <Link className="admin-metric-card" href="/admin/projects">
          <span><BriefcaseBusiness size={19} /></span>
          <small>โครงการทั้งหมด</small>
          <strong>{projects}</strong>
          <em>{activeProjects} active</em>
        </Link>
        <Link className="admin-metric-card" href="/admin/users">
          <span><Users size={19} /></span>
          <small>ผู้ใช้งาน</small>
          <strong>{users}</strong>
          <em>active accounts</em>
        </Link>
      </section>

      <section className="admin-panel admin-map-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>แผนที่งานภาคสนามวันนี้</h2>
            <p>ดูเช็คอินวันนี้ โครงการที่ยัง active และทริปที่กำลังเดินทางแบบ cluster จาก OpenStreetMap</p>
          </div>
          <Link className="row-view-button" href="/admin/check-ins">
            ประวัติเช็คอิน
            <ArrowRight size={15} />
          </Link>
        </div>
        <AdminLiveMap points={mapPoints} />
      </section>

      <section className="admin-dashboard-grid">
        <div className="admin-main-column">
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>งานที่ควรตรวจ</h2>
                <p>รายการที่กระทบการจ่ายเงินหรือความถูกต้องของข้อมูลหน้างาน</p>
              </div>
              <Link className="row-view-button" href="/admin/travel">
                ดูทั้งหมด
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="admin-action-list">
              <Link className="admin-action-item urgent" href="/admin/travel">
                <span><AlertCircle size={18} /></span>
                <div>
                  <strong>ค่าเดินทางรอตรวจ</strong>
                  <small>{pendingClaims._count} รายการ · {formatMoney(pendingAmount)}</small>
                </div>
              </Link>
              <Link className="admin-action-item" href="/projects?location=missing">
                <span><MapPinOff size={18} /></span>
                <div>
                  <strong>โครงการที่ยังไม่มีพิกัด</strong>
                  <small>{missingLocation} โครงการควรเติมตำแหน่งเพื่อคำนวณระยะทางแม่นขึ้น</small>
                </div>
              </Link>
              <Link className="admin-action-item" href="/admin/projects">
                <span><Settings size={18} /></span>
                <div>
                  <strong>ตรวจสถานะโครงการ</strong>
                  <small>{quotedProjects} โครงการอยู่ในช่วงขาย/ทำราคา และ {constructionProjects} โครงการกำลังก่อสร้าง</small>
                </div>
              </Link>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>เช็คอินล่าสุด</h2>
                <p>ภาพเคลื่อนไหวของทีมภาคสนามแบบ real-time จากข้อมูลล่าสุด</p>
              </div>
              <Link className="row-view-button" href="/admin/check-ins">
                ประวัติ
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="admin-feed">
              {recentCheckIns.map((checkIn) => (
                <article className="admin-feed-item" key={checkIn.id}>
                  <div className="feed-dot" />
                  <div>
                    <div className="feed-title">
                      <strong>{checkIn.user.name}</strong>
                      <span>{formatDateTime(checkIn.checkedAt)}</span>
                    </div>
                    <p>{purposeLabels[checkIn.purpose]} · <Link href={`/projects/${checkIn.project.id}`}>{checkIn.project.code} {checkIn.project.name}</Link></p>
                    <small>{roleLabels[checkIn.user.role]}</small>
                  </div>
                </article>
              ))}
            </div>
            {recentCheckIns.length === 0 ? <div className="empty">ยังไม่มีเช็คอินล่าสุด</div> : null}
          </section>
        </div>

        <aside className="admin-side-column">
          <section className="admin-panel">
            <div className="admin-panel-heading compact">
              <div>
                <h2>สถานะโครงการ</h2>
                <p>สัดส่วนงานที่ต้องตามต่อ</p>
              </div>
            </div>
            <div className="project-mix-list">
              {projectMix.map((item) => (
                <div className="project-mix-item" key={item.label}>
                  <span className={`mix-dot ${item.tone}`} />
                  <strong>{item.label}</strong>
                  <em>{item.value}</em>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading compact">
              <div>
                <h2>โครงการล่าสุด</h2>
                <p>อัปเดตล่าสุดจากรายการทั้งหมด</p>
              </div>
            </div>
            <div className="admin-project-list">
              {latestProjects.map((project) => {
                const status = project.status as ProjectStatus;
                return (
                  <Link href={`/projects/${project.id}`} className="admin-project-row" key={project.id}>
                    <div>
                      <strong>{project.code} · {project.name}</strong>
                      <small>{project.customerName}</small>
                    </div>
                    <span className={`badge ${getProjectStatusTone(status)}`}>{projectStatusLabels[status]}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="admin-panel accent">
            <div className="admin-panel-heading compact">
              <div>
                <h2>ระยะทางสะสม</h2>
                <p>จาก travel legs ทั้งหมด</p>
              </div>
              <Route size={22} color="#095aa4" />
            </div>
            <strong className="admin-big-number">{formatNumber(distance._sum.distanceKm ?? 0, 1)} กม.</strong>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading compact">
              <div>
                <h2>เคลมรอตรวจล่าสุด</h2>
                <p>รายการที่ควรอนุมัติหรือปฏิเสธ</p>
              </div>
            </div>
            <div className="admin-claim-list">
              {latestClaims.map((claim) => (
                <Link href="/admin/travel" className="admin-claim-row" key={claim.id}>
                  <div>
                    <strong>{claim.user.name}</strong>
                    <small>{claim.travelLeg.fromProject?.name ?? "จุดก่อนหน้า"} → {claim.travelLeg.toProject?.name ?? claim.travelLeg.destinationLabel ?? "สำนักงาน"}</small>
                  </div>
                  <div>
                    <span>{formatMoney(claim.totalAmount)}</span>
                    <em className={claimTone(claim.status)}>{claimStatusLabels[claim.status]}</em>
                  </div>
                </Link>
              ))}
            </div>
            {latestClaims.length === 0 ? <div className="empty">ไม่มีรายการรอตรวจ</div> : null}
          </section>
        </aside>
      </section>
    </div>
  );
}
