-- Migration: Add missing columns to User table
-- isActive, lastLogin, updatedAt were added to schema.prisma but never
-- created through any migration. This migration adds them idempotently.

-- Add isActive (default true so existing rows are non-breaking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'isActive'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add lastLogin (nullable — no default needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'lastLogin'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "lastLogin" TIMESTAMP(3);
  END IF;
END $$;

-- Add updatedAt (default now() so existing rows get a valid timestamp)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
