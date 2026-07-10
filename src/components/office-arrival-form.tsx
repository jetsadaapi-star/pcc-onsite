"use client";

import { Building2, Gauge, LocateFixed, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ActionModal } from "@/components/action-modal";
import { CameraCaptureField } from "@/components/camera-capture-field";
import { completeOfficeTripAction } from "@/lib/actions";

type OfficeArrivalFormProps = {
  trip: {
    id: string;
    originLabel: string | null;
    odometerStartKm: number | null;
    vehicle: {
      name: string;
      licensePlate: string | null;
      kmPerLiter: number | null;
    } | null;
  };
};

export function OfficeArrivalForm({ trip }: OfficeArrivalFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const gpsRequestedRef = useRef(false);
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const gpsText = useMemo(() => {
    if (gpsLoading) return "กำลังดึงพิกัดบริษัท...";
    if (!gps) return "ยังไม่ได้ดึง GPS ตอนถึงบริษัท";
    return `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}${gps.accuracy ? ` +/-${Math.round(gps.accuracy)}m` : ""}`;
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
        if (!silent) setGpsError(error.message || "ไม่สามารถดึงพิกัดได้");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    if (gpsRequestedRef.current) return;
    gpsRequestedRef.current = true;
    captureGps(true);
  }, [captureGps]);

  function submitWithFeedback() {
    if (!gps) {
      setModal({
        title: "กรุณาดึง GPS ตอนถึงบริษัท",
        description: "ระบบต้องใช้พิกัดปลายทางเพื่อปิดทริปและบันทึกระยะทาง"
      });
      return;
    }
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await completeOfficeTripAction(formData);
        });
      }}
      className="start-trip-panel"
    >
      <input type="hidden" name="tripSessionId" value={trip.id} />
      <input type="hidden" name="latitude" value={gps?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={gps?.longitude ?? ""} />
      <input type="hidden" name="accuracy" value={gps?.accuracy ?? ""} />

      <section className="trip-step-card primary">
        <div className="trip-step-head">
          <span><Building2 size={19} /></span>
          <div>
            <strong>ถึงบริษัท/สำนักงานแล้ว</strong>
            <small>เริ่มจาก {trip.originLabel ?? "จุดเริ่มต้น"} ระบบจะบันทึกประวัติการเดินทางเข้าบริษัทโดยไม่สร้างรายการเบิก</small>
          </div>
        </div>
      </section>

      <section className="trip-step-card">
        <div className="trip-section-title">
          <strong>ตำแหน่งปลายทาง</strong>
          <small>กดดึง GPS ตอนถึงบริษัทเพื่อปิดทริป</small>
        </div>
        <div className={gps ? "gps-box ready" : "gps-box"}>
          <div className="toolbar">
            <div>
              <strong><LocateFixed size={16} /> GPS บริษัท</strong>
              <div className="muted">{gpsText}</div>
            </div>
            <button className="button secondary gps-button" type="button" onClick={() => captureGps(false)} disabled={gpsLoading}>
              <LocateFixed size={17} />
              {gpsLoading ? "กำลังดึง GPS..." : gps ? "อัปเดต GPS" : "ดึง GPS"}
            </button>
          </div>
          {gpsError ? <div className="error-banner">{gpsError}</div> : null}
        </div>
      </section>

      <section className="trip-step-card">
        <div className="trip-section-title">
          <strong>เลขไมล์ตอนถึง</strong>
          <small>
            {trip.vehicle
              ? `${trip.vehicle.name}${trip.vehicle.licensePlate ? ` · ${trip.vehicle.licensePlate}` : ""}`
              : "รถหลักของคุณ"}
            {trip.odometerStartKm !== null ? ` · เริ่ม ${trip.odometerStartKm.toLocaleString("th-TH")} กม.` : ""}
          </small>
        </div>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="office-odometerEndKm"><Gauge size={15} /> เลขไมล์เมื่อถึงบริษัท</label>
            <input className="input" id="office-odometerEndKm" name="odometerEndKm" type="number" min="0" step="0.1" placeholder="เช่น 45248.0" />
          </div>
          <CameraCaptureField
            name="odometerEndPhoto"
            label="รูปเลขไมล์เมื่อถึงบริษัท"
            title="ถ่ายเลขไมล์เมื่อถึงบริษัท"
            description="ใช้ตรวจสอบระยะจริงกับ GPS"
          />
        </div>
      </section>

      <button className="button success full-action-button" type="button" onClick={submitWithFeedback} disabled={isPending}>
        <Send size={17} />
        {isPending ? "กำลังปิดทริป..." : "บันทึกว่าถึงบริษัทแล้ว"}
      </button>

      <ActionModal
        open={!!modal}
        tone="warning"
        title={modal?.title ?? ""}
        description={modal?.description ?? ""}
        onClose={() => setModal(null)}
      />
    </form>
  );
}
