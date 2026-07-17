"use client";

import Link from "next/link";
import {
  Building2,
  CarFront,
  CheckCircle2,
  ChevronDown,
  Gauge,
  Home,
  LocateFixed,
  MapPin,
  MapPinned,
  Navigation,
  Plus,
  Search,
  Send,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ActionModal } from "@/components/action-modal";
import { CameraCaptureField } from "@/components/camera-capture-field";
import { startTripFormAction } from "@/lib/form-actions";
import { useProjectSearch } from "@/lib/use-project-search";

type ProjectOption = {
  id: string;
  code: string;
  name: string;
  customerName: string;
};

type VehicleOption = {
  id: string;
  name: string;
  licensePlate: string | null;
  kmPerLiter: number | null;
  isDefault: boolean;
};

type OfficeOption = {
  name: string;
  latitude: number;
  longitude: number;
} | null;

const originOptions = [
  { value: "OFFICE", label: "บริษัท/สำนักงาน", icon: Building2 },
  { value: "HOME", label: "บ้าน/ที่พัก", icon: Home },
  { value: "CURRENT_LOCATION", label: "ตำแหน่งปัจจุบัน", icon: LocateFixed },
  { value: "PREVIOUS_SITE", label: "หน้างานก่อนหน้า", icon: Navigation }
] as const;

