-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "checkoutPhotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
