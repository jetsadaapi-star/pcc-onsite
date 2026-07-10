-- CreateTable
CREATE TABLE "VehicleEfficiencyPreset" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT,
    "fuelType" "FuelType" NOT NULL DEFAULT 'GASOLINE',
    "kmPerLiter" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleEfficiencyPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleEfficiencyPreset_make_model_fuelType_active_idx" ON "VehicleEfficiencyPreset"("make", "model", "fuelType", "active");
