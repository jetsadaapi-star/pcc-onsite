"use client";

import clsx from "clsx";
import {
  AlertTriangle,
  BarChart3,
  BookOpenText,
  BriefcaseBusiness,
  CarFront,
  ClipboardCheck,
  Fuel,
  Gauge,
  LogOut,
  MapPinned,
  Menu,
  ReceiptText,
  Settings,
  Sparkles,
  UserRound,
  Users,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useState } from "react";
import { logoutAction } from "@/lib/actions";

type ShellUser = {
  name: string;
  email: string;
  role: string;
  profilePhotoUrl?: string | null;
};

type ShellBranding = {
  appName: string;
  logoUrl: string | null;
};

type NavItem = {
  href: string;
  label: string;
  description: string;
  tone: "blue" | "teal" | "amber" | "violet" | "rose";
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
};

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "ภาพรวม", description: "งานและค่าเดินทาง", icon: Gauge, tone: "blue" },
  { href: "/check-in", label: "เช็คอินหน้างาน", description: "GPS และรูปหลักฐาน", icon: MapPinned, tone: "teal" },
  { href: "/projects", label: "โครงการ/หน้างาน", description: "ค้นหาและเปลี่ยนสถานะ", icon: BriefcaseBusiness, tone: "amber" },
  { href: "/vehicles", label: "รถของฉัน", description: "เพิ่มรถและรออนุมัติ", icon: CarFront, tone: "teal" },
  { href: "/fuel", label: "บันทึกเติมน้ำมัน", description: "เลขไมล์และใบเสร็จ", icon: Fuel, tone: "rose" },
  { href: "/reports", label: "รายงานของฉัน", description: "ระยะทางและยอดเคลม", icon: BarChart3, tone: "violet" },
  { href: "/guide", label: "วิธีใช้งาน", description: "คู่มือมือถือสำหรับหน้างาน", icon: BookOpenText, tone: "blue" }
];

const accountNav: NavItem[] = [
  { href: "/profile", label: "โปรไฟล์ของฉัน", description: "รูปโปรไฟล์และข้อมูลบัญชี", icon: UserRound, tone: "blue" }
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Admin Overview", description: "สรุปภาพรวมทั้งระบบ", icon: Settings, tone: "blue" },
  { href: "/reports", label: "รายงานทั้งระบบ", description: "ส่งออกและวิเคราะห์ทุกทีม", icon: BarChart3, tone: "violet" },
  { href: "/admin/projects", label: "จัดการโครงการ", description: "มอบหมายและตรวจสถานะ", icon: BriefcaseBusiness, tone: "amber" },
  { href: "/admin/check-ins", label: "ประวัติเช็คอิน", description: "ตรวจว่าใครไปที่ไหน", icon: ClipboardCheck, tone: "teal" },
  { href: "/admin/anomalies", label: "ตรวจความผิดปกติ", description: "GPS เลขไมล์ และค่าน้ำมัน", icon: AlertTriangle, tone: "amber" },
  { href: "/admin/vehicles", label: "จัดการรถ", description: "รถ อัตราสิ้นเปลือง และสถานะ", icon: CarFront, tone: "teal" },
  { href: "/admin/travel", label: "ค่าเดินทาง", description: "อนุมัติและตั้งค่าเรต", icon: ReceiptText, tone: "rose" },
  { href: "/admin/users", label: "ผู้ใช้งาน", description: "บัญชีและสิทธิ์", icon: Users, tone: "violet" }
];

const roleLabels: Record<string, string> = {
  ADMIN: "แอดมิน",
  EMPLOYEE: "พนักงาน",
  SALES: "ผู้แทนขาย",
  ENGINEER: "วิศวกร"
};

function NavLink({ href, label, description, icon: Icon, tone, onClick }: NavItem & { onClick?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href || (!["/dashboard", "/admin", "/reports"].includes(href) && pathname.startsWith(href));

  return (
    <Link href={href} className={clsx("nav-link", active && "active")} onClick={onClick}>
      <span className={clsx("nav-icon", `tone-${tone}`)}>
        <Icon size={17} aria-hidden={true} />
      </span>
      <span className="nav-copy">
        <span>{label}</span>
        <small>{description}</small>
      </span>
    </Link>
  );
}

function NavGroup({
  title,
  eyebrow,
  items,
  onClick
}: {
  title: string;
  eyebrow: string;
  items: NavItem[];
  onClick: () => void;
}) {
  return (
    <section className="nav-group">
      <div className="nav-section">
        <span>{title}</span>
        <small>{eyebrow}</small>
      </div>
      <nav className="nav-list">
        {items.map((item) => (
          <NavLink key={item.href} {...item} onClick={onClick} />
        ))}
      </nav>
    </section>
  );
}

export function AppShell({ user, branding, children }: { user: ShellUser; branding: ShellBranding; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const initials = user.name.slice(0, 1).toUpperCase();
  const isAdmin = user.role === "ADMIN";
  const appName = branding.appName || "PCC OnSite";

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <button className="button icon secondary" type="button" onClick={() => setOpen(true)} aria-label="เปิดเมนู">
          <Menu size={20} />
        </button>
        <strong>{appName}</strong>
        <span className="badge info">{roleLabels[user.role] ?? user.role}</span>
      </div>

      <aside className={clsx("sidebar", open && "open")}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            {branding.logoUrl ? <img src={branding.logoUrl} alt={appName} /> : "P"}
          </div>
          <div className="brand-copy">
            <strong>{appName}</strong>
            <span>Field operations</span>
          </div>
          <button className="sidebar-close" type="button" onClick={close} aria-label="ปิดเมนู">
            <X size={18} />
          </button>
        </div>

        <Link className="sidebar-highlight" href={isAdmin ? "/reports" : "/check-in"} onClick={close}>
          <span className="highlight-icon">
            <Sparkles size={18} />
          </span>
          <span>
            <strong>{isAdmin ? "รายงานทั้งระบบ" : "เช็คอินด่วน"}</strong>
            <small>{isAdmin ? "ดูภาพรวม ส่งออก และตรวจยอดทุกทีม" : "บันทึก GPS และเริ่มคำนวณระยะทาง"}</small>
          </span>
        </Link>

        {!isAdmin ? <NavGroup title="งานประจำวัน" eyebrow="FIELD" items={mainNav} onClick={close} /> : null}

        {isAdmin ? (
          <NavGroup
            title="ผู้ดูแลระบบ"
            eyebrow="ADMIN"
            items={[
              ...adminNav,
              { href: "/admin/settings", label: "ตั้งค่าระบบ", description: "พิกัดบริษัทและค่าเริ่มต้น", icon: Settings, tone: "blue" }
            ]}
            onClick={close}
          />
        ) : null}

        <div className="sidebar-footer">
          <NavGroup title="บัญชี" eyebrow="ME" items={accountNav} onClick={close} />
          <Link className="user-chip" href="/profile" onClick={close}>
            <div className="avatar">
              {user.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt={user.name} /> : initials}
            </div>
            <div className="user-meta">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
              <em>{roleLabels[user.role] ?? user.role}</em>
            </div>
          </Link>
          <form action={logoutAction}>
            <button className="logout-button" type="submit">
              <LogOut size={17} />
              ออกจากระบบ
            </button>
          </form>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
