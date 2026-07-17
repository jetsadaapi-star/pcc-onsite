"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del, put } from "@vercel/blob";
import { z } from "zod";
import { destroySession, hashPassword, requireAdmin, requireUser, verifyPassword } from "@/lib/auth";
import {
  detectCheckInGpsAnomaly,
  detectDistanceVarianceAnomaly,
  detectFuelEfficiencyAnomaly,
  detectOdometerReversed
} from "@/lib/anomaly";
import { prisma } from "@/lib/db";
import { calculateHaversineKm, getRouteDistance } from "@/lib/distance";
import { processCheckoutReminders } from "@/lib/notifications";
import { calculateReimbursement } from "@/lib/reimbursement";
import { canTransitionProjectStatus, type ProjectStatus } from "@/lib/project-status";
import { getNumber, getString } from "@/lib/form-values";
import type { CheckInPurpose, CheckOutStatus, ClaimStatus, FuelType, Role, TripOriginType } from "@/generated/prisma/enums";

function getSafeRedirectPath(value: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  try {
    const url = new URL(value, "http://localhost");
    if (url.origin !== "http://localhost") return undefined;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}

function withQueryParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function getDate(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function assertCoordinates(latitude: number, longitude: number, accuracy?: number) {
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("Invalid GPS coordinates");
  }
  if (accuracy !== undefined && (accuracy < 0 || accuracy > 5000)) {
    throw new Error("Invalid GPS accuracy");
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

async function settleAnomalyTasks(tasks: Promise<void>[], context: string) {
  const results = await Promise.allSettled(tasks);

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Anomaly detection failed after ${context} (task ${index + 1})`, result.reason);
    }
  });
}

function detectImageExtension(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return undefined;
}

function assertFormUploadLimit(formData: FormData) {
  const totalBytes = Array.from(formData.values()).reduce(
    (sum, value) => sum + (value instanceof File ? value.size : 0),
    0
  );
  if (totalBytes > 7 * 1024 * 1024) {
    throw new Error("Total upload size must not exceed 7 MB per submission.");
  }
}

async function deleteStoredFile(publicUrl?: string | null) {
  if (!publicUrl?.startsWith("/api/uploads/")) return;
  const pathname = publicUrl.slice("/api/".length);
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await del(pathname);
      return;
    }
    const storageRoot = process.env.UPLOAD_STORAGE_DIR
      ? path.resolve(process.env.UPLOAD_STORAGE_DIR)
      : path.join(process.cwd(), "storage", "uploads");
    const relativePath = pathname.replace(/^uploads\//, "");
    const filePath = path.resolve(storageRoot, relativePath);
    if (filePath.startsWith(`${storageRoot}${path.sep}`)) await unlink(filePath).catch(() => undefined);
  } catch {
    // Storage cleanup is best effort and must not roll back saved business data.
  }
}

async function saveImageFromForm(formData: FormData, field: string, folder: string, userId: string) {
  assertFormUploadLimit(formData);
  const value = formData.get(field);
  if (!(value instanceof File) || value.size === 0) return undefined;
  if (value.size > 5 * 1024 * 1024) throw new Error("Image is too large. Maximum file size is 5 MB.");
  if (!value.type.startsWith("image/")) throw new Error("รองรับเฉพาะไฟล์รูปภาพ");

  const bytes = Buffer.from(await value.arrayBuffer());
  const ext = detectImageExtension(bytes);
  if (!ext) throw new Error("Only JPG, PNG, and WEBP image files are supported.");
  const fileName = `${userId}-${randomUUID()}.${ext}`;
  const isPublicBranding = folder === "branding";
  const publicPath = `/api/uploads/${folder}/${fileName}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(`uploads/${folder}/${fileName}`, bytes, {
      access: "private",
      contentType: value.type,
      cacheControlMaxAge: isPublicBranding ? 86400 : 300
    });
    return publicPath;
  }

  const storageRoot = process.env.UPLOAD_STORAGE_DIR
    ? path.resolve(process.env.UPLOAD_STORAGE_DIR)
    : path.join(process.cwd(), "storage", "uploads");
  const uploadDir = isPublicBranding
    ? path.join(process.cwd(), "public", "uploads", folder)
    : path.join(storageRoot, folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), bytes);
  return isPublicBranding ? `/uploads/${folder}/${fileName}` : publicPath;
}

async function saveImagesFromForm(formData: FormData, field: string, folder: string, userId: string) {
  assertFormUploadLimit(formData);
  const values = formData.getAll(field).filter((value): value is File => value instanceof File && value.size > 0);
  if (values.length > 8) throw new Error("แนบรูปได้สูงสุด 8 รูปต่อรายการ");
  const urls = await Promise.all(values.map(async (value) => {
    if (!value.type.startsWith("image/")) throw new Error("รองรับเฉพาะไฟล์รูปภาพ");
    const imageForm = new FormData();
    imageForm.set(field, value);
    return saveImageFromForm(imageForm, field, folder, userId);
  }));

  return urls.filter((url): url is string => Boolean(url));
}

async function findVehicleEfficiencyPreset(input: { make?: string; model?: string; fuelType?: string }) {
  const make = input.make?.trim();
  const model = input.model?.trim();
  const fuelType = (input.fuelType || "GASOLINE") as FuelType;
  if (!make) return null;

  const exact = model
    ? await prisma.vehicleEfficiencyPreset.findFirst({
        where: {
          active: true,
          fuelType,
          make: { equals: make, mode: "insensitive" },
          model: { equals: model, mode: "insensitive" }
        },
        orderBy: { updatedAt: "desc" }
      })
    : null;
  if (exact) return exact;

  return prisma.vehicleEfficiencyPreset.findFirst({
    where: {
      active: true,
      fuelType,
      make: { equals: make, mode: "insensitive" },
      OR: [{ model: null }, { model: "" }]
    },
    orderBy: { updatedAt: "desc" }
  });
}

const projectSchema = z.object({
  name: z.string().min(2),
  customerName: z.string().min(2),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  address: z.string().min(4),
  province: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  status: z.enum(["NEW", "CONTACTED", "SURVEY_SCHEDULED", "SURVEYED", "QUOTING", "QUOTED", "NEGOTIATING", "WON", "IN_CONSTRUCTION", "COMPLETED", "ON_HOLD", "CLOSED_LOST", "CANCELLED"]).optional(),
  description: z.string().optional()
});

const vehicleSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2),
  make: z.string().optional(),
  model: z.string().optional(),
  licensePlate: z.string().optional(),
  fuelType: z.string().optional(),
  kmPerLiter: z.number().positive().optional(),
  approved: z.boolean().optional(),
  isDefault: z.boolean().optional()
});

const vehicleUpdateSchema = vehicleSchema.extend({
  id: z.string().min(1),
  active: z.boolean().optional()
});

const ownVehicleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  make: z.string().optional(),
  model: z.string().optional(),
  licensePlate: z.string().optional(),
  fuelType: z.string().optional()
});

const vehicleEfficiencyPresetSchema = z.object({
  id: z.string().optional(),
  make: z.string().min(1),
  model: z.string().optional(),
  fuelType: z.string().optional(),
  kmPerLiter: z.number().positive(),
  active: z.boolean().optional()
});

const fuelLogSchema = z.object({
  vehicleId: z.string().min(1),
  fueledAt: z.date().optional(),
  odometerKm: z.number().nonnegative(),
  liters: z.number().positive(),
  pricePerLiter: z.number().positive(),
  note: z.string().optional()
});

const officeLocationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  active: z.boolean().optional(),
  isDefault: z.boolean().optional()
});

const tripSchema = z.object({
  originType: z.enum(["OFFICE", "HOME", "CURRENT_LOCATION", "PREVIOUS_SITE"]),
  destinationType: z.enum(["PROJECT", "OFFICE"]).default("PROJECT"),
  destinationProjectId: z.string().optional(),
  originLatitude: z.number().optional(),
  originLongitude: z.number().optional(),
  originAccuracy: z.number().optional(),
  odometerStartKm: z.number().nonnegative().optional()
});

const officeTripCompletionSchema = z.object({
  tripSessionId: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
  odometerEndKm: z.number().nonnegative().optional(),
  note: z.string().optional()
});

const cancelTripSchema = z.object({
  tripSessionId: z.string().min(1),
  reason: z.string().min(3)
});

export async function logoutAction() {
  const user = await requireUser();
  await prisma.activityLog.create({
    data: { actorId: user.id, entityType: "User", entityId: user.id, action: "LOGOUT" }
  }).catch((auditError) => console.error("Failed to record logout activity", auditError));
  await destroySession();
  redirect("/login");
}

export async function updateProfilePhotoAction(formData: FormData) {
  const user = await requireUser();
  const previousPhotoUrl = user.profilePhotoUrl;
  const photoUrl = await saveImageFromForm(formData, "profilePhoto", "profiles", user.id);
  if (!photoUrl) throw new Error("กรุณาเลือกรูปโปรไฟล์");

  await prisma.user.update({
    where: { id: user.id },
    data: { profilePhotoUrl: photoUrl }
  });

  await prisma.activityLog.create({
    data: {
      actorId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "UPDATE_PROFILE_PHOTO",
      metadata: { profilePhotoUrl: photoUrl }
    }
  });
  if (previousPhotoUrl && previousPhotoUrl !== photoUrl) await deleteStoredFile(previousPhotoUrl);

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/admin/users");
}

export async function removeProfilePhotoAction() {
  const user = await requireUser();
  const previousPhotoUrl = user.profilePhotoUrl;

  await prisma.user.update({
    where: { id: user.id },
    data: { profilePhotoUrl: null }
  });

  await prisma.activityLog.create({
    data: {
      actorId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "REMOVE_PROFILE_PHOTO",
      metadata: {}
    }
  });
  await deleteStoredFile(previousPhotoUrl);

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/admin/users");
}

