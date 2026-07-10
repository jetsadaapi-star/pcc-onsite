"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ActionModalProps = {
  open: boolean;
  tone?: "info" | "warning" | "danger" | "success";
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
};

const icons = {
  info: Info,
  warning: AlertTriangle,
  danger: AlertTriangle,
  success: CheckCircle2
};

export function ActionModal({
  open,
  tone = "info",
  title,
  description,
  confirmLabel = "ตกลง",
  cancelLabel,
  onConfirm,
  onClose
}: ActionModalProps) {
  if (!open) return null;
  const Icon = icons[tone];

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="action-modal" role="dialog" aria-modal="true" aria-labelledby="action-modal-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="ปิด">
          <X size={18} />
        </button>
        <div className={`modal-icon ${tone}`}>
          <Icon size={22} />
        </div>
        <h2 id="action-modal-title">{title}</h2>
        <p>{description}</p>
        <div className="modal-actions">
          {cancelLabel ? (
            <button className="button secondary" type="button" onClick={onClose}>
              {cancelLabel}
            </button>
          ) : null}
          <button
            className={tone === "danger" ? "button danger" : "button"}
            type="button"
            onClick={() => {
              onConfirm?.();
              if (!onConfirm) onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
