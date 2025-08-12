/*
  Warnings:

  - You are about to drop the column `modulesData` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Project" DROP COLUMN "modulesData",
ADD COLUMN     "activeVersionId" TEXT;

-- CreateTable
CREATE TABLE "public"."ModuleVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT,
    "modulesData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ModuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuleVersion_projectId_version_key" ON "public"."ModuleVersion"("projectId", "version");

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "public"."ModuleVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModuleVersion" ADD CONSTRAINT "ModuleVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
