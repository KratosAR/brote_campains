-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "messageSnapshot" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "attempts" JSONB NOT NULL,
    "timeline" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deliveries_workspaceId_campaignId_idx" ON "deliveries"("workspaceId", "campaignId");

-- CreateIndex
CREATE INDEX "deliveries_workspaceId_status_idx" ON "deliveries"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "deliveries_providerMessageId_idx" ON "deliveries"("providerMessageId");

-- CreateIndex
CREATE INDEX "deliveries_contactId_idx" ON "deliveries"("contactId");

-- CreateIndex
CREATE INDEX "deliveries_createdAt_idx" ON "deliveries"("createdAt");
