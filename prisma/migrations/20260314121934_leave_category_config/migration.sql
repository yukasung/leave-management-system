-- CreateTable: LeaveCategoryConfig
CREATE TABLE "LeaveCategoryConfig" (
    "id"        TEXT NOT NULL,
    "key"       TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "color"     TEXT NOT NULL DEFAULT 'blue',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveCategoryConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeaveCategoryConfig_key_key" ON "LeaveCategoryConfig"("key");
CREATE UNIQUE INDEX "LeaveCategoryConfig_name_key" ON "LeaveCategoryConfig"("name");

-- Seed default categories (preserve existing enum values as keys)
INSERT INTO "LeaveCategoryConfig" ("id", "key", "name", "color", "sortOrder")
VALUES
  (gen_random_uuid(), 'ANNUAL', 'ลาประจำปี', 'blue',   0),
  (gen_random_uuid(), 'EVENT',  'ลาพิเศษ',   'violet', 1);

-- Add leaveCategoryId column to LeaveType (nullable FK)
ALTER TABLE "LeaveType" ADD COLUMN "leaveCategoryId" TEXT;

-- Populate leaveCategoryId from existing leaveCategory enum values
UPDATE "LeaveType" lt
SET "leaveCategoryId" = lcc."id"
FROM "LeaveCategoryConfig" lcc
WHERE lcc."key" = lt."leaveCategory"::TEXT;

-- Drop old enum column
ALTER TABLE "LeaveType" DROP COLUMN "leaveCategory";

-- AddForeignKey
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_leaveCategoryId_fkey"
    FOREIGN KEY ("leaveCategoryId") REFERENCES "LeaveCategoryConfig"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
