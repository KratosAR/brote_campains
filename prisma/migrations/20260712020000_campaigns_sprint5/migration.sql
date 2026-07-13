-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "audienceType" TEXT NOT NULL,
    "audienceGroupIds" JSONB NOT NULL,
    "audienceContactIds" JSONB NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "timezone" TEXT,
    "sendNow" BOOLEAN NOT NULL DEFAULT false,
    "maxRetries" INTEGER NOT NULL,
    "retryDelays" JSONB NOT NULL,
    "statistics" JSONB NOT NULL,
    "timeline" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_workspaceId_status_idx" ON "campaigns"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "campaigns_workspaceId_scheduledAt_idx" ON "campaigns"("workspaceId", "scheduledAt");

-- CreateIndex
CREATE INDEX "campaigns_workspaceId_createdAt_idx" ON "campaigns"("workspaceId", "createdAt");
