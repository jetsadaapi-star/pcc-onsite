import { BriefcaseBusiness, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { ProfilePhotoSettings } from "@/components/profile-photo-settings";
import { ProfilePasswordForm } from "@/components/profile-password-form";
import { requireUser } from "@/lib/auth";
import { roleLabels } from "@/lib/labels";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="content-stack profile-page">
      <section className="profile-hero">
        <div>
          <span className="hero-label">
            <UserRound size={15} />
            My Profile
          </span>
          <h1>โปรไฟล์ของฉัน</h1>
          <p>ตั้งค่ารูปโปรไฟล์และตรวจสอบข้อมูลบัญชีที่ใช้ในระบบเช็คอินภาคสนาม</p>
        </div>
      </section>

      <section className="profile-layout">
        <ProfilePhotoSettings
          user={{
            name: user.name,
            email: user.email,
            role: user.role,
            profilePhotoUrl: user.profilePhotoUrl
          }}
        />

        <aside className="profile-info-card">
          <div className="profile-info-head">
            <span><ShieldCheck size={21} /></span>
            <div>
              <h2>ข้อมูลบัญชี</h2>
              <p>ข้อมูลส่วนนี้แก้ไขโดยผู้ดูแลระบบ</p>
            </div>
          </div>
          <div className="profile-info-list">
            <div>
              <span><UserRound size={15} /> ชื่อ</span>
              <strong>{user.name}</strong>
            </div>
            <div>
              <span><Mail size={15} /> อีเมล</span>
              <strong>{user.email}</strong>
            </div>
            <div>
              <span><BriefcaseBusiness size={15} /> บทบาท</span>
              <strong>{roleLabels[user.role] ?? user.role}</strong>
            </div>
            <div>
              <span><Phone size={15} /> เบอร์โทร</span>
              <strong>{user.phone || "ยังไม่ระบุ"}</strong>
            </div>
          </div>
        </aside>
        <ProfilePasswordForm />
      </section>
    </div>
  );
}
