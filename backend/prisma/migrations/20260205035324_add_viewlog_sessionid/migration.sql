/*
  Warnings:

  - A unique constraint covering the columns `[documentId,sessionId]` on the table `ViewLog` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ViewLog" ADD COLUMN "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "ViewLog_documentId_viewedAt_idx" ON "ViewLog"("documentId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ViewLog_documentId_sessionId_key" ON "ViewLog"("documentId", "sessionId");
