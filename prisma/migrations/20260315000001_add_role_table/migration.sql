-- Migration: Add Role table
-- Bridges the gap between migrations (which only created a "Role" enum type)
-- and the current schema (which requires a "Role" table with RoleName enum).
-- All steps are idempotent — safe to run on both fresh and existing databases.
--
-- Strategy: RENAME the old "Role" enum to "_OldRoleEnum" BEFORE creating the
-- "Role" table, to avoid the PostgreSQL error "type role already exists" that
-- occurs when a table is created with the same name as an existing enum type.

-- ============================================================
-- 1. Create RoleName enum type (if not exists)
-- ============================================================
DO $$
BEGIN
  CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. Rename "Role" enum → "_OldRoleEnum" so we can then create
--    a TABLE named "Role" without a type-name conflict.
--    Only renames if the enum exists and Role table does not.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'Role' AND t.typtype = 'e' AND n.nspname = 'public'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Role'
  ) THEN
    ALTER TYPE "Role" RENAME TO "_OldRoleEnum";
  END IF;
END $$;

-- ============================================================
-- 3. Create the Role table (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Role" (
  "id"          TEXT         NOT NULL,
  "name"        "RoleName"   NOT NULL,
  "description" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_key" ON "Role"("name");

-- ============================================================
-- 4. Add roleId column to User (if not exists)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'roleId'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "roleId" TEXT;
  END IF;
END $$;

-- ============================================================
-- 5. Add FK constraint User_roleId_fkey (if not exists)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'User_roleId_fkey'
      AND table_name = 'User'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_roleId_fkey"
      FOREIGN KEY ("roleId") REFERENCES "Role"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_roleId_idx" ON "User"("roleId");

-- ============================================================
-- 6. Drop old User.role column (type _OldRoleEnum or original Role enum)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'role'
  ) THEN
    ALTER TABLE "User" DROP COLUMN "role";
  END IF;
END $$;

-- ============================================================
-- 7. Drop old Employee.role column (if exists)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'role'
  ) THEN
    ALTER TABLE "Employee" DROP COLUMN "role";
  END IF;
END $$;

-- ============================================================
-- 8. Drop renamed old Role enum (now _OldRoleEnum) — no more deps
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = '_OldRoleEnum' AND t.typtype = 'e' AND n.nspname = 'public'
  ) THEN
    DROP TYPE "_OldRoleEnum";
  END IF;
END $$;

-- ============================================================
-- 9. Drop UserRole enum type (if exists — no longer used)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'UserRole' AND t.typtype = 'e' AND n.nspname = 'public'
  ) THEN
    DROP TYPE "UserRole" CASCADE;
  END IF;
END $$;
