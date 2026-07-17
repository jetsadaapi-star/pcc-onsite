"use client";

import { CalendarDays, CarFront, Eye, Fuel, Gauge, Plus, ReceiptText, RotateCcw, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ActionFeedbackForm } from "@/components/action-feedback-form";
import { CameraCaptureField } from "@/components/camera-capture-field";
import { createFuelLogFormAction } from "@/lib/form-actions";
import { useDialogAccessibility } from "@/lib/use-dialog-accessibility";

type VehicleOption = {
  id: string;
  name: string;
  licensePlate: string | null;
  kmPerLiter: number | null;
};

type FuelLogRow = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleLicensePlate: string | null;
  fueledAt: string;
  odometerKm: number;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  receiptPhotoUrl: string | null;
  receiptPhotoUrls: string[];
  odometerPhotoUrl: string | null;
  odometerPhotoUrls: string[];
  note: string | null;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok"
  }).format(new Date(value));
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2
  }).format(value);
}

function withinPreset(value: string, preset: string) {
  if (!preset) return true;
  const date = new Date(value).getTime();
  const now = Date.now();
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : preset === "90d" ? 90 : 0;
  if (!days) return true;
  return date >= now - days * 24 * 60 * 60 * 1000;
}

function FuelCreateModal({ vehicles, onClose }: { vehicles: VehicleOption[]; onClose: () => void }) {
  const dialogRef = useDialogAccessibility(true, onClose);
  return (
    <div className="modal-backdrop vehicle-modal-backdrop" role="presentation">
      <section ref={dialogRef} className="vehicle-modal-panel" role="dialog" aria-modal="true" aria-labelledby="fuel-create-title">
        <div className="vehicle-modal-head">
          <span><Fuel size={21} /></span>
          <div>
            <h2 id="fuel-create-title">เพิ่มรายการเติมน้ำมัน</h2>
            <p>จดเลขไมล์ ลิตร ราคา และแนบรูปหลักฐาน</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>

        {vehicles.length > 0 ? (
          <ActionFeedbackForm action={createFuelLogFormAction} className="vehicle-modal-form">
            <div className="form-grid two">
              <div className="field">
                <label htmlFor="fuel-vehicleId"><CarFront size={15} /> รถ</label>
                <select className="select" id="fuel-vehicleId" name="vehicleId" defaultValue={vehicles[0]?.id} required>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}{vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="fuel-fueledAt"><CalendarDays size={15} /> วันที่เติม</label>
                <input className="input" id="fuel-fueledAt" name="fueledAt" type="datetime-local" />
              </div>
            </div>

            <div className="form-grid three">
              <div className="field">
                <label htmlFor="fuel-odometerKm"><Gauge size={15} /> เลขไมล์</label>
                <input className="input" id="fuel-odometerKm" name="odometerKm" type="number" min="0" step="0.1" placeholder="45280.0" required />
              </div>
              <div className="field">
                <label htmlFor="fuel-liters"><Fuel size={15} /> ลิตร</label>
                <input className="input" id="fuel-liters" name="liters" type="number" min="0.01" step="0.01" placeholder="32.50" required />
              </div>
              <div className="field">
                <label htmlFor="fuel-pricePerLiter">ราคาต่อลิตร</label>
                <input className="input" id="fuel-pricePerLiter" name="pricePerLiter" type="number" min="0.01" step="0.01" placeholder="36.25" required />
              </div>
            </div>

            <div className="form-grid two">
              <CameraCaptureField
                name="receiptPhoto"
                label="รูปใบเสร็จ"
                title="ถ่ายใบเสร็จ"
                description="เปิดกล้องในระบบเพื่อเก็บหลักฐานค่าน้ำมัน"
                tone="receipt"
                multiple
                ocrTargets={[
                  { targetId: "fuel-liters", label: "ลิตร" },
                  { targetId: "fuel-pricePerLiter", label: "ราคา/ลิตร" },
                  { targetId: "fuel-odometerKm", label: "เลขไมล์" }
                ]}
              />
              <CameraCaptureField
                name="odometerPhoto"
                label="รูปเลขไมล์"
                title="ถ่ายเลขไมล์"
                description="ใช้ตรวจสอบเลขไมล์ตอนเติม"
                multiple
                ocrTargets={[{ targetId: "fuel-odometerKm", label: "เลขไมล์" }]}
              />
            </div>

            <div className="field">
              <label htmlFor="fuel-note">หมายเหตุ</label>
              <textarea className="textarea" id="fuel-note" name="note" placeholder="เช่น เติมเต็มถัง, เติมระหว่างทาง, เลขหัวจ่าย" />
            </div>

            <div className="vehicle-modal-actions">
              <button className="button secondary" type="button" onClick={onClose}>ยกเลิก</button>
              <button className="button" type="submit">
                <Fuel size={16} />
                บันทึกเติมน้ำมัน
              </button>
            </div>
          </ActionFeedbackForm>
        ) : (
          <div className="fuel-modal-empty">
            ยังไม่มีรถที่แอดมินอนุมัติและกำหนด กม./ลิตร ให้เพิ่มรถที่หน้า รถของฉัน ก่อน
          </div>
        )}
      </section>
    </div>
  );
}

