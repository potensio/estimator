/*
  Warnings:

  - You are about to drop the column `adjustedFibonacciPoints` on the `ModuleVersion` table. All the data in the column will be lost.
  - You are about to drop the column `baseFibonacciPoints` on the `ModuleVersion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ModuleVersion" DROP COLUMN "adjustedFibonacciPoints",
DROP COLUMN "baseFibonacciPoints",
ADD COLUMN     "adjustedTShirtSize" TEXT,
ADD COLUMN     "baseTShirtSize" TEXT;
