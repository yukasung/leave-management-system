-- CreateTable: LeaveCategoryConfig (idempotent)
CREATE TABLE IF NOT EXISTS "LeaveCategoryConfig" (
    "id"        TEXT NOT NULL,
    "key"       TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "color"     TEXT NOT NULL DEFAULT 'blue',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveCategoryConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeaveCategoryConfig_key_key" ON "LeaveCategoryConfig"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "LeaveCategoryConfig_name_key" ON "LeaveCategoryConfig"("name");

-- Seed default categories (ON CONFLICT — safe to run multiple times)
INSERT INTO "LeaveCategoryConfig" ("id", "key", "name", "color", "sortOrder")
VALUES
  (gen_random_uuid(), 'ANNUAL', 'ลาประจำปี', 'blue',   0),
  (gen_random_uuid(), 'EVENT',  'ลาพิเศษ',   'violet', 1)
ON CONFLICT ("key") DO NOTHING;

-- Add leaveCategoryId column to LeaveType (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'LeaveType' AND column_name = 'leaveCategoryId'
  ) THEN
    ALTER TABLE "LeaveType" ADD COLUMN "leaveCategoryId" TEXT;
  END IF;
END $$;

-- Populate leaveCategoryId from existing leaveCategory enum values (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'LeaveType' AND column_name = 'leaveCategory'
  ) THEN
    UPDATE "LeaveType" lt
    SET "leaveCategoryId" = lcc."id"
    FROM "LeaveCategoryConfig" lcc
    WHERE lcc."key" = lt."leaveCategory"::TEXT;

    ALTER TABLE "LeaveType" DROP COLUMN "leaveCategory";
  END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'LeaveType_leaveCategoryId_fkey'
      AND table_name = 'LeaveType'
  ) THEN
    ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_leaveCategoryId_fkey"
      FOREIGN KEY ("leaveCategoryId") REFERENCES "LeaveCategoryConfig"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
