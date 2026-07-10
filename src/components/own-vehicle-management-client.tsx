"use client";

import { CarFront, CheckCircle2, Fuel, Gauge, Pencil, Plus, Search, ShieldCheck, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOwnVehicleAction, updateOwnVehicleAction } from "@/lib/actions";
import { formatNumber } from "@/lib/format";
import { OwnVehicleDeleteForm } from "@/components/own-vehicle-delete-form";

type OwnVehicleRow = {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
  licensePlate: string | null;
  fuelType: string;
  kmPerLiter: number | null;
  active: boolean;
  approved: boolean;
  isDefault: boolean;
  counts: {
    checkIns: number;
    fuelLogs: number;
    travelClaims: number;
    odometerLogs: number;
  };
};

const fuelTypeLabels: Record<string, string> = {
  GASOLINE: "เบนซิน",
  DIESEL: "ดีเซล",
  HYBRID: "ไฮบริด",
  EV: "ไฟฟ้า",
  OTHER: "อื่นๆ"
};

const fuelTypes = Object.entries(fuelTypeLabels);

function referenceCount(vehicle: OwnVehicleRow) {
  return vehicle.counts.checkIns + vehicle.counts.fuelLogs + vehicle.counts.travelClaims + vehicle.counts.odometerLogs;
}

function statusLabel(vehicle: OwnVehicleRow) {
  if (!vehicle.active) return "ปิดใช้งาน";
  if (!vehicle.approved) return "รอแอดมินอนุมัติ";
  if (!vehicle.kmPerLiter) return "รอกำหนด กม./ลิตร";
  return "พร้อมใช้งาน";
}

function statusTone(vehicle: OwnVehicleRow) {
  if (!vehicle.active) return "muted";
  if (!vehicle.approved || !vehicle.kmPerLiter) return "warning";
  return "success";
}

