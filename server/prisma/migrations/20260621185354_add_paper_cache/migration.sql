-- AlterEnum
ALTER TYPE "FileType" ADD VALUE 'LATEX';

-- CreateTable
CREATE TABLE "Paper" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'pdf',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paper_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Paper_url_key" ON "Paper"("url");

-- CreateIndex
CREATE INDEX "Paper_fetchedAt_idx" ON "Paper"("fetchedAt");
