-- AlterTable
ALTER TABLE "public"."HospitalRegistration" ALTER COLUMN "licenseExpiryDate" DROP NOT NULL,
ALTER COLUMN "nocExpiryDate" DROP NOT NULL;
