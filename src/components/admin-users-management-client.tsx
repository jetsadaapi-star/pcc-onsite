"use client";

import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  KeyRound,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  UserRound,
  X
} from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUserAction, toggleUserActiveAction, updateUserAction } from "@/lib/actions";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  phone: string | null;
  lineUserId: string | null;
  checkoutReminderEnabled: boolean;
  profilePhotoUrl: string | null;
  active: boolean;
  createdAt: string;
  counts: {
    checkIns: number;
    createdProjects: number;
    vehicles: number;
    travelClaims: number;
  };
};

const roles = ["ADMIN", "EMPLOYEE", "SALES", "ENGINEER"];
const roleLabels: Record<string, string> = {
  ADMIN: "แอดมิน",
  EMPLOYEE: "พนักงาน",
  SALES: "ผู้แทนขาย",
  ENGINEER: "วิศวกร"
};

function roleTone(role: string) {
  if (role === "ADMIN") return "admin";
  if (role === "ENGINEER") return "engineer";
  if (role === "SALES") return "sales";
  return "employee";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok"
  }).format(new Date(value));
}

function UserFormModal({
  user,
  onClose
}: {
  user?: AdminUserRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const action = user ? updateUserAction : createUserAction;

  function submit(formData: FormData) {
    startTransition(async () => {
      await action(formData);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="modal-backdrop vehicle-modal-backdrop" role="presentation">
      <section className="vehicle-modal-panel admin-user-modal" role="dialog" aria-modal="true" aria-labelledby="admin-user-modal-title">
        <div className="vehicle-modal-head">
          <span><UserRound size={21} /></span>
          <div>
            <h2 id="admin-user-modal-title">{user ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}</h2>
            <p>{user ? "ปรับข้อมูล บทบาท หรือเปลี่ยนรหัสผ่านเมื่อจำเป็น" : "สร้างบัญชีสำหรับพนักงาน ผู้แทนขาย วิศวกร หรือแอดมิน"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>

        <form action={submit} className="vehicle-modal-form" key={user?.id ?? "new-user"}>
          {user ? <input type="hidden" name="id" value={user.id} /> : null}

          <div className="form-grid two">
            <div className="field">
              <label htmlFor="admin-user-name">ชื่อผู้ใช้</label>
              <input className="input" id="admin-user-name" name="name" defaultValue={user?.name ?? ""} placeholder="เช่น Jetsada Somchai" required />
            </div>
            <div className="field">
              <label htmlFor="admin-user-email">อีเมล</label>
              <input className="input" id="admin-user-email" name="email" type="email" defaultValue={user?.email ?? ""} placeholder="name@company.com" required />
            </div>
          </div>

          <div className="form-grid three">
            <div className="field">
              <label htmlFor="admin-user-role">บทบาท</label>
              <select className="select" id="admin-user-role" name="role" defaultValue={user?.role ?? "EMPLOYEE"}>
                {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="admin-user-department">แผนก</label>
              <input className="input" id="admin-user-department" name="department" defaultValue={user?.department ?? ""} placeholder="เช่น Sales, Engineering" />
            </div>
            <div className="field">
              <label htmlFor="admin-user-phone">เบอร์โทร</label>
              <input className="input" id="admin-user-phone" name="phone" defaultValue={user?.phone ?? ""} placeholder="08x-xxx-xxxx" />
            </div>
          </div>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor="admin-user-lineUserId"><MessageCircle size={15} /> LINE user id</label>
              <input className="input" id="admin-user-lineUserId" name="lineUserId" defaultValue={user?.lineUserId ?? ""} placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
            </div>
            <label className="toggle-row admin-user-reminder-toggle">
              <input name="checkoutReminderEnabled" type="checkbox" defaultChecked={user?.checkoutReminderEnabled ?? true} />
              <span><BellRing size={16} /> รับแจ้งเตือนลืมเช็คเอาท์</span>
            </label>
          </div>

          <div className="field">
            <label htmlFor="admin-user-password">
              <KeyRound size={15} />
              {user ? "รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน"}
            </label>
            <input className="input" id="admin-user-password" name="password" type="password" minLength={8} autoComplete="new-password" required={!user} placeholder="อย่างน้อย 8 ตัวอักษร" />
          </div>

          <div className="admin-user-form-hint">
            <ShieldCheck size={16} />
            <span>แอดมินควรใช้บทบาท ADMIN เฉพาะผู้ที่จัดการระบบจริง ส่วนทีมภาคสนามใช้ EMPLOYEE, SALES หรือ ENGINEER</span>
          </div>

          <div className="vehicle-modal-actions">
            <button className="button secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="button" type="submit" disabled={isPending}>
              <CheckCircle2 size={16} />
              {isPending ? "กำลังบันทึก..." : user ? "บันทึกการแก้ไข" : "สร้างบัญชี"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ToggleUserForm({ user, currentAdminId }: { user: AdminUserRow; currentAdminId: string }) {
  const isSelf = user.id === currentAdminId;

  return (
    <form action={toggleUserActiveAction}>
      <input type="hidden" name="id" value={user.id} />
      <input type="hidden" name="active" value={user.active ? "false" : "true"} />
      <button
        className={`admin-users-action ${user.active ? "danger" : "success"}`}
        type="submit"
        disabled={isSelf && user.active}
        title={isSelf && user.active ? "ไม่สามารถปิดบัญชีตัวเองได้" : undefined}
      >
        {user.active ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
        {user.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      </button>
    </form>
  );
}

export function AdminUsersManagementClient({
  users,
  currentAdminId
}: {
  users: AdminUserRow[];
  currentAdminId: string;
}) {
  const [modal, setModal] = useState<{ user?: AdminUserRow } | null>(null);

  return (
    <>
      <div className="admin-users-table-toolbar">
        <div>
          <strong>รายการผู้ใช้</strong>
          <span>จัดการบัญชี บทบาท สถานะ และข้อมูลติดต่อ</span>
        </div>
        <button className="button admin-users-add-button" type="button" onClick={() => setModal({})}>
          <Plus size={17} />
          เพิ่มผู้ใช้
        </button>
      </div>

      <div className="admin-users-table-wrap">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>ผู้ใช้</th>
              <th>บทบาท/สถานะ</th>
              <th>ข้อมูลติดต่อ</th>
              <th>กิจกรรม</th>
              <th>สร้างเมื่อ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="admin-users-person">
                    <span>{user.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt={user.name} /> : user.name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{user.name}</strong>
                      <small>{user.department || "ไม่ระบุแผนก"}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`admin-users-role ${roleTone(user.role)}`}>{roleLabels[user.role] ?? user.role}</span>
                  <span className={`admin-users-status ${user.active ? "active" : "inactive"}`}>{user.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</span>
                </td>
                <td>
                  <span className="admin-users-contact"><Mail size={14} /> {user.email}</span>
                  <span className="admin-users-contact muted"><Phone size={14} /> {user.phone || "ไม่ระบุเบอร์"}</span>
                </td>
                <td>
                  <div className="admin-users-metrics">
                    <span>{user.counts.checkIns} เช็คอิน</span>
                    <span>{user.counts.createdProjects} โครงการ</span>
                    <span>{user.counts.vehicles} รถ</span>
                    <span>{user.counts.travelClaims} เบิกเดินทาง</span>
                  </div>
                </td>
                <td>{formatDate(user.createdAt)}</td>
                <td>
                  <div className="admin-users-actions">
                    <button className="admin-users-action edit" type="button" onClick={() => setModal({ user })}>
                      <Pencil size={14} />
                      แก้ไข
                    </button>
                    <ToggleUserForm user={user} currentAdminId={currentAdminId} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-users-mobile-list">
        {users.map((user) => (
          <article className="admin-users-mobile-card" key={user.id}>
            <div className="admin-users-mobile-head">
              <div className="admin-users-person">
                <span>{user.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt={user.name} /> : user.name.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </div>
              </div>
              <span className={`admin-users-status ${user.active ? "active" : "inactive"}`}>{user.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</span>
            </div>
            <div className="admin-users-mobile-meta">
              <span className={`admin-users-role ${roleTone(user.role)}`}>{roleLabels[user.role] ?? user.role}</span>
              <span>{user.department || "ไม่ระบุแผนก"}</span>
              <span>{user.phone || "ไม่ระบุเบอร์"}</span>
            </div>
            <div className="admin-users-metrics">
              <span>{user.counts.checkIns} เช็คอิน</span>
              <span>{user.counts.createdProjects} โครงการ</span>
              <span>{user.counts.vehicles} รถ</span>
              <span>{user.counts.travelClaims} เบิกเดินทาง</span>
            </div>
            <div className="admin-users-actions">
              <button className="admin-users-action edit" type="button" onClick={() => setModal({ user })}>
                <Pencil size={14} />
                แก้ไข
              </button>
              <ToggleUserForm user={user} currentAdminId={currentAdminId} />
            </div>
          </article>
        ))}
      </div>

      {users.length === 0 ? (
        <div className="admin-users-empty">
          <UserRound size={28} />
          <strong>ไม่พบผู้ใช้ตามตัวกรอง</strong>
          <span>ลองล้างตัวกรองหรือเพิ่มผู้ใช้ใหม่</span>
        </div>
      ) : null}

      {modal ? <UserFormModal user={modal.user} onClose={() => setModal(null)} /> : null}
    </>
  );
}
