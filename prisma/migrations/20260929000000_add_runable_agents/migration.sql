-- CreateTable RunableAgent
CREATE TABLE "RunableAgent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "config" JSONB NOT NULL,
    "runableApiKeyEncrypted" TEXT NOT NULL,
    "webhook_secret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RunableAgent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE
);

-- CreateTable RunableAgentExecution
CREATE TABLE "RunableAgentExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inputData" JSONB,
    "outputData" JSONB,
    "errorMessage" TEXT,
    "metaActionsCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RunableAgentExecution_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "RunableAgent" ("id") ON DELETE CASCADE
);

-- CreateTable RunableAgentActionLog
CREATE TABLE "RunableAgentActionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetId" TEXT,
    "actionData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RunableAgentActionLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "RunableAgent" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RunableAgent_storeId_agentId_key" ON "RunableAgent"("storeId", "agentId");

-- CreateIndex
CREATE INDEX "RunableAgent_storeId_status_idx" ON "RunableAgent"("storeId", "status");

-- CreateIndex
CREATE INDEX "RunableAgent_agentType_idx" ON "RunableAgent"("agentType");

-- CreateIndex
CREATE UNIQUE INDEX "RunableAgentExecution_agentId_executionId_key" ON "RunableAgentExecution"("agentId", "executionId");

-- CreateIndex
CREATE INDEX "RunableAgentExecution_agentId_status_idx" ON "RunableAgentExecution"("agentId", "status");

-- CreateIndex
CREATE INDEX "RunableAgentExecution_agentId_createdAt_idx" ON "RunableAgentExecution"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "RunableAgentActionLog_agentId_createdAt_idx" ON "RunableAgentActionLog"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "RunableAgentActionLog_agentId_actionType_idx" ON "RunableAgentActionLog"("agentId", "actionType");

-- CreateIndex
CREATE INDEX "RunableAgentActionLog_targetId_idx" ON "RunableAgentActionLog"("targetId");
