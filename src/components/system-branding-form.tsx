"use client";

import { ImagePlus, Save, Settings2, Upload } from "lucide-react";
import { useState } from "react";
import { updateSystemBrandingAction } from "@/lib/actions";

type SystemBrandingFormProps = {
  branding: {
    appName: string;
    logoUrl: string | null;
    faviconUrl: string | null;
  };
};

export function SystemBrandingForm({ branding }: SystemBrandingFormProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const logoSrc = logoPreview ?? branding.logoUrl;
  const faviconSrc = faviconPreview ?? branding.faviconUrl;

  return (
    <form action={updateSystemBrandingAction} className="system-branding-form">
      <input type="hidden" name="currentLogoUrl" value={branding.logoUrl ?? ""} />
      <input type="hidden" name="currentFaviconUrl" value={branding.faviconUrl ?? ""} />

      <section className="system-branding-card">
        <div className="system-branding-head">
          <span><Settings2 size={22} /></span>
          <div>
            <h2>แบรนด์ระบบ</h2>
            <p>ตั้งชื่อระบบ โลโก้ และไอคอนเว็บที่ใช้ใน sidebar, หน้า login และ browser tab</p>
          </div>
        </div>

        <div className="system-branding-fields">
          <div className="field">
            <label htmlFor="system-appName">ชื่อระบบ</label>
            <input className="input" id="system-appName" name="appName" defaultValue={branding.appName || "PCC OnSite"} required />
          </div>

          <div className="system-branding-upload-grid">
            <label className="system-branding-upload" htmlFor="system-logo">
              <span className="system-branding-preview logo">
                {logoSrc ? <img src={logoSrc} alt="System logo" /> : <ImagePlus size={24} />}
              </span>
              <div>
                <strong>โลโก้ระบบ</strong>
                <small>ใช้ใน sidebar และหน้า login แนะนำรูป PNG/JPG พื้นหลังโปร่งใส</small>
              </div>
            </label>
            <input
              id="system-logo"
              name="logo"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                setLogoPreview(file ? URL.createObjectURL(file) : null);
              }}
            />

            <label className="system-branding-upload" htmlFor="system-favicon">
              <span className="system-branding-preview favicon">
                {faviconSrc ? <img src={faviconSrc} alt="Web icon" /> : <Upload size={22} />}
              </span>
              <div>
                <strong>ไอคอนเว็บ</strong>
                <small>ใช้เป็น favicon/browser tab แนะนำรูปสี่เหลี่ยม 512x512</small>
              </div>
            </label>
            <input
              id="system-favicon"
              name="favicon"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                setFaviconPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </div>
        </div>

        <div className="system-branding-actions">
          <button className="button" type="submit">
            <Save size={17} />
            บันทึกแบรนด์ระบบ
          </button>
        </div>
      </section>
    </form>
  );
}
