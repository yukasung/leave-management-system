/*
  Warnings:

  - You are about to drop the column `daysPerYear` on the `LeaveType` table. All the data in the column will be lost.
  - You are about to drop the column `requireDocument` on the `LeaveType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LeaveType" DROP COLUMN "daysPerYear",
DROP COLUMN "requireDocument",
ADD COLUMN     "allowDuringProbation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deductFromBalance" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxDaysPerRequest" DOUBLE PRECISION,
ADD COLUMN     "maxDaysPerYear" DOUBLE PRECISION,
ADD COLUMN     "requiresAttachment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isProbation" BOOLEAN NOT NULL DEFAULT false;