export async function changeOwnPasswordAction(formData: FormData) {
  const user = await requireUser();
  const currentPassword = getString(formData, "currentPassword");
  const newPassword = getString(formData, "newPassword");
  const confirmPassword = getString(formData, "confirmPassword");
  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters");
  if (newPassword !== confirmPassword) throw new Error("Password confirmation does not match");

  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
    throw new Error("Current password is incorrect");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword), sessionVersion: { increment: 1 } }
    });
    await tx.activityLog.create({
      data: {
        actorId: user.id,
        entityType: "User",
        entityId: user.id,
        action: "CHANGE_OWN_PASSWORD"
      }
    });
  });

  await destroySession();
  redirect("/login?notice=password-changed");
}

function assertFieldUser(user: { role: string }) {
  if (user.role === "ADMIN") {
    throw new Error("Admin cannot perform field user actions");
  }
}

const tripOriginLabels: Record<TripOriginType, string> = {
  OFFICE: "บริษัท/สำนักงาน",
  HOME: "บ้าน/ที่พัก",
  CURRENT_LOCATION: "ตำแหน่งปัจจุบัน",
  PREVIOUS_SITE: "หน้างานก่อนหน้า"
};

export async function startTripAction(formData: FormData) {
  const user = await requireUser();
  assertFieldUser(user);
  const input = tripSchema.parse({
    originType: getString(formData, "originType") || "CURRENT_LOCATION",
    destinationType: getString(formData, "destinationType") || "PROJECT",
    destinationProjectId: getString(formData, "destinationProjectId"),
    originLatitude: getNumber(formData, "originLatitude"),
    originLongitude: getNumber(formData, "originLongitude"),
    originAccuracy: getNumber(formData, "originAccuracy"),
    odometerStartKm: getNumber(formData, "odometerStartKm")
  });

  const [activeVisit, activeTrip, defaultOffice] = await Promise.all([
    prisma.checkIn.findFirst({ where: { userId: user.id, checkedOutAt: null } }),
    prisma.tripSession.findFirst({ where: { userId: user.id, status: "ACTIVE" } }),
    prisma.officeLocation.findFirst({
      where: { active: true },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]
    })
  ]);
  if (activeVisit) redirect("/check-in?active=1");

  if (activeTrip) redirect("/check-in?trip=active");

  let destinationLabel = "บริษัท/สำนักงาน";
  if (input.destinationType === "PROJECT") {
    if (!input.destinationProjectId) throw new Error("กรุณาเลือกโครงการ/หน้างานปลายทาง");
    const destination = await prisma.project.findFirst({
      where: { id: input.destinationProjectId, status: { notIn: ["COMPLETED", "CLOSED_LOST", "CANCELLED"] } },
      select: { id: true, name: true }
    });
    if (!destination) throw new Error("Project not found or inactive");
    destinationLabel = destination.name;
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { userId: user.id, active: true, approved: true, kmPerLiter: { not: null } },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]
  });
  if (!vehicle) throw new Error("ยังไม่มีรถที่แอดมินอนุมัติและกำหนด กม./ลิตร");

  let originLatitude = input.originLatitude;
  let originLongitude = input.originLongitude;
  let originAccuracy = input.originAccuracy;
  let fromProjectId: string | undefined;
  let originLabel = tripOriginLabels[input.originType];

  if (input.originType === "OFFICE" && defaultOffice) {
    originLatitude = defaultOffice.latitude;
    originLongitude = defaultOffice.longitude;
    originAccuracy = undefined;
    originLabel = defaultOffice.name;
  } else if (input.originType === "PREVIOUS_SITE") {
    const previous = await prisma.checkIn.findFirst({
      where: { userId: user.id, checkedOutAt: { not: null } },
      orderBy: { checkedOutAt: "desc" },
      include: { project: true }
    });
    if (!previous) throw new Error("ไม่พบหน้างานก่อนหน้าสำหรับใช้เป็นต้นทาง");
    originLatitude = previous.checkoutLatitude ?? previous.latitude;
    originLongitude = previous.checkoutLongitude ?? previous.longitude;
    originAccuracy = previous.checkoutAccuracy ?? previous.accuracy ?? undefined;
    fromProjectId = previous.projectId;
    originLabel = previous.project.name;
  }

  if (originLatitude === undefined || originLongitude === undefined) {
    throw new Error("กรุณาดึง GPS จุดเริ่มต้นก่อนเริ่มเดินทาง");
  }
  assertCoordinates(originLatitude, originLongitude, originAccuracy);

  const odometerStartPhotoUrl = await saveImageFromForm(formData, "odometerStartPhoto", "odometers", user.id);

  const trip = await prisma.tripSession.create({
    data: {
      userId: user.id,
      vehicleId: vehicle.id,
      originType: input.originType,
      originLabel,
      originLatitude,
      originLongitude,
      originAccuracy,
      fromProjectId,
      destinationType: input.destinationType,
      destinationProjectId: input.destinationType === "PROJECT" ? input.destinationProjectId : undefined,
      destinationLabel,
      odometerStartKm: input.odometerStartKm,
      odometerStartPhotoUrl
    }
  });

  await prisma.activityLog.create({
    data: {
      actorId: user.id,
      entityType: "TripSession",
      entityId: trip.id,
      action: "START_TRIP",
      metadata: { originType: input.originType, destinationType: input.destinationType, destinationProjectId: input.destinationProjectId, vehicleId: vehicle.id }
    }
  });

  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  redirect("/check-in?trip=started");
}

export async function cancelTripAction(formData: FormData) {
  const user = await requireUser();
  assertFieldUser(user);
  const input = cancelTripSchema.parse({
    tripSessionId: getString(formData, "tripSessionId"),
    reason: getString(formData, "reason")
  });

  await prisma.$transaction(async (tx) => {
    const cancelled = await tx.tripSession.updateMany({
      where: { id: input.tripSessionId, userId: user.id, status: "ACTIVE" },
      data: {
        status: "CANCELLED",
        cancelReason: input.reason,
        cancelledAt: new Date()
      }
    });
    if (cancelled.count !== 1) throw new Error("ไม่พบทริปที่กำลังเดินทางอยู่");

    await tx.activityLog.create({
      data: {
        actorId: user.id,
        entityType: "TripSession",
        entityId: input.tripSessionId,
        action: "CANCEL_TRIP",
        metadata: { reason: input.reason }
      }
    });
  });

  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  redirect("/check-in?trip=cancelled");
}

export async function completeOfficeTripAction(formData: FormData) {
  const user = await requireUser();
  assertFieldUser(user);
  const input = officeTripCompletionSchema.parse({
    tripSessionId: getString(formData, "tripSessionId"),
    latitude: getNumber(formData, "latitude"),
    longitude: getNumber(formData, "longitude"),
    accuracy: getNumber(formData, "accuracy"),
    odometerEndKm: getNumber(formData, "odometerEndKm"),
    note: getString(formData, "note") || undefined
  });

  const trip = await prisma.tripSession.findFirst({
    where: { id: input.tripSessionId, userId: user.id, status: "ACTIVE", destinationType: "OFFICE" },
    include: { vehicle: true }
  });
  if (!trip) throw new Error("ไม่พบทริปกลับบริษัทที่กำลังเดินทางอยู่");
  assertCoordinates(input.latitude, input.longitude, input.accuracy);

  const [office, settings, rate] = await Promise.all([
    prisma.officeLocation.findFirst({
      where: { active: true },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]
    }),
    prisma.systemSetting.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.reimbursementRate.findFirst({ where: { active: true }, orderBy: { activeFrom: "desc" } })
  ]);
  if (!office) throw new Error("ยังไม่ได้ตั้งค่าสำนักงานปลายทาง");

  const officeDistanceMeters = calculateHaversineKm(
    { latitude: input.latitude, longitude: input.longitude },
    { latitude: office.latitude, longitude: office.longitude }
  ) * 1000;
  const allowedOfficeRadius = settings?.anomalyGpsThresholdMeters ?? 500;
  if (officeDistanceMeters > allowedOfficeRadius) {
    throw new Error(`GPS อยู่ห่างจากสำนักงาน ${Math.round(officeDistanceMeters)} เมตร กรุณาตรวจตำแหน่งอีกครั้ง`);
  }

  const route = await getRouteDistance(
    { latitude: trip.originLatitude, longitude: trip.originLongitude },
    { latitude: input.latitude, longitude: input.longitude }
  );

  const odometerEndPhotoUrl = await saveImageFromForm(formData, "odometerEndPhoto", "odometers", user.id);
  const kmPerLiter = trip.vehicle?.kmPerLiter ?? rate?.kmPerLiter ?? 12;
  const reimbursement = calculateReimbursement({
    distanceKm: route.distanceKm,
    ratePerKm: Number(rate?.ratePerKm ?? 1.5),
    kmPerLiter,
    fuelPricePerLiter: Number(rate?.fuelPricePerLiter ?? 36)
  });
  const odometerDistanceKm =
    trip.odometerStartKm !== null && trip.odometerStartKm !== undefined && input.odometerEndKm !== undefined
      ? Math.max(0, input.odometerEndKm - trip.odometerStartKm)
      : undefined;
  const distanceVariancePercent =
    odometerDistanceKm !== undefined && route.distanceKm > 0
      ? Math.abs(odometerDistanceKm - route.distanceKm) / route.distanceKm * 100
      : undefined;

  const leg = await prisma.$transaction(async (tx) => {
    const updated = await tx.tripSession.updateMany({
      where: { id: trip.id, userId: user.id, status: "ACTIVE" },
      data: {
        status: "COMPLETED",
        arrivedAt: new Date(),
        destinationLabel: office.name,
        destinationLatitude: input.latitude,
        destinationLongitude: input.longitude,
        destinationAccuracy: input.accuracy,
        odometerEndKm: input.odometerEndKm,
        odometerEndPhotoUrl,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        routeProvider: route.routeProvider,
        distanceStatus: distanceVariancePercent !== undefined && distanceVariancePercent > (settings?.anomalyDistanceVariancePercent ?? 20)
          ? "PENDING_REVIEW"
          : route.distanceStatus
      }
    });
    if (updated.count !== 1) throw new Error("ทริปนี้ถูกปิดไปแล้ว กรุณารีเฟรชหน้า");

    const createdLeg = await tx.travelLeg.create({
      data: {
        userId: user.id,
        tripSessionId: trip.id,
        fromProjectId: trip.fromProjectId,
        destinationType: "OFFICE",
        destinationLabel: office.name,
        originLatitude: trip.originLatitude,
        originLongitude: trip.originLongitude,
        destinationLatitude: input.latitude,
        destinationLongitude: input.longitude,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        routeProvider: route.routeProvider,
        distanceStatus: distanceVariancePercent !== undefined && distanceVariancePercent > (settings?.anomalyDistanceVariancePercent ?? 20)
          ? "PENDING_REVIEW"
          : route.distanceStatus,
        routeSummary: route.routeSummary,
        providerPayload: route.providerPayload === undefined ? undefined : JSON.parse(JSON.stringify(route.providerPayload)),
        claim: {
          create: {
            userId: user.id,
            vehicleId: trip.vehicle?.id,
            vehicleName: trip.vehicle?.name,
            vehicleLicensePlate: trip.vehicle?.licensePlate,
            status: "PENDING_REVIEW",
            distanceKm: reimbursement.distanceKm,
            ratePerKm: Number(rate?.ratePerKm ?? 1.5),
            mileageAmount: reimbursement.mileageAmount,
            kmPerLiter,
            fuelPricePerLiter: Number(rate?.fuelPricePerLiter ?? 36),
            fuelEstimate: reimbursement.fuelEstimate,
            odometerStartKm: trip.odometerStartKm,
            odometerEndKm: input.odometerEndKm,
            odometerDistanceKm,
            distanceVariancePercent,
            totalAmount: reimbursement.totalAmount
          }
        }
      }
    });

    if (input.odometerEndKm !== undefined) {
      await tx.odometerLog.create({
        data: {
          userId: user.id,
          vehicleId: trip.vehicle?.id,
          type: "CHECK_OUT",
          odometerKm: input.odometerEndKm,
          photoUrl: odometerEndPhotoUrl,
          latitude: input.latitude,
          longitude: input.longitude,
          note: `ถึง ${office.name}`
        }
      });
    }

    await tx.activityLog.create({
      data: {
        actorId: user.id,
        entityType: "TripSession",
        entityId: trip.id,
        action: "COMPLETE_OFFICE_TRIP",
        metadata: { distanceKm: route.distanceKm, provider: route.routeProvider, travelLegId: createdLeg.id, note: input.note }
      }
    });
    return createdLeg;
  });

  await settleAnomalyTasks([
    detectOdometerReversed({
      sourceKey: `office-trip:${trip.id}`,
      userId: user.id,
      vehicleId: trip.vehicle?.id,
      previousKm: trip.odometerStartKm,
      currentKm: input.odometerEndKm,
      label: "Office trip odometer"
    }),
    detectDistanceVarianceAnomaly({
      sourceKey: `travel-leg:${leg.id}`,
      userId: user.id,
      vehicleId: trip.vehicle?.id,
      travelLegId: leg.id,
      variancePercent: distanceVariancePercent,
      gpsDistanceKm: route.distanceKm,
      odometerDistanceKm
    })
  ], `office trip ${trip.id}`);

  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  redirect("/dashboard?officeTrip=completed");
}

