"use client";

import { CheckCircle2, Gauge, Settings2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRateAction } from "@/lib/actions";
import { formatMoney, formatNumber } from "@/lib/format";

type TravelRateModalProps = {
  rate: {
    ratePerKm: number;
    kmPerLiter: number;
    fuelPricePerLiter: number;
  } | null;
};

export function TravelRateModal({ rate }: TravelRateModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      await updateRateAction(formData);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button className="button admin-travel-rate-trigger" type="button" onClick={() => setOpen(true)}>
        <Settings2 size={17} />
        เพิ่มเรตเดินทาง
      </button>

      {open ? (
        <div className="modal-backdrop vehicle-modal-backdrop" role="presentation">
          <section className="vehicle-modal-panel compact" role="dialog" aria-modal="true" aria-labelledby="travel-rate-title">
            <div className="vehicle-modal-head">
              <span><Gauge size={21} /></span>
              <div>
                <h2 id="travel-rate-title">ตั้งค่าเรตเดินทาง</h2>
                <p>สร้างเรตใหม่สำหรับค่าสึกหรอ น้ำมัน และค่าเริ่มต้นกรณีรถยังไม่มีอัตราสิ้นเปลืองเฉพาะคัน</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="ปิด">
                <X size={18} />
              </button>
            </div>

            <form action={submit} className="vehicle-modal-form">
              <div className="admin-travel-current-rate">
                <div>
                  <span>ค่าสึกหรอปัจจุบัน</span>
                  <strong>{formatMoney(rate?.ratePerKm ?? 1.5)} / กม.</strong>
                </div>
                <div>
                  <span>อัตราสิ้นเปลืองกลาง</span>
                  <strong>{formatNumber(rate?.kmPerLiter ?? 12, 1)} กม./ลิตร</strong>
                </div>
              </div>

              <div className="form-grid three">
                <div className="field">
                  <label htmlFor="rate-modal-ratePerKm">ค่าสึกหรอ/กม.</label>
                  <input className="input" id="rate-modal-ratePerKm" name="ratePerKm" type="number" min="0" step="0.01" defaultValue={rate?.ratePerKm ?? 1.5} required />
                </div>
                <div className="field">
                  <label htmlFor="rate-modal-kmPerLiter">กม./ลิตร เริ่มต้น</label>
                  <input className="input" id="rate-modal-kmPerLiter" name="kmPerLiter" type="number" min="1" step="0.1" defaultValue={rate?.kmPerLiter ?? 12} required />
                </div>
                <div className="field">
                  <label htmlFor="rate-modal-fuelPricePerLiter">ราคาน้ำมัน/ลิตร</label>
                  <input className="input" id="rate-modal-fuelPricePerLiter" name="fuelPricePerLiter" type="number" min="0" step="0.01" defaultValue={rate?.fuelPricePerLiter ?? 36} required />
                </div>
              </div>

              <div className="admin-travel-rate-note modal">
                เมื่อบันทึก ระบบจะปิดเรตเดิมและใช้เรตใหม่นี้กับรายการเดินทางหลังจากนี้ ส่วนรถที่แอดมินกำหนด กม./ลิตร ไว้แล้วจะใช้ค่าของรถคันนั้นก่อน
              </div>

              <div className="vehicle-modal-actions">
                <button className="button secondary" type="button" onClick={() => setOpen(false)}>
                  ยกเลิก
                </button>
                <button className="button" type="submit" disabled={isPending}>
                  <CheckCircle2 size={16} />
                  {isPending ? "กำลังบันทึก..." : "บันทึกเรตใหม่"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
