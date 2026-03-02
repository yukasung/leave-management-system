/*
  Warnings:

  - You are about to drop the column `endType` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to drop the column `startType` on the `LeaveRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LeaveRequest" DROP COLUMN "endType",
DROP COLUMN "startType",
ADD COLUMN     "durationType" "LeaveDurationType" NOT NULL DEFAULT 'FULL_DAY';
