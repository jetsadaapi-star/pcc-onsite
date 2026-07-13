"use client";

import type { ReactNode } from "react";

export function ConfirmActionForm({
  action,
  fields,
  message,
  className,
  children
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  message: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      {children}
    </form>
  );
}
