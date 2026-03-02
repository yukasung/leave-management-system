/*
  Warnings:

  - You are about to drop the column `durationType` on the `LeaveRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LeaveRequest" DROP COLUMN "durationType",
ADD COLUMN     "endDurationType" "LeaveDurationType" NOT NULL DEFAULT 'FULL_DAY',
ADD COLUMN     "startDurationType" "LeaveDurationType" NOT NULL DEFAULT 'FULL_DAY';
