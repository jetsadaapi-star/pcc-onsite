"use client";

import Link from "next/link";
import {
  CarFront,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  LocateFixed,
  MapPin,
  MapPinned,
  Plus,
  Search,
  Send,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ActionModal } from "@/components/action-modal";
import { CameraCaptureField } from "@/components/camera-capture-field";
import { createCheckInFormAction } from "@/lib/form-actions";
import { useProjectSearch } from "@/lib/use-project-search";

type ProjectOption = {
  id: string;
  code: string;
  name: string;
  customerName: string;
};

type ActiveTripOption = {
  id: string;
  originType: string;
  originLabel: string | null;
  startedAt: Date | string;
  destinationProject: ProjectOption;
  vehicle: {
    name: string;
    licensePlate: string | null;
    kmPerLiter: number | null;
  } | null;
};

const purposes = [
  ["SITE_SURVEY", "สำรวจหน้างาน"],
  ["CUSTOMER_VISIT", "พบลูกค้า"],
  ["FOLLOW_UP", "ติดตามงาน"],
  ["INSPECTION", "ตรวจงาน"],
  ["HANDOVER", "ส่งมอบ"],
  ["CONSTRUCTION", "ก่อสร้าง/ติดตั้ง"],
  ["OTHER", "อื่นๆ"]
] as const;