export async function createProjectAction(formData: FormData) {
  const user = await requireUser();
  const input = projectSchema.parse({
    name: getString(formData, "name"),
    customerName: getString(formData, "customerName"),
    contactName: getString(formData, "contactName") || undefined,
    contactPhone: getString(formData, "contactPhone") || undefined,
    address: getString(formData, "address"),
    province: getString(formData, "province") || undefined,
    latitude: getNumber(formData, "latitude"),
    longitude: getNumber(formData, "longitude"),
    status: getString(formData, "status") || "NEW",
    description: getString(formData, "description") || undefined
  });

  const count = await prisma.project.count();
  let code = "";
  let project: Awaited<ReturnType<typeof prisma.project.create>> | undefined;

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    code = `PRJ-${String(count + attempt).padStart(5, "0")}`;
    try {
      project = await prisma.project.create({
        data: {
          ...input,
          code,
          status: user.role === "ADMIN" ? input.status as ProjectStatus : "NEW",
          createdById: user.id,
          ownerId: user.id
        }
      });
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Unique constraint")) throw error;
    }
  }

  if (!project) throw new Error("Unable to generate unique project code");

  await prisma.activityLog.create({
    data: {
      actorId: user.id,
      entityType: "Project",
      entityId: project.id,
      action: "CREATE_PROJECT",
      metadata: { code, name: project.name }
    }
  });

  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  revalidatePath("/check-in");

  const redirectTo = getSafeRedirectPath(getString(formData, "redirectTo")) ?? "/projects";
  redirect(redirectTo);
}

export async function updateProjectStatusAction(formData: FormData) {
  const user = await requireUser();
  const id = getString(formData, "id");
  const nextStatus = getString(formData, "status") as ProjectStatus;
  const redirectTo = getSafeRedirectPath(getString(formData, "redirectTo"));
  if (!["NEW", "CONTACTED", "SURVEY_SCHEDULED", "SURVEYED", "QUOTING", "QUOTED", "NEGOTIATING", "WON", "IN_CONSTRUCTION", "COMPLETED", "ON_HOLD", "CLOSED_LOST", "CANCELLED"].includes(nextStatus)) {
    if (redirectTo) redirect(withQueryParam(redirectTo, "statusError", "invalid-status"));
    throw new Error("Invalid project status");
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new Error("Project not found");

  const ownsProject = project.createdById === user.id || project.ownerId === user.id;
  if (user.role !== "ADMIN" && !ownsProject) throw new Error("Forbidden");
  if (!canTransitionProjectStatus(project.status as ProjectStatus, nextStatus) && user.role !== "ADMIN") {
    if (redirectTo) redirect(withQueryParam(redirectTo, "statusError", "invalid-transition"));
    throw new Error("Invalid project status transition");
  }

  await prisma.project.update({
    where: { id },
    data: { status: nextStatus }
  });

  await prisma.activityLog.create({
    data: {
      actorId: user.id,
      entityType: "Project",
      entityId: id,
      action: "UPDATE_PROJECT_STATUS",
      metadata: { from: project.status, to: nextStatus }
    }
  });

  revalidatePath("/projects");
  revalidatePath("/admin/projects");

  if (redirectTo) redirect(redirectTo);
}

export async function updateProjectAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = getString(formData, "id");
  if (!id) throw new Error("Missing project id");

  const input = projectSchema.parse({
    name: getString(formData, "name"),
    customerName: getString(formData, "customerName"),
    contactName: getString(formData, "contactName") || undefined,
    contactPhone: getString(formData, "contactPhone") || undefined,
    address: getString(formData, "address"),
    province: getString(formData, "province") || undefined,
    latitude: getNumber(formData, "latitude"),
    longitude: getNumber(formData, "longitude"),
    status: getString(formData, "status") || "NEW",
    description: getString(formData, "description") || undefined
  });

  const project = await prisma.project.update({
    where: { id },
    data: { ...input, status: input.status as ProjectStatus }
  });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "Project",
      entityId: id,
      action: "UPDATE_PROJECT",
      metadata: { code: project.code, name: project.name }
    }
  });

  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function deleteProjectAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = getString(formData, "id");
  if (!id) throw new Error("Missing project id");

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      code: true,
      name: true,
      _count: {
        select: {
          checkIns: true,
          originTravelLegs: true,
          destinationTravelLegs: true,
          originTripSessions: true,
          destinationTripSessions: true
        }
      }
    }
  });
  if (!project) throw new Error("Project not found");

  const dependencyCount = Object.values(project._count).reduce((sum, count) => sum + count, 0);
  if (dependencyCount > 0) {
    throw new Error("Cannot delete a project that has check-ins or travel history");
  }

  await prisma.$transaction([
    prisma.project.delete({ where: { id } }),
    prisma.activityLog.create({
      data: {
        actorId: admin.id,
        entityType: "Project",
        entityId: id,
        action: "DELETE_PROJECT",
        metadata: { code: project.code, name: project.name }
      }
    })
  ]);

  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  redirect("/admin/projects?deleted=1");
}

