-- AlterTable
ALTER TABLE "SeekerProfile" ADD COLUMN     "resumeText" TEXT;

-- CreateTable
CREATE TABLE "JobMatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobMatch_createdAt_idx" ON "JobMatch"("createdAt");

-- CreateIndex
CREATE INDEX "JobMatch_userId_createdAt_idx" ON "JobMatch"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobMatch_userId_jobId_inputHash_key" ON "JobMatch"("userId", "jobId", "inputHash");

-- AddForeignKey
ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
