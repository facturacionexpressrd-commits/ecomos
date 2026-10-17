-- Persist visible EcomOS Operator conversations, scoped to the owning user and store.
CREATE TABLE public."AgentConversation" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES public."Organization"("id") ON DELETE CASCADE,
  "storeId" text NOT NULL REFERENCES public."Store"("id") ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "title" text NOT NULL DEFAULT 'Nueva conversación',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "AgentConversation_userId_storeId_updatedAt_idx"
  ON public."AgentConversation" ("userId", "storeId", "updatedAt" DESC);
CREATE INDEX "AgentConversation_organizationId_storeId_idx"
  ON public."AgentConversation" ("organizationId", "storeId");

CREATE TABLE public."AgentConversationMessage" (
  "id" text PRIMARY KEY,
  "conversationId" text NOT NULL REFERENCES public."AgentConversation"("id") ON DELETE CASCADE,
  "role" text NOT NULL CHECK ("role" IN ('user', 'assistant')),
  "content" text NOT NULL,
  "metadata" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "AgentConversationMessage_conversationId_createdAt_idx"
  ON public."AgentConversationMessage" ("conversationId", "createdAt");

ALTER TABLE public."AgentConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgentConversationMessage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own store conversations"
  ON public."AgentConversation"
  FOR ALL TO authenticated
  USING (
    "userId" = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1
      FROM public."Store" store
      JOIN public."User" account ON account."id" = (SELECT auth.uid())::text
      WHERE store."id" = "AgentConversation"."storeId"
        AND store."organizationId" = "AgentConversation"."organizationId"
        AND account."organizationId" = "AgentConversation"."organizationId"
    )
    AND EXISTS (
      SELECT 1
      FROM public."UserStoreAccess" access
      WHERE access."userId" = (SELECT auth.uid())::text
        AND access."storeId" = "AgentConversation"."storeId"
    )
  )
  WITH CHECK (
    "userId" = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1
      FROM public."Store" store
      JOIN public."User" account ON account."id" = (SELECT auth.uid())::text
      WHERE store."id" = "AgentConversation"."storeId"
        AND store."organizationId" = "AgentConversation"."organizationId"
        AND account."organizationId" = "AgentConversation"."organizationId"
    )
    AND EXISTS (
      SELECT 1
      FROM public."UserStoreAccess" access
      WHERE access."userId" = (SELECT auth.uid())::text
        AND access."storeId" = "AgentConversation"."storeId"
    )
  );

CREATE POLICY "Users can access messages in their own store conversations"
  ON public."AgentConversationMessage"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public."AgentConversation" conversation
      JOIN public."UserStoreAccess" access
        ON access."storeId" = conversation."storeId"
      WHERE conversation."id" = "AgentConversationMessage"."conversationId"
        AND conversation."userId" = (SELECT auth.uid())::text
        AND access."userId" = (SELECT auth.uid())::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public."AgentConversation" conversation
      JOIN public."UserStoreAccess" access
        ON access."storeId" = conversation."storeId"
      WHERE conversation."id" = "AgentConversationMessage"."conversationId"
        AND conversation."userId" = (SELECT auth.uid())::text
        AND access."userId" = (SELECT auth.uid())::text
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public."AgentConversation" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."AgentConversationMessage" TO authenticated;
