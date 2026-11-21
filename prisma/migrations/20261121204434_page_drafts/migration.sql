-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "draftAt" TIMESTAMP(3),
ADD COLUMN     "draftById" TEXT,
ADD COLUMN     "draftData" JSONB;
