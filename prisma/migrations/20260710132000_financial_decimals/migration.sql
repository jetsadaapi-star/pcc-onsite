ALTER TABLE "TravelClaim"
  ALTER COLUMN "ratePerKm" TYPE DECIMAL(12,2) USING ROUND("ratePerKm"::numeric, 2),
  ALTER COLUMN "mileageAmount" TYPE DECIMAL(14,2) USING ROUND("mileageAmount"::numeric, 2),
  ALTER COLUMN "fuelPricePerLiter" TYPE DECIMAL(12,2) USING ROUND("fuelPricePerLiter"::numeric, 2),
  ALTER COLUMN "fuelEstimate" TYPE DECIMAL(14,2) USING ROUND("fuelEstimate"::numeric, 2),
  ALTER COLUMN "tollAmount" TYPE DECIMAL(14,2) USING ROUND("tollAmount"::numeric, 2),
  ALTER COLUMN "parkingAmount" TYPE DECIMAL(14,2) USING ROUND("parkingAmount"::numeric, 2),
  ALTER COLUMN "otherAmount" TYPE DECIMAL(14,2) USING ROUND("otherAmount"::numeric, 2),
  ALTER COLUMN "totalAmount" TYPE DECIMAL(14,2) USING ROUND("totalAmount"::numeric, 2);

ALTER TABLE "FuelLog"
  ALTER COLUMN "liters" TYPE DECIMAL(12,3) USING ROUND("liters"::numeric, 3),
  ALTER COLUMN "pricePerLiter" TYPE DECIMAL(12,2) USING ROUND("pricePerLiter"::numeric, 2),
  ALTER COLUMN "totalAmount" TYPE DECIMAL(14,2) USING ROUND("totalAmount"::numeric, 2);

ALTER TABLE "ReimbursementRate"
  ALTER COLUMN "ratePerKm" TYPE DECIMAL(12,2) USING ROUND("ratePerKm"::numeric, 2),
  ALTER COLUMN "fuelPricePerLiter" TYPE DECIMAL(12,2) USING ROUND("fuelPricePerLiter"::numeric, 2);

ALTER TABLE "ExportDocument"
  ALTER COLUMN "totalAmount" TYPE DECIMAL(16,2) USING ROUND("totalAmount"::numeric, 2);
