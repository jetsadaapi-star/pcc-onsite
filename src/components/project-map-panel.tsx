"use client";

import { Map, MapPinned } from "lucide-react";
import { useState } from "react";
import { MapPreview, type MapPoint } from "@/components/map-preview";

export function ProjectMapPanel({ points, totalProjects }: { points: MapPoint[]; totalProjects: number }) {
  const [open, setOpen] = useState(false);
  const missingLocation = totalProjects - points.length;

  return (
    <section className="project-map-card">
      <div className="project-map-summary">
        <span className="project-map-icon">
          <MapPinned size={20} />
        </span>
        <div>
          <h2>แผนที่หน้างาน</h2>
          <p className="muted">
            มีพิกัด {points.length} โครงการ{missingLocation > 0 ? ` · ยังไม่มีพิกัด ${missingLocation} โครงการ` : ""}
          </p>
        </div>
      </div>
      <button className="button secondary" type="button" onClick={() => setOpen((value) => !value)}>
        <Map size={17} />
        {open ? "ซ่อนแผนที่" : "เปิดแผนที่"}
      </button>

      {open ? (
        <div className="project-map-body">
          <MapPreview points={points} />
        </div>
      ) : null}
    </section>
  );
}
