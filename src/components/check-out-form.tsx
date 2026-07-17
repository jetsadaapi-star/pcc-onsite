"use client";

import { CarFront, ClipboardCheck, FileText, Gauge, LocateFixed, LogOut, MapPin, MapPinned } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ActionModal } from "@/components/action-modal";
import { CameraCaptureField } from "@/components/camera-capture-field";
import { checkoutFormAction } from "@/lib/form-actions";

type ActiveVisit = {
  id: string;
  checkedAt: Date | string;
  project: {
    code: string;
    name: string;
    customerName: string;
  };
  vehicle: {
    name: string;
    licensePlate: string | null;
    kmPerLiter: number | null;
  } | null;
  odometerStartKm: number | null;
};

const checkoutStatuses = [
  ["DONE", "เสร็จงาน"],
  ["NEED_RETURN", "ต้องกลับมาอีก"],
  ["WAITING_CUSTOMER", "รอลูกค้า"],
  ["ISSUE", "มีปัญหา"],
  ["OTHER", "อื่นๆ"]
] as const;

export function CheckOutForm({ activeVisit }: { activeVisit: ActiveVisit }) {
  const formRef = useRef<HTMLFormElement>(null);
  const gpsRequestedRef = useRef(false);
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; description: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const gpsText = useMemo(() => {
    if (gpsLoading) return "กำลังดึงพิกัดตอนออกอัตโนมัติ...";
    if (!gps) return "ยังไม่ได้ดึงพิกัดตอนออก";
    return `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}${gps.accuracy ? ` ±${Math.round(gps.accuracy)}m` : ""}`;
  }, [gps, gpsLoading]);

  const captureGps = useCallback((silent = false) => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("เบราว์เซอร์นี้ไม่รองรับ GPS");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setGpsLoading(false);
      },
      (error) => {
        setGpsLoading(false);
        if (!silent) {
          setGpsError(error.message || "ไม่สามารถดึงพิกัดได้");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    if (gpsRequestedRef.current) return;
    gpsRequestedRef.current = true;
    captureGps(true);
  }, [captureGps]);

  function requestCheckout() {
    if (!gps) {
      setNotice({
        title: "กรุณาดึง GPS ตอนออก",
        description: "ระบบพยายามดึง GPS ให้อัตโนมัติแล้ว หากยังไม่ได้พิกัดให้กดปุ่มดึง GPS ตอนออกอีกครั้ง"
      });
      return;
    }
    setConfirmOpen(true);
  }

  function confirmCheckout() {
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setActionError(null);
        startTransition(async () => {
          const result = await checkoutFormAction(formData);
          if (!result.ok) setActionError(result.error);
        });
      }}
      className="checkin-panel"
    >
      {actionError ? <div className="error-banner" role="alert">{actionError}</div> : null}
      <input type="hidden" name="checkInId" value={activeVisit.id} />
      <input type="hidden" name="latitude" value={gps?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={gps?.longitude ?? ""} />
      <input type="hidden" name="accuracy" value={gps?.accuracy ?? ""} />

      <div className="active-visit-card checkout">
        <span><MapPinned size={20} /></span>
        <div>
          <strong>{activeVisit.project.code} · {activeVisit.project.name}</strong>
          <small>{activeVisit.project.customerName}</small>
        </div>
      </div>

      <div className={gps ? "gps-box ready checkout" : "gps-box checkout"}>
        <div className="toolbar">
          <div>
            <strong><MapPin size={16} /> พิกัดตอนออก</strong>
            <div className="muted">{gpsText}</div>
          </div>
          <button className="button secondary gps-button" type="button" onClick={() => captureGps(false)} disabled={gpsLoading}>
            <LocateFixed size={17} />
            {gpsLoading ? "กำลังดึง GPS..." : gps ? "อัปเดต GPS" : "ดึง GPS ตอนออก"}
          </button>
        </div>
        {gpsError ? <div className="error-banner">{gpsError}</div> : null}
      </div>

      <section className="odometer-card checkout">
        <div className="odometer-card-head">
          <span><CarFront size={18} /></span>
          <div>
            <strong>{activeVisit.vehicle?.name ?? "รถที่ใช้เดินทาง"}</strong>
            <small>
              {activeVisit.vehicle?.licensePlate ? `${activeVisit.vehicle.licensePlate} · ` : ""}
              {activeVisit.odometerStartKm !== null ? `เริ่ม ${activeVisit.odometerStartKm.toLocaleString("th-TH")} กม.` : "เพิ่มเลขไมล์ตอนออกเพื่อปิดงานให้ครบ"}
            </small>
          </div>
        </div>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="odometerEndKm"><Gauge size={15} /> เลขไมล์ตอนออก</label>
            <input className="input" id="odometerEndKm" name="odometerEndKm" type="number" min="0" step="0.1" placeholder="เช่น 45248.0" />
          </div>
          <CameraCaptureField
            name="odometerEndPhoto"
            label="รูปหน้าปัดเลขไมล์"
            title="ถ่ายหน้าปัดตอนออก"
            description="เปิดกล้องในระบบเพื่อยืนยันเลขไมล์ปลายทาง"
            tone="danger"
            ocrTargets={[{ targetId: "odometerEndKm", label: "เลขไมล์" }]}
          />
        </div>
      </section>

      <div className="field">
        <label htmlFor="checkoutStatus"><ClipboardCheck size={15} /> สถานะงาน</label>
        <select className="select" id="checkoutStatus" name="checkoutStatus" defaultValue="DONE" required>
          {checkoutStatuses.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="checkoutNote"><FileText size={15} /> สรุปงานก่อนออก</label>
        <textarea className="textarea" id="checkoutNote" name="checkoutNote" placeholder="สรุปสิ่งที่ทำ ปัญหาที่พบ หรือสิ่งที่ต้องติดตามต่อ" />
      </div>

      <CameraCaptureField
        name="checkoutPhotos"
        label="รูปเพิ่มเติม"
        title="ถ่ายรูปเพิ่มเติม"
        description="ถ่ายได้หลายรูปสำหรับสรุปงานหรือหลักฐานก่อนออก"
        multiple
        tone="danger"
      />

      <button className="button danger full-action-button" type="button" onClick={requestCheckout} disabled={isPending}>
        {isPending ? <MapPinned size={17} /> : <LogOut size={17} />}
        {isPending ? "กำลังเช็คเอาท์..." : "เช็คเอาท์"}
      </button>
      <ActionModal
        open={!!notice}
        tone="warning"
        title={notice?.title ?? ""}
        description={notice?.description ?? ""}
        onClose={() => setNotice(null)}
      />
      <ActionModal
        open={confirmOpen}
        tone="danger"
        title="ยืนยันเช็คเอาท์?"
        description={`การเช็คเอาท์จะปิดงานที่ ${activeVisit.project.name} และบันทึกเวลาออกกับพิกัดปัจจุบัน`}
        confirmLabel="ยืนยันเช็คเอาท์"
        cancelLabel="ยกเลิก"
        onConfirm={confirmCheckout}
        onClose={() => setConfirmOpen(false)}
      />
    </form>
  );
}
