-- CreateEnum
CREATE TYPE "HolidaySource" AS ENUM ('BOT', 'MANUAL');

-- CreateTable
CREATE TABLE "company_holidays" (
    "id"        TEXT NOT NULL,
    "date"      DATE NOT NULL,
    "name"      TEXT NOT NULL,
    "year"      INTEGER NOT NULL,
    "source"    "HolidaySource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_holidays_date_key" ON "company_holidays"("date");

-- CreateIndex
CREATE INDEX "company_holidays_year_idx" ON "company_holidays"("year");
