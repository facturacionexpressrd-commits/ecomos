-- Phase 7 (user-approved): persist agent chat threads server-side so conversations sync
-- across devices and survive localStorage clears. Tenant isolation stays in the app layer;
-- RLS is enabled with no policies to close the Supabase anon-key path, consistent with every
-- other tenant table in this schema (see 20260919003500_enable_rls header).

-- CreateTable
CREATE TABLE "AgentThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentThread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentThread_userId_storeId_updatedAt_idx" ON "AgentThread"("userId", "storeId", "updatedAt" DESC);

-- CreateTable
CREATE TABLE "AgentMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "activityJson" JSONB,
    "sourcesJson" JSONB,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentMessage_threadId_createdAt_idx" ON "AgentMessage"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "AgentThread"
    ADD CONSTRAINT "AgentThread_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentThread"
    ADD CONSTRAINT "AgentThread_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMessage"
    ADD CONSTRAINT "AgentMessage_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "AgentThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: enabled with no policies, consistent with the rest of the tenant tables.
ALTER TABLE "AgentThread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentMessage" ENABLE ROW LEVEL SECURITY;
