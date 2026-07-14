"use client";

import { ArrowLeft, Building2, ClipboardList, LocateFixed, MapPinned, Phone, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ProjectLocationMap, type ProjectLocation } from "@/components/project-location-map";
import { createProjectAction } from "@/lib/actions";

type ProjectFormProps = {
  backHref?: string;
  redirectTo?: string;
};

export function ProjectForm({ backHref = "/projects", redirectTo = "/projects" }: ProjectFormProps) {
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const gpsText = useMemo(() => {
    if (!gps) return "ยังไม่ได้ดึงตำแหน่ง";
    return `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}${gps.accuracy ? ` ±${Math.round(gps.accuracy)}m` : ""}`;
  }, [gps]);

  function captureGps() {
    setGpsError(null);
    setGpsLoading(true);

    if (!navigator.geolocation) {
      setGpsLoading(false);
      setGpsError("เบราว์เซอร์นี้ไม่รองรับการดึงตำแหน่ง");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false);
        setGps({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        setGpsLoading(false);
        setGpsError(error.message || "ไม่สามารถดึงตำแหน่งได้");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  function updateLocation(location: ProjectLocation) {
    setGps({
      latitude: location.latitude,
      longitude: location.longitude
    });
    setGpsError(null);
  }

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await createProjectAction(formData);
        });
      }}
      className="new-project-form"
    >
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input type="hidden" name="latitude" value={gps?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={gps?.longitude ?? ""} />

      <section className="new-project-form-card">
        <div className="new-project-step-head">
          <span>1</span>
          <div>
            <h2>ข้อมูลโครงการ</h2>
            <p>ชื่อโครงการ ลูกค้า และผู้ติดต่อหลักสำหรับติดตามงาน</p>
          </div>
        </div>

        <div className="form-grid two">
          <div className="field">
            <label htmlFor="name"><Building2 size={15} /> ชื่อโครงการ</label>
            <input className="input" id="name" name="name" placeholder="เช่น ติดตั้งระบบควบคุมอาคาร B" required />
          </div>
          <div className="field">
            <label htmlFor="customerName"><UserRound size={15} /> ชื่อลูกค้า</label>
            <input className="input" id="customerName" name="customerName" placeholder="บริษัท/หน่วยงาน" required />
          </div>
          <div className="field">
            <label htmlFor="contactName"><UserRound size={15} /> ผู้ติดต่อ</label>
            <input className="input" id="contactName" name="contactName" placeholder="ชื่อผู้ประสานงาน" />
          </div>
          <div className="field">
            <label htmlFor="contactPhone"><Phone size={15} /> เบอร์โทร</label>
            <input className="input" id="contactPhone" name="contactPhone" placeholder="08x-xxx-xxxx" />
          </div>
        </div>
      </section>

      <section className="new-project-form-card">
        <div className="new-project-step-head">
          <span>2</span>
          <div>
            <h2>ตำแหน่งหน้างาน</h2>
            <p>เพิ่มที่อยู่และดึง GPS เมื่ออยู่หน้างานจริง</p>
          </div>
        </div>

        <button className={`new-project-gps-button ${gps ? "ready" : ""}`} type="button" onClick={captureGps} disabled={gpsLoading}>
          <span><LocateFixed size={22} /></span>
          <div>
            <strong>{gpsLoading ? "กำลังดึง GPS..." : gps ? "ดึง GPS แล้ว" : "ดึงตำแหน่งปัจจุบัน"}</strong>
            <small>{gpsText}</small>
          </div>
        </button>
        {gpsError ? <div className="new-project-alert">{gpsError}</div> : null}

        <div className="project-location-picker">
          <div className="project-location-picker-head">
            <div>
              <strong><MapPinned size={17} /> ปักหมุดตำแหน่งที่ตั้ง</strong>
              <span>{gps ? "ลากหมุดเพื่อปรับตำแหน่ง หรือคลิกจุดใหม่บนแผนที่" : "คลิกบนแผนที่เพื่อวางหมุด หรือกดดึงตำแหน่งปัจจุบันด้านบน"}</span>
            </div>
            <em className={gps ? "ready" : ""}>{gps ? "เลือกตำแหน่งแล้ว" : "รอปักหมุด"}</em>
          </div>
          <ProjectLocationMap location={gps} onLocationChange={updateLocation} />
        </div>

        <div className="form-grid two">
          <div className="field">
            <label htmlFor="address"><MapPinned size={15} /> ที่อยู่หน้างาน</label>
            <textarea className="textarea" id="address" name="address" placeholder="รายละเอียดที่ตั้ง อาคาร ชั้น จุดสังเกต" required />
          </div>
          <div className="field">
            <label htmlFor="province">จังหวัด</label>
            <input className="input" id="province" name="province" placeholder="เช่น กรุงเทพมหานคร" />
          </div>
        </div>
      </section>

      <section className="new-project-form-card">
        <div className="new-project-step-head">
          <span>3</span>
          <div>
            <h2>รายละเอียดงาน</h2>
            <p>สรุปสิ่งที่ไปทำหรือสิ่งที่ทีมต้องติดตามต่อ</p>
          </div>
        </div>

        <div className="field">
          <label htmlFor="description"><ClipboardList size={15} /> รายละเอียดเพิ่มเติม</label>
          <textarea className="textarea" id="description" name="description" placeholder="เช่น ไปสำรวจโหลดไฟฟ้า รอลูกค้าส่งแบบ หรือกำลังทำราคา" />
        </div>
      </section>

      <div className="new-project-actions">
        <Link className="button secondary" href={backHref}>
          <ArrowLeft size={17} />
          กลับ
        </Link>
        <button className="button" type="submit" disabled={isPending}>
          <Save size={17} />
          {isPending ? "กำลังบันทึก..." : "บันทึกโครงการ"}
        </button>
      </div>
    </form>
  );
}