function OwnVehicleFormModal({
  vehicle,
  onClose
}: {
  vehicle?: OwnVehicleRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const action = vehicle ? updateOwnVehicleAction : createOwnVehicleAction;

  function submit(formData: FormData) {
    startTransition(async () => {
      await action(formData);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="modal-backdrop vehicle-modal-backdrop" role="presentation">
      <section className="vehicle-modal-panel" role="dialog" aria-modal="true" aria-labelledby="own-vehicle-modal-title">
        <div className="vehicle-modal-head">
          <span><CarFront size={21} /></span>
          <div>
            <h2 id="own-vehicle-modal-title">{vehicle ? "แก้ไขรถของฉัน" : "เพิ่มรถของฉัน"}</h2>
            <p>แอดมินจะตรวจและกำหนด กม./ลิตรให้ก่อนใช้งาน</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>

        <form action={submit} className="vehicle-modal-form" key={vehicle?.id ?? "new"}>
          {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="own-vehicle-name">ชื่อรถ</label>
              <input className="input" id="own-vehicle-name" name="name" defaultValue={vehicle?.name ?? ""} placeholder="เช่น Toyota Yaris ของผม" required />
            </div>
            <div className="field">
              <label htmlFor="own-vehicle-licensePlate">ทะเบียน</label>
              <input className="input" id="own-vehicle-licensePlate" name="licensePlate" defaultValue={vehicle?.licensePlate ?? ""} placeholder="เช่น 1กก 1234" />
            </div>
          </div>

          <div className="form-grid three">
            <div className="field">
              <label htmlFor="own-vehicle-make">ยี่ห้อ</label>
              <input className="input" id="own-vehicle-make" name="make" defaultValue={vehicle?.make ?? ""} placeholder="Toyota, Honda" />
            </div>
            <div className="field">
              <label htmlFor="own-vehicle-model">รุ่น</label>
              <input className="input" id="own-vehicle-model" name="model" defaultValue={vehicle?.model ?? ""} placeholder="Yaris, City" />
            </div>
            <div className="field">
              <label htmlFor="own-vehicle-fuelType">เชื้อเพลิง</label>
              <select className="select" id="own-vehicle-fuelType" name="fuelType" defaultValue={vehicle?.fuelType ?? "GASOLINE"}>
                {fuelTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>

          <div className="own-vehicle-readonly-rate">
            <Gauge size={17} />
            <div>
              <strong>กม./ลิตร กำหนดโดยแอดมิน</strong>
              <span>{vehicle?.kmPerLiter ? `${formatNumber(vehicle.kmPerLiter, 1)} กม./ลิตร` : "ยังไม่กำหนด"}</span>
            </div>
          </div>

          <div className="vehicle-modal-actions">
            <button className="button secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="button" type="submit" disabled={isPending}>
              {isPending ? "กำลังส่ง..." : vehicle ? "ส่งแก้ไขให้แอดมินตรวจ" : "ส่งรถให้แอดมินตรวจ"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function OwnVehicleManagementClient({ vehicles }: { vehicles: OwnVehicleRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState<{ vehicle?: OwnVehicleRow } | null>(null);

  const filteredVehicles = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesKeyword = !keyword || [vehicle.name, vehicle.licensePlate, vehicle.make, vehicle.model]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
      const matchesStatus =
        !status ||
        (status === "ready" && vehicle.active && vehicle.approved && Boolean(vehicle.kmPerLiter)) ||
        (status === "pending" && vehicle.active && (!vehicle.approved || !vehicle.kmPerLiter)) ||
        (status === "inactive" && !vehicle.active);

      return matchesKeyword && matchesStatus;
    });
  }, [query, status, vehicles]);

  const readyCount = vehicles.filter((vehicle) => vehicle.active && vehicle.approved && vehicle.kmPerLiter).length;
  const pendingCount = vehicles.filter((vehicle) => vehicle.active && (!vehicle.approved || !vehicle.kmPerLiter)).length;

  return (
    <div className="content-stack vehicle-admin-page own-vehicle-page">
      <section className="vehicle-hero refined">
        <div>
          <p>My vehicles</p>
          <h1>รถของฉัน</h1>
          <span>เพิ่มรถที่ใช้ทำงาน แอดมินจะตรวจและกำหนด กม./ลิตร ก่อนนำไปใช้เช็คอินและคำนวณค่าเดินทาง</span>
        </div>
        <div className="vehicle-hero-note">
          <ShieldCheck size={16} />
          กม./ลิตร ถูกกำหนดโดยแอดมิน
        </div>
        <button className="vehicle-primary-action" type="button" onClick={() => setModal({})}>
          <Plus size={18} />
          เพิ่มรถ
        </button>
      </section>

      <section className="vehicle-stats compact">
        <div>
          <span>รถทั้งหมด</span>
          <strong>{vehicles.length}</strong>
        </div>
        <div>
          <span>พร้อมใช้งาน</span>
          <strong>{readyCount}</strong>
        </div>
        <div>
          <span>รอแอดมิน</span>
          <strong>{pendingCount}</strong>
        </div>
      </section>

      <section className="vehicle-table-card">
        <div className="vehicle-table-head">
          <div>
            <h2>รายการรถของฉัน</h2>
            <p>{filteredVehicles.length} คันจากรายการของคุณ</p>
          </div>
          <div className="vehicle-table-tools">
            <div className="vehicle-search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหารถหรือทะเบียน" />
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="กรองสถานะรถ">
              <option value="">ทุกสถานะ</option>
              <option value="ready">พร้อมใช้งาน</option>
              <option value="pending">รอแอดมิน</option>
              <option value="inactive">ปิดใช้งาน</option>
            </select>
          </div>
        </div>

        <div className="vehicle-table-wrap">
          <table className="vehicle-table">
            <thead>
              <tr>
                <th>รถ</th>
                <th>ทะเบียน</th>
                <th>เชื้อเพลิง</th>
                <th>กม./ลิตร</th>
                <th>สถานะ</th>
                <th>ประวัติ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => {
                const refs = referenceCount(vehicle);
                return (
                  <tr key={vehicle.id}>
                    <td>
                      <div className="vehicle-table-name">
                        <span><CarFront size={18} /></span>
                        <div>
                          <strong>{vehicle.name}</strong>
                          <small>{[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "ไม่ระบุรุ่น"}</small>
                        </div>
                      </div>
                    </td>
                    <td>{vehicle.licensePlate || "-"}</td>
                    <td><span className="vehicle-soft-pill"><Fuel size={14} /> {fuelTypeLabels[vehicle.fuelType]}</span></td>
                    <td>
                      <span className={vehicle.kmPerLiter ? "vehicle-soft-pill" : "vehicle-soft-pill warning"}>
                        <Gauge size={14} />
                        {vehicle.kmPerLiter ? formatNumber(vehicle.kmPerLiter, 1) : "รอแอดมิน"}
                      </span>
                    </td>
                    <td>
                      <div className="vehicle-status-stack">
                        <span className={`badge ${statusTone(vehicle)}`}>{statusLabel(vehicle)}</span>
                        {vehicle.isDefault ? <small>รถหลัก</small> : null}
                      </div>
                    </td>
                    <td>{refs} รายการ</td>
                    <td>
                      <div className="vehicle-row-actions">
                        <button className="vehicle-icon-button" type="button" onClick={() => setModal({ vehicle })}>
                          <Pencil size={15} />
                          แก้ไข
                        </button>
                        <OwnVehicleDeleteForm id={vehicle.id} name={vehicle.name} hasReferences={refs > 0} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="own-vehicle-mobile-list">
          {filteredVehicles.map((vehicle) => {
            const refs = referenceCount(vehicle);
            return (
              <article className="own-vehicle-mobile-card" key={vehicle.id}>
                <div className="own-vehicle-mobile-head">
                  <span><CarFront size={18} /></span>
                  <div>
                    <strong>{vehicle.name}</strong>
                    <small>{vehicle.licensePlate || "ไม่ระบุทะเบียน"}</small>
                  </div>
                </div>
                <div className="own-vehicle-mobile-meta">
                  <span><Fuel size={14} /> {fuelTypeLabels[vehicle.fuelType]}</span>
                  <span><Gauge size={14} /> {vehicle.kmPerLiter ? `${formatNumber(vehicle.kmPerLiter, 1)} กม./ลิตร` : "รอแอดมิน"}</span>
                </div>
                <div className="vehicle-status-stack">
                  <span className={`badge ${statusTone(vehicle)}`}>{statusLabel(vehicle)}</span>
                  {vehicle.isDefault ? <small><CheckCircle2 size={12} /> รถหลัก</small> : null}
                </div>
                <div className="own-vehicle-mobile-actions">
                  <button className="vehicle-icon-button" type="button" onClick={() => setModal({ vehicle })}>
                    <Pencil size={15} />
                    แก้ไข
                  </button>
                  <OwnVehicleDeleteForm id={vehicle.id} name={vehicle.name} hasReferences={refs > 0} />
                </div>
              </article>
            );
          })}
        </div>

        {filteredVehicles.length === 0 ? <div className="empty">ยังไม่มีรถ หรือไม่พบรถตามคำค้นหา</div> : null}
      </section>

      {modal ? <OwnVehicleFormModal vehicle={modal.vehicle} onClose={() => setModal(null)} /> : null}
    </div>
  );
}
