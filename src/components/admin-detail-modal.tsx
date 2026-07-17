"use client";

import { X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useDialogAccessibility } from "@/lib/use-dialog-accessibility";

type AdminDetailModalProps = {
  buttonLabel?: string;
  buttonClassName?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
};

export function AdminDetailModal({
  buttonLabel = "ดูรายละเอียด",
  buttonClassName = "button secondary small",
  eyebrow,
  title,
  subtitle,
  children,
  wide = false
}: AdminDetailModalProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialogRef = useDialogAccessibility(open, () => setOpen(false));

  return (
    <>
      <button className={buttonClassName} type="button" onClick={() => setOpen(true)}>{buttonLabel}</button>
      {open ? (
        <div className="admin-detail-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section ref={dialogRef} className={`admin-detail-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <header>
              <div><span>{eyebrow}</span><h2 id={titleId}>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
              <button type="button" onClick={() => setOpen(false)} aria-label="ปิด"><X size={20} /></button>
            </header>
            <div className="admin-detail-body">{children}</div>
          </section>
        </div>
      ) : null}
    </>
  );
}
