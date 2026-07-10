"use client";

import { AlertTriangle, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { cancelTripAction } from "@/lib/actions";

export function CancelTripButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (reason.trim().length < 3) return;
    const formData = new FormData();
    formData.set("tripSessionId", tripId);
    formData.set("reason", reason);
    startTransition(async () => {
      await cancelTripAction(formData);
    });
  }

  return (
    <>
      <button className="button secondary trip-cancel-trigger" type="button" onClick={() => setOpen(true)}>
        <XCircle size={16} />
        ยกเลิกทริป
      </button>
      {open ? (
        <div className="modal-backdrop vehicle-modal-backdrop" role="presentation">
          <section className="vehicle-modal-panel trip-cancel-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-trip-title">
            <div className="vehicle-modal-head">
              <span><AlertTriangle size={21} /></span>
              <div>
                <h2 id="cancel-trip-title">ยกเลิกทริปที่เริ่มผิด?</h2>
                <p>ใช้เมื่อเลือกปลายทางผิด, GPS ผิด, หรือไม่ได้ออกเดินทางจริง ระบบจะเก็บเหตุผลไว้ในประวัติ</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="ปิด">
                <XCircle size={18} />
              </button>
            </div>
            <div className="field">
              <label htmlFor="cancel-trip-reason">เหตุผล</label>
              <textarea
                className="textarea"
                id="cancel-trip-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="เช่น เลือกปลายทางผิด / กดเริ่มผิด / ยังไม่ได้ออกเดินทาง"
                autoFocus
              />
            </div>
            <div className="vehicle-modal-actions">
              <button className="button secondary" type="button" onClick={() => setOpen(false)}>กลับ</button>
              <button className="button danger" type="button" onClick={submit} disabled={isPending || reason.trim().length < 3}>
                <XCircle size={16} />
                {isPending ? "กำลังยกเลิก..." : "ยืนยันยกเลิกทริป"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
