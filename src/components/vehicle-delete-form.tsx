"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionModal } from "@/components/action-modal";
import { deleteVehicleAction } from "@/lib/actions";

export function VehicleDeleteForm({ id, name, hasReferences }: { id: string; name: string; hasReferences: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    const formData = new FormData();
    formData.set("id", id);
    setOpen(false);
    startTransition(async () => {
      await deleteVehicleAction(formData);
      router.refresh();
    });
  }

  return (
    <>
      <button className="vehicle-danger-button" type="button" disabled={isPending} onClick={() => setOpen(true)}>
        <Trash2 size={15} />
        {isPending ? "กำลังลบ..." : "ลบ"}
      </button>
      <ActionModal
        open={open}
        tone="danger"
        title={`ลบรถ ${name}?`}
        description={
          hasReferences
            ? "รถคันนี้มีประวัติใช้งานแล้ว ระบบจะปิดใช้งานแทนการลบถาวร เพื่อให้รายงานย้อนหลังยังถูกต้อง"
            : "รถคันนี้ยังไม่มีประวัติใช้งาน ระบบจะลบออกจากฐานข้อมูลถาวร"
        }
        confirmLabel={hasReferences ? "ปิดใช้งานรถ" : "ลบรถ"}
        cancelLabel="ยกเลิก"
        onConfirm={confirmDelete}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
