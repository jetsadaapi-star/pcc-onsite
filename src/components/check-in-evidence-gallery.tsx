"use client";

import { ChevronLeft, ChevronRight, ExternalLink, ImageIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useDialogAccessibility } from "@/lib/use-dialog-accessibility";

export type CheckInEvidenceItem = {
  url: string;
  label: string;
};

export function CheckInEvidenceGallery({ items }: { items: CheckInEvidenceItem[] }) {
  const evidence = useMemo(() => Array.from(new Map(items.filter((item) => item.url).map((item) => [item.url, item])).values()), [items]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selected = selectedIndex === null ? null : evidence[selectedIndex];
  const close = () => setSelectedIndex(null);
  const dialogRef = useDialogAccessibility(selectedIndex !== null, close);

  if (!evidence.length) return <span className="admin-checkins-proof"><ImageIcon size={14} /> ไม่มีไฟล์แนบ</span>;

  function move(direction: number) {
    setSelectedIndex((current) => current === null ? null : (current + direction + evidence.length) % evidence.length);
  }

  return (
    <>
      <div className="checkin-evidence-gallery" aria-label={`หลักฐาน ${evidence.length} ไฟล์`}>
        {evidence.map((item, index) => (
          <button key={item.url} type="button" onClick={() => setSelectedIndex(index)} aria-label={`เปิด ${item.label}`}>
            <img src={item.url} alt={item.label} loading="lazy" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="evidence-lightbox-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) close();
        }}>
          <section ref={dialogRef} className="evidence-lightbox" role="dialog" aria-modal="true" aria-label={selected.label}>
            <header>
              <div><strong>{selected.label}</strong><span>{selectedIndex! + 1} / {evidence.length}</span></div>
              <div>
                <a href={selected.url} target="_blank" rel="noreferrer"><ExternalLink size={17} /> เปิดไฟล์ต้นฉบับ</a>
                <button type="button" onClick={close} aria-label="ปิด"><X size={20} /></button>
              </div>
            </header>
            <div className="evidence-lightbox-stage">
              {evidence.length > 1 ? <button type="button" onClick={() => move(-1)} aria-label="รูปก่อนหน้า"><ChevronLeft size={24} /></button> : null}
              <img src={selected.url} alt={selected.label} />
              {evidence.length > 1 ? <button type="button" onClick={() => move(1)} aria-label="รูปถัดไป"><ChevronRight size={24} /></button> : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
