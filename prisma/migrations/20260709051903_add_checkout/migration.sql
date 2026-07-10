-- CreateEnum
CREATE TYPE "CheckOutStatus" AS ENUM ('DONE', 'NEED_RETURN', 'WAITING_CUSTOMER', 'ISSUE', 'OTHER');

-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "checkedOutAt" TIMESTAMP(3),
ADD COLUMN     "checkoutAccuracy" DOUBLE PRECISION,
ADD COLUMN     "checkoutLatitude" DOUBLE PRECISION,
ADD COLUMN     "checkoutLongitude" DOUBLE PRECISION,
ADD COLUMN     "checkoutNote" TEXT,
ADD COLUMN     "checkoutPhotoUrl" TEXT,
ADD COLUMN     "checkoutStatus" "CheckOutStatus";

-- CreateIndex
CREATE INDEX "CheckIn_userId_checkedOutAt_idx" ON "CheckIn"("userId", "checkedOutAt");
