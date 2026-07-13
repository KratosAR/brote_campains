-- CreateTable
CREATE TABLE "channel_connections" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "credentialsEncrypted" TEXT NOT NULL,
    "capabilities" JSONB,
    "lastHealthCheck" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "channel_connections_workspaceId_channel_idx" ON "channel_connections"("workspaceId", "channel");
