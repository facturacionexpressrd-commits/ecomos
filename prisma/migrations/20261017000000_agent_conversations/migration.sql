-- CreateTable AgentConversation
CREATE TABLE "AgentConversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Nueva conversación',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable AgentConversationMessage
CREATE TABLE "AgentConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentConversationMessage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AgentConversationMessage_role_check" CHECK ("role" IN ('user', 'assistant'))
);

-- CreateIndex
CREATE INDEX "AgentConversation_userId_storeId_updatedAt_idx"
ON "AgentConversation"("userId", "storeId", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentConversation_organizationId_storeId_idx"
ON "AgentConversation"("organizationId", "storeId");

-- CreateIndex
CREATE INDEX "AgentConversationMessage_conversationId_createdAt_idx"
ON "AgentConversationMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "AgentConversation"
ADD CONSTRAINT "AgentConversation_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConversation"
ADD CONSTRAINT "AgentConversation_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConversation"
ADD CONSTRAINT "AgentConversation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConversationMessage"
ADD CONSTRAINT "AgentConversationMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "AgentConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Match the project's existing Supabase posture: Prisma is the only app DB client,
-- and RLS without public REST policies blocks direct anon/authenticated table access.
ALTER TABLE "AgentConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentConversationMessage" ENABLE ROW LEVEL SECURITY;
