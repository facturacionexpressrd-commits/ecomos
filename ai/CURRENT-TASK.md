# Current Task

## Objective
Support autonomous agent orchestration for Meta Ads campaign management in EcomOS while maintaining multi-tenant isolation and data security.

## Update 2026-10-01 (Agent Configuration)
- AGENTS.md: Defines 5 autonomous agents (Campaign Manager, Budget Optimizer, Performance Monitor, Copy Generator, Audience Targeting)
- Framework: Runable AI orchestration via `/api/runable/*` webhooks + Vercel cron
- State: Published configs immutable during execution; draft configs for staging
- GitHub: Committed and pushed agent configuration to `facturacionexpressrd-commits/ecomos`

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