export async function createCheckInAction(formData: FormData) {
  const user = await requireUser();
  assertFieldUser(user);
  const projectId = getString(formData, "projectId");
  const latitude = getNumber(formData, "latitude");
  const longitude = getNumber(formData, "longitude");
  const accuracy = getNumber(formData, "accuracy");
  const purpose = getString(formData, "purpose");
  const note = getString(formData, "note") || undefined;
  const tripSessionId = getString(formData, "tripSessionId") || undefined;
  const vehicleId = getString(formData, "vehicleId") || undefined;
  const odometerStartKm = getNumber(formData, "odometerStartKm");

  if (!projectId || latitude === undefined || longitude === undefined) {
    throw new Error("กรุณาเลือกโครงการและอนุญาต GPS ก่อนเช็คอิน");
  }
  assertCoordinates(latitude, longitude, accuracy);
  if (!["SITE_SURVEY", "CUSTOMER_VISIT", "FOLLOW_UP", "INSPECTION", "HANDOVER", "CONSTRUCTION", "OTHER"].includes(purpose)) {
    throw new Error("Invalid check-in purpose");
  }

  const activeVisit = await prisma.checkIn.findFirst({
    where: { userId: user.id, checkedOutAt: null },
    include: { project: true }
  });
  if (activeVisit) {
    redirect("/check-in?active=1");
  }

  const activeTrip = tripSessionId
    ? await prisma.tripSession.findFirst({
        where: { id: tripSessionId, userId: user.id, status: "ACTIVE" },
        include: { vehicle: true, destinationProject: true }
      })
    : null;

  if (tripSessionId && !activeTrip) throw new Error("ไม่พบทริปที่กำลังเดินทางอยู่");

  const resolvedProjectId = activeTrip?.destinationProjectId ?? projectId;
  const activeProject = await prisma.project.findFirst({
    where: {
      id: resolvedProjectId,
      status: { notIn: ["COMPLETED", "CLOSED_LOST", "CANCELLED"] }
    },
    select: { id: true }
  });
  if (!activeProject) {
    throw new Error("โครงการนี้ปิดงานหรือยกเลิกแล้ว กรุณาเลือกโครงการที่ยังดำเนินการอยู่");
  }
  const previous = activeTrip || process.env.ENABLE_LEGACY_TRAVEL_FALLBACK !== "true"
    ? null
    : await prisma.checkIn.findFirst({
        where: { userId: user.id, checkedOutAt: { not: null } },
        orderBy: { checkedAt: "desc" },
        include: { project: true, vehicle: true }
      });
  const vehicle = activeTrip?.vehicle ?? (vehicleId
    ? await prisma.vehicle.findFirst({
        where: { id: vehicleId, userId: user.id, active: true, approved: true, kmPerLiter: { not: null } }
      })
    : await prisma.vehicle.findFirst({
        where: { userId: user.id, active: true, approved: true, kmPerLiter: { not: null } },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]
      }));
  const routeOrigin = activeTrip
    ? { latitude: activeTrip.originLatitude, longitude: activeTrip.originLongitude }
    : previous
      ? {
          latitude: previous.checkoutLatitude ?? previous.latitude,
          longitude: previous.checkoutLongitude ?? previous.longitude
        }
      : null;
  const [route, rate] = routeOrigin
    ? await Promise.all([
        getRouteDistance(routeOrigin, { latitude, longitude }),
        prisma.reimbursementRate.findFirst({ where: { active: true }, orderBy: { activeFrom: "desc" } })
      ])
    : [null, null];
  const photoUrls = await saveImagesFromForm(formData, "photos", "check-ins", user.id);
  const legacyPhotoUrl = await saveImageFromForm(formData, "photo", "check-ins", user.id);
  const allPhotoUrls = legacyPhotoUrl ? [legacyPhotoUrl, ...photoUrls] : photoUrls;
  const photoUrl = allPhotoUrls[0];
  const odometerStartPhotoUrl = await saveImageFromForm(formData, "odometerStartPhoto", "odometers", user.id);

  const { checkIn, anomalyContext } = await prisma.$transaction(async (tx) => {
    const projectStillActive = await tx.project.findFirst({
      where: {
        id: resolvedProjectId,
        status: { notIn: ["COMPLETED", "CLOSED_LOST", "CANCELLED"] }
      },
      select: { id: true }
    });
    if (!projectStillActive) {
      throw new Error("โครงการนี้ปิดงานหรือยกเลิกแล้ว กรุณาเลือกโครงการที่ยังดำเนินการอยู่");
    }

    let anomalyContext: {
      sourceKey: string;
      travelLegId: string;
      vehicleId?: string;
      previousKm?: number | null;
      currentKm?: number;
      label: string;
      variancePercent?: number;
      gpsDistanceKm: number;
      odometerDistanceKm?: number;
    } | undefined;

  const checkIn = await tx.checkIn.create({
    data: {
      userId: user.id,
      vehicleId: vehicle?.id,
      tripSessionId: activeTrip?.id,
      projectId: resolvedProjectId,
      latitude,
      longitude,
      accuracy,
      photoUrl,
      photoUrls: allPhotoUrls,
      purpose: purpose as CheckInPurpose,
      note,
      odometerStartKm,
      odometerStartPhotoUrl
    }
  });

  if (odometerStartKm !== undefined) {
    await tx.odometerLog.create({
      data: {
        userId: user.id,
        vehicleId: vehicle?.id,
        checkInId: checkIn.id,
        type: "CHECK_IN",
        odometerKm: odometerStartKm,
        photoUrl: odometerStartPhotoUrl,
        latitude,
        longitude,
        note: resolvedProjectId
      }
    });
  }

  if (activeTrip) {
    if (!route) throw new Error("Route calculation is unavailable");
    const kmPerLiter = vehicle?.kmPerLiter ?? rate?.kmPerLiter ?? 12;
    const reimbursement = calculateReimbursement({
      distanceKm: route.distanceKm,
      ratePerKm: Number(rate?.ratePerKm ?? 1.5),
      kmPerLiter,
      fuelPricePerLiter: Number(rate?.fuelPricePerLiter ?? 36)
    });
    const odometerDistanceKm =
      activeTrip.odometerStartKm !== null && activeTrip.odometerStartKm !== undefined && odometerStartKm !== undefined
        ? Math.max(0, odometerStartKm - activeTrip.odometerStartKm)
        : undefined;
    const distanceVariancePercent =
      odometerDistanceKm !== undefined && route.distanceKm > 0
        ? Math.abs(odometerDistanceKm - route.distanceKm) / route.distanceKm * 100
        : undefined;

    const leg = await tx.travelLeg.create({
      data: {
        userId: user.id,
        tripSessionId: activeTrip.id,
        toCheckInId: checkIn.id,
        fromProjectId: activeTrip.fromProjectId,
        toProjectId: resolvedProjectId,
        originLatitude: activeTrip.originLatitude,
        originLongitude: activeTrip.originLongitude,
        destinationLatitude: latitude,
        destinationLongitude: longitude,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        routeProvider: route.routeProvider,
        distanceStatus: distanceVariancePercent !== undefined && distanceVariancePercent > 20 ? "PENDING_REVIEW" : route.distanceStatus,
        routeSummary: route.routeSummary,
        claim: {
          create: {
            userId: user.id,
            vehicleId: vehicle?.id,
            vehicleName: vehicle?.name,
            vehicleLicensePlate: vehicle?.licensePlate,
            status: activeTrip.originType === "HOME" ? "PENDING_REVIEW" : "PENDING_REVIEW",
            distanceKm: reimbursement.distanceKm,
            ratePerKm: Number(rate?.ratePerKm ?? 1.5),
            mileageAmount: reimbursement.mileageAmount,
            kmPerLiter,
            fuelPricePerLiter: Number(rate?.fuelPricePerLiter ?? 36),
            fuelEstimate: reimbursement.fuelEstimate,
            odometerStartKm: activeTrip.odometerStartKm,
            odometerEndKm: odometerStartKm,
            odometerDistanceKm,
            distanceVariancePercent,
            totalAmount: reimbursement.totalAmount,
            adminNote: activeTrip.originType === "HOME" ? "เริ่มเดินทางจากบ้าน/ที่พัก รอตรวจตามนโยบายบริษัท" : undefined
          }
        }
      }
    });

    anomalyContext = {
      sourceKey: `trip:${activeTrip.id}`,
      travelLegId: leg.id,
      vehicleId: vehicle?.id,
      previousKm: activeTrip.odometerStartKm,
      currentKm: odometerStartKm,
      label: "Trip odometer",
      variancePercent: distanceVariancePercent,
      gpsDistanceKm: route.distanceKm,
      odometerDistanceKm
    };

    const completedTrip = await tx.tripSession.updateMany({
      where: { id: activeTrip.id, userId: user.id, status: "ACTIVE" },
      data: { status: "COMPLETED", arrivedAt: new Date() }
    });
    if (completedTrip.count !== 1) throw new Error("ทริปนี้ถูกปิดไปแล้ว กรุณารีเฟรชหน้า");

    await tx.activityLog.create({
      data: {
        actorId: user.id,
        entityType: "TravelLeg",
        entityId: leg.id,
        action: "CREATE_TRAVEL_LEG_FROM_TRIP",
        metadata: { distanceKm: route.distanceKm, provider: route.routeProvider, tripSessionId: activeTrip.id }
      }
    });
  } else if (previous) {
    if (!route) throw new Error("Route calculation is unavailable");
    const claimVehicle = vehicle ?? previous.vehicle;
    const kmPerLiter = claimVehicle?.kmPerLiter ?? rate?.kmPerLiter ?? 12;
    const reimbursement = calculateReimbursement({
      distanceKm: route.distanceKm,
      ratePerKm: Number(rate?.ratePerKm ?? 1.5),
      kmPerLiter,
      fuelPricePerLiter: Number(rate?.fuelPricePerLiter ?? 36)
    });
    const odometerDistanceKm =
      previous.odometerEndKm !== null && previous.odometerEndKm !== undefined && odometerStartKm !== undefined
        ? Math.max(0, odometerStartKm - previous.odometerEndKm)
        : undefined;
    const distanceVariancePercent =
      odometerDistanceKm !== undefined && route.distanceKm > 0
        ? Math.abs(odometerDistanceKm - route.distanceKm) / route.distanceKm * 100
        : undefined;

    const leg = await tx.travelLeg.create({
      data: {
        userId: user.id,
        fromCheckInId: previous.id,
        toCheckInId: checkIn.id,
        fromProjectId: previous.projectId,
        toProjectId: resolvedProjectId,
        originLatitude: previous.checkoutLatitude ?? previous.latitude,
        originLongitude: previous.checkoutLongitude ?? previous.longitude,
        destinationLatitude: latitude,
        destinationLongitude: longitude,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        routeProvider: route.routeProvider,
        distanceStatus: distanceVariancePercent !== undefined && distanceVariancePercent > 20 ? "PENDING_REVIEW" : route.distanceStatus,
        routeSummary: route.routeSummary,
        claim: {
          create: {
            userId: user.id,
            vehicleId: claimVehicle?.id,
            vehicleName: claimVehicle?.name,
            vehicleLicensePlate: claimVehicle?.licensePlate,
            status: "PENDING_REVIEW" as const,
            distanceKm: reimbursement.distanceKm,
            ratePerKm: Number(rate?.ratePerKm ?? 1.5),
            mileageAmount: reimbursement.mileageAmount,
            kmPerLiter,
            fuelPricePerLiter: Number(rate?.fuelPricePerLiter ?? 36),
            fuelEstimate: reimbursement.fuelEstimate,
            odometerStartKm: previous.odometerEndKm,
            odometerEndKm: odometerStartKm,
            odometerDistanceKm,
            distanceVariancePercent,
            totalAmount: reimbursement.totalAmount
          }
        }
      }
    });

    anomalyContext = {
      sourceKey: `checkin:${checkIn.id}:previous`,
      travelLegId: leg.id,
      vehicleId: claimVehicle?.id,
      previousKm: previous.odometerEndKm,
      currentKm: odometerStartKm,
      label: "Previous checkout to current check-in odometer",
      variancePercent: distanceVariancePercent,
      gpsDistanceKm: route.distanceKm,
      odometerDistanceKm
    };

    await tx.activityLog.create({
      data: {
        actorId: user.id,
        entityType: "TravelLeg",
        entityId: leg.id,
        action: "CREATE_TRAVEL_LEG",
        metadata: { distanceKm: route.distanceKm, provider: route.routeProvider }
      }
    });
  }

  await tx.activityLog.create({
    data: {
      actorId: user.id,
      entityType: "CheckIn",
      entityId: checkIn.id,
      action: "CREATE_CHECK_IN",
      metadata: { projectId: resolvedProjectId, purpose, tripSessionId: activeTrip?.id }
    }
  });

    return { checkIn, anomalyContext };
  }, { timeout: 30_000 });

  const anomalyTasks: Promise<void>[] = [detectCheckInGpsAnomaly(checkIn.id)];
  if (anomalyContext) {
    anomalyTasks.push(detectOdometerReversed({
      sourceKey: anomalyContext.sourceKey,
      userId: user.id,
      vehicleId: anomalyContext.vehicleId,
      checkInId: checkIn.id,
      previousKm: anomalyContext.previousKm,
      currentKm: anomalyContext.currentKm,
      label: anomalyContext.label
    }));
    anomalyTasks.push(detectDistanceVarianceAnomaly({
      sourceKey: `travel-leg:${anomalyContext.travelLegId}`,
      userId: user.id,
      vehicleId: anomalyContext.vehicleId,
      checkInId: checkIn.id,
      travelLegId: anomalyContext.travelLegId,
      variancePercent: anomalyContext.variancePercent,
      gpsDistanceKm: anomalyContext.gpsDistanceKm,
      odometerDistanceKm: anomalyContext.odometerDistanceKm
    }));
  }
  await Promise.allSettled(anomalyTasks);

  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  revalidatePath("/admin/check-ins");
  redirect("/dashboard?checkedIn=1");
}

