import {
  AlertTriangle,
  BellRing,
  Building2,
  CheckCircle2,
  Clock3,
  Mail,
  MapPinned,
  MessageCircle,
  Route,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Workflow
} from "lucide-react";
import { OfficeLocationForm } from "@/components/office-location-form";
import { SystemBrandingForm } from "@/components/system-branding-form";
import { runCheckoutRemindersAction, updateOperationalSettingsAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { getAppBranding } from "@/lib/branding";
import { prisma } from "@/lib/db";

type AdminSettingsSearchParams = {
  saved?: string;
  sent?: string;
  failed?: string;
  skipped?: string;
};

function savedMessage(params: AdminSettingsSearchParams) {
  if (params.saved === "branding") return "บันทึกแบรนด์ระบบเรียบร้อยแล้ว";
  if (params.saved === "operations") return "บันทึกการแจ้งเตือนและเกณฑ์ตรวจสอบเรียบร้อยแล้ว";
  if (params.saved === "reminders") {
    return `ประมวลผลแจ้งเตือนแล้ว: ส่ง ${params.sent ?? 0}, ล้มเหลว ${params.failed ?? 0}, ข้าม ${params.skipped ?? 0}`;
  }
  return "บันทึกพิกัดสำนักงานเรียบร้อยแล้ว";
}

function minutesLabel(minutes?: number | null) {
  const value = minutes ?? 480;
  if (value >= 60 && value % 60 === 0) return `${value / 60} ชม.`;
  return `${value} นาที`;
}

export default async function AdminSettingsPage({
  searchParams
}: {
  searchParams: Promise<AdminSettingsSearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const [branding, settings, office, officeCount, activeOfficeCount, officeOriginTrips, officeDestinationTrips, activeTrips, openAnomalies, reminderLogs] = await Promise.all([
    getAppBranding(),
    prisma.systemSetting.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        checkoutReminderEnabled: true,
        checkoutReminderAfterMinutes: true,
        checkoutReminderEmailEnabled: true,
        checkoutReminderLineEnabled: true,
        anomalyGpsThresholdMeters: true,
        anomalyDistanceVariancePercent: true
      }
    }),
    prisma.officeLocation.findFirst({
      where: { active: true },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]
    }),
    prisma.officeLocation.count(),
    prisma.officeLocation.count({ where: { active: true } }),
    prisma.tripSession.count({ where: { originType: "OFFICE" } }),
    prisma.tripSession.count({ where: { destinationType: "OFFICE" } }),
    prisma.tripSession.count({ where: { status: "ACTIVE" } }),
    prisma.anomalyRecord.count({ where: { status: "OPEN" } }),
    prisma.notificationLog.count({ where: { type: "CHECKOUT_REMINDER" } })
  ]);

  const reminderEnabled = settings?.checkoutReminderEnabled ?? true;
  const emailEnabled = settings?.checkoutReminderEmailEnabled ?? false;
  const lineEnabled = settings?.checkoutReminderLineEnabled ?? false;

  return (
    <div className="content-stack admin-settings-page">
      <section className="admin-settings-hero">
        <div className="admin-settings-hero-copy">
          <span className="hero-label">
            <Settings size={15} />
            PCC OnSite Settings
          </span>
          <h1>ตั้งค่าระบบ</h1>
          <p>จัดการแบรนด์ พิกัดสำนักงาน การแจ้งเตือนลืมเช็คเอาท์ และเกณฑ์ตรวจข้อมูลผิดปกติของงานภาคสนาม</p>
        </div>
        <div className="admin-settings-hero-status">
          <span className={office ? "ready" : "warning"}>
            {office ? <CheckCircle2 size={15} /> : <MapPinned size={15} />}
            {office ? "สำนักงานพร้อมใช้งาน" : "รอตั้งค่าพิกัดสำนักงาน"}
          </span>
        </div>
      </section>

      {params.saved ? (
        <div className="success-banner admin-settings-saved">
          <CheckCircle2 size={17} />
          {savedMessage(params)}
        </div>
      ) : null}

      <section className="admin-settings-summary">
        <div>
          <span><Building2 size={16} /> สำนักงาน</span>
          <strong>{officeCount}</strong>
          <small>{activeOfficeCount} จุดเปิดใช้งาน</small>
        </div>
        <div>
          <span><BellRing size={16} /> แจ้งเตือน</span>
          <strong>{reminderEnabled ? "เปิด" : "ปิด"}</strong>
          <small>หลัง {minutesLabel(settings?.checkoutReminderAfterMinutes)}</small>
        </div>
        <div>
          <span><Workflow size={16} /> ทริปกำลังเดินทาง</span>
          <strong>{activeTrips}</strong>
          <small>ต้องติดตามเช็คเอาท์</small>
        </div>
        <div>
          <span><AlertTriangle size={16} /> Anomaly</span>
          <strong>{openAnomalies}</strong>
          <small>เคสรอตรวจสอบ</small>
        </div>
      </section>

      <section className="admin-settings-layout">
        <div className="admin-settings-main">
          <div className="settings-section-label">
            <Sparkles size={16} />
            <span>ข้อมูลที่มีผลกับทั้งระบบ</span>
          </div>

          <SystemBrandingForm branding={branding} />

          <section className="admin-settings-operation-card">
            <div className="admin-settings-card-head clean">
              <span><SlidersHorizontal size={15} /> Operations</span>
              <div>
                <h2>แจ้งเตือนและตรวจข้อมูลผิดปกติ</h2>
                <p>ตั้งค่าพฤติกรรมระบบหลังเช็คอิน การเตือนลืมเช็คเอาท์ และเกณฑ์ตรวจ GPS/เลขไมล์</p>
              </div>
            </div>

            <form action={updateOperationalSettingsAction} className="admin-settings-form">
              <div className="settings-toggle-grid">
                <label className="toggle-row">
                  <input name="checkoutReminderEnabled" type="checkbox" defaultChecked={reminderEnabled} />
                  <span><BellRing size={16} /> เตือนลืมเช็คเอาท์</span>
                </label>
                <label className="toggle-row">
                  <input name="checkoutReminderEmailEnabled" type="checkbox" defaultChecked={emailEnabled} />
                  <span><Mail size={16} /> Email</span>
                </label>
                <label className="toggle-row">
                  <input name="checkoutReminderLineEnabled" type="checkbox" defaultChecked={lineEnabled} />
                  <span><MessageCircle size={16} /> LINE</span>
                </label>
              </div>

              <div className="settings-field-grid">
                <div className="field">
                  <label htmlFor="checkoutReminderAfterMinutes">เตือนหลังเช็คอิน</label>
                  <input className="input" id="checkoutReminderAfterMinutes" name="checkoutReminderAfterMinutes" type="number" min="30" max="2880" step="30" defaultValue={settings?.checkoutReminderAfterMinutes ?? 480} />
                </div>
                <div className="field">
                  <label htmlFor="anomalyGpsThresholdMeters">GPS ห่างไซต์เกิน</label>
                  <input className="input" id="anomalyGpsThresholdMeters" name="anomalyGpsThresholdMeters" type="number" min="50" max="5000" step="50" defaultValue={settings?.anomalyGpsThresholdMeters ?? 500} />
                </div>
                <div className="field">
                  <label htmlFor="anomalyDistanceVariancePercent">GPS ต่างจากเลขไมล์เกิน</label>
                  <input className="input" id="anomalyDistanceVariancePercent" name="anomalyDistanceVariancePercent" type="number" min="5" max="100" step="1" defaultValue={settings?.anomalyDistanceVariancePercent ?? 20} />
                </div>
              </div>

              <div className="settings-unit-row">
                <span><Clock3 size={14} /> นาที</span>
                <span><MapPinned size={14} /> เมตร</span>
                <span><Route size={14} /> เปอร์เซ็นต์</span>
              </div>

              <div className="admin-settings-actions">
                <button className="button primary" type="submit">
                  <Settings size={16} />
                  บันทึกการตั้งค่า
                </button>
              </div>
            </form>
          </section>

          <form action={runCheckoutRemindersAction} className="admin-settings-inline-card">
            <div>
              <strong>ทดสอบแจ้งเตือนลืมเช็คเอาท์</strong>
              <span>มี log แจ้งเตือนแล้ว {reminderLogs} รายการ ใช้ `SMTP_*`, `LINE_CHANNEL_ACCESS_TOKEN` และ `CRON_SECRET` เมื่อตั้งใช้งานจริง</span>
            </div>
            <button className="button secondary" type="submit">
              <Send size={16} />
              ส่งเตือนตอนนี้
            </button>
          </form>

          <div className="settings-section-label">
            <MapPinned size={16} />
            <span>จุดเริ่มต้นมาตรฐาน</span>
          </div>

          <OfficeLocationForm
            office={office ? {
              id: office.id,
              name: office.name,
              address: office.address,
              latitude: office.latitude,
              longitude: office.longitude,
              active: office.active,
              isDefault: office.isDefault,
              updatedAt: office.updatedAt.toISOString()
            } : null}
          />
        </div>

        <aside className="admin-settings-side">
          <section className="admin-settings-status-card">
            <div>
              <span className={office ? "status-dot ready" : "status-dot warning"} />
              <strong>{office ? office.name : "ยังไม่มีสำนักงานหลัก"}</strong>
              <small>{office ? `${office.latitude.toFixed(6)}, ${office.longitude.toFixed(6)}` : "เพิ่มพิกัดเพื่อใช้คำนวณทริปจากบริษัท"}</small>
            </div>
          </section>

          <section className="admin-settings-guide-card primary">
            <span><Route size={22} /></span>
            <h2>Flow ระยะทาง</h2>
            <p>ถ้าเริ่มจากบริษัท ระบบใช้พิกัดสำนักงาน ถ้าเริ่มจากบ้านหรือจุดอื่น ระบบใช้ GPS จุดเริ่มต้นของทริป แล้วเทียบกับเช็คอิน/เช็คเอาท์ถัดไป</p>
          </section>

          <section className="admin-settings-guide-card">
            <span><BellRing size={22} /></span>
            <h2>ช่องทางแจ้งเตือน</h2>
            <div className="admin-settings-flow-list">
              <div>
                <strong>Email</strong>
                <span>ต้องตั้งค่า SMTP ใน env</span>
              </div>
              <div>
                <strong>LINE</strong>
                <span>ต้องมี channel token และ LINE user id ในบัญชีผู้ใช้</span>
              </div>
              <div>
                <strong>Cron</strong>
                <span>เรียก `/api/tasks/checkout-reminders` พร้อม `CRON_SECRET`</span>
              </div>
            </div>
          </section>

          <section className="admin-settings-guide-card">
            <span><AlertTriangle size={22} /></span>
            <h2>เกณฑ์ตรวจสอบ</h2>
            <div className="admin-settings-flow-list">
              <div>
                <strong>GPS ห่างไซต์</strong>
                <span>เกิน {settings?.anomalyGpsThresholdMeters ?? 500} เมตร จะเปิดเคสให้แอดมินตรวจ</span>
              </div>
              <div>
                <strong>เลขไมล์และระยะทาง</strong>
                <span>ต่างจาก GPS เกิน {settings?.anomalyDistanceVariancePercent ?? 20}% หรือเลขไมล์ย้อน จะถูก flag</span>
              </div>
              <div>
                <strong>ค่าน้ำมัน</strong>
                <span>เทียบ กม./ลิตรจริงกับค่ามาตรฐานของรถ</span>
              </div>
            </div>
          </section>

          <section className="admin-settings-guide-card compact">
            <span><ShieldCheck size={22} /></span>
            <h2>สถิติสำนักงาน</h2>
            <div className="settings-mini-stats">
              <div>
                <strong>{officeOriginTrips}</strong>
                <span>เริ่มจากบริษัท</span>
              </div>
              <div>
                <strong>{officeDestinationTrips}</strong>
                <span>กลับบริษัท</span>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
