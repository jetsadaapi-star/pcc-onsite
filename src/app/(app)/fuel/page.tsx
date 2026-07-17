import { FuelManagementClient } from "@/components/fuel-management-client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

const PAGE_SIZE = 50;

export default async function FuelPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/reports");
  const requestedPage = Number((await searchParams).page ?? "1");
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const [vehicles, fuelLogs, totalLogs] = await Promise.all([
    prisma.vehicle.findMany({
      where: { userId: user.id, active: true, approved: true, kmPerLiter: { not: null } },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      select: { id: true, name: true, licensePlate: true, kmPerLiter: true }
    }),
    prisma.fuelLog.findMany({
      where: { userId: user.id },
      orderBy: { fueledAt: "desc" },
      include: { vehicle: { select: { name: true, licensePlate: true } } },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.fuelLog.count({ where: { userId: user.id } })
  ]);
  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE));
  if (currentPage > totalPages) {
    redirect(totalPages === 1 ? "/fuel" : `/fuel?page=${totalPages}`);
  }

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
      pagination={{ currentPage, totalPages, totalLogs }}
    />
  );
}
