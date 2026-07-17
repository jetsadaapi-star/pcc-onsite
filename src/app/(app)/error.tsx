"use client";

import { useEffect } from "react";

export default function ProtectedAppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Protected route render failed", error);
  }, [error]);

  return (
    <div className="route-error" role="alert">
      <strong>ไม่สามารถโหลดหน้านี้ได้</strong>
      <p>การเชื่อมต่ออาจสะดุดชั่วคราว กรุณาลองโหลดข้อมูลอีกครั้ง</p>
      <button className="button" type="button" onClick={reset}>ลองอีกครั้ง</button>
    </div>
  );
}
