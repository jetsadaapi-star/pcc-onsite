"use server";

import {
  changeOwnPasswordAction,
  checkoutAction,
  completeOfficeTripAction,
  createCheckInAction,
  createFuelLogAction,
  createProjectAction,
  createUserAction,
  createVehicleEfficiencyPresetAction,
  deleteUserAction,
  removeProfilePhotoAction,
  resolveAnomalyAction,
  reviewTravelClaimAction,
  runCheckoutRemindersAction,
  startTripAction,
  toggleUserActiveAction,
  updateUserAction,
  updateVehicleAction,
  updateVehicleEfficiencyPresetAction,
  updateOperationalSettingsAction,
  updateProfilePhotoAction,
  updateProjectAction,
  updateProjectStatusAction,
  updateSystemBrandingAction,
  upsertOfficeLocationAction
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
    const travelMessages: Array<[string, string]> = [
      ["Invalid claim status", "สถานะรายการเดินทางไม่ถูกต้อง กรุณารีเฟรชหน้าแล้วลองอีกครั้ง"],
      ["Rejection reason is required", "กรุณาระบุเหตุผลก่อนปฏิเสธรายการค่าเดินทาง"],
      ["Override reason is required", "กรุณาระบุเหตุผลเมื่อปรับยอดค่าเดินทาง"],
      ["Override amount must be", "ยอดที่ปรับต้องอยู่ระหว่าง 0 ถึง 1,000,000 บาท"],
      ["Travel claim not found", "ไม่พบรายการค่าเดินทางนี้ อาจถูกลบหรือเปลี่ยนแปลงแล้ว"],
      ["Cannot change claim from", "สถานะรายการถูกเปลี่ยนไปแล้ว กรุณารีเฟรชหน้าเพื่อตรวจสอบสถานะล่าสุด"],
      ["Only pending claims can be adjusted", "ปรับยอดได้เฉพาะรายการที่กำลังรอตรวจสอบ"],
      ["Claim was changed by another administrator", "มีแอดมินคนอื่นแก้รายการนี้แล้ว กรุณารีเฟรชหน้าและลองอีกครั้ง"]
    ];
    const matchedTravelMessage = travelMessages.find(([source]) => error.message.includes(source));
    if (matchedTravelMessage) return matchedTravelMessage[1];
    if (error.message.includes("Total upload size")) return "รูปทั้งหมดมีขนาดเกิน 7 MB กรุณาลดจำนวนรูปแล้วลองใหม่";
    if (error.message.includes("Maximum file size is 5 MB")) return "รูปมีขนาดเกิน 5 MB กรุณาเลือกรูปที่เล็กลง";
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

export async function createFuelLogFormAction(formData: FormData) {
  return execute(createFuelLogAction, formData);
}

export async function changeOwnPasswordFormAction(formData: FormData) {
  return execute(changeOwnPasswordAction, formData);
}

export async function upsertOfficeLocationFormAction(formData: FormData) {
  return execute(upsertOfficeLocationAction, formData);
}

export async function updateSystemBrandingFormAction(formData: FormData) {
  return execute(updateSystemBrandingAction, formData);
}

export async function updateOperationalSettingsFormAction(formData: FormData) {
  return execute(updateOperationalSettingsAction, formData);
}

export async function updateProfilePhotoFormAction(formData: FormData) {
  return execute(updateProfilePhotoAction, formData);
}

export async function removeProfilePhotoFormAction(formData: FormData) {
  return execute(() => removeProfilePhotoAction(), formData);
}

export async function runCheckoutRemindersFormAction(formData: FormData) {
  return execute(() => runCheckoutRemindersAction(), formData);
}

export async function reviewTravelClaimFormAction(formData: FormData) {
  return execute(reviewTravelClaimAction, formData);
}

export async function resolveAnomalyFormAction(formData: FormData) {
  return execute(resolveAnomalyAction, formData);
}

export async function toggleUserActiveFormAction(formData: FormData) {
  return execute(toggleUserActiveAction, formData);
}

export async function deleteUserFormAction(formData: FormData) {
  return execute(deleteUserAction, formData);
}
