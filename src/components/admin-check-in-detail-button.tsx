"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Gauge, ImageIcon, MapPin, X } from "lucide-react";
import { useState } from "react";
import type { CheckInEvidenceItem } from "@/components/check-in-evidence-gallery";
import { useDialogAccessibility } from "@/lib/use-dialog-accessibility";

export type AdminCheckInDetail = {
  id: string;
  checkedAt: string;
  checkedOutAt: string | null;
  user: { name: string; email: string; roleLabel: string };
  project: { id: string; code: string; name: string; customerName: string; province: string | null };
  purposeLabel: string;
  checkoutStatusLabel: string | null;
  note: string | null;
  checkoutNote: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  checkoutLatitude: number | null;
  checkoutLongitude: number | null;
  vehicle: { name: string; licensePlate: string | null } | null;
  odometerStartKm: number | null;
  odometerEndKm: number | null;
  odometerDistanceKm: number | null;
  evidence: CheckInEvidenceItem[];
};

function mapsHref(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function AdminCheckInDetailButton({ detail }: { detail: AdminCheckInDetail }) {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const close = () => {
    setSelectedIndex(null);
    setOpen(false);
  };
  const dialogRef = useDialogAccessibility(open, close);
  const selected = selectedIndex === null ? null : detail.evidence[selectedIndex];

  function moveEvidence(direction: number) {
    setSelectedIndex((current) => current === null ? null : (current + direction + detail.evidence.length) % detail.evidence.length);
  }

  return (
    <>
      <button className="button secondary small" type="button" onClick={() => setOpen(true)}>
        ดูรายละเอียด
      </button>

      {open ? (
        <div className="checkin-detail-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) close();
        }}>
          <section ref={dialogRef} className="checkin-detail-modal" role="dialog" aria-modal="true" aria-labelledby={`checkin-detail-${detail.id}`}>
            <header className="checkin-detail-header">
              <div>
                <span>Check-in detail</span>
                <h2 id={`checkin-detail-${detail.id}`}>{detail.project.code} · {detail.project.name}</h2>
              </div>
              <button type="button" onClick={close} aria-label="ปิด"><X size={20} /></button>
            </header>

            {selected ? (
              <div className="checkin-detail-evidence-viewer">
                <div className="checkin-detail-evidence-toolbar">
                  <button type="button" onClick={() => setSelectedIndex(null)}>กลับไปดูรายละเอียด</button>
                  <span>{selected.label} · {selectedIndex! + 1}/{detail.evidence.length}</span>
                  <a href={selected.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> เปิดไฟล์ต้นฉบับ</a>
                </div>
                <div className="checkin-detail-evidence-stage">
                  {detail.evidence.length > 1 ? <button type="button" onClick={() => moveEvidence(-1)} aria-label="ไฟล์ก่อนหน้า"><ChevronLeft size={24} /></button> : null}
                  <img src={selected.url} alt={selected.label} />
                  {detail.evidence.length > 1 ? <button type="button" onClick={() => moveEvidence(1)} aria-label="ไฟล์ถัดไป"><ChevronRight size={24} /></button> : null}
                </div>
              </div>
            ) : (
              <div className="checkin-detail-body">
                <section className="checkin-detail-section">
                  <h3>ผู้ปฏิบัติงานและโครงการ</h3>
                  <div className="checkin-detail-grid">
                    <div><span>พนักงาน</span><strong>{detail.user.name}</strong><small>{detail.user.roleLabel} · {detail.user.email}</small></div>
                    <div><span>ลูกค้า</span><strong>{detail.project.customerName}</strong><small>{detail.project.province ?? "ไม่ระบุจังหวัด"}</small></div>
                    <div><span>ประเภทงาน</span><strong>{detail.purposeLabel}</strong></div>
                    <div><span>สถานะ</span><strong>{detail.checkedOutAt ? "เช็กเอาท์แล้ว" : "ยังเปิดงาน"}</strong><small>{detail.checkoutStatusLabel ?? "-"}</small></div>
                  </div>
                </section>

                <section className="checkin-detail-section">
                  <h3>เวลาและพิกัด</h3>
                  <div className="checkin-detail-grid">
                    <div><span>เวลาเข้า</span><strong>{detail.checkedAt}</strong></div>
                    <div><span>เวลาออก</span><strong>{detail.checkedOutAt ?? "-"}</strong></div>
                    <div>
                      <span>พิกัดตอนเข้า</span>
                      <a href={mapsHref(detail.latitude, detail.longitude)} target="_blank" rel="noreferrer"><MapPin size={14} /> {detail.latitude.toFixed(6)}, {detail.longitude.toFixed(6)}</a>
                      <small>{detail.accuracy ? `ความแม่นยำ ±${Math.round(detail.accuracy)} เมตร` : "ไม่ระบุความแม่นยำ"}</small>
                    </div>
                    <div>
                      <span>พิกัดตอนออก</span>
                      {detail.checkoutLatitude !== null && detail.checkoutLongitude !== null
                        ? <a href={mapsHref(detail.checkoutLatitude, detail.checkoutLongitude)} target="_blank" rel="noreferrer"><MapPin size={14} /> {detail.checkoutLatitude.toFixed(6)}, {detail.checkoutLongitude.toFixed(6)}</a>
                        : <strong>-</strong>}
                    </div>
                  </div>
                </section>

                <section className="checkin-detail-section">
                  <h3>รถและเลขไมล์</h3>
                  <div className="checkin-detail-grid">
                    <div><span>รถ</span><strong>{detail.vehicle?.name ?? "ไม่ได้ระบุ"}</strong><small>{detail.vehicle?.licensePlate ?? "ไม่ระบุทะเบียน"}</small></div>
                    <div><span>เลขไมล์ตอนเข้า</span><strong>{detail.odometerStartKm ?? "-"}</strong></div>
                    <div><span>เลขไมล์ตอนออก</span><strong>{detail.odometerEndKm ?? "-"}</strong></div>
                    <div><span>ระยะเลขไมล์</span><strong><Gauge size={14} /> {detail.odometerDistanceKm !== null ? `${detail.odometerDistanceKm.toLocaleString("th-TH")} กม.` : "-"}</strong></div>
                  </div>
                </section>

                <section className="checkin-detail-section">
                  <h3>บันทึกงาน</h3>
                  <div className="checkin-detail-notes">
                    <div><span>ตอนเช็กอิน</span><p>{detail.note ?? "ไม่มีบันทึก"}</p></div>
                    <div><span>ตอนเช็กเอาท์</span><p>{detail.checkoutNote ?? "ไม่มีบันทึก"}</p></div>
                  </div>
                </section>

                <section className="checkin-detail-section">
                  <h3>หลักฐานแนบ <span>{detail.evidence.length} ไฟล์</span></h3>
                  {detail.evidence.length ? (
                    <div className="checkin-detail-evidence-grid">
                      {detail.evidence.map((item, index) => (
                        <button key={item.url} type="button" onClick={() => setSelectedIndex(index)}>
                          <img src={item.url} alt={item.label} loading="lazy" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : <div className="checkin-detail-empty"><ImageIcon size={18} /> ไม่มีไฟล์หลักฐาน</div>}
                </section>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
