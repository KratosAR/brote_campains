-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "company" TEXT,
    "externalId" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "acceptsCampaigns" TEXT NOT NULL,
    "consentSource" TEXT,
    "consentDate" TIMESTAMP(3),
    "optedOutAt" TIMESTAMP(3),
    "preferredChannel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_channels" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_tags" (
    "contactId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "contact_tags_pkey" PRIMARY KEY ("contactId","tag")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_groups" (
    "contactId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_groups_pkey" PRIMARY KEY ("contactId","groupId")
);

-- CreateIndex
CREATE INDEX "contacts_workspaceId_status_idx" ON "contacts"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_externalId_idx" ON "contacts"("workspaceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "contact_channels_workspaceId_type_value_key" ON "contact_channels"("workspaceId", "type", "value");

-- AddForeignKey
ALTER TABLE "contact_channels" ADD CONSTRAINT "contact_channels_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_groups" ADD CONSTRAINT "contact_groups_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_groups" ADD CONSTRAINT "contact_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
