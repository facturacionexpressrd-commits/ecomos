# Current Task

## Objective
Support autonomous agent orchestration for Meta Ads campaign management in EcomOS while maintaining multi-tenant isolation and data security.

## Update 2026-10-01 (Agent Configuration)
- AGENTS.md: Defines 5 autonomous agents (Campaign Manager, Budget Optimizer, Performance Monitor, Copy Generator, Audience Targeting)
- Framework: Runable AI orchestration via `/api/runable/*` webhooks + Vercel cron
- State: Published configs immutable during execution; draft configs for staging
- GitHub: Committed and pushed agent configuration to `facturacionexpressrd-commits/ecomos`

## Update 2026-10-16 (EcomOS Operator conversational agent)
- `/dashboard/agents` is now a real authenticated chat against `POST /api/agents/chat`, not a preview.
- Agent loop runs locally on the repo's existing Claude provider (`CLAUDE_MODEL`, raw fetch to Anthropic).
  Runable stays separate and untouched.
- 7 read-only, store-scoped tools in `src/lib/agents/tools.ts`; permission registry in
  `src/lib/agents/permissions.ts` (PermissionLevel union copied from the AISETTINGS `ecomos_operator`
  preset, not installed — that package is unpublished).
- Bounded tool-use loop: 5 rounds, 8 tool calls, 1600 output tokens, 6000 chars per tool result.
- Quota: `agentChatQuotaExceeded` counts `AuditLog` rows with action `agent.chat` (10/min, 200/day per
  store). Deliberately NOT the `copy`/`ideas` quotas — those count rows a chat turn never writes.
- No schema change, no migration. Write capabilities are declared `available: false` and labelled
  unavailable in the UI rather than simulated.
- Needs `ANTHROPIC_API_KEY` in the Vercel preview environment to answer; without it the endpoint
  returns 503 with a clear message.

## Update 2026-10-16 (Saved EcomOS Operator conversations)
- Added user-owned conversation threads scoped to the authenticated user and selected store.
- Added authenticated list/create/read/delete endpoints at `/api/agents/conversations`; chat turns now load context from persisted messages instead of browser-supplied history.
- Saved messages contain visible user/assistant text plus display metadata (tool labels, source labels, truncation state); raw tool payloads and provider credentials are not saved.
- Added migration `0041_agent_conversations.sql` with RLS policies on conversations and messages.
- Added a conversation picker, automatic titles, new conversation, reopen after refresh, and confirmed delete controls.
- Schema changes are in a proposed migration; the migration has not been applied to production.

## Current State (verified 2026-10-01)
- Deployed: https://ecomos-omega.vercel.app, `/api/health` → 200
- Agent Dashboard: `/components/agents/agents-dashboard.tsx` ready (awaiting Runable webhook integration)
- Database: All 40 migrations applied in production
- Runable Integration: Documented in `RUNABLE_AI_INTEGRATION.md`, awaiting API key setup

## Relevant Files
`AGENTS.md` · `RUNABLE_AI_INTEGRATION.md` · `docs/DEPLOY.md` · `src/app/api/runable/route.ts`

## Next Steps (human steps marked H)
1. **H** Set `RUNABLE_API_KEY` and `RUNABLE_WEBHOOK_SECRET` in Vercel Production environment
2. **H** Configure Runable webhook in Runable dashboard pointing to `/api/runable/webhook`
3. Verify agent dashboard loads with sample agents
4. Create first autonomous campaign manager agent in Runable with test configuration
5. Monitor agent execution logs in `/api/health` metrics
6. Implement agent approval workflow for high-cost budget changes
7. Add agent performance analytics to dashboard

## Constraints
- Do not edit migrations (0001–0040). Add new numbered files.
- Agent configs must respect multi-tenant isolation (RLS enforced on `ai_agents` table)
- Runable API credentials stored encrypted in Supabase
- Published configs are immutable; only draft configs can be modified
