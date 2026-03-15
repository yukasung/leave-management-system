-- Replace startDate/endDate/startDurationType/endDurationType with
-- leaveStartDateTime/leaveEndDateTime and remove LeaveDurationType enum.

-- Step 1: add new columns as nullable so we can backfill existing rows
ALTER TABLE "LeaveRequest" ADD COLUMN "leaveStartDateTime" TIMESTAMP(3);
ALTER TABLE "LeaveRequest" ADD COLUMN "leaveEndDateTime"   TIMESTAMP(3);

-- Step 2: backfill from old columns (they were date-only at UTC midnight)
UPDATE "LeaveRequest"
SET "leaveStartDateTime" = "startDate",
    "leaveEndDateTime"   = "endDate";

-- Step 3: make them NOT NULL now that all rows have values
ALTER TABLE "LeaveRequest" ALTER COLUMN "leaveStartDateTime" SET NOT NULL;
ALTER TABLE "LeaveRequest" ALTER COLUMN "leaveEndDateTime"   SET NOT NULL;

-- Step 4: drop old columns
ALTER TABLE "LeaveRequest"
  DROP COLUMN "startDate",
  DROP COLUMN "endDate",
  DROP COLUMN "startDurationType",
  DROP COLUMN "endDurationType";

-- Step 5: drop the LeaveDurationType enum (no longer used)
DROP TYPE IF EXISTS "LeaveDurationType";
