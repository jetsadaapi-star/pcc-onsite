import { KeyRound, ShieldCheck } from "lucide-react";
import { ActionFeedbackForm } from "@/components/action-feedback-form";
import { changeOwnPasswordFormAction } from "@/lib/form-actions";

export function ProfilePasswordForm() {
  return (
    <section className="profile-info-card">
      <div className="profile-info-head">
        <span><KeyRound size={21} /></span>
        <div>
          <h2>เปลี่ยนรหัสผ่าน</h2>
          <p>การบันทึกจะออกจากระบบทุกอุปกรณ์ที่เคยเข้าสู่ระบบไว้</p>
        </div>
      </div>
      <ActionFeedbackForm action={changeOwnPasswordFormAction} className="form-grid">
        <div className="field">
          <label htmlFor="profile-current-password">รหัสผ่านปัจจุบัน</label>
          <input className="input" id="profile-current-password" name="currentPassword" type="password" autoComplete="current-password" required />
        </div>
        <div className="field">
          <label htmlFor="profile-new-password">รหัสผ่านใหม่</label>
          <input className="input" id="profile-new-password" name="newPassword" type="password" minLength={8} autoComplete="new-password" required />
        </div>
        <div className="field">
          <label htmlFor="profile-confirm-password">ยืนยันรหัสผ่านใหม่</label>
          <input className="input" id="profile-confirm-password" name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required />
        </div>
        <button className="button" type="submit"><ShieldCheck size={16} /> เปลี่ยนรหัสผ่าน</button>
      </ActionFeedbackForm>
    </section>
  );
}