export async function checkoutAction(formData: FormData) {
  const user = await requireUser();
  assertFieldUser(user);
  const checkInId = getString(formData, "checkInId");
  const latitude = getNumber(formData, "latitude");
  const longitude = getNumber(formData, "longitude");
  const accuracy = getNumber(formData, "accuracy");
  const checkoutStatus = (getString(formData, "checkoutStatus") || "DONE") as CheckOutStatus;
  const checkoutNote = getString(formData, "checkoutNote") || undefined;
  const odometerEndKm = getNumber(formData, "odometerEndKm");

  if (!checkInId || latitude === undefined || longitude === undefined) {
    throw new Error("กรุณาดึง GPS ก่อนเช็คเอาท์");
  }
  assertCoordinates(latitude, longitude, accuracy);
  if (!["DONE", "NEED_RETURN", "WAITING_CUSTOMER", "ISSUE", "OTHER"].includes(checkoutStatus)) {
    throw new Error("Invalid checkout status");
  }

  const activeVisit = await prisma.checkIn.findFirst({
    where: { id: checkInId, userId: user.id, checkedOutAt: null }
  });
  if (!activeVisit) throw new Error("ไม่พบงานที่กำลังเปิดอยู่");

  const checkoutPhotoUrls = await saveImagesFromForm(formData, "checkoutPhotos", "check-outs", user.id);
  const legacyCheckoutPhotoUrl = await saveImageFromForm(formData, "checkoutPhoto", "check-outs", user.id);
  const allCheckoutPhotoUrls = legacyCheckoutPhotoUrl ? [legacyCheckoutPhotoUrl, ...checkoutPhotoUrls] : checkoutPhotoUrls;
  const checkoutPhotoUrl = allCheckoutPhotoUrls[0];
  const odometerEndPhotoUrl = await saveImageFromForm(formData, "odometerEndPhoto", "odometers", user.id);
  const checkedOutAt = new Date();
  const odometerDistanceKm =
    activeVisit.odometerStartKm !== null && activeVisit.odometerStartKm !== undefined && odometerEndKm !== undefined
      ? Math.max(0, odometerEndKm - activeVisit.odometerStartKm)
      : undefined;

  const checkIn = await prisma.$transaction(async (tx) => {
    const updated = await tx.checkIn.updateMany({
      where: { id: checkInId, userId: user.id, checkedOutAt: null },
      data: {
        checkedOutAt,
        checkoutLatitude: latitude,
        checkoutLongitude: longitude,
        checkoutAccuracy: accuracy,
        checkoutStatus,
        checkoutNote,
        checkoutPhotoUrl,
        checkoutPhotoUrls: allCheckoutPhotoUrls,
        odometerEndKm,
        odometerEndPhotoUrl,
        odometerDistanceKm
      }
    });
    if (updated.count !== 1) throw new Error("รายการนี้ถูกเช็คเอาท์ไปแล้ว กรุณารีเฟรชหน้า");

    const current = await tx.checkIn.findUniqueOrThrow({ where: { id: checkInId } });
    if (odometerEndKm !== undefined) {
      await tx.odometerLog.create({
        data: {
          userId: user.id,
          vehicleId: activeVisit.vehicleId,
          checkInId: current.id,
          type: "CHECK_OUT",
          odometerKm: odometerEndKm,
          photoUrl: odometerEndPhotoUrl,
          latitude,
          longitude,
          note: checkoutNote
        }
      });
    }

    await tx.activityLog.create({
      data: {
        actorId: user.id,
        entityType: "CheckIn",
        entityId: current.id,
        action: "CHECK_OUT",
        metadata: {
          checkoutStatus,
          durationMinutes: Math.max(0, Math.round((checkedOutAt.getTime() - current.checkedAt.getTime()) / 60000))
        }
      }
    });
    return current;
  });

  await settleAnomalyTasks([
    detectOdometerReversed({
      sourceKey: `checkout:${checkIn.id}`,
      userId: user.id,
      vehicleId: activeVisit.vehicleId,
      checkInId: checkIn.id,
      previousKm: activeVisit.odometerStartKm,
      currentKm: odometerEndKm,
      label: "Check-out odometer"
    })
  ], `check-out ${checkIn.id}`);

  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  revalidatePath("/admin/check-ins");
  revalidatePath(`/projects/${checkIn.projectId}`);
  redirect("/dashboard?checkedOut=1");
}

export async function reviewTravelClaimAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = getString(formData, "id");
  const status = getString(formData, "status") as ClaimStatus;
  const adminNote = getString(formData, "adminNote") || undefined;
  const overrideTotalAmount = getNumber(formData, "overrideTotalAmount");
  const overrideReason = getString(formData, "overrideReason") || undefined;

  if (!["APPROVED", "REJECTED", "PAID"].includes(status)) {
    throw new Error("Invalid claim status");
  }
  if (status === "REJECTED" && !adminNote) {
    throw new Error("Rejection reason is required");
  }
  if (overrideTotalAmount !== undefined && !overrideReason) {
    throw new Error("Override reason is required");
  }
  if (overrideTotalAmount !== undefined && (overrideTotalAmount < 0 || overrideTotalAmount > 1_000_000)) {
    throw new Error("Override amount must be between 0 and 1,000,000 baht");
  }

  const claim = await prisma.travelClaim.findUnique({ where: { id } });
  if (!claim) throw new Error("Travel claim not found");
  const allowedTransitions: Record<ClaimStatus, ClaimStatus[]> = {
    DRAFT: ["PENDING_REVIEW"],
    PENDING_REVIEW: ["APPROVED", "REJECTED"],
    APPROVED: ["PAID"],
    REJECTED: [],
    PAID: []
  };
  if (!allowedTransitions[claim.status].includes(status)) {
    throw new Error(`Cannot change claim from ${claim.status} to ${status}`);
  }
  if (overrideTotalAmount !== undefined && claim.status !== "PENDING_REVIEW") {
    throw new Error("Only pending claims can be adjusted");
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.travelClaim.updateMany({
      where: { id, status: claim.status },
      data: {
        status,
        adminNote,
        ...(overrideTotalAmount !== undefined ? { totalAmount: overrideTotalAmount, overrideReason } : {}),
        reviewedById: admin.id,
        reviewedAt: new Date(),
        paidAt: status === "PAID" ? new Date() : null
      }
    });
    if (updated.count !== 1) throw new Error("Claim was changed by another administrator. Please refresh.");

    await tx.activityLog.create({
      data: {
        actorId: admin.id,
        entityType: "TravelClaim",
        entityId: id,
        action: "REVIEW_TRAVEL_CLAIM",
        metadata: {
          from: claim.status,
          to: status,
          previousTotalAmount: Number(claim.totalAmount),
          ...(overrideTotalAmount !== undefined ? { overrideTotalAmount } : {}),
          ...(overrideReason ? { overrideReason } : {})
        }
      }
    });
  });

  revalidatePath("/admin/travel");
  revalidatePath("/reports");
}

export async function updateRateAction(formData: FormData) {
  const admin = await requireAdmin();
  const ratePerKm = getNumber(formData, "ratePerKm") ?? 1.5;
  const kmPerLiter = getNumber(formData, "kmPerLiter") ?? 12;
  const fuelPricePerLiter = getNumber(formData, "fuelPricePerLiter") ?? 36;
  if (ratePerKm < 0 || ratePerKm > 100) throw new Error("Invalid rate per kilometer");
  if (kmPerLiter <= 0 || kmPerLiter > 100) throw new Error("Invalid fuel efficiency");
  if (fuelPricePerLiter < 0 || fuelPricePerLiter > 500) throw new Error("Invalid fuel price");

  await prisma.$transaction(async (tx) => {
    await tx.reimbursementRate.updateMany({ where: { active: true }, data: { active: false } });
    const rate = await tx.reimbursementRate.create({
      data: {
        name: `เรต ${new Date().toLocaleDateString("th-TH")}`,
        ratePerKm,
        kmPerLiter,
        fuelPricePerLiter,
        active: true
      }
    });

    await tx.activityLog.create({
      data: {
        actorId: admin.id,
        entityType: "ReimbursementRate",
        entityId: rate.id,
        action: "UPDATE_RATE",
        metadata: { ratePerKm, kmPerLiter, fuelPricePerLiter }
      }
    });
  });

  revalidatePath("/admin/travel");
}

