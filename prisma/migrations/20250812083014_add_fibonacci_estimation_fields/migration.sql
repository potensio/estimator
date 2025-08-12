-- AlterTable
ALTER TABLE "public"."ModuleVersion" ADD COLUMN     "adjustedEstimationHours" INTEGER,
ADD COLUMN     "adjustedFibonacciPoints" INTEGER,
ADD COLUMN     "baseEstimationHours" INTEGER,
ADD COLUMN     "baseFibonacciPoints" INTEGER,
ADD COLUMN     "optimisticLevel" TEXT,
ADD COLUMN     "teamVelocity" INTEGER,
ADD COLUMN     "totalEstimatedSprints" DECIMAL(65,30);
