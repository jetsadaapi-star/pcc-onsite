"use client";

import { Flag, Gauge, LocateFixed, MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ActionModal } from "@/components/action-modal";
import { CameraCaptureField } from "@/components/camera-capture-field";
import { endFieldWorkSessionFormAction } from "@/lib/form-actions";

type FieldSession = {
  startedAt: Date | string;
  odometerStartKm: number;
  vehicle: { name: string; licensePlate: string | null };
  tripCount: number;
  distanceKm: number;
};

export function EndFieldWorkSessionForm({ session }: { session: FieldSession }) {
  const formRef = useRef<HTMLFormElement>(null);
  const requestedRef = useRef(false);
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<{ title: string; description: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const gpsText = useMemo(() => gps
    ? `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}${gps.accuracy ? ` ±${Math.round(gps.accuracy)}m` : ""}`
    : gpsLoading ? "กำลังดึงพิกัด..." : "ยังไม่ได้พิกัดสิ้นสุด", [gps, gpsLoading]);

  const captureGps = useCallback((silent = false) => {
    if (!navigator.geolocation) {
      setGpsError("เบราว์เซอร์นี้ไม่รองรับ GPS");
      return;
    }
    setGpsError(null);
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
        if (!silent) setGpsError(error.message || "ไม่สามารถดึงพิกัดได้");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    captureGps(true);
  }, [captureGps]);

  function requestEndDay() {
    const formData = new FormData(formRef.current!);
    const odometerValue = String(formData.get("odometerEndKm") ?? "").trim();
    const odometer = Number(odometerValue);
    const photo = formData.get("odometerEndPhoto");
    if (!gps) {
      setNotice({ title: "กรุณาดึง GPS", description: "ระบบต้องบันทึกตำแหน่งที่จบการเดินทางวันนี้" });
      return;
    }
    if (!(photo instanceof File) || photo.size === 0) {
      setNotice({ title: "กรุณาถ่ายรูปเลขไมล์สิ้นสุด", description: "ถ่ายหน้าปัดให้เห็นตัวเลขชัดเจนก่อนจบการเดินทางวันนี้" });
      return;
    }
    if (!odometerValue || !Number.isFinite(odometer) || odometer < session.odometerStartKm) {
      setNotice({ title: "ตรวจสอบเลขไมล์", description: `เลขไมล์สิ้นสุดต้องไม่น้อยกว่า ${session.odometerStartKm.toLocaleString("th-TH")} กม.` });
      return;
    }
    setConfirmOpen(true);
  }

  return (
    <form
      ref={formRef}
      className="start-trip-panel"
      action={(formData) => {
        setActionError(null);
        startTransition(async () => {
          const result = await endFieldWorkSessionFormAction(formData);
          if (!result.ok) setActionError(result.error);
        });
      }}
    >
      {actionError ? <div className="error-banner" role="alert">{actionError}</div> : null}
      <input type="hidden" name="latitude" value={gps?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={gps?.longitude ?? ""} />
      <input type="hidden" name="accuracy" value={gps?.accuracy ?? ""} />

      <section className="trip-step-card primary day-summary-card">
        <div className="trip-step-head">
          <span><Flag size={19} /></span>
          <div>
            <strong>สรุปรอบงานภาคสนาม</strong>
            <small>{session.vehicle.name}{session.vehicle.licensePlate ? ` · ${session.vehicle.licensePlate}` : ""} · {session.tripCount} ช่วง · GPS ${session.distanceKm.toLocaleString("th-TH", { maximumFractionDigits: 1 })} กม.</small>
          </div>
        </div>
      </section>

      <div className={gps ? "gps-box ready" : "gps-box"}>
        <div className="toolbar">
          <div><strong><MapPin size={16} /> จุดสิ้นสุดวันนี้</strong><div className="muted">{gpsText}</div></div>
          <button className="button secondary gps-button" type="button" onClick={() => captureGps(false)} disabled={gpsLoading}>
            <LocateFixed size={17} /> {gpsLoading ? "กำลังดึง GPS..." : gps ? "อัปเดต GPS" : "ดึง GPS"}
          </button>
        </div>
        {gpsError ? <div className="error-banner">{gpsError}</div> : null}
      </div>

      <section className="trip-step-card">
        <div className="trip-section-title">
          <strong>เลขไมล์สิ้นสุดของวันนี้</strong>
          <small>เริ่มต้น {session.odometerStartKm.toLocaleString("th-TH")} กม. ระบบจะเทียบกับระยะ GPS รวมทุกช่วง</small>
        </div>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="day-odometer-end"><Gauge size={15} /> เลขไมล์สิ้นสุด</label>
            <input className="input" id="day-odometer-end" name="odometerEndKm" type="number" min={session.odometerStartKm} step="0.1" required placeholder="เช่น 45280.0" />
          </div>
          <CameraCaptureField name="odometerEndPhoto" label="รูปเลขไมล์สิ้นสุด" title="ถ่ายเลขไมล์สิ้นสุด" description="ถ่ายให้เห็นตัวเลขชัดเจน" ocrTargets={[{ targetId: "day-odometer-end", label: "เลขไมล์" }]} />
        </div>
        <div className="field">
          <label htmlFor="day-end-note">หมายเหตุ (ถ้ามี)</label>
          <textarea className="textarea" id="day-end-note" name="note" maxLength={500} placeholder="เช่น กลับบ้านโดยใช้เส้นทางอื่น" />
        </div>
      </section>

      <button className="button danger full-action-button" type="button" onClick={requestEndDay} disabled={isPending}>
        <Flag size={17} /> {isPending ? "กำลังสรุปวันนี้..." : "จบการเดินทางวันนี้"}
      </button>

      <ActionModal open={!!notice} tone="warning" title={notice?.title ?? ""} description={notice?.description ?? ""} onClose={() => setNotice(null)} />
      <ActionModal
        open={confirmOpen}
        tone="danger"
        title="จบการเดินทางวันนี้?"
        description="ระบบจะปิดรอบงานภาคสนามและเปรียบเทียบเลขไมล์กับระยะ GPS รวม หลังยืนยันจะเริ่มทริปใหม่ไม่ได้จนกว่าจะเปิดรอบวันใหม่"
        confirmLabel="ยืนยันจบวันนี้"
        cancelLabel="กลับไปตรวจสอบ"
        onConfirm={() => { setConfirmOpen(false); formRef.current?.requestSubmit(); }}
        onClose={() => setConfirmOpen(false)}
      />
    </form>
  );
}
