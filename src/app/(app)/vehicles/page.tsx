import { OwnVehicleManagementClient } from "@/components/own-vehicle-management-client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function VehiclesPage() {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/admin/vehicles");

  const vehicles = await prisma.vehicle.findMany({
    where: { userId: user.id },
    orderBy: [{ active: "desc" }, { isDefault: "desc" }, { updatedAt: "desc" }],
    include: {
      _count: {
        select: {
          checkIns: true,
          fuelLogs: true,
          travelClaims: true,
          odometerLogs: true
        }
      }
    }
  });

  return (
    <OwnVehicleManagementClient
      vehicles={vehicles.map((vehicle) => ({
        id: vehicle.id,
        name: vehicle.name,
        make: vehicle.make,
        model: vehicle.model,
        licensePlate: vehicle.licensePlate,
        fuelType: vehicle.fuelType,
        kmPerLiter: vehicle.kmPerLiter,
        active: vehicle.active,
        approved: vehicle.approved,
        isDefault: vehicle.isDefault,
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