function FuelDetailModal({ log, onClose }: { log: FuelLogRow; onClose: () => void }) {
  const dialogRef = useDialogAccessibility(true, onClose);
  return (
    <div className="modal-backdrop vehicle-modal-backdrop" role="presentation">
      <section ref={dialogRef} className="vehicle-modal-panel fuel-detail-modal" role="dialog" aria-modal="true" aria-labelledby="fuel-detail-title">
        <div className="vehicle-modal-head">
          <span><ReceiptText size={21} /></span>
          <div>
            <h2 id="fuel-detail-title">รายละเอียดเติมน้ำมัน</h2>
            <p>{log.vehicleName} · {formatDateTime(log.fueledAt)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>

        <div className="fuel-detail-body">
          <div className="fuel-detail-grid">
            <div><span>ยอดรวม</span><strong>{formatMoney(log.totalAmount)}</strong></div>
            <div><span>ลิตร</span><strong>{formatNumber(log.liters, 2)}</strong></div>
            <div><span>ราคาต่อลิตร</span><strong>{formatMoney(log.pricePerLiter)}</strong></div>
            <div><span>เลขไมล์</span><strong>{formatNumber(log.odometerKm, 1)} กม.</strong></div>
          </div>

          <div className="fuel-proof-grid">
            <div className="fuel-proof-panel">
              <div className="fuel-proof-title">
                <ReceiptText size={16} />
                <strong>รูปใบเสร็จ</strong>
              </div>
              {log.receiptPhotoUrls.length ? (
                <div className="fuel-proof-photo-list">
                  {log.receiptPhotoUrls.map((url, index) => (
                    <a href={url} target="_blank" rel="noreferrer" key={url}>
                      <img src={url} alt={`รูปใบเสร็จ ${index + 1}`} />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="fuel-proof-empty">ไม่มีรูปใบเสร็จ</div>
              )}
            </div>

            <div className="fuel-proof-panel">
              <div className="fuel-proof-title">
                <Gauge size={16} />
                <strong>รูปเลขไมล์</strong>
              </div>
              {log.odometerPhotoUrls.length ? (
                <div className="fuel-proof-photo-list">
                  {log.odometerPhotoUrls.map((url, index) => (
                    <a href={url} target="_blank" rel="noreferrer" key={url}>
                      <img src={url} alt={`รูปเลขไมล์ ${index + 1}`} />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="fuel-proof-empty">ไม่มีรูปเลขไมล์</div>
              )}
            </div>
          </div>

          {log.note ? (
            <div className="fuel-note-box">
              <span>หมายเหตุ</span>
              <p>{log.note}</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function FuelManagementClient({
  vehicles,
  fuelLogs,
  pagination
}: {
  vehicles: VehicleOption[];
  fuelLogs: FuelLogRow[];
  pagination: { currentPage: number; totalPages: number; totalLogs: number };
}) {
  const [query, setQuery] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [datePreset, setDatePreset] = useState("30d");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<FuelLogRow | null>(null);

  const filteredLogs = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return fuelLogs.filter((log) => {
      const matchesKeyword = !keyword || [log.vehicleName, log.vehicleLicensePlate, log.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
      const matchesVehicle = !vehicleId || log.vehicleId === vehicleId;
      const matchesDate = withinPreset(log.fueledAt, datePreset);
      return matchesKeyword && matchesVehicle && matchesDate;
    });
  }, [datePreset, fuelLogs, query, vehicleId]);

  const totalAmount = filteredLogs.reduce((sum, log) => sum + log.totalAmount, 0);
  const totalLiters = filteredLogs.reduce((sum, log) => sum + log.liters, 0);
  const avgPrice = totalLiters > 0 ? totalAmount / totalLiters : 0;
  const latestLog = filteredLogs[0];

  function resetFilters() {
    setQuery("");
    setVehicleId("");
    setDatePreset("30d");
  }

  return (
    <div className="content-stack fuel-page">
      <section className="vehicle-hero refined fuel-management-hero">
        <div>
          <p>Fuel management</p>
          <h1>จัดการเติมน้ำมัน</h1>
          <span>ดูประวัติเติมน้ำมัน ตรวจใบเสร็จ รูปเลขไมล์ และเพิ่มรายการใหม่จากหน้าตารางเดียว</span>
        </div>
        <button className="vehicle-primary-action" type="button" onClick={() => setCreateOpen(true)}>
          <Plus size={18} />
          เพิ่มรายการ
        </button>
      </section>

      <section className="vehicle-stats compact">
        <div>
          <span>เติมล่าสุด</span>
          <strong>{latestLog ? formatDate(latestLog.fueledAt) : "-"}</strong>
        </div>
        <div>
          <span>ลิตรรวม</span>
          <strong>{formatNumber(totalLiters, 1)}</strong>
        </div>
        <div>
          <span>ยอดรวม</span>
          <strong>{formatMoney(totalAmount)}</strong>
        </div>
        <div>
          <span>เฉลี่ย/ลิตร</span>
          <strong>{avgPrice ? formatMoney(avgPrice) : "-"}</strong>
        </div>
      </section>

      <section className="vehicle-table-card">
        <div className="vehicle-table-head">
          <div>
            <h2>รายการเติมน้ำมัน</h2>
            <p>{filteredLogs.length} รายการจากตัวกรองปัจจุบัน</p>
          </div>
          <div className="vehicle-table-tools">
            <div className="vehicle-search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหารถ ทะเบียน หรือหมายเหตุ" />
            </div>
            <select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} aria-label="กรองรถ">
              <option value="">รถทุกคัน</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
              ))}
            </select>
            <select value={datePreset} onChange={(event) => setDatePreset(event.target.value)} aria-label="กรองช่วงเวลา">
              <option value="">ทั้งหมดในหน้านี้</option>
              <option value="7d">7 วันล่าสุด</option>
              <option value="30d">30 วันล่าสุด</option>
              <option value="90d">90 วันล่าสุด</option>
            </select>
            <button className="vehicle-icon-button" type="button" onClick={resetFilters}>
              <RotateCcw size={15} />
              ล้าง
            </button>
          </div>
        </div>

        <div className="vehicle-table-wrap">
          <table className="vehicle-table fuel-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>รถ</th>
                <th>เลขไมล์</th>
                <th>ลิตร</th>
                <th>ราคาต่อลิตร</th>
                <th>ยอดรวม</th>
                <th>หลักฐาน</th>
                <th>ดู</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.fueledAt)}</td>
                  <td>
                    <div className="vehicle-table-name">
                      <span><CarFront size={18} /></span>
                      <div>
                        <strong>{log.vehicleName}</strong>
                        <small>{log.vehicleLicensePlate || "ไม่ระบุทะเบียน"}</small>
                      </div>
                    </div>
                  </td>
                  <td><span className="vehicle-soft-pill"><Gauge size={14} /> {formatNumber(log.odometerKm, 1)} กม.</span></td>
                  <td>{formatNumber(log.liters, 2)}</td>
                  <td>{formatMoney(log.pricePerLiter)}</td>
                  <td><strong>{formatMoney(log.totalAmount)}</strong></td>
                  <td>
                    <div className="fuel-proof-badges">
                      <span className={log.receiptPhotoUrl ? "badge success" : "badge muted"}>บิล</span>
                      <span className={log.odometerPhotoUrl ? "badge success" : "badge muted"}>เลขไมล์</span>
                    </div>
                  </td>
                  <td>
                    <button className="vehicle-icon-button" type="button" onClick={() => setDetail(log)}>
                      <Eye size={15} />
                      ดู
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="fuel-mobile-list">
          {filteredLogs.map((log) => (
            <article className="fuel-mobile-card" key={log.id}>
              <div className="fuel-mobile-head">
                <span><Fuel size={18} /></span>
                <div>
                  <strong>{formatMoney(log.totalAmount)}</strong>
                  <small>{formatDateTime(log.fueledAt)}</small>
                </div>
              </div>
              <div className="fuel-mobile-meta">
                <span>{log.vehicleName}</span>
                <span>{log.vehicleLicensePlate || "ไม่ระบุทะเบียน"}</span>
              </div>
              <div className="fuel-mobile-kpis">
                <span><Gauge size={14} /> {formatNumber(log.odometerKm, 1)} กม.</span>
                <span>{formatNumber(log.liters, 2)} ลิตร</span>
                <span>{formatMoney(log.pricePerLiter)}/ลิตร</span>
              </div>
              <button className="vehicle-icon-button" type="button" onClick={() => setDetail(log)}>
                <Eye size={15} />
                ดูบิลและรูปเลขไมล์
              </button>
            </article>
          ))}
        </div>

        {filteredLogs.length === 0 ? <div className="empty">ไม่พบรายการเติมน้ำมันตามเงื่อนไข</div> : null}
        <div className="projects-pagination">
          <Link
            className={`projects-page-link ${pagination.currentPage <= 1 ? "disabled" : ""}`}
            href={pagination.currentPage <= 2 ? "/fuel" : `/fuel?page=${pagination.currentPage - 1}`}
            aria-disabled={pagination.currentPage <= 1}
          >
            ก่อนหน้า
          </Link>
          <span className="projects-page-size-pill">
            หน้า {pagination.currentPage}/{pagination.totalPages} · ทั้งหมด {pagination.totalLogs} รายการ
          </span>
          <Link
            className={`projects-page-link ${pagination.currentPage >= pagination.totalPages ? "disabled" : ""}`}
            href={pagination.currentPage >= pagination.totalPages ? `/fuel?page=${pagination.totalPages}` : `/fuel?page=${pagination.currentPage + 1}`}
            aria-disabled={pagination.currentPage >= pagination.totalPages}
          >
            ถัดไป
          </Link>
        </div>
      </section>

      {createOpen ? <FuelCreateModal vehicles={vehicles} onClose={() => setCreateOpen(false)} /> : null}
      {detail ? <FuelDetailModal log={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}
