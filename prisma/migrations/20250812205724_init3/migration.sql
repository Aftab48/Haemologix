-- AlterTable
ALTER TABLE "public"."DonorRegistration" ADD COLUMN     "latitude" TEXT,
ADD COLUMN     "longitude" TEXT;

-- AlterTable
ALTER TABLE "public"."HospitalRegistration" ADD COLUMN     "latitude" TEXT,
ADD COLUMN     "longitude" TEXT;
