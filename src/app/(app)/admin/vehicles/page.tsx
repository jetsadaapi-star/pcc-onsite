import { VehicleManagementClient } from "@/components/vehicle-management-client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminVehiclesPage() {
  await requireAdmin();

  const [vehicles, users, presets, total, active, pending] = await Promise.all([
    prisma.vehicle.findMany({
      orderBy: [{ active: "desc" }, { user: { name: "asc" } }, { isDefault: "desc" }, { updatedAt: "desc" }],
      include: {
        user: { select: { id: true, name: true, role: true } },
        _count: {
          select: {
            checkIns: true,
            fuelLogs: true,
            travelClaims: true,
            odometerLogs: true
          }
        }
      },
      take: 300
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true }
    }),
    prisma.vehicleEfficiencyPreset.findMany({
      orderBy: [{ active: "desc" }, { make: "asc" }, { model: "asc" }]
    }),
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { active: true, approved: true, kmPerLiter: { not: null } } }),
    prisma.vehicle.count({ where: { active: true, approved: false } })
  ]);

  return (
    <VehicleManagementClient
      users={users}
      stats={{ total, active, pending }}
      presets={presets.map((preset) => ({
        id: preset.id,
        make: preset.make,
        model: preset.model,
        fuelType: preset.fuelType,
        kmPerLiter: preset.kmPerLiter,
        active: preset.active
      }))}
      initialVehicles={vehicles.map((vehicle) => ({
        id: vehicle.id,
        userId: vehicle.userId,
        name: vehicle.name,
        make: vehicle.make,
        model: vehicle.model,
        licensePlate: vehicle.licensePlate,
        fuelType: vehicle.fuelType,
        kmPerLiter: vehicle.kmPerLiter,
        active: vehicle.active,
        approved: vehicle.approved,
        isDefault: vehicle.isDefault,
        user: vehicle.user,
        counts: {
          checkIns: vehicle._count.checkIns,
          fuelLogs: vehicle._count.fuelLogs,
          travelClaims: vehicle._count.travelClaims,
          odometerLogs: vehicle._count.odometerLogs
        }
      }))}
    />
  );
}
