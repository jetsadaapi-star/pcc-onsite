import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Route,
  Trash2,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectMapPanel } from "@/components/project-map-panel";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { deleteProjectAction, updateProjectStatusAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { checkoutStatusLabels, purposeLabels } from "@/lib/labels";
import { getProjectStatusTone, projectStatusLabels, projectStatusOptions, type ProjectStatus } from "@/lib/project-status";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
      checkIns: {
        orderBy: { checkedAt: "desc" },
        take: 12,
        include: { user: { select: { name: true, role: true } } }
      },
      destinationTravelLegs: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { distanceKm: true }
      },
      _count: { select: { checkIns: true } }
    }
  });

  if (!project) notFound();

  const status = project.status as ProjectStatus;
  const hasLocation = project.latitude !== null && project.longitude !== null;
  const totalInboundKm = project.destinationTravelLegs.reduce((sum, leg) => sum + leg.distanceKm, 0);
  const lastCheckIn = project.checkIns[0];
  const mapPoints = hasLocation
    ? [{ id: project.id, label: `${project.code} ${project.name}`, latitude: project.latitude as number, longitude: project.longitude as number }]
    : [];

  return (
    <div className="project-detail-page">
      <section className="project-view-hero">
        <div className="project-view-hero-main">
          <Link className="back-link" href="/projects">
            <ArrowLeft size={15} />
            กลับรายการโครงการ
          </Link>
          <div className="project-view-title">
            <span>{project.code}</span>
            <h1>{project.name}</h1>
            <p>{project.customerName}</p>
          </div>
          <div className="project-view-meta">
            <span><MapPin size={14} /> {project.province || "ยังไม่ระบุจังหวัด"}</span>
            <span><CalendarClock size={14} /> อัปเดต {formatDateTime(project.updatedAt)}</span>
            <span><UserRound size={14} /> {project.owner?.name ?? project.createdBy.name}</span>
          </div>
        </div>
        <div className="project-status-panel">
          <span className={`badge ${getProjectStatusTone(status)}`}>{projectStatusLabels[status]}</span>
          <strong>{project._count.checkIns}</strong>
          <small>check-ins</small>
        </div>
        {user.role === "ADMIN" ? (
          <div className="new-project-actions">
            <Link className="button secondary" href={`/admin/projects/${project.id}/edit`}><Pencil size={16} /> แก้ไข</Link>
            <ConfirmActionForm action={deleteProjectAction} fields={{ id: project.id }} message={`ยืนยันลบโครงการ ${project.code} ${project.name} ใช่หรือไม่?`}>
              <button className="button danger" type="submit" disabled={project._count.checkIns > 0} title={project._count.checkIns > 0 ? "โครงการมีประวัติเช็กอิน ไม่สามารถลบได้" : undefined}><Trash2 size={16} /> ลบ</button>
            </ConfirmActionForm>
          </div>
        ) : null}
      </section>

      <section className="project-view-kpis">
        <div className="project-view-kpi">
          <span className="kpi-icon blue"><ClipboardList size={18} /></span>
          <div><small>สถานะปัจจุบัน</small><strong>{projectStatusLabels[status]}</strong></div>
        </div>
        <div className="project-view-kpi">
          <span className="kpi-icon teal"><CheckCircle2 size={18} /></span>
          <div><small>เช็คอินทั้งหมด</small><strong>{project._count.checkIns}</strong></div>
        </div>
        <div className="project-view-kpi">
          <span className="kpi-icon amber"><Route size={18} /></span>
          <div><small>ระยะทางเข้าโครงการ</small><strong>{totalInboundKm.toFixed(1)} กม.</strong></div>
        </div>
        <div className="project-view-kpi">
          <span className="kpi-icon rose"><Navigation size={18} /></span>
          <div><small>พิกัด</small><strong>{hasLocation ? "พร้อมใช้งาน" : "รอเพิ่ม"}</strong></div>
        </div>
      </section>

      <section className="project-view-layout">
        <main className="project-view-main">
          <section className="project-view-card">
            <div className="project-card-heading">
              <div>
                <h2>ข้อมูลหน้างาน</h2>
                <p>ข้อมูลลูกค้า ผู้ติดต่อ ที่อยู่ และรายละเอียดสำคัญ</p>
              </div>
            </div>

            <div className="project-info-grid">
              <div className="project-info-item">
                <span><UserRound size={15} /> ลูกค้า</span>
                <strong>{project.customerName}</strong>
              </div>
              <div className="project-info-item">
                <span><Phone size={15} /> ผู้ติดต่อ</span>
                <strong>{project.contactName || "-"}</strong>
                <small>{project.contactPhone || "ยังไม่มีเบอร์โทร"}</small>
              </div>
              <div className="project-info-item wide">
                <span><MapPin size={15} /> ที่อยู่</span>
                <strong>{project.address}</strong>
                <small>{project.province || ""}</small>
              </div>
            </div>

            {project.description ? (
              <div className="project-description">
                <span>รายละเอียด</span>
                <p>{project.description}</p>
              </div>
            ) : null}
          </section>

          <ProjectMapPanel points={mapPoints} totalProjects={1} />

          <section className="project-view-card">
            <div className="project-card-heading">
              <div>
                <h2>Timeline เช็คอิน</h2>
                <p>{lastCheckIn ? `ล่าสุด ${formatDateTime(lastCheckIn.checkedAt)}` : "ยังไม่มีประวัติเช็คอิน"}</p>
              </div>
              <span className="badge info">{project._count.checkIns} ครั้ง</span>
            </div>

            <div className="checkin-timeline">
              {project.checkIns.map((checkIn) => (
                <article className="timeline-item" key={checkIn.id}>
                  <div className="timeline-dot" />
                  <div>
                    <div className="timeline-head">
                      <strong>{purposeLabels[checkIn.purpose]}</strong>
                      <span>{formatDateTime(checkIn.checkedAt)}{checkIn.checkedOutAt ? ` - ${formatDateTime(checkIn.checkedOutAt)}` : ""}</span>
                    </div>
                    <p>{checkIn.checkoutNote || checkIn.note || "ไม่มีบันทึกเพิ่มเติม"}</p>
                    <small>{checkIn.user.name}{checkIn.checkoutStatus ? ` · ${checkoutStatusLabels[checkIn.checkoutStatus]}` : " · ยังไม่เช็คเอาท์"}</small>
                  </div>
                </article>
              ))}
            </div>
            {project.checkIns.length === 0 ? <div className="empty">ยังไม่มีประวัติเช็คอินในโครงการนี้</div> : null}
          </section>
        </main>

        <aside className="project-view-aside">
          <section className="status-control-card">
            <div>
              <h2>จัดการสถานะ</h2>
              <p>อัปเดตสถานะจากหน้ารายละเอียดเพื่อลดการกดผิดในตาราง</p>
            </div>
            <form action={updateProjectStatusAction} className="form-grid">
              <input type="hidden" name="id" value={project.id} />
              <input type="hidden" name="redirectTo" value={`/projects/${project.id}`} />
              <div className="field">
                <label htmlFor="status">สถานะใหม่</label>
                <select className="select" id="status" name="status" defaultValue={project.status}>
                  {projectStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <button className="button" type="submit">อัปเดตสถานะ</button>
            </form>
          </section>

          <section className="project-people-card">
            <h2>ทีมที่เกี่ยวข้อง</h2>
            <div className="people-row">
              <span>ผู้รับผิดชอบ</span>
              <strong>{project.owner?.name ?? project.createdBy.name}</strong>
              <small>{project.owner?.email ?? project.createdBy.email}</small>
            </div>
            <div className="people-row">
              <span>ผู้สร้าง</span>
              <strong>{project.createdBy.name}</strong>
              <small>{project.createdBy.email}</small>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
