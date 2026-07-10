import { FuelManagementClient } from "@/components/fuel-management-client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function FuelPage() {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/reports");

  const [vehicles, fuelLogs] = await Promise.all([
    prisma.vehicle.findMany({
      where: { userId: user.id, active: true, approved: true, kmPerLiter: { not: null } },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      select: { id: true, name: true, licensePlate: true, kmPerLiter: true }
    }),
    prisma.fuelLog.findMany({
      where: { userId: user.id },
      orderBy: { fueledAt: "desc" },
      include: { vehicle: { select: { name: true, licensePlate: true } } },
      take: 200
    })
  ]);

  return (
    <FuelManagementClient
      vehicles={vehicles}
      fuelLogs={fuelLogs.map((log) => ({
        id: log.id,
        vehicleId: log.vehicleId,
        vehicleName: log.vehicle.name,
        vehicleLicensePlate: log.vehicle.licensePlate,
        fueledAt: log.fueledAt.toISOString(),
        odometerKm: log.odometerKm,
        liters: Number(log.liters),
        pricePerLiter: Number(log.pricePerLiter),
        totalAmount: Number(log.totalAmount),
        receiptPhotoUrl: log.receiptPhotoUrl,
        receiptPhotoUrls: log.receiptPhotoUrls.length ? log.receiptPhotoUrls : log.receiptPhotoUrl ? [log.receiptPhotoUrl] : [],
        odometerPhotoUrl: log.odometerPhotoUrl,
        odometerPhotoUrls: log.odometerPhotoUrls.length ? log.odometerPhotoUrls : log.odometerPhotoUrl ? [log.odometerPhotoUrl] : [],
        note: log.note
      }))}
    />
  );
}
