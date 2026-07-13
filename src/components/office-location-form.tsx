"use client";

import { Building2, ExternalLink, LocateFixed, MapPinned, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { deleteOfficeLocationAction, upsertOfficeLocationAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";

type OfficeLocationFormProps = {
  office?: {
    id: string;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
    active: boolean;
    isDefault: boolean;
    updatedAt?: Date | string;
  } | null;
};

function mapsUrl(lat: string, lng: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function OfficeLocationForm({ office }: OfficeLocationFormProps) {
  const [lat, setLat] = useState(office?.latitude?.toString() ?? "");
  const [lng, setLng] = useState(office?.longitude?.toString() ?? "");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const hasCoordinates = Boolean(lat && lng);
  const gpsText = useMemo(() => {
    if (!hasCoordinates) return "ยังไม่ได้ตั้งค่าพิกัดสำนักงาน";
    return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
  }, [hasCoordinates, lat, lng]);

  function captureGps() {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("เบราว์เซอร์นี้ไม่รองรับ GPS");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(String(position.coords.latitude));
        setLng(String(position.coords.longitude));
        setGpsLoading(false);
      },
      (error) => {
        setGpsError(error.message || "ไม่สามารถดึง GPS ได้");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  return (
    <form action={upsertOfficeLocationAction} className="admin-settings-form">
      <input type="hidden" name="id" value={office?.id ?? ""} />
      <input type="hidden" name="isDefault" value="true" />
      <input type="hidden" name="active" value="true" />

      <section className="settings-office-card">
        <div className="settings-office-head">
          <span><Building2 size={24} /></span>
          <div>
            <strong>สำนักงานหลัก</strong>
            <p>ใช้เป็นจุดเริ่มต้นมาตรฐานเมื่อพนักงานเลือกออกจากบริษัท/สำนักงาน</p>
          </div>
          <em className={office ? "ready" : ""}>{office ? "ตั้งค่าแล้ว" : "ยังไม่ตั้งค่า"}</em>
        </div>

        <div className="settings-office-status">
          <div>
            <span><MapPinned size={15} /> พิกัดปัจจุบัน</span>
            <strong>{gpsText}</strong>
          </div>
          <div>
            <span><ShieldCheck size={15} /> สถานะใช้งาน</span>
            <strong>{office?.active !== false ? "เปิดใช้งาน" : "ปิดใช้งาน"}</strong>
          </div>
          <div>
            <span>อัปเดตล่าสุด</span>
            <strong>{office?.updatedAt ? formatDateTime(new Date(office.updatedAt)) : "ยังไม่มีข้อมูล"}</strong>
          </div>
        </div>

        <div className="settings-office-fields">
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="office-name">ชื่อสำนักงาน</label>
              <input className="input" id="office-name" name="name" defaultValue={office?.name ?? "สำนักงานใหญ่"} placeholder="สำนักงานใหญ่" required />
            </div>
            <div className="field">
              <label htmlFor="office-address">ที่อยู่/จุดสังเกต</label>
              <input className="input" id="office-address" name="address" defaultValue={office?.address ?? ""} placeholder="อาคาร, ชั้น, ถนน, จังหวัด" />
            </div>
          </div>

          <div className="settings-gps-panel">
            <button className={hasCoordinates ? "settings-gps-capture ready" : "settings-gps-capture"} type="button" onClick={captureGps} disabled={gpsLoading}>
              <span><LocateFixed size={23} /></span>
              <div>
                <strong>{gpsLoading ? "กำลังดึง GPS..." : "ดึง GPS สำนักงาน"}</strong>
                <small>{gpsLoading ? "โปรดรอสักครู่และอนุญาตตำแหน่งบนเบราว์เซอร์" : "กดเมื่ออยู่ที่สำนักงานเพื่อบันทึกพิกัดจริง"}</small>
              </div>
            </button>
            {hasCoordinates ? (
              <a className="settings-map-link" href={mapsUrl(lat, lng)} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                เปิดใน Google Maps
              </a>
            ) : null}
          </div>
          {gpsError ? <div className="error-banner">{gpsError}</div> : null}

          <div className="form-grid two">
            <div className="field">
              <label htmlFor="office-latitude">Latitude</label>
              <input className="input" id="office-latitude" name="latitude" value={lat} onChange={(event) => setLat(event.target.value)} placeholder="13.756331" required />
            </div>
            <div className="field">
              <label htmlFor="office-longitude">Longitude</label>
              <input className="input" id="office-longitude" name="longitude" value={lng} onChange={(event) => setLng(event.target.value)} placeholder="100.501762" required />
            </div>
          </div>
        </div>

        <div className="settings-office-actions">
          {office ? (
            <button
              className="button danger"
              type="submit"
              formAction={deleteOfficeLocationAction}
              onClick={(event) => {
                if (!window.confirm(`ยืนยันลบจุดสำนักงาน ${office.name} ใช่หรือไม่?`)) event.preventDefault();
              }}
            >
              <Trash2 size={17} />
              ลบจุดสำนักงาน
            </button>
          ) : null}
          <button className="button" type="submit">
            <Save size={17} />
            บันทึกพิกัดสำนักงาน
          </button>
        </div>
      </section>
    </form>
  );
}
