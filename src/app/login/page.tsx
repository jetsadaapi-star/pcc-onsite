import { MapPinned } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getAppBranding } from "@/lib/branding";
import { redirect } from "next/navigation";
import { loginAction } from "./actions";

const errorMessages: Record<string, string> = {
  invalid: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  locked: "เข้าสู่ระบบผิดหลายครั้ง บัญชีจากอุปกรณ์นี้ถูกพัก 15 นาที",
  db: "ยังเชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจ PostgreSQL",
  "db-starting": "ฐานข้อมูลกำลังเริ่มทำงาน กรุณาลองใหม่อีกครั้ง"
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const [params, branding] = await Promise.all([searchParams, getAppBranding()]);
  const error = params.error ? errorMessages[params.error] : null;

  return (
    <main className="login-page">
      <section className="login-panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div className="brand-mark">
            {branding.logoUrl ? <img src={branding.logoUrl} alt={branding.appName} /> : <MapPinned size={24} />}
          </div>
          <div>
            <h1>{branding.appName}</h1>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              เช็คอินหน้างานและคำนวณค่าเดินทาง
            </p>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {params.notice === "password-changed" ? <div className="success-banner">เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่</div> : null}

        <form action={loginAction} className="form-grid">
          <div className="field">
            <label htmlFor="email">อีเมล</label>
            <input className="input" id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="field">
            <label htmlFor="password">รหัสผ่าน</label>
            <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="button" type="submit">เข้าสู่ระบบ</button>
        </form>
      </section>
    </main>
  );
}
