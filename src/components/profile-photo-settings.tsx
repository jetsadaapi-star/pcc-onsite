"use client";

import { Camera, ImagePlus, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionFeedbackForm } from "@/components/action-feedback-form";
import { removeProfilePhotoFormAction, updateProfilePhotoFormAction } from "@/lib/form-actions";

type ProfilePhotoSettingsProps = {
  user: {
    name: string;
    email: string;
    role: string;
    profilePhotoUrl: string | null;
  };
};

export function ProfilePhotoSettings({ user }: ProfilePhotoSettingsProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const initials = user.name.slice(0, 1).toUpperCase();
  const photoSrc = preview ?? user.profilePhotoUrl;
  const hasPhoto = Boolean(user.profilePhotoUrl);

  const statusText = useMemo(() => {
    if (preview) return "เลือกรูปใหม่แล้ว กดบันทึกเพื่อใช้งาน";
    if (hasPhoto) return "กำลังใช้รูปโปรไฟล์นี้ในระบบ";
    return "ยังไม่ได้ตั้งค่ารูปโปรไฟล์";
  }, [hasPhoto, preview]);

  return (
    <section className="profile-photo-card">
      <div className="profile-photo-preview">
        <div className="profile-photo-frame">
          {photoSrc ? <img src={photoSrc} alt={user.name} /> : <span>{initials}</span>}
        </div>
        <div>
          <strong>{user.name}</strong>
          <span>{user.email}</span>
          <em>{statusText}</em>
        </div>
      </div>

      <ActionFeedbackForm action={updateProfilePhotoFormAction} className="profile-photo-form" successMessage="บันทึกรูปโปรไฟล์แล้ว">
        <label className="profile-upload-target" htmlFor="profile-photo">
          <span><ImagePlus size={22} /></span>
          <div>
            <strong>เลือกรูปโปรไฟล์</strong>
            <small>รองรับไฟล์รูปภาพจากกล้องหรือแกลเลอรี แนะนำรูปสี่เหลี่ยมจัตุรัส</small>
          </div>
        </label>
        <input
          id="profile-photo"
          name="profilePhoto"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
          required
        />
        <div className="profile-photo-actions">
          <button className="button" type="submit">
            <Upload size={17} />
            บันทึกรูปโปรไฟล์
          </button>
        </div>
      </ActionFeedbackForm>

      {hasPhoto ? (
        <ActionFeedbackForm action={removeProfilePhotoFormAction} className="profile-remove-form">
          <button className="button secondary danger-soft" type="submit">
            <Trash2 size={16} />
            ลบรูปโปรไฟล์
          </button>
        </ActionFeedbackForm>
      ) : null}

      <div className="profile-photo-note">
        <Camera size={16} />
        <span>รูปนี้จะแสดงใน sidebar และส่วนบัญชีของผู้ใช้ทันทีหลังบันทึก</span>
      </div>
    </section>
  );
}
