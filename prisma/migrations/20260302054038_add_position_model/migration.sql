-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "positionId" TEXT;

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Position_name_key" ON "Position"("name");

-- CreateIndex
CREATE INDEX "Position_name_idx" ON "Position"("name");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: insert distinct positions and link employees
INSERT INTO "Position" ("id", "name", "createdAt")
SELECT gen_random_uuid(), "position", NOW()
FROM (SELECT DISTINCT "position" FROM "Employee" WHERE "position" IS NOT NULL AND "position" != '') AS t;

UPDATE "Employee" e
SET "positionId" = p."id"
FROM "Position" p
WHERE e."position" = p."name";