export function CheckInForm({
  projects,
  activeTrip
}: {
  projects: ProjectOption[];
  activeTrip?: ActiveTripOption | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const gpsRequestedRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [projectQuery, setProjectQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(activeTrip?.destinationProject.id ?? "");
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasProjects = projects.length > 0;
  const selectedProject = activeTrip?.destinationProject ?? projects.find((project) => project.id === selectedProjectId);
  const { projects: filteredProjects, searching: projectSearching, error: projectSearchError } = useProjectSearch(projects, projectQuery);
  const gpsText = useMemo(() => {
    if (gpsLoading) return "กำลังดึงพิกัดอัตโนมัติ...";
    if (!gps) return "ยังไม่ได้ดึงพิกัด";
    return `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}${gps.accuracy ? ` ±${Math.round(gps.accuracy)}m` : ""}`;
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
        if (!silent) {
          setGpsError(error.message || "ไม่สามารถดึงพิกัดได้");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, []);

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
    if (!activeTrip && !hasProjects) {
      setModal({
        title: "ยังไม่มีโครงการให้เลือก",
        description: "กรุณาเพิ่มโครงการ/หน้างานก่อน แล้วค่อยกลับมาเช็คอิน"
      });
      return;
    }
    if (!activeTrip && !selectedProjectId) {
      setModal({
        title: "กรุณาเลือกโครงการ",
        description: "แตะช่องเลือกโครงการ ค้นหา แล้วเลือกโครงการหรือหน้างานที่คุณอยู่ตอนนี้ก่อนบันทึกเช็คอิน"
      });
      return;
    }
    if (!gps) {
      setModal({
        title: "กรุณาดึง GPS ก่อน",
        description: "ระบบพยายามดึง GPS ให้อัตโนมัติแล้ว หากยังไม่ได้พิกัดให้กดปุ่มดึง GPS อีกครั้ง"
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
          const result = await createCheckInFormAction(formData);
          if (!result.ok) setActionError(result.error);
        });
      }}
      className="checkin-panel"
    >
      {actionError ? <div className="error-banner" role="alert">{actionError}</div> : null}
      <div className={gps ? "gps-box ready" : "gps-box"}>
        <div className="toolbar">
          <div>
            <strong><MapPin size={16} /> พิกัดปัจจุบัน</strong>
            <div className="muted">{gpsText}</div>
          </div>
          <button className="button secondary gps-button" type="button" onClick={() => captureGps(false)} disabled={gpsLoading}>
            <LocateFixed size={17} />
            {gpsLoading ? "กำลังดึง GPS..." : gps ? "อัปเดต GPS" : "ดึง GPS"}
          </button>
        </div>
        {gpsError ? <div className="error-banner">{gpsError}</div> : null}
      </div>

      <input type="hidden" name="latitude" value={gps?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={gps?.longitude ?? ""} />
      <input type="hidden" name="accuracy" value={gps?.accuracy ?? ""} />
      <input type="hidden" name="projectId" value={selectedProjectId} />
      <input type="hidden" name="tripSessionId" value={activeTrip?.id ?? ""} />

      <section className="odometer-card compact-day-odometer">
        <div className="odometer-card-head">
          <span><CarFront size={18} /></span>
          <div>
            <strong>{activeTrip?.vehicle?.name ?? "รถประจำรอบงาน"}</strong>
            <small>เช็คอินครั้งนี้ใช้ GPS เท่านั้น เลขไมล์จะบันทึกอีกครั้งเมื่อจบการเดินทางวันนี้</small>
          </div>
        </div>
      </section>

      <div className="field project-picker">
        <label className="required-label"><Search size={15} /> โครงการ/หน้างาน</label>
        {activeTrip ? (
          <div className="active-visit-card">
            <span><MapPinned size={20} /></span>
            <div>
              <strong>{activeTrip.destinationProject.code} · {activeTrip.destinationProject.name}</strong>
              <small>{activeTrip.destinationProject.customerName}</small>
            </div>
          </div>
        ) : (
        <div className="project-combobox">
          <button
            className={selectedProject ? "project-combobox-button selected" : "project-combobox-button"}
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={!hasProjects}
            aria-expanded={pickerOpen}
          >
            <span className="project-combobox-icon"><MapPinned size={18} /></span>
            <span className="project-combobox-text">
              <strong>{selectedProject ? `${selectedProject.code} · ${selectedProject.name}` : "เลือกโครงการ/หน้างาน"}</strong>
              <small>{selectedProject ? selectedProject.customerName : "แตะเพื่อค้นหาและเลือกหน้างาน"}</small>
            </span>
            <ChevronDown size={18} />
          </button>

          {pickerOpen ? (
            <>
              <button
                className="project-picker-backdrop"
                type="button"
                aria-label="ปิดรายการโครงการ"
                onClick={() => setPickerOpen(false)}
              />
              <div className="project-picker-popover" role="dialog" aria-label="เลือกโครงการ/หน้างาน">
                <div className="project-picker-header">
                  <div>
                    <strong>เลือกโครงการ/หน้างาน</strong>
                    <small>ค้นหาจากรหัสโครงการ ชื่อลูกค้า หรือชื่อหน้างาน</small>
                  </div>
                  <button className="project-picker-close" type="button" onClick={() => setPickerOpen(false)} aria-label="ปิด">
                    <X size={18} />
                  </button>
                </div>

                <div className="project-search-box">
                  <Search size={17} />
                  <input
                    type="search"
                    value={projectQuery}
                    onChange={(event) => setProjectQuery(event.target.value)}
                    placeholder="ค้นหาโครงการ..."
                    autoFocus
                  />
                </div>

                <div className="project-choice-list">
                  {filteredProjects.map((project) => {
                    const selected = project.id === selectedProjectId;
                    return (
                      <button
                        key={project.id}
                        className={selected ? "project-choice selected" : "project-choice"}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => selectProject(project.id)}
                      >
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
                {!projectSearching && !projectSearchError && filteredProjects.length === 0 ? (
                  <div className="empty compact">ไม่พบโครงการที่ตรงกับคำค้นหา</div>
                ) : null}

                <Link className="project-add-link" href="/projects/new?returnTo=/check-in" onClick={() => setPickerOpen(false)}>
                  <Plus size={17} />
                  เพิ่มหน้างานใหม่
                </Link>
              </div>
            </>
          ) : null}
        </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="purpose"><ClipboardList size={15} /> วัตถุประสงค์</label>
        <select className="select" id="purpose" name="purpose" required defaultValue="SITE_SURVEY">
          {purposes.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="note"><ClipboardList size={15} /> บันทึกงานที่ทำ</label>
        <textarea className="textarea" id="note" name="note" placeholder="เช่น สำรวจพื้นที่, พบลูกค้า, ตรวจความคืบหน้า" />
      </div>

      <CameraCaptureField
        name="photos"
        label="รูปหลักฐาน"
        title="ถ่ายรูปหลักฐาน"
        description="ถ่ายได้หลายรูป เช่น หน้างาน สภาพพื้นที่ เอกสาร หรือจุดติดตั้ง"
        multiple
      />

      <button className="button success full-action-button" type="button" onClick={submitWithFeedback} disabled={isPending}>
        {isPending ? <MapPinned size={17} /> : <Send size={17} />}
        {isPending ? "กำลังบันทึก..." : "เช็คอิน"}
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