export async function createOwnVehicleAction(formData: FormData) {
  const user = await requireUser();
  assertFieldUser(user);
  const input = ownVehicleSchema.parse({
    name: getString(formData, "name"),
    make: getString(formData, "make") || undefined,
    model: getString(formData, "model") || undefined,
    licensePlate: getString(formData, "licensePlate") || undefined,
    fuelType: getString(formData, "fuelType") || "GASOLINE"
  });
  const preset = await findVehicleEfficiencyPreset(input);

  const vehicle = await prisma.vehicle.create({
    data: {
      userId: user.id,
      name: input.name,
      make: input.make,
      model: input.model,
      licensePlate: input.licensePlate,
      fuelType: input.fuelType as FuelType,
      kmPerLiter: preset?.kmPerLiter ?? null,
      active: true,
      approved: false,
      isDefault: false
    }
  });

  await prisma.activityLog.create({
    data: {
      actorId: user.id,
      entityType: "Vehicle",
      entityId: vehicle.id,
      action: "CREATE_OWN_VEHICLE",
      metadata: { name: input.name, fuelType: input.fuelType, presetId: preset?.id }
    }
  });

  revalidatePath("/vehicles");
  revalidatePath("/admin/vehicles");
}

export async function updateOwnVehicleAction(formData: FormData) {
  const user = await requireUser();
  assertFieldUser(user);
  const input = ownVehicleSchema.parse({
    id: getString(formData, "id"),
    name: getString(formData, "name"),
    make: getString(formData, "make") || undefined,
    model: getString(formData, "model") || undefined,
    licensePlate: getString(formData, "licensePlate") || undefined,
    fuelType: getString(formData, "fuelType") || "GASOLINE"
  });
  if (!input.id) throw new Error("Vehicle id is required");

  const existing = await prisma.vehicle.findFirst({ where: { id: input.id, userId: user.id } });
  if (!existing) throw new Error("Vehicle not found");
  const preset = await findVehicleEfficiencyPreset(input);

  const vehicle = await prisma.vehicle.update({
    where: { id: input.id },
    data: {
      name: input.name,
      make: input.make,
      model: input.model,
      licensePlate: input.licensePlate,
      fuelType: input.fuelType as FuelType,
      approved: false,
      isDefault: false,
      kmPerLiter: preset?.kmPerLiter ?? null
    }
  });

  await prisma.activityLog.create({
    data: {
      actorId: user.id,
      entityType: "Vehicle",
      entityId: vehicle.id,
      action: "UPDATE_OWN_VEHICLE",
      metadata: { name: input.name, fuelType: input.fuelType, presetId: preset?.id }
    }
  });

  revalidatePath("/vehicles");
  revalidatePath("/admin/vehicles");
  revalidatePath("/check-in");
  revalidatePath("/fuel");
}

export async function deleteOwnVehicleAction(formData: FormData) {
  const user = await requireUser();
  assertFieldUser(user);
  const id = getString(formData, "id");
  if (!id) throw new Error("Vehicle id is required");

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, userId: user.id },
    include: {
      _count: {
        select: {
          checkIns: true,
          odometerLogs: true,
          fuelLogs: true,
          travelClaims: true
        }
      }
    }
  });
  if (!vehicle) throw new Error("Vehicle not found");

  const referenceCount = vehicle._count.checkIns + vehicle._count.odometerLogs + vehicle._count.fuelLogs + vehicle._count.travelClaims;
  if (referenceCount === 0) {
    await prisma.vehicle.delete({ where: { id } });
  } else {
    await prisma.vehicle.update({
      where: { id },
      data: { active: false, approved: false, isDefault: false }
    });
  }

  await prisma.activityLog.create({
    data: {
      actorId: user.id,
      entityType: "Vehicle",
      entityId: id,
      action: referenceCount === 0 ? "DELETE_OWN_VEHICLE" : "DEACTIVATE_OWN_VEHICLE",
      metadata: { name: vehicle.name, referenceCount }
    }
  });

  revalidatePath("/vehicles");
  revalidatePath("/check-in");
  revalidatePath("/fuel");
  revalidatePath("/admin/vehicles");
}

export async function createVehicleEfficiencyPresetAction(formData: FormData) {
  const admin = await requireAdmin();
  const input = vehicleEfficiencyPresetSchema.parse({
    make: getString(formData, "make"),
    model: getString(formData, "model") || undefined,
    fuelType: getString(formData, "fuelType") || "GASOLINE",
    kmPerLiter: getNumber(formData, "kmPerLiter"),
    active: getString(formData, "active") !== "off"
  });

  const preset = await prisma.vehicleEfficiencyPreset.create({
    data: {
      make: input.make,
      model: input.model,
      fuelType: input.fuelType as FuelType,
      kmPerLiter: input.kmPerLiter,
      active: input.active ?? true
    }
  });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "VehicleEfficiencyPreset",
      entityId: preset.id,
      action: "CREATE_VEHICLE_EFFICIENCY_PRESET",
      metadata: { make: input.make, model: input.model, fuelType: input.fuelType, kmPerLiter: input.kmPerLiter }
    }
  });

  revalidatePath("/admin/vehicles");
  revalidatePath("/vehicles");
}

export async function updateVehicleEfficiencyPresetAction(formData: FormData) {
  const admin = await requireAdmin();
  const input = vehicleEfficiencyPresetSchema.parse({
    id: getString(formData, "id"),
    make: getString(formData, "make"),
    model: getString(formData, "model") || undefined,
    fuelType: getString(formData, "fuelType") || "GASOLINE",
    kmPerLiter: getNumber(formData, "kmPerLiter"),
    active: getString(formData, "active") === "on"
  });
  if (!input.id) throw new Error("Preset id is required");

  const preset = await prisma.vehicleEfficiencyPreset.update({
    where: { id: input.id },
    data: {
      make: input.make,
      model: input.model,
      fuelType: input.fuelType as FuelType,
      kmPerLiter: input.kmPerLiter,
      active: input.active ?? false
    }
  });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "VehicleEfficiencyPreset",
      entityId: preset.id,
      action: "UPDATE_VEHICLE_EFFICIENCY_PRESET",
      metadata: { make: input.make, model: input.model, fuelType: input.fuelType, kmPerLiter: input.kmPerLiter, active: input.active }
    }
  });

  revalidatePath("/admin/vehicles");
  revalidatePath("/vehicles");
}

export async function deleteVehicleEfficiencyPresetAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = getString(formData, "id");
  if (!id) throw new Error("Preset id is required");

  await prisma.vehicleEfficiencyPreset.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "VehicleEfficiencyPreset",
      entityId: id,
      action: "DELETE_VEHICLE_EFFICIENCY_PRESET"
    }
  });

  revalidatePath("/admin/vehicles");
  revalidatePath("/vehicles");
}

export async function createVehicleAction(formData: FormData) {
  const admin = await requireAdmin();
  const input = vehicleSchema.parse({
    userId: getString(formData, "userId"),
    name: getString(formData, "name"),
    make: getString(formData, "make") || undefined,
    model: getString(formData, "model") || undefined,
    licensePlate: getString(formData, "licensePlate") || undefined,
    fuelType: getString(formData, "fuelType") || "GASOLINE",
    kmPerLiter: getNumber(formData, "kmPerLiter"),
    approved: getString(formData, "approved") === "on",
    isDefault: getString(formData, "isDefault") === "on"
  });
  if (input.approved && input.kmPerLiter === undefined) {
    throw new Error("กรุณากำหนด กม./ลิตร ก่อนอนุมัติรถ");
  }

  if (input.isDefault) {
    await prisma.vehicle.updateMany({
      where: { userId: input.userId, isDefault: true },
      data: { isDefault: false }
    });
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      userId: input.userId,
      name: input.name,
      make: input.make,
      model: input.model,
      licensePlate: input.licensePlate,
      fuelType: input.fuelType as FuelType,
      kmPerLiter: input.kmPerLiter,
      approved: input.approved ?? false,
      isDefault: input.isDefault ?? false
    }
  });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "Vehicle",
      entityId: vehicle.id,
      action: "CREATE_VEHICLE",
      metadata: { userId: input.userId, name: input.name, kmPerLiter: input.kmPerLiter }
    }
  });

  revalidatePath("/admin/travel");
  revalidatePath("/admin/vehicles");
  revalidatePath("/check-in");
  revalidatePath("/fuel");
}

export async function updateVehicleAction(formData: FormData) {
  const admin = await requireAdmin();
  const input = vehicleUpdateSchema.parse({
    id: getString(formData, "id"),
    userId: getString(formData, "userId"),
    name: getString(formData, "name"),
    make: getString(formData, "make") || undefined,
    model: getString(formData, "model") || undefined,
    licensePlate: getString(formData, "licensePlate") || undefined,
    fuelType: getString(formData, "fuelType") || "GASOLINE",
    kmPerLiter: getNumber(formData, "kmPerLiter"),
    approved: getString(formData, "approved") === "on",
    isDefault: getString(formData, "isDefault") === "on",
    active: getString(formData, "active") === "on"
  });
  if (input.approved && input.kmPerLiter === undefined) {
    throw new Error("กรุณากำหนด กม./ลิตร ก่อนอนุมัติรถ");
  }

  const existing = await prisma.vehicle.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("Vehicle not found");

  if (input.isDefault) {
    await prisma.vehicle.updateMany({
      where: { userId: input.userId, id: { not: input.id }, isDefault: true },
      data: { isDefault: false }
    });
  }

  const vehicle = await prisma.vehicle.update({
    where: { id: input.id },
    data: {
      userId: input.userId,
      name: input.name,
      make: input.make,
      model: input.model,
      licensePlate: input.licensePlate,
      fuelType: input.fuelType as FuelType,
      kmPerLiter: input.kmPerLiter,
      active: input.active ?? false,
      approved: input.approved ?? false,
      isDefault: input.active ? input.isDefault ?? false : false
    }
  });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "Vehicle",
      entityId: vehicle.id,
      action: "UPDATE_VEHICLE",
      metadata: {
        fromUserId: existing.userId,
        toUserId: input.userId,
        name: input.name,
        active: input.active,
        approved: input.approved,
        isDefault: vehicle.isDefault
      }
    }
  });

  revalidatePath("/admin/vehicles");
  revalidatePath("/admin/travel");
  revalidatePath("/check-in");
  revalidatePath("/fuel");
}

