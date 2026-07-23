import { MapPinned, Navigation, Plus, Route } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CancelTripButton } from "@/components/cancel-trip-button";
import { CheckInForm } from "@/components/check-in-form";
import { CheckOutForm } from "@/components/check-out-form";
import { EndFieldWorkSessionForm } from "@/components/end-field-work-session-form";
import { MapPreview } from "@/components/map-preview";
import { OfficeArrivalForm } from "@/components/office-arrival-form";
import { StartTripForm } from "@/components/start-trip-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { checkoutStatusLabels, purposeLabels } from "@/lib/labels";

function durationText(start: Date, end?: Date | null) {
  const minutes = Math.max(0, Math.round(((end ?? new Date()).getTime() - start.getTime()) / 60000));
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ชม. ${rest} นาที` : `${hours} ชม.`;
}

export default async function CheckInPage() {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/admin");

  const [projects, vehicles, recentCheckIns, lastLeg, activeVisit, activeTrip, previousSite, defaultOffice, activeFieldWorkSession] = await Promise.all([
    prisma.project.findMany({
      where: { status: { notIn: ["COMPLETED", "CLOSED_LOST", "CANCELLED"] } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, code: true, name: true, customerName: true, latitude: true, longitude: true }
    }),
    prisma.vehicle.findMany({
      where: { userId: user.id, active: true, approved: true, kmPerLiter: { not: null } },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      select: { id: true, name: true, licensePlate: true, kmPerLiter: true, isDefault: true }
    }),
    prisma.checkIn.findMany({
      where: { userId: user.id },
      orderBy: { checkedAt: "desc" },
      take: 6,
      include: { project: true, vehicle: true }
    }),
    prisma.travelLeg.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { fromProject: true, toProject: true }
    }),
    prisma.checkIn.findFirst({
      where: { userId: user.id, checkedOutAt: null },
      orderBy: { checkedAt: "desc" },
      include: { project: true, vehicle: true }
    }),
    prisma.tripSession.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
      include: {
        destinationProject: { select: { id: true, code: true, name: true, customerName: true } },
        vehicle: { select: { name: true, licensePlate: true, kmPerLiter: true } }
      }
    }),
    prisma.checkIn.findFirst({
      where: { userId: user.id, checkedOutAt: { not: null } },
      orderBy: { checkedOutAt: "desc" },
      select: { id: true }
    }),
    prisma.officeLocation.findFirst({
      where: { active: true },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      select: { name: true, latitude: true, longitude: true }
    }),
    prisma.fieldWorkSession.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      include: {
        vehicle: { select: { id: true, name: true, licensePlate: true, kmPerLiter: true, isDefault: true } },
        tripSessions: { select: { travelLeg: { select: { distanceKm: true } } } }
      }
    })
  ]);
  const defaultVehicle = activeFieldWorkSession?.vehicle ?? vehicles[0] ?? null;
  const fieldDayDistanceKm = activeFieldWorkSession?.tripSessions.reduce((sum, trip) => sum + (trip.travelLeg?.distanceKm ?? 0), 0) ?? 0;
  const activeOfficeTrip = activeTrip?.destinationType === "OFFICE" ? activeTrip : null;
  const activeProjectTrip = activeTrip?.destinationType === "PROJECT" && activeTrip.destinationProject
    ? { ...activeTrip, destinationProject: activeTrip.destinationProject }
    : null;
  const activeTripDestinationLabel = activeOfficeTrip
    ? "บริษัท/สำนักงาน"
    : activeProjectTrip?.destinationProject.name ?? activeTrip?.destinationLabel ?? "ปลายทาง";
  // The warning intentionally reflects request time in this server-rendered page.
  // eslint-disable-next-line react-hooks/purity
  const checkoutWarning = activeVisit ? Date.now() - activeVisit.checkedAt.getTime() > 6 * 60 * 60 * 1000 : false;

  const mapPoints = projects
    .filter((project) => project.latitude && project.longitude)
    .slice(0, 30)
    .map((project) => ({
      id: project.id,
      label: `${project.code} ${project.name}`,
      latitude: project.latitude as number,
      longitude: project.longitude as number
    }));

  return (
    <div className="field-visit-page">
      <section className={activeVisit ? "visit-hero active" : "visit-hero"}>
        <div>
          <span className="visit-eyebrow">{activeVisit ? "Active visit" : activeTrip ? "Arriving" : activeFieldWorkSession ? "Field day active" : "Start field day"}</span>
          <h1>{activeVisit ? "ออกจากหน้างาน" : activeTrip ? "ถึงปลายทางแล้วใช่ไหม" : activeFieldWorkSession ? "เดินทางไปจุดถัดไป" : "เริ่มงานภาคสนามวันนี้"}</h1>
          <p>
            {activeVisit
              ? `คุณกำลังอยู่ที่ ${activeVisit.project.name} มาแล้ว ${durationText(activeVisit.checkedAt)}`
              : activeTrip
                ? `ทริปนี้เริ่มจาก ${activeTrip.originLabel ?? "จุดเริ่มต้น"} ไปยัง ${activeTripDestinationLabel}`
                : activeFieldWorkSession
                  ? `รอบวันนี้เปิดแล้วด้วย ${activeFieldWorkSession.vehicle.name} เลขไมล์ต้นวัน ${activeFieldWorkSession.odometerStartKm.toLocaleString("th-TH")} กม.`
                  : "เลือกต้นทาง ปลายทาง และบันทึกเลขไมล์ต้นวันครั้งเดียว ระบบจะคำนวณระยะทางทุกช่วงให้อัตโนมัติ"}
          </p>
        </div>
        <span className="visit-hero-icon">
          <MapPinned size={28} />
        </span>
      </section>

      {checkoutWarning ? (
        <section className="field-alert-card danger">
          <strong>งานนี้เปิดไว้นานเกิน 6 ชั่วโมง</strong>
          <p>ถ้าออกจาก {activeVisit?.project.name} แล้ว ให้กดเช็คเอาท์ก่อนเริ่มเดินทางครั้งถัดไป เพื่อให้ระยะทางไม่ปนกัน</p>
        </section>
      ) : null}

      <section className="visit-layout">
        <main className="visit-main-card">
          <div className="visit-form-heading">
            <div>
              <h2>{activeVisit ? "ออกจากงานนี้" : activeTrip ? "บันทึกถึงปลายทาง" : activeFieldWorkSession ? "เริ่มช่วงการเดินทางถัดไป" : "เปิดรอบงานภาคสนาม"}</h2>
              <p>{activeVisit ? "ดึง GPS ตอนออก สรุปงาน และแนบรูปโดยไม่ต้องบันทึกเลขไมล์" : activeTrip ? "เมื่อถึงหน้างาน ให้ดึง GPS และบันทึกงาน" : activeFieldWorkSession ? "เลือกต้นทางและปลายทาง ไม่ต้องกรอกเลขไมล์ซ้ำ" : "บันทึกเลขไมล์ต้นวัน แล้วเลือกต้นทางและปลายทางแรก"}</p>
            </div>
            {!activeVisit && !activeTrip ? (
              <Link className="row-view-button" href="/projects/new?returnTo=/check-in">
                <Plus size={15} />
                เพิ่มหน้างาน
              </Link>
            ) : activeTrip ? (
              <CancelTripButton tripId={activeTrip.id} />
            ) : null}
          </div>
          {activeVisit ? (
            <CheckOutForm activeVisit={activeVisit} />
          ) : activeOfficeTrip ? (
            <OfficeArrivalForm trip={activeOfficeTrip} />
          ) : activeProjectTrip ? (
            <CheckInForm projects={projects} activeTrip={activeProjectTrip} />
          ) : (
            <>
              <StartTripForm projects={projects} defaultVehicle={defaultVehicle} activeFieldWorkSession={activeFieldWorkSession} hasPreviousSite={!!previousSite} defaultOffice={defaultOffice} />
              {activeFieldWorkSession ? (
                <details className="end-field-day-disclosure">
                  <summary>เสร็จงานแล้ว · จบการเดินทางวันนี้</summary>
                  <EndFieldWorkSessionForm session={{
                    startedAt: activeFieldWorkSession.startedAt,
                    odometerStartKm: activeFieldWorkSession.odometerStartKm,
                    vehicle: activeFieldWorkSession.vehicle,
                    tripCount: activeFieldWorkSession.tripSessions.length,
                    distanceKm: fieldDayDistanceKm
                  }} />
                </details>
              ) : null}
            </>
          )}
        </main>

        <aside className="visit-side-stack">
          <section className="visit-side-card">
            <div className="visit-side-heading">
              <span><Route size={18} /></span>
              <div>
                <h2>ระยะทางล่าสุด</h2>
                <p>จากหน้างานก่อนหน้า</p>
              </div>
            </div>
            {lastLeg ? (
              <div className="visit-route-card">
                <strong>{lastLeg.fromProject?.name ?? "จุดก่อนหน้า"} → {lastLeg.toProject?.name ?? lastLeg.destinationLabel ?? "สำนักงาน"}</strong>
                <small>{formatNumber(lastLeg.distanceKm, 1)} กม. · {lastLeg.routeProvider}</small>
                <span className={`badge ${lastLeg.distanceStatus === "CALCULATED" ? "success" : "warning"}`}>
                  {lastLeg.distanceStatus === "CALCULATED" ? "คำนวณแล้ว" : "รอตรวจสอบ"}
                </span>
              </div>
            ) : (
              <div className="empty">เช็คอินครั้งแรกจะยังไม่สร้างระยะทาง</div>
            )}
          </section>

          <section className="visit-side-card map-compact">
            <div className="visit-side-heading">
              <span><Navigation size={18} /></span>
              <div>
                <h2>แผนที่หน้างาน</h2>
                <p>{mapPoints.length} จุดที่มีพิกัด</p>
              </div>
            </div>
            <MapPreview points={mapPoints} />
          </section>
        </aside>
      </section>

      <section className="visit-history-card">
        <div className="visit-form-heading">
          <div>
            <h2>ประวัติล่าสุด</h2>
            <p>เข้า-ออกงานล่าสุดของคุณ</p>
          </div>
          <Link className="row-view-button" href="/history">ดูทั้งหมด</Link>
        </div>
        <div className="visit-history-list">
          {recentCheckIns.map((item) => (
            <article className="visit-history-item" key={item.id}>
              <div className="visit-history-status">
                <span className={item.checkedOutAt ? "done" : "open"} />
              </div>
              <div>
                <div className="visit-history-head">
                  <strong>{item.project.name}</strong>
                  <em>{item.checkedOutAt ? durationText(item.checkedAt, item.checkedOutAt) : "กำลังเปิดอยู่"}</em>
                </div>
                <p>{purposeLabels[item.purpose]} · เข้า {formatDateTime(item.checkedAt)}</p>
                <small>
                  {item.checkedOutAt
                    ? `ออก ${formatDateTime(item.checkedOutAt)} · ${item.checkoutStatus ? checkoutStatusLabels[item.checkoutStatus] : "เช็คเอาท์แล้ว"}`
                    : "ยังไม่เช็คเอาท์"}
                </small>
              </div>
            </article>
          ))}
        </div>
        {recentCheckIns.length === 0 ? <div className="empty">ยังไม่มีประวัติเช็คอิน</div> : null}
      </section>
    </div>
  );
}
