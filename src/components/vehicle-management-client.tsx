"use client";

import { CarFront, Fuel, Gauge, Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { VehicleDeleteForm } from "@/components/vehicle-delete-form";
import {
  deleteVehicleEfficiencyPresetAction,
} from "@/lib/actions";
import { saveVehicleEfficiencyPresetFormAction, updateVehicleFormAction } from "@/lib/form-actions";
import { formatNumber } from "@/lib/format";
import { roleLabels } from "@/lib/labels";
import { useDialogAccessibility } from "@/lib/use-dialog-accessibility";

type UserOption = {
  id: string;
  name: string;
  role: string;
};

type VehicleRow = {
  id: string;
  userId: string;
  name: string;
  make: string | null;
  model: string | null;
  licensePlate: string | null;
  fuelType: string;
  kmPerLiter: number | null;
  active: boolean;
  approved: boolean;
  isDefault: boolean;
  user: UserOption;
  counts: {
    checkIns: number;
    fuelLogs: number;
    travelClaims: number;
    odometerLogs: number;
  };
};

type VehicleStats = {
  total: number;
  active: number;
  pending: number;
};

type EfficiencyPreset = {
  id: string;
  make: string;
  model: string | null;
  fuelType: string;
  kmPerLiter: number;
  active: boolean;
};

const fuelTypeLabels: Record<string, string> = {
  GASOLINE: "เบนซิน",
  DIESEL: "ดีเซล",
  HYBRID: "ไฮบริด",
  EV: "ไฟฟ้า",
  OTHER: "อื่นๆ"
};

const fuelTypes = Object.entries(fuelTypeLabels);

function statusLabel(vehicle: VehicleRow) {
  if (!vehicle.active) return "ปิดใช้งาน";
  if (!vehicle.approved) return "รออนุมัติ";
  if (!vehicle.kmPerLiter) return "รอกำหนด กม./ลิตร";
  return "อนุมัติแล้ว";
}

function statusTone(vehicle: VehicleRow) {
  if (!vehicle.active) return "muted";
  if (!vehicle.approved || !vehicle.kmPerLiter) return "warning";
  return "success";
}

function referenceCount(vehicle: VehicleRow) {
  return vehicle.counts.checkIns + vehicle.counts.fuelLogs + vehicle.counts.travelClaims + vehicle.counts.odometerLogs;
}

function VehicleFormModal({
  vehicle,
  users,
  onClose
}: {
  vehicle: VehicleRow;
  users: UserOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const dialogRef = useDialogAccessibility(true, onClose);

  function submit(formData: FormData) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateVehicleFormAction(formData);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="modal-backdrop vehicle-modal-backdrop" role="presentation">
      <section ref={dialogRef} className="vehicle-modal-panel" role="dialog" aria-modal="true" aria-labelledby="vehicle-modal-title">
        <div className="vehicle-modal-head">
          <span><CarFront size={21} /></span>
          <div>
            <h2 id="vehicle-modal-title">ตรวจและอนุมัติรถ</h2>
            <p>{vehicle.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>

        <form action={submit} className="vehicle-modal-form" key={vehicle.id}>
          <input type="hidden" name="id" value={vehicle.id} />
          {actionError ? <div className="error-banner" role="alert">{actionError}</div> : null}

          <div className="form-grid two">
            <div className="field">
              <label htmlFor="vehicle-userId">พนักงาน</label>
              <select className="select" id="vehicle-userId" name="userId" defaultValue={vehicle.userId} required>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name} · {roleLabels[user.role]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="vehicle-name">ชื่อรถ</label>
              <input className="input" id="vehicle-name" name="name" defaultValue={vehicle.name} placeholder="เช่น Honda City วิศวกรสำรวจ" required />
            </div>
          </div>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor="vehicle-licensePlate">ทะเบียน</label>
              <input className="input" id="vehicle-licensePlate" name="licensePlate" defaultValue={vehicle.licensePlate ?? ""} placeholder="เช่น 1กก 1234" />
            </div>
            <div className="field">
              <label htmlFor="vehicle-fuelType">เชื้อเพลิง</label>
              <select className="select" id="vehicle-fuelType" name="fuelType" defaultValue={vehicle.fuelType}>
                {fuelTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid three">
            <div className="field">
              <label htmlFor="vehicle-make">ยี่ห้อ</label>
              <input className="input" id="vehicle-make" name="make" defaultValue={vehicle.make ?? ""} placeholder="Toyota, Honda" />
            </div>
            <div className="field">
              <label htmlFor="vehicle-model">รุ่น</label>
              <input className="input" id="vehicle-model" name="model" defaultValue={vehicle.model ?? ""} placeholder="Yaris, City" />
            </div>
            <div className="field">
              <label htmlFor="vehicle-kmPerLiter">กม./ลิตร</label>
              <input className="input" id="vehicle-kmPerLiter" name="kmPerLiter" type="number" min="1" step="0.1" defaultValue={vehicle.kmPerLiter ?? ""} placeholder="เช่น 14.5" required={vehicle.approved} />
            </div>
          </div>

          <div className="vehicle-modal-switches">
            <label><input type="checkbox" name="active" defaultChecked={vehicle.active} /> ใช้งาน</label>
            <label><input type="checkbox" name="approved" defaultChecked={vehicle.approved} /> อนุมัติ</label>
            <label><input type="checkbox" name="isDefault" defaultChecked={vehicle.isDefault} /> รถหลัก</label>
          </div>

          <div className="vehicle-modal-actions">
            <button className="button secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="button" type="submit" disabled={isPending}>
              {isPending ? "กำลังบันทึก..." : "บันทึกและอนุมัติ"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PresetFormModal({
  preset,
  onClose
}: {
  preset?: EfficiencyPreset;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const dialogRef = useDialogAccessibility(true, onClose);

  function submit(formData: FormData) {
    setActionError(null);
    startTransition(async () => {
      const result = await saveVehicleEfficiencyPresetFormAction(formData);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="modal-backdrop vehicle-modal-backdrop" role="presentation">
      <section ref={dialogRef} className="vehicle-modal-panel compact" role="dialog" aria-modal="true" aria-labelledby="preset-modal-title">
        <div className="vehicle-modal-head">
          <span><Gauge size={21} /></span>
          <div>
            <h2 id="preset-modal-title">{preset ? "แก้อัตรามาตรฐาน" : "เพิ่มอัตรามาตรฐาน"}</h2>
            <p>ใช้เป็นค่าแนะนำ กม./ลิตร ตามยี่ห้อ รุ่น และเชื้อเพลิง</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>

        <form action={submit} className="vehicle-modal-form" key={preset?.id ?? "new-preset"}>
          {preset ? <input type="hidden" name="id" value={preset.id} /> : null}
          {actionError ? <div className="error-banner" role="alert">{actionError}</div> : null}
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="preset-make">ยี่ห้อ</label>
              <input className="input" id="preset-make" name="make" defaultValue={preset?.make ?? ""} placeholder="Toyota, Honda, Isuzu" required />
            </div>
            <div className="field">
              <label htmlFor="preset-model">รุ่น</label>
              <input className="input" id="preset-model" name="model" defaultValue={preset?.model ?? ""} placeholder="Yaris, City หรือเว้นว่างเป็นค่าทั้งยี่ห้อ" />
            </div>
          </div>
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="preset-fuelType">เชื้อเพลิง</label>
              <select className="select" id="preset-fuelType" name="fuelType" defaultValue={preset?.fuelType ?? "GASOLINE"}>
                {fuelTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="preset-kmPerLiter">กม./ลิตร</label>
              <input className="input" id="preset-kmPerLiter" name="kmPerLiter" type="number" min="1" step="0.1" defaultValue={preset?.kmPerLiter ?? ""} placeholder="14.5" required />
            </div>
          </div>
          {preset ? (
            <div className="vehicle-modal-switches">
              <label><input type="checkbox" name="active" defaultChecked={preset.active} /> ใช้งาน</label>
            </div>
          ) : null}
          <div className="vehicle-modal-actions">
            <button className="button secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="button" type="submit" disabled={isPending}>
              {isPending ? "กำลังบันทึก..." : preset ? "บันทึกอัตรา" : "เพิ่มอัตรา"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function VehicleManagementClient({
  initialVehicles,
  users,
  stats,
  presets
}: {
  initialVehicles: VehicleRow[];
  users: UserOption[];
  stats: VehicleStats;
  presets: EfficiencyPreset[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");
  const [modal, setModal] = useState<{ vehicle: VehicleRow } | null>(null);
  const [presetModal, setPresetModal] = useState<{ preset?: EfficiencyPreset } | null>(null);
  const router = useRouter();

  const vehicles = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return initialVehicles.filter((vehicle) => {
      const matchesKeyword = !keyword || [
        vehicle.name,
        vehicle.licensePlate,
        vehicle.make,
        vehicle.model,
        vehicle.user.name
      ].filter(Boolean).join(" ").toLowerCase().includes(keyword);
      const matchesUser = !userId || vehicle.userId === userId;
      const matchesStatus =
        !status ||
        (status === "approved" && vehicle.active && vehicle.approved) ||
        (status === "pending" && vehicle.active && !vehicle.approved) ||
        (status === "active" && vehicle.active) ||
        (status === "inactive" && !vehicle.active);
      return matchesKeyword && matchesUser && matchesStatus;
    });
  }, [initialVehicles, query, status, userId]);

  return (
    <div className="content-stack vehicle-admin-page">
      <section className="vehicle-hero refined">
        <div>
          <p>Vehicle management</p>
          <h1>จัดการรถพนักงาน</h1>
          <span>พนักงานเพิ่มรถของตัวเอง แอดมินตรวจ อนุมัติ และกำหนด กม./ลิตร ก่อนนำไปใช้คำนวณค่าเดินทาง</span>
        </div>
        <div className="vehicle-hero-note">เพิ่มรถได้จากหน้า รถของฉัน</div>
      </section>

      <section className="vehicle-stats compact">
        <div>
          <span>รถทั้งหมด</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>ใช้งานได้</span>
          <strong>{stats.active}</strong>
        </div>
        <div>
          <span>รออนุมัติ</span>
          <strong>{stats.pending}</strong>
        </div>
      </section>

      <section className="vehicle-table-card">
        <div className="vehicle-table-head">
          <div>
            <h2>อัตราสิ้นเปลืองมาตรฐาน</h2>
            <p>ระบบจะใช้ค่าเหล่านี้แนะนำ กม./ลิตร เมื่อพนักงานเพิ่มรถที่ตรงกับยี่ห้อ/รุ่น</p>
          </div>
          <button className="vehicle-primary-action small" type="button" onClick={() => setPresetModal({})}>
            <Plus size={16} />
            เพิ่มอัตรา
          </button>
        </div>
        <div className="vehicle-table-wrap">
          <table className="vehicle-table preset">
            <thead>
              <tr>
                <th>ยี่ห้อ</th>
                <th>รุ่น</th>
                <th>เชื้อเพลิง</th>
                <th>กม./ลิตร</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {presets.map((preset) => (
                <tr key={preset.id}>
                  <td><strong>{preset.make}</strong></td>
                  <td>{preset.model || "ทุกรุ่น"}</td>
                  <td><span className="vehicle-soft-pill"><Fuel size={14} /> {fuelTypeLabels[preset.fuelType]}</span></td>
                  <td><span className="vehicle-soft-pill"><Gauge size={14} /> {formatNumber(preset.kmPerLiter, 1)}</span></td>
                  <td><span className={`badge ${preset.active ? "success" : "muted"}`}>{preset.active ? "ใช้งาน" : "ปิด"}</span></td>
                  <td>
                    <div className="vehicle-row-actions">
                      <button className="vehicle-icon-button" type="button" onClick={() => setPresetModal({ preset })}>
                        <Pencil size={15} />
                        แก้ไข
                      </button>
                      <button
                        className="vehicle-danger-button"
                        type="button"
                        onClick={() => {
                          const formData = new FormData();
                          formData.set("id", preset.id);
                          void deleteVehicleEfficiencyPresetAction(formData).then(() => router.refresh());
                        }}
                      >
                        <Trash2 size={15} />
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {presets.length === 0 ? <div className="empty">ยังไม่มีอัตรามาตรฐาน</div> : null}
      </section>

      <section className="vehicle-table-card">
        <div className="vehicle-table-head">
          <div>
            <h2>รายการรถ</h2>
            <p>{vehicles.length} คันจากตัวกรองปัจจุบัน</p>
          </div>
          <div className="vehicle-table-tools">
            <div className="vehicle-search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหารถ ทะเบียน หรือพนักงาน" />
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="กรองสถานะ">
              <option value="">ทุกสถานะ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="pending">รออนุมัติ</option>
              <option value="active">ใช้งานอยู่</option>
              <option value="inactive">ปิดใช้งาน</option>
            </select>
            <select value={userId} onChange={(event) => setUserId(event.target.value)} aria-label="กรองพนักงาน">
              <option value="">ทุกคน</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <button className="button secondary" type="button" onClick={() => { setQuery(""); setStatus(""); setUserId(""); }}>
              <SlidersHorizontal size={16} />
              ล้าง
            </button>
          </div>
        </div>

        <div className="vehicle-table-wrap">
          <table className="vehicle-table">
            <thead>
              <tr>
                <th>รถ</th>
                <th>พนักงาน</th>
                <th>ทะเบียน</th>
                <th>เชื้อเพลิง</th>
                <th>กม./ลิตร</th>
                <th>สถานะ</th>
                <th>ประวัติ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => {
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
                    <td>
                      <strong>{vehicle.user.name}</strong>
                      <small className="vehicle-muted">{roleLabels[vehicle.user.role]}</small>
                    </td>
                    <td>{vehicle.licensePlate || "-"}</td>
                    <td><span className="vehicle-soft-pill"><Fuel size={14} /> {fuelTypeLabels[vehicle.fuelType]}</span></td>
                    <td>
                      <span className={vehicle.kmPerLiter ? "vehicle-soft-pill" : "vehicle-soft-pill warning"}>
                        <Gauge size={14} />
                        {vehicle.kmPerLiter ? formatNumber(vehicle.kmPerLiter, 1) : "รอกำหนด"}
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
                        <VehicleDeleteForm id={vehicle.id} name={vehicle.name} hasReferences={refs > 0} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {vehicles.length === 0 ? <div className="empty">ไม่พบรถตามเงื่อนไขที่ค้นหา</div> : null}
      </section>

      {modal ? (
        <VehicleFormModal
          vehicle={modal.vehicle}
          users={users}
          onClose={() => setModal(null)}
        />
      ) : null}
      {presetModal ? (
        <PresetFormModal preset={presetModal.preset} onClose={() => setPresetModal(null)} />
      ) : null}
    </div>
  );
}