export async function deleteVehicleAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = getString(formData, "id");
  if (!id) throw new Error("Vehicle id is required");

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          checkIns: true,
          odometerLogs: true,
          fuelLogs: true,
          travelClaims: true
        }
      }
    }
  });
  if (!vehicle) throw new Error("Vehicle not found");

  const referenceCount = vehicle._count.checkIns + vehicle._count.odometerLogs + vehicle._count.fuelLogs + vehicle._count.travelClaims;
  if (referenceCount === 0) {
    await prisma.vehicle.delete({ where: { id } });
  } else {
    await prisma.vehicle.update({
      where: { id },
      data: { active: false, approved: false, isDefault: false }
    });
  }

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "Vehicle",
      entityId: id,
      action: referenceCount === 0 ? "DELETE_VEHICLE" : "DEACTIVATE_VEHICLE",
      metadata: { name: vehicle.name, referenceCount }
    }
  });

  revalidatePath("/admin/vehicles");
  revalidatePath("/admin/travel");
  revalidatePath("/check-in");
  revalidatePath("/fuel");
}

export async function upsertOfficeLocationAction(formData: FormData) {
  const admin = await requireAdmin();
  const input = officeLocationSchema.parse({
    id: getString(formData, "id") || undefined,
    name: getString(formData, "name"),
    address: getString(formData, "address") || undefined,
    latitude: getNumber(formData, "latitude"),
    longitude: getNumber(formData, "longitude"),
    active: getString(formData, "active") !== "false",
    isDefault: getString(formData, "isDefault") === "on" || getString(formData, "isDefault") === "true"
  });

  if (input.isDefault) {
    await prisma.officeLocation.updateMany({ data: { isDefault: false } });
  }

  const office = input.id
    ? await prisma.officeLocation.update({
        where: { id: input.id },
        data: {
          name: input.name,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          active: input.active ?? true,
          isDefault: input.isDefault ?? false
        }
      })
    : await prisma.officeLocation.create({
        data: {
          name: input.name,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          active: input.active ?? true,
          isDefault: input.isDefault ?? false
        }
      });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "OfficeLocation",
      entityId: office.id,
      action: input.id ? "UPDATE_OFFICE_LOCATION" : "CREATE_OFFICE_LOCATION",
      metadata: { name: office.name, isDefault: office.isDefault }
    }
  });

  revalidatePath("/admin/settings");
  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  redirect("/admin/settings?saved=1");
}

export async function deleteOfficeLocationAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = getString(formData, "id");
  if (!id) throw new Error("Missing office id");

  const office = await prisma.officeLocation.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { actorId: admin.id, entityType: "OfficeLocation", entityId: id, action: "DELETE_OFFICE_LOCATION", metadata: { name: office.name } }
  });
  revalidatePath("/admin/settings");
}

export async function updateSystemBrandingAction(formData: FormData) {
  const admin = await requireAdmin();
  const appName = getString(formData, "appName") || "PCC OnSite";
  const currentLogoUrl = getString(formData, "currentLogoUrl") || undefined;
  const currentFaviconUrl = getString(formData, "currentFaviconUrl") || undefined;
  const logoUrl = await saveImageFromForm(formData, "logo", "branding", "system");
  const faviconUrl = await saveImageFromForm(formData, "favicon", "branding", "system");

  const setting = await prisma.systemSetting.upsert({
    where: { id: "system" },
    create: {
      id: "system",
      appName,
      logoUrl: logoUrl ?? currentLogoUrl,
      faviconUrl: faviconUrl ?? currentFaviconUrl
    },
    update: {
      appName,
      logoUrl: logoUrl ?? currentLogoUrl ?? null,
      faviconUrl: faviconUrl ?? currentFaviconUrl ?? null
    }
  });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "SystemSetting",
      entityId: setting.id,
      action: "UPDATE_SYSTEM_BRANDING",
      metadata: { appName, logoChanged: Boolean(logoUrl), faviconChanged: Boolean(faviconUrl) }
    }
  });
  if (logoUrl && currentLogoUrl && logoUrl !== currentLogoUrl) await deleteStoredFile(currentLogoUrl);
  if (faviconUrl && currentFaviconUrl && faviconUrl !== currentFaviconUrl) await deleteStoredFile(currentFaviconUrl);

  revalidatePath("/");
  revalidatePath("/login");
  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
  redirect("/admin/settings?saved=branding");
}

export async function updateOperationalSettingsAction(formData: FormData) {
  const admin = await requireAdmin();
  const checkoutReminderAfterMinutes = Math.max(30, Math.min(2880, Math.round(getNumber(formData, "checkoutReminderAfterMinutes") ?? 480)));
  const anomalyGpsThresholdMeters = Math.max(50, Math.min(5000, Math.round(getNumber(formData, "anomalyGpsThresholdMeters") ?? 500)));
  const anomalyDistanceVariancePercent = Math.max(5, Math.min(100, getNumber(formData, "anomalyDistanceVariancePercent") ?? 20));

  const setting = await prisma.systemSetting.upsert({
    where: { id: "system" },
    create: {
      id: "system",
      appName: "PCC OnSite",
      checkoutReminderEnabled: getString(formData, "checkoutReminderEnabled") === "on",
      checkoutReminderAfterMinutes,
      checkoutReminderEmailEnabled: getString(formData, "checkoutReminderEmailEnabled") === "on",
      checkoutReminderLineEnabled: getString(formData, "checkoutReminderLineEnabled") === "on",
      anomalyGpsThresholdMeters,
      anomalyDistanceVariancePercent
    },
    update: {
      checkoutReminderEnabled: getString(formData, "checkoutReminderEnabled") === "on",
      checkoutReminderAfterMinutes,
      checkoutReminderEmailEnabled: getString(formData, "checkoutReminderEmailEnabled") === "on",
      checkoutReminderLineEnabled: getString(formData, "checkoutReminderLineEnabled") === "on",
      anomalyGpsThresholdMeters,
      anomalyDistanceVariancePercent
    }
  });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "SystemSetting",
      entityId: setting.id,
      action: "UPDATE_OPERATIONAL_SETTINGS",
      metadata: {
        checkoutReminderAfterMinutes,
        anomalyGpsThresholdMeters,
        anomalyDistanceVariancePercent
      }
    }
  });

  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=operations");
}

export async function runCheckoutRemindersAction() {
  await requireAdmin();
  const result = await processCheckoutReminders();
  revalidatePath("/admin/settings");
  revalidatePath("/admin/check-ins");
  redirect(`/admin/settings?saved=reminders&sent=${result.sent}&failed=${result.failed}&skipped=${result.skipped}`);
}

export async function resolveAnomalyAction(formData: FormData) {
  const user = await requireAdmin();
  const id = getString(formData, "id");
  if (!id) throw new Error("Anomaly id is required");

  const anomaly = await prisma.anomalyRecord.update({
    where: { id },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date()
    },
    select: { id: true, type: true, title: true }
  });

  await prisma.activityLog.create({
    data: {
      actorId: user.id,
      entityType: "AnomalyRecord",
      entityId: anomaly.id,
      action: "RESOLVE_ANOMALY",
      metadata: {
        type: anomaly.type,
        title: anomaly.title
      }
    }
  });

  revalidatePath("/admin/anomalies");
  revalidatePath("/reports");
  revalidatePath("/admin");
}

export async function deleteAnomalyAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = getString(formData, "id");
  if (!id) throw new Error("Missing anomaly id");
  const anomaly = await prisma.anomalyRecord.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { actorId: admin.id, entityType: "AnomalyRecord", entityId: id, action: "DELETE_ANOMALY", metadata: { type: anomaly.type, title: anomaly.title } }
  });
  revalidatePath("/admin/anomalies");
}

export async function deleteTravelClaimAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = getString(formData, "id");
  if (!id) throw new Error("Missing claim id");
  const existingClaim = await prisma.travelClaim.findUnique({
    where: { id },
    select: { status: true, userId: true, totalAmount: true }
  });
  if (!existingClaim) throw new Error("Travel claim not found");
  if (existingClaim.status === "APPROVED" || existingClaim.status === "PAID") {
    throw new Error("Approved or paid travel claims cannot be deleted. Reject or reverse the accounting status first.");
  }

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.travelClaim.deleteMany({
      where: { id, status: { notIn: ["APPROVED", "PAID"] } }
    });
    if (deleted.count !== 1) throw new Error("The travel claim status changed and it can no longer be deleted.");
    await tx.activityLog.create({
      data: {
        actorId: admin.id,
        entityType: "TravelClaim",
        entityId: id,
        action: "DELETE_TRAVEL_CLAIM",
        metadata: { userId: existingClaim.userId, totalAmount: String(existingClaim.totalAmount) }
      }
    });
  });
  revalidatePath("/admin/travel");
  revalidatePath("/reports");
}