export function StartTripForm({
  projects,
  defaultVehicle,
  hasPreviousSite,
  defaultOffice
}: {
  projects: ProjectOption[];
  defaultVehicle: VehicleOption | null;
  hasPreviousSite: boolean;
  defaultOffice: OfficeOption;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const gpsRequestedRef = useRef(false);
  const [originType, setOriginType] = useState("CURRENT_LOCATION");
  const [destinationType, setDestinationType] = useState<"PROJECT" | "OFFICE">("PROJECT");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [projectQuery, setProjectQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const effectiveOrigin = originType === "OFFICE" && defaultOffice
    ? { latitude: defaultOffice.latitude, longitude: defaultOffice.longitude, accuracy: undefined }
    : gps;
  const { projects: filteredProjects, searching: projectSearching, error: projectSearchError } = useProjectSearch(projects, projectQuery);
  const gpsText = useMemo(() => {
    if (originType === "OFFICE" && defaultOffice) return `${defaultOffice.name} (${defaultOffice.latitude.toFixed(6)}, ${defaultOffice.longitude.toFixed(6)})`;
    if (originType === "PREVIOUS_SITE") return "ระบบจะใช้พิกัดเช็คเอาท์ล่าสุดเป็นต้นทาง";
    if (gpsLoading) return "กำลังดึงพิกัดจุดเริ่มต้น...";
    if (!gps) return "ยังไม่ได้ดึงพิกัดจุดเริ่มต้น";
    return `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}${gps.accuracy ? ` ±${Math.round(gps.accuracy)}m` : ""}`;
  }, [defaultOffice, gps, gpsLoading, originType]);

  const captureGps = useCallback((silent = false) => {
    if (originType === "PREVIOUS_SITE" || (originType === "OFFICE" && defaultOffice)) return;
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
  }, [defaultOffice, originType]);

  useEffect(() => {
    if (gpsRequestedRef.current) return;
    gpsRequestedRef.current = true;
    captureGps(true);
  }, [captureGps]);

  function selectProject(projectId: string) {
    setSelectedProjectId(projectId);
    setProjectQuery("");
    setPickerOpen(false);
  }

  function submitWithFeedback() {
    if (!defaultVehicle) {
      setModal({
        title: "ยังไม่มีรถที่พร้อมใช้งาน",
        description: "กรุณาเพิ่มรถของคุณ และรอแอดมินอนุมัติพร้อมกำหนด กม./ลิตร ก่อนเริ่มเดินทาง"
      });
      return;
    }
    if (destinationType === "PROJECT" && !selectedProjectId) {
      setModal({
        title: "กรุณาเลือกปลายทาง",
        description: "เลือกโครงการ/หน้างานที่จะเดินทางไปก่อนเริ่มเดินทาง"
      });
      return;
    }
    if (originType === "PREVIOUS_SITE" && !hasPreviousSite) {
      setModal({
        title: "ยังไม่มีหน้างานก่อนหน้า",
        description: "ไม่พบประวัติเช็คเอาท์ล่าสุด ให้เลือกบริษัท บ้าน หรือตำแหน่งปัจจุบันแทน"
      });
      return;
    }
    if (originType !== "PREVIOUS_SITE" && !effectiveOrigin) {
      setModal({
        title: "กรุณาดึง GPS จุดเริ่มต้น",
        description: "ระบบต้องมีพิกัดต้นทางเพื่อคำนวณระยะทางไปหน้างาน"
      });
      return;
    }
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setActionError(null);
        startTransition(async () => {
          const result = await startTripFormAction(formData);
          if (!result.ok) setActionError(result.error);
        });
      }}
      className="start-trip-panel"
    >
      {actionError ? <div className="error-banner" role="alert">{actionError}</div> : null}
      <input type="hidden" name="originType" value={originType} />
      <input type="hidden" name="originLatitude" value={effectiveOrigin?.latitude ?? ""} />
      <input type="hidden" name="originLongitude" value={effectiveOrigin?.longitude ?? ""} />
      <input type="hidden" name="originAccuracy" value={effectiveOrigin?.accuracy ?? ""} />
      <input type="hidden" name="destinationType" value={destinationType} />
      <input type="hidden" name="destinationProjectId" value={destinationType === "PROJECT" ? selectedProjectId : ""} />

      <section className="trip-step-card primary">
        <div className="trip-step-head">
          <span><Navigation size={19} /></span>
          <div>
            <strong>เริ่มเดินทางก่อนออกหน้างาน</strong>
            <small>ระบบจะใช้จุดเริ่มต้นนี้คำนวณระยะทางและค่าน้ำมันเมื่อคุณเช็คอินถึงหน้างาน</small>
          </div>
        </div>
      </section>

      <section className="trip-step-card">
        <div className="trip-section-title">
          <strong>ต้นทาง</strong>
          <small>เลือกสถานที่ที่เริ่มเดินทางจริง</small>
        </div>
        <div className="trip-origin-grid">
          {originOptions.map((option) => {
            const Icon = option.icon;
            const disabled = option.value === "PREVIOUS_SITE" && !hasPreviousSite;
            return (
              <button
                key={option.value}
                className={originType === option.value ? "trip-origin-option active" : "trip-origin-option"}
                type="button"
                onClick={() => {
                  if (disabled) return;
                  setOriginType(option.value);
                }}
                disabled={disabled}
              >
                <Icon size={18} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        <div className={effectiveOrigin || originType === "PREVIOUS_SITE" ? "gps-box ready" : "gps-box"}>
          <div className="toolbar">
            <div>
              <strong><MapPin size={16} /> พิกัดต้นทาง</strong>
              <div className="muted">{gpsText}</div>
            </div>
            <button className="button secondary gps-button" type="button" onClick={() => captureGps(false)} disabled={gpsLoading || originType === "PREVIOUS_SITE" || (originType === "OFFICE" && !!defaultOffice)}>
              <LocateFixed size={17} />
              {originType === "OFFICE" && defaultOffice ? "ใช้พิกัดบริษัท" : gpsLoading ? "กำลังดึง GPS..." : gps ? "อัปเดต GPS" : "ดึง GPS"}
            </button>
          </div>
          {gpsError ? <div className="error-banner">{gpsError}</div> : null}
        </div>
      </section>

      <section className="trip-step-card">
        <div className="trip-section-title">
          <strong>รถหลักที่ใช้คำนวณ</strong>
          <small>ระบบเลือกจากรถที่แอดมินอนุมัติแล้วอัตโนมัติ</small>
        </div>
        <div className={defaultVehicle ? "trip-vehicle-card ready" : "trip-vehicle-card"}>
          <span><CarFront size={20} /></span>
          <div>
            <strong>{defaultVehicle ? defaultVehicle.name : "ยังไม่มีรถพร้อมใช้งาน"}</strong>
            <small>
              {defaultVehicle
                ? `${defaultVehicle.licensePlate ? `${defaultVehicle.licensePlate} · ` : ""}${defaultVehicle.kmPerLiter?.toFixed(1) ?? "-"} กม./ลิตร`
                : "เพิ่มรถและรอแอดมินกำหนด กม./ลิตร"}
            </small>
          </div>
        </div>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="trip-odometerStartKm"><Gauge size={15} /> เลขไมล์ก่อนออก</label>
            <input className="input" id="trip-odometerStartKm" name="odometerStartKm" type="number" min="0" step="0.1" placeholder="เช่น 45210.5" />
          </div>
          <CameraCaptureField
            name="odometerStartPhoto"
            label="รูปเลขไมล์ก่อนออก"
            title="ถ่ายเลขไมล์ก่อนออก"
            description="ใช้ตรวจสอบระยะทางจริงกับ GPS"
          />
        </div>
      </section>

      <section className="trip-step-card">
        <div className="trip-section-title">
          <strong>ปลายทาง</strong>
          <small>เลือกโครงการ/หน้างานที่จะเดินทางไป</small>
        </div>
        <div className="trip-destination-mode">
          <button
            className={destinationType === "PROJECT" ? "trip-origin-option active" : "trip-origin-option"}
            type="button"
            onClick={() => setDestinationType("PROJECT")}
          >
            <MapPinned size={18} />
            <span>ไปโครงการ/หน้างาน</span>
          </button>
          <button
            className={destinationType === "OFFICE" ? "trip-origin-option active" : "trip-origin-option"}
            type="button"
            onClick={() => {
              setDestinationType("OFFICE");
              setSelectedProjectId("");
              setPickerOpen(false);
            }}
          >
            <Building2 size={18} />
            <span>ไปบริษัท/สำนักงาน</span>
          </button>
        </div>

        {destinationType === "OFFICE" ? (
          <div className="trip-vehicle-card ready">
            <span><Building2 size={20} /></span>
            <div>
              <strong>ปลายทาง: บริษัท/สำนักงาน</strong>
              <small>ใช้บันทึกการเดินทางเข้าบริษัท ไม่สร้างรายการเบิกเดินทาง</small>
            </div>
          </div>
        ) : null}

        {destinationType === "PROJECT" ? <div className="project-combobox">
          <button
            className={selectedProject ? "project-combobox-button selected" : "project-combobox-button"}
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={projects.length === 0}
            aria-expanded={pickerOpen}
          >
            <span className="project-combobox-icon"><MapPinned size={18} /></span>
            <span className="project-combobox-text">
              <strong>{selectedProject ? `${selectedProject.code} · ${selectedProject.name}` : "เลือกปลายทาง"}</strong>
              <small>{selectedProject ? selectedProject.customerName : "แตะเพื่อค้นหาโครงการ/หน้างาน"}</small>
            </span>
            <ChevronDown size={18} />
          </button>

          {pickerOpen ? (
            <>
              <button className="project-picker-backdrop" type="button" aria-label="ปิดรายการโครงการ" onClick={() => setPickerOpen(false)} />
              <div className="project-picker-popover" role="dialog" aria-label="เลือกปลายทาง">
                <div className="project-picker-header">
                  <div>
                    <strong>เลือกปลายทาง</strong>
                    <small>ค้นหาจากรหัสโครงการ ชื่อลูกค้า หรือชื่อหน้างาน</small>
                  </div>
                  <button className="project-picker-close" type="button" onClick={() => setPickerOpen(false)} aria-label="ปิด">
                    <X size={18} />
                  </button>
                </div>
                <div className="project-search-box">
                  <Search size={17} />
                  <input type="search" value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} placeholder="ค้นหาโครงการ..." autoFocus />
                </div>
                <div className="project-choice-list">
                  {filteredProjects.map((project) => {
                    const selected = project.id === selectedProjectId;
                    return (
                      <button key={project.id} className={selected ? "project-choice selected" : "project-choice"} type="button" aria-pressed={selected} onClick={() => selectProject(project.id)}>
                        <span className="project-choice-icon"><MapPinned size={18} /></span>
                        <span>
                          <strong>{project.code} · {project.name}</strong>
                          <small>{project.customerName}</small>
                        </span>
                        {selected ? <CheckCircle2 size={18} /> : null}
                      </button>
                    );
                  })}
                </div>
                {projectSearching ? <div className="empty compact">กำลังค้นหาโครงการ...</div> : null}
                {projectSearchError ? <div className="empty compact" role="status">{projectSearchError}</div> : null}
                {!projectSearching && !projectSearchError && filteredProjects.length === 0 ? <div className="empty compact">ไม่พบโครงการที่ตรงกับคำค้นหา</div> : null}
                <Link className="project-add-link" href="/projects/new?returnTo=/check-in" onClick={() => setPickerOpen(false)}>
                  <Plus size={17} />
                  เพิ่มหน้างานใหม่
                </Link>
              </div>
            </>
          ) : null}
        </div> : null}
      </section>

      <button className="button success full-action-button" type="button" onClick={submitWithFeedback} disabled={isPending}>
        <Send size={17} />
        {isPending ? "กำลังเริ่มเดินทาง..." : "เริ่มเดินทาง"}
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
