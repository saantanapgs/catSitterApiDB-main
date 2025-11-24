/*
  Warnings:

  - Made the column `adminId` on table `Service` required. This step will fail if there are existing NULL values in that column.
  - Made the column `time` on table `Service` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Service" ALTER COLUMN "adminId" SET NOT NULL,
ALTER COLUMN "time" SET NOT NULL;
