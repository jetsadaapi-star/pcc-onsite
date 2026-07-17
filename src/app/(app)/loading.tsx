export default function ProtectedAppLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-spinner" aria-hidden="true" />
      <div>
        <strong>กำลังโหลดข้อมูล...</strong>
        <p>ระบบกำลังเตรียมข้อมูลล่าสุด กรุณารอสักครู่</p>
      </div>
    </div>
  );
}
