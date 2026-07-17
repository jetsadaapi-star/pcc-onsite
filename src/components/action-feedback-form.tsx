"use client";

import { useEffect, useRef, useState, useTransition, type FormEventHandler, type ReactNode } from "react";
import type { FormActionResult } from "@/lib/form-actions";

type ActionFeedbackFormProps = {
  action: (formData: FormData) => Promise<FormActionResult>;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

export function ActionFeedbackForm({ action, children, className, successMessage, onSubmit }: ActionFeedbackFormProps) {
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedback?.tone === "error") feedbackRef.current?.focus();
  }, [feedback]);

  return (
    <form
      className={className}
      aria-busy={isPending}
      onSubmit={onSubmit}
      action={(formData) => {
        setFeedback(null);
        startTransition(async () => {
          const result = await action(formData);
          setFeedback(result.ok
            ? successMessage ? { tone: "success", message: successMessage } : null
            : { tone: "error", message: result.error });
        });
      }}
    >
      {feedback ? (
        <div ref={feedbackRef} tabIndex={-1} className={feedback.tone === "error" ? "error-banner" : "success-banner"} role={feedback.tone === "error" ? "alert" : "status"}>
          {feedback.message}
        </div>
      ) : null}
      {children}
    </form>
  );
}
