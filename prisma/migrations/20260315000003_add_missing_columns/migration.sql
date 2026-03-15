-- Migration: Add all remaining missing columns across tables
-- Covers schema drift where columns were added to schema.prisma
-- directly without corresponding migrations.
-- All steps are idempotent (IF NOT EXISTS).

-- ============================================================
-- Employee: hireDate, updatedAt
-- Also handle: drop old "email" unique index + column (removed from schema),
--              drop old "position" text column (replaced by positionId FK),
--              fix managerId FK to reference Employee (self-relation)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'hireDate'
  ) THEN
    ALTER TABLE "Employee" ADD COLUMN "hireDate" TIMESTAMP(3);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "Employee" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Drop old "position" text column if it still exists (replaced by positionId FK)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'position'
  ) THEN
    ALTER TABLE "Employee" DROP COLUMN "position";
  END IF;
END $$;

-- Drop old "email" column and its unique index from Employee if still present
-- (email was removed from schema; authentication uses User.email)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'email'
  ) THEN
    ALTER TABLE "Employee" DROP COLUMN "email";
  END IF;
END $$;

-- Fix managerId FK: schema expects Employee self-relation (EmployeeReportsTo),
-- but migration 20260302052720 changed it to reference User.
-- Re-point to Employee.id if it currently references User.
DO $$
DECLARE
  ref_table TEXT;
BEGIN
  SELECT ccu.table_name INTO ref_table
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'Employee'
    AND kcu.column_name = 'managerId'
    AND tc.constraint_schema = 'public';

  IF ref_table = 'User' THEN
    ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_managerId_fkey";
    ALTER TABLE "Employee"
      ADD CONSTRAINT "Employee_managerId_fkey"
      FOREIGN KEY ("managerId") REFERENCES "Employee"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- Employee many-to-many approvers join table (_EmployeeApprovers)
-- ============================================================
CREATE TABLE IF NOT EXISTS "_EmployeeApprovers" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = '_EmployeeApprovers_AB_pkey'
  ) THEN
    ALTER TABLE "_EmployeeApprovers"
      ADD CONSTRAINT "_EmployeeApprovers_AB_pkey" PRIMARY KEY ("A", "B");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "_EmployeeApprovers_B_index" ON "_EmployeeApprovers"("B");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = '_EmployeeApprovers_A_fkey'
  ) THEN
    ALTER TABLE "_EmployeeApprovers"
      ADD CONSTRAINT "_EmployeeApprovers_A_fkey"
      FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = '_EmployeeApprovers_B_fkey'
  ) THEN
    ALTER TABLE "_EmployeeApprovers"
      ADD CONSTRAINT "_EmployeeApprovers_B_fkey"
      FOREIGN KEY ("B") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- Position: departmentId FK (added to schema, never migrated)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Position' AND column_name = 'departmentId'
  ) THEN
    ALTER TABLE "Position" ADD COLUMN "departmentId" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'Position_departmentId_fkey'
      AND table_name = 'Position'
  ) THEN
    ALTER TABLE "Position"
      ADD CONSTRAINT "Position_departmentId_fkey"
      FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- LeaveType: leaveLimitType, dayCountType enums + columns
-- ============================================================
DO $$
BEGIN
  CREATE TYPE "LeaveLimitType" AS ENUM ('PER_YEAR', 'PER_REQUEST', 'UNLIMITED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'LeaveType' AND column_name = 'leaveLimitType'
  ) THEN
    ALTER TABLE "LeaveType" ADD COLUMN "leaveLimitType" "LeaveLimitType" NOT NULL DEFAULT 'PER_YEAR';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'LeaveType' AND column_name = 'dayCountType'
  ) THEN
    -- DayCountType enum was created in earlier migration
    ALTER TABLE "LeaveType" ADD COLUMN "dayCountType" "DayCountType" NOT NULL DEFAULT 'WORKING_DAY';
  END IF;
END $$;
