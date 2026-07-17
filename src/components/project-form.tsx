"use client";

import { ArrowLeft, Building2, ClipboardList, LocateFixed, MapPinned, Navigation, Phone, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ProjectLocationMap, type ProjectLocation } from "@/components/project-location-map";
import { createProjectFormAction } from "@/lib/form-actions";

type ProjectFormProps = {
  backHref?: string;
  redirectTo?: string;
};

export function ProjectForm({ backHref = "/projects", redirectTo = "/projects" }: ProjectFormProps) {
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [latitudeInput, setLatitudeInput] = useState("");
  const [longitudeInput, setLongitudeInput] = useState("");
  const [coordinateError, setCoordinateError] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const gpsText = useMemo(() => {
    if (!gps) return "ยังไม่ได้ดึงตำแหน่ง";
    return `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}${gps.accuracy ? ` ±${Math.round(gps.accuracy)}m` : ""}`;
  }, [gps]);

  function parseCoordinates(latitudeValue: string, longitudeValue: string) {
    if (!latitudeValue.trim() || !longitudeValue.trim()) return null;
    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
  }

  function handleCoordinateChange(latitudeValue: string, longitudeValue: string) {
    setLatitudeInput(latitudeValue);
    setLongitudeInput(longitudeValue);
    setCoordinateError(null);

    const location = parseCoordinates(latitudeValue, longitudeValue);
    if (location) {
      setGps(location);
      setGpsError(null);
    } else {
      setGps(null);
    }
  }

  function applyCoordinates() {
    const location = parseCoordinates(latitudeInput, longitudeInput);
    if (!location) {
      setCoordinateError("กรุณากรอกละติจูด -90 ถึง 90 และลองจิจูด -180 ถึง 180 ให้ครบทั้งสองช่อง");
      return;
    }

    setGps(location);
    setLatitudeInput(location.latitude.toFixed(6));
    setLongitudeInput(location.longitude.toFixed(6));
    setGpsError(null);
    setCoordinateError(null);
  }

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
        setLatitudeInput(position.coords.latitude.toFixed(6));
        setLongitudeInput(position.coords.longitude.toFixed(6));
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
    setLatitudeInput(location.latitude.toFixed(6));
    setLongitudeInput(location.longitude.toFixed(6));
    setGps({
      latitude: location.latitude,
      longitude: location.longitude
    });
    setGpsError(null);
    setCoordinateError(null);
  }

  return (
    <form
      action={(formData) => {
        setActionError(null);
        startTransition(async () => {
          const result = await createProjectFormAction(formData);
          if (!result.ok) setActionError(result.error);
        });
      }}
      className="new-project-form"
    >
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {actionError ? <div className="error-banner" role="alert">{actionError}</div> : null}

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

        <div className="project-coordinate-panel">
          <div className="project-coordinate-copy">
            <strong>วางพิกัดละติจูด / ลองจิจูด</strong>
            <span>กรอกพิกัดให้ครบ แล้วหมุดบนแผนที่จะเลื่อนไปยังตำแหน่งนั้น</span>
          </div>
          <div className="project-coordinate-fields">
            <div className="field">
              <label htmlFor="latitude">ละติจูด (Latitude)</label>
              <input
                className="input"
                id="latitude"
                inputMode="decimal"
                max="90"
                min="-90"
                name="latitude"
                onChange={(event) => handleCoordinateChange(event.target.value, longitudeInput)}
                placeholder="13.756300"
                required={Boolean(longitudeInput.trim())}
                step="any"
                type="number"
                value={latitudeInput}
              />
            </div>
            <div className="field">
              <label htmlFor="longitude">ลองจิจูด (Longitude)</label>
              <input
                className="input"
                id="longitude"
                inputMode="decimal"
                max="180"
                min="-180"
                name="longitude"
                onChange={(event) => handleCoordinateChange(latitudeInput, event.target.value)}
                placeholder="100.501800"
                required={Boolean(latitudeInput.trim())}
                step="any"
                type="number"
                value={longitudeInput}
              />
            </div>
            <button className="button secondary project-coordinate-apply" type="button" onClick={applyCoordinates}>
              <Navigation size={16} />
              ไปยังพิกัด
            </button>
          </div>
          {coordinateError ? <div className="project-coordinate-error" role="alert">{coordinateError}</div> : null}
        </div>

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