export async function deleteCheckInAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = getString(formData, "id");
  if (!id) throw new Error("Missing check-in id");
  const [checkIn, protectedClaim] = await Promise.all([
    prisma.checkIn.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        projectId: true,
        tripSessionId: true,
        photoUrl: true,
        photoUrls: true,
        checkoutPhotoUrl: true,
        checkoutPhotoUrls: true,
        odometerStartPhotoUrl: true,
        odometerEndPhotoUrl: true
      }
    }),
    prisma.travelClaim.findFirst({
      where: {
        status: { in: ["APPROVED", "PAID"] },
        travelLeg: { is: { OR: [{ fromCheckInId: id }, { toCheckInId: id }] } }
      },
      select: { id: true, status: true }
    })
  ]);
  if (!checkIn) throw new Error("Check-in not found");
  if (protectedClaim) {
    throw new Error(`This check-in is linked to a ${protectedClaim.status.toLowerCase()} travel claim and cannot be deleted.`);
  }

  const storedFileUrls = [
    checkIn.photoUrl,
    ...checkIn.photoUrls,
    checkIn.checkoutPhotoUrl,
    ...checkIn.checkoutPhotoUrls,
    checkIn.odometerStartPhotoUrl,
    checkIn.odometerEndPhotoUrl
  ].filter((url): url is string => Boolean(url));

  await prisma.$transaction(async (tx) => {
    const legs = await tx.travelLeg.findMany({ where: { OR: [{ fromCheckInId: id }, { toCheckInId: id }] }, select: { id: true } });
    const legIds = legs.map((leg) => leg.id);
    if (legIds.length) {
      const protectedClaimCount = await tx.travelClaim.count({
        where: { travelLegId: { in: legIds }, status: { in: ["APPROVED", "PAID"] } }
      });
      if (protectedClaimCount > 0) {
        throw new Error("This check-in is linked to an approved or paid travel claim and cannot be deleted.");
      }
      await tx.anomalyRecord.deleteMany({ where: { travelLegId: { in: legIds } } });
      await tx.travelClaim.deleteMany({ where: { travelLegId: { in: legIds } } });
      await tx.travelLeg.deleteMany({ where: { id: { in: legIds } } });
    }
    await tx.notificationLog.deleteMany({ where: { checkInId: id } });
    await tx.anomalyRecord.deleteMany({ where: { checkInId: id } });
    await tx.odometerLog.deleteMany({ where: { checkInId: id } });
    await tx.checkIn.delete({ where: { id } });
    if (checkIn.tripSessionId) await tx.tripSession.delete({ where: { id: checkIn.tripSessionId } });
    await tx.activityLog.create({
      data: { actorId: admin.id, entityType: "CheckIn", entityId: id, action: "DELETE_CHECK_IN", metadata: { userId: checkIn.userId, projectId: checkIn.projectId } }
    });
  });

  await Promise.allSettled(Array.from(new Set(storedFileUrls)).map(deleteStoredFile));

  revalidatePath("/admin/check-ins");
  revalidatePath("/admin/travel");
  revalidatePath("/reports");
  revalidatePath(`/projects/${checkIn.projectId}`);
}

export async function createFuelLogAction(formData: FormData) {
  const user = await requireUser();
  assertFieldUser(user);
  const input = fuelLogSchema.parse({
    vehicleId: getString(formData, "vehicleId"),
    fueledAt: getDate(formData, "fueledAt"),
    odometerKm: getNumber(formData, "odometerKm"),
    liters: getNumber(formData, "liters"),
    pricePerLiter: getNumber(formData, "pricePerLiter"),
    note: getString(formData, "note") || undefined
  });

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: input.vehicleId,
      userId: user.id,
      active: true,
      approved: true,
      kmPerLiter: { not: null }
    }
  });
  if (!vehicle) throw new Error("Vehicle not found or not approved");

  const receiptPhotoUrls = await saveImagesFromForm(formData, "receiptPhoto", "fuel-logs", user.id);
  const odometerPhotoUrls = await saveImagesFromForm(formData, "odometerPhoto", "odometers", user.id);
  const receiptPhotoUrl = receiptPhotoUrls[0];
  const odometerPhotoUrl = odometerPhotoUrls[0];
  if (!receiptPhotoUrl || !odometerPhotoUrl) {
    throw new Error("กรุณาถ่ายรูปบิลและหน้าปัดเลขไมล์ให้ครบ");
  }
  const totalAmount = roundMoney(input.liters * input.pricePerLiter);
  const fueledAt = input.fueledAt ?? new Date();
  const previousFuelLog = await prisma.fuelLog.findFirst({
    where: { vehicleId: vehicle.id, fueledAt: { lte: fueledAt } },
    orderBy: [{ fueledAt: "desc" }, { createdAt: "desc" }],
    select: { odometerKm: true }
  });

  const fuelLog = await prisma.$transaction(async (tx) => {
    const created = await tx.fuelLog.create({
      data: {
        userId: user.id,
        vehicleId: vehicle.id,
        fueledAt,
        odometerKm: input.odometerKm,
        liters: input.liters,
        pricePerLiter: input.pricePerLiter,
        totalAmount,
        receiptPhotoUrl,
        receiptPhotoUrls,
        odometerPhotoUrl,
        odometerPhotoUrls,
        note: input.note
      }
    });

    await tx.odometerLog.create({
      data: {
        userId: user.id,
        vehicleId: vehicle.id,
        type: "REFUEL",
        odometerKm: input.odometerKm,
        photoUrl: odometerPhotoUrl,
        note: input.note
      }
    });

    await tx.activityLog.create({
      data: {
        actorId: user.id,
        entityType: "FuelLog",
        entityId: created.id,
        action: "CREATE_FUEL_LOG",
        metadata: { vehicleId: vehicle.id, liters: input.liters, totalAmount }
      }
    });
    return created;
  });

  await settleAnomalyTasks([
    detectOdometerReversed({
      sourceKey: `fuel:${fuelLog.id}`,
      userId: user.id,
      vehicleId: vehicle.id,
      fuelLogId: fuelLog.id,
      previousKm: previousFuelLog?.odometerKm,
      currentKm: input.odometerKm,
      label: "Fuel odometer"
    }),
    detectFuelEfficiencyAnomaly(fuelLog.id)
  ], `fuel log ${fuelLog.id}`);

  revalidatePath("/fuel");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  revalidatePath("/admin/travel");
  redirect("/fuel?created=1");
}

export async function createUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const name = getString(formData, "name");
  const role = (getString(formData, "role") || "EMPLOYEE") as Role;
  const department = getString(formData, "department") || undefined;
  const phone = getString(formData, "phone") || undefined;
  const lineUserId = getString(formData, "lineUserId") || undefined;
  const checkoutReminderEnabled = getString(formData, "checkoutReminderEnabled") === "on";

  if (!email || !password || !name) throw new Error("Missing required user fields");
  if (!z.string().email().safeParse(email).success) throw new Error("Invalid email address");
  if (!["ADMIN", "EMPLOYEE", "SALES", "ENGINEER"].includes(role)) throw new Error("Invalid role");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      name,
      role,
      department,
      phone,
      lineUserId,
      checkoutReminderEnabled
    }
  });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "User",
      entityId: user.id,
      action: "CREATE_USER",
      metadata: { email, role }
    }
  });

  revalidatePath("/admin/users");
}

export async function updateUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = getString(formData, "id");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const name = getString(formData, "name");
  const role = (getString(formData, "role") || "EMPLOYEE") as Role;
  const department = getString(formData, "department") || undefined;
  const phone = getString(formData, "phone") || undefined;
  const lineUserId = getString(formData, "lineUserId") || undefined;
  const checkoutReminderEnabled = getString(formData, "checkoutReminderEnabled") === "on";

  if (!id || !email || !name) throw new Error("Missing required user fields");
  if (!z.string().email().safeParse(email).success) throw new Error("Invalid email address");
  if (!["ADMIN", "EMPLOYEE", "SALES", "ENGINEER"].includes(role)) throw new Error("Invalid role");
  if (admin.id === id && role !== "ADMIN") throw new Error("Cannot remove your own admin role");
  if (password && password.length < 8) throw new Error("Password must be at least 8 characters");

  const existingUser = await prisma.user.findUnique({ where: { id }, select: { role: true, active: true } });
  if (!existingUser) throw new Error("User not found");
  if (existingUser.role === "ADMIN" && role !== "ADMIN" && existingUser.active) {
    const activeAdminCount = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (activeAdminCount <= 1) throw new Error("Cannot remove the last active administrator");
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      email,
      name,
      role,
      department,
      phone,
      lineUserId,
      checkoutReminderEnabled,
      ...(password ? { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 } } : {})
    }
  });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "User",
      entityId: user.id,
      action: "UPDATE_USER",
      metadata: { email, role, passwordChanged: Boolean(password) }
    }
  });

  revalidatePath("/admin/users");
}

export async function toggleUserActiveAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = getString(formData, "id");
  const active = getString(formData, "active") === "true";

  if (!id) throw new Error("Missing user id");
  if (admin.id === id && !active) throw new Error("Cannot deactivate your own account");

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, active: true } });
  if (!target) throw new Error("User not found");
  if (!active && target.active && target.role === "ADMIN") {
    const activeAdminCount = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (activeAdminCount <= 1) throw new Error("Cannot deactivate the last active administrator");
  }

  const user = await prisma.user.update({
    where: { id },
    data: { active }
  });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "User",
      entityId: user.id,
      action: active ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      metadata: { email: user.email, role: user.role }
    }
  });

  revalidatePath("/admin/users");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = getString(formData, "id");
  if (!id) throw new Error("Missing user id");
  if (admin.id === id) throw new Error("Cannot delete your own account");

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      email: true,
      role: true,
      profilePhotoUrl: true,
      _count: {
        select: {
          createdProjects: true,
          ownedProjects: true,
          vehicles: true,
          tripSessions: true,
          checkIns: true,
          travelLegs: true,
          travelClaims: true,
          reviewedClaims: true,
          odometerLogs: true,
          fuelLogs: true
        }
      }
    }
  });
  if (!target) throw new Error("User not found");

  const dependencyCount = Object.values(target._count).reduce((sum, count) => sum + count, 0);
  if (dependencyCount > 0) {
    throw new Error("Cannot delete a user that has projects, vehicles, or activity history. Deactivate the account instead.");
  }
  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) throw new Error("Cannot delete the last administrator");
  }

  await prisma.$transaction([
    prisma.notificationLog.deleteMany({ where: { userId: id } }),
    prisma.anomalyRecord.deleteMany({ where: { userId: id } }),
    prisma.exportDocument.updateMany({ where: { generatedById: id }, data: { generatedById: null } }),
    prisma.user.delete({ where: { id } }),
    prisma.activityLog.create({
      data: {
        actorId: admin.id,
        entityType: "User",
        entityId: id,
        action: "DELETE_USER",
        metadata: { email: target.email, role: target.role }
      }
    })
  ]);

  await deleteStoredFile(target.profilePhotoUrl);

  revalidatePath("/admin/users");
}
