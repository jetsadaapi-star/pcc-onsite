"use server";

import {
  checkoutAction,
  completeOfficeTripAction,
  createCheckInAction,
  createProjectAction,
  createUserAction,
  createVehicleEfficiencyPresetAction,
  startTripAction,
  updateUserAction,
  updateVehicleAction,
  updateVehicleEfficiencyPresetAction,
  updateProjectAction,
  updateProjectStatusAction
} from "@/lib/actions";
import { redirect } from "next/navigation";

export type FormActionResult =
  | { ok: true }
  | { ok: false; error: string };

function isNextControlFlowError(error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  const digest = String((error as { digest?: unknown }).digest ?? "");
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
}

function userMessage(error: unknown) {
  if (error instanceof Error) {
    if (/[฀-๿]/.test(error.message)) return error.message;
    if (error.name === "ZodError") return "ข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง กรุณาตรวจสอบช่องที่จำเป็น";
  }
  return "ไม่สามารถบันทึกข้อมูลได้ในขณะนี้ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง";
}

async function execute(action: (formData: FormData) => Promise<void>, formData: FormData): Promise<FormActionResult> {
  try {
    await action(formData);
    return { ok: true };
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    console.error("Form action failed", error);
    return { ok: false, error: userMessage(error) };
  }
}

export async function createProjectFormAction(formData: FormData) {
  return execute(createProjectAction, formData);
}

export async function updateProjectFormAction(formData: FormData) {
  return execute(updateProjectAction, formData);
}

export async function updateProjectStatusFormAction(formData: FormData) {
  const result = await execute(updateProjectStatusAction, formData);
  if (result.ok) return;

  const requestedPath = String(formData.get("redirectTo") ?? "");
  const safePath = requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/projects";
  const url = new URL(safePath, "http://localhost");
  url.searchParams.set("statusError", "save-failed");
  redirect(`${url.pathname}${url.search}`);
}

export async function startTripFormAction(formData: FormData) {
  return execute(startTripAction, formData);
}

export async function completeOfficeTripFormAction(formData: FormData) {
  return execute(completeOfficeTripAction, formData);
}

export async function createCheckInFormAction(formData: FormData) {
  return execute(createCheckInAction, formData);
}

export async function checkoutFormAction(formData: FormData) {
  return execute(checkoutAction, formData);
}

export async function saveAdminUserFormAction(formData: FormData) {
  return execute(formData.get("id") ? updateUserAction : createUserAction, formData);
}

export async function updateVehicleFormAction(formData: FormData) {
  return execute(updateVehicleAction, formData);
}

export async function saveVehicleEfficiencyPresetFormAction(formData: FormData) {
  return execute(
    formData.get("id") ? updateVehicleEfficiencyPresetAction : createVehicleEfficiencyPresetAction,
    formData
  );
}
