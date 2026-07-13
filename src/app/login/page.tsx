import {
  CheckCircle2,
  Clock3,
  LocateFixed,
  MapPinned,
  Navigation,
  Route,
  ShieldCheck
} from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { getAppBranding } from "@/lib/branding";

const errorMessages: Record<string, string> = {
  invalid: "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง",
  locked: "เข้าสู่ระบบไม่สำเร็จหลายครั้ง บัญชีบนอุปกรณ์นี้ถูกพักชั่วคราว 15 นาที",
  db: "ยังเชื่อมต่อฐานข้อมูลไม่ได้ กรุณาติดต่อผู้ดูแลระบบ",
  "db-starting": "ระบบกำลังเตรียมฐานข้อมูล กรุณารอสักครู่แล้วลองใหม่อีกครั้ง"
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const [params, branding] = await Promise.all([searchParams, getAppBranding()]);
  const error = params.error ? errorMessages[params.error] : null;
  const notice = params.notice === "password-changed"
    ? "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่"
    : null;

  return (
    <main className="login-shell">
      <div className="login-atmosphere" aria-hidden="true">
        <span className="login-orbit login-orbit-one" />
        <span className="login-orbit login-orbit-two" />
      </div>

      <section className="login-story" aria-label="ข้อมูลระบบ">
        <div className="login-story-top">
          <div className="login-brand-lockup">
            <span className="login-brand-mark">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="" />
              ) : (
                <MapPinned size={27} strokeWidth={2.2} />
              )}
            </span>
            <span>
              <strong>{branding.appName}</strong>
              <small>FIELD OPERATIONS</small>
            </span>
          </div>
          <span className="login-system-status">
            <i /> ระบบพร้อมใช้งาน
          </span>
        </div>

        <div className="login-story-copy">
          <span className="login-eyebrow"><LocateFixed size={16} /> ทำงานได้แม่นยำทุกพื้นที่</span>
          <h1>ทุกการเดินทาง<br />มีข้อมูลที่เชื่อถือได้</h1>
          <p>
            เช็กอินหน้างาน บันทึกเส้นทาง และจัดการค่าเดินทาง
            ครบจบในระบบเดียวสำหรับทีมภาคสนาม
          </p>
        </div>

        <div className="login-route-card" aria-hidden="true">
          <div className="login-route-head">
            <span><Navigation size={17} /> ภารกิจวันนี้</span>
            <strong>กำลังดำเนินการ</strong>
          </div>
          <div className="login-route-line">
            <span className="login-route-point start"><CheckCircle2 size={14} /></span>
            <i />
            <span className="login-route-pin"><MapPinned size={18} /></span>
          </div>
          <div className="login-route-labels">
            <span><small>จุดเริ่มต้น</small><strong>สำนักงานใหญ่</strong></span>
            <span><small>จุดหมาย</small><strong>พื้นที่โครงการ</strong></span>
          </div>
          <div className="login-route-meta">
            <span><Route size={15} /> บันทึกเส้นทางอัตโนมัติ</span>
            <span><Clock3 size={15} /> ข้อมูลแบบเรียลไทม์</span>
          </div>
        </div>

        <p className="login-story-foot"><ShieldCheck size={16} /> ข้อมูลตำแหน่งถูกจัดเก็บอย่างปลอดภัย</p>
      </section>

      <section className="login-access">
        <div className="login-mobile-brand">
          <span className="login-brand-mark">
            {branding.logoUrl ? <img src={branding.logoUrl} alt="" /> : <MapPinned size={24} />}
          </span>
          <span><strong>{branding.appName}</strong><small>FIELD OPERATIONS</small></span>
        </div>

        <div className="login-access-card">
          <div className="login-heading">
            <span className="login-heading-icon"><Navigation size={21} /></span>
            <div>
              <span>ยินดีต้อนรับกลับ</span>
              <h2>เข้าสู่ระบบ</h2>
            </div>
          </div>
          <p className="login-intro">ใช้บัญชีของคุณเพื่อเริ่มบันทึกงานและการเดินทาง</p>

          {error ? <div className="login-alert error" role="alert">{error}</div> : null}
          {notice ? <div className="login-alert success" role="status">{notice}</div> : null}

          <LoginForm />

          <div className="login-help">
            <span><ShieldCheck size={17} /></span>
            <p><strong>เข้าสู่ระบบอย่างปลอดภัย</strong> หากไม่สามารถเข้าใช้งานได้ กรุณาติดต่อผู้ดูแลระบบ</p>
          </div>
        </div>

        <p className="login-copyright">© {new Date().getFullYear()} {branding.appName} · ระบบบริหารงานภาคสนาม</p>
      </section>
    </main>
  );
}
