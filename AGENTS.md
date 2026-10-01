<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# EcomOS — agent entry point

Multi-tenant e-commerce SaaS for Dominican businesses: product management, AI-powered Meta Ads automation, Shopify integration, order tracking, analytics, and profit monitoring. Built for SMBs needing autonomous campaign management without developer involvement.

All 19 build phases complete. Product deployed and actively managing ad campaigns across live stores.

Code comments, UI copy, and `docs/` are in **Spanish**. Keep it that way. This `ai/` layer is in English.

## Stack (VERIFIED)

Next.js 16.3 (App Router, `proxy.ts` not `middleware.ts`) · React 19 · TypeScript strict · Tailwind v4 · Supabase (Postgres 17 + Auth + Realtime + pgvector, RLS on every tenant table) · OpenAI (chat + embeddings) · Shopify OAuth · Meta Cloud API · Vercel (Fluid compute, cron) · npm · Prisma ORM · `node:test` for unit tests.

**Agentic Layer:** Runable AI for autonomous campaign orchestration (create/pause/optimize/rebudget Meta Ad campaigns, monitor performance, auto-adjust based on ROI).

## Repository map

```
src/app/(auth)/        login, registro, invitacion/[token]
src/app/(app)/         the product (guarded by requireActiveBusiness in layout.tsx)
src/app/admin/         super-admin panel
src/app/api/           chat, ai/process (worker+cron), webhooks/{meta,shopify,runable}, oauth/shopify, health
src/lib/ai/            chat orchestrator, tools, guards, rules
src/lib/channels/      meta, shopify integrations, send (outbound adapter)
src/lib/auth/          session.ts (requireRole/requireActiveBusiness), actions.ts
src/lib/{crm,inbox,billing,knowledge,integrations,admin,calendar,metrics,agents}/  queries + Server Actions
src/lib/supabase/      server (RLS client) · service (bypasses RLS, restricted) · middleware
src/components/        ui.tsx primitives, app-shell, sidebar, topbar, inbox/, agents/
supabase/migrations/   0001–0040 (all applied in prod 2026-10-01)
scripts/               verify-rls.mjs (runs supabase/tests in PGlite), ai-worker.mjs (local)
docs/                  Spanish reference docs · ai/ agent memory · plans/ forward work
```

## Commands

```bash
npm run dev            # port 3002 in this machine's .env.local
npm run verify         # tsc + eslint + unit tests + DB tests  ← run before finishing
npm test               # node:test unit tests (src/**/*.test.ts)
npm run test:db        # PGlite: migrations + supabase/tests/*.sql
npm run ai:worker      # local queue worker (Vercel cron does this in prod)
vercel --prod --yes    # deploy (project already linked: ecomos)
```

## Non-negotiable rules (full list: `ai/RULES.md`)

1. Every tenant row has `business_id`; isolation is RLS in Postgres, not app filters.
2. `createServiceClient()` bypasses RLS → only in `/api/webhooks/*`, the worker, and `channels/send.ts` after RLS already authorized. Never in a Server Component/Action that reads for the browser.
3. Server Actions call `requireRole()` / `requireActiveBusiness()` first. Hiding a button is not access control.
4. The AI never invents prices/metrics: `guards.ts` rejects unbacked claims; escalate.
5. Inbound messages persist before processing (`webhook_events`, `ingest_inbound`).
6. Shopify tokens are encrypted at rest (`crypto.ts`); `*_encrypted` columns never reach the browser.
7. Meta Ads API credentials are read-only from Supabase during worker execution; stored encrypted and rotated per business.
8. Don't edit applied migrations (0001–0040). Add a new numbered file.
9. Runable agent config is published and immutable during execution; draft config for testing only.

## Context-loading protocol (progressive, keep tokens low)

Always: this file · `ai/CURRENT-TASK.md` · `ai/PROGRESS.md`.

Then only what the task needs:

| Task touches | Read |
|---|---|
| product behavior / business rules | `docs/PRODUCT.md` |
| non-negotiable rules (tenancy, contracts, secrets, envs) | `docs/PROJECT_CONSTITUTION.md` |
| types that cross module boundaries | `docs/API_CONTRACTS.md` → import from `src/lib/contracts.ts` |
| structure, data flow, AI engine | `docs/ARCHITECTURE.md` |
| schema, RLS, migrations | `docs/DATABASE.md` |
| routes, Server Actions, webhooks | `docs/API.md`; provider rules → `docs/INTEGRATIONS.md` |
| screens, components, design tokens | `docs/UI-UX.md` |
| deploy, env vars, monitoring | `docs/DEPLOY.md` |
| Runable agent orchestration, workflow | `docs/RUNABLE.md`; plan → `plans/RUNABLE-ROADMAP.md` |
| "why is it like this?" | `ai/DECISIONS.md` |
| something failing that feels familiar | `ai/ERRORS.md` |
| per-phase build history | `docs/ROADMAP.md` (long — search, don't read whole) |

Code is the source of truth. If a doc disagrees with code, fix the doc, not the code.

## Session protocol

Start: read Level-1 files → load task-specific docs → inspect the source you will change → implement → `npm run verify`.

End: update `ai/PROGRESS.md` and `ai/CURRENT-TASK.md`; `ai/DECISIONS.md` only for a real decision; `ai/ERRORS.md` only for a reusable lesson; `plans/BACKLOG.md` if tasks changed; `docs/` only if you made them inaccurate. Never rewrite every doc per task.

Stop and explain before: schema changes, auth changes, billing changes, production config, dependency swaps, API contract changes, agent workflow changes.

## Agent Responsibilities (Autonomous Layer)

| Agent | Responsibility | Triggers | Success Criterion |
|---|---|---|---|
| **Campaign Manager** | Create/pause/resume Meta Ad campaigns based on store performance | Daily or on manual trigger | Campaign created in Meta, tracked in `ai_agents.published_config` |
| **Budget Optimizer** | Auto-adjust campaign budgets based on ROI per product | Hourly | Budget updated in Meta; cost per acquisition stays within limits |
| **Performance Monitor** | Fetch campaign metrics, detect underperformers, flag for action | Every 4 hours | Metrics stored in `agent_executions` table with status |
| **Copy Generator** | Create ad copy from product catalog + AI | Per new product or manual trigger | Copy in `ai_training_examples`, human-reviewed before publish |
| **Audience Targeting** | Segment customers by behavior, update campaign audiences | Weekly | Audiences synced to Meta via API |

## Current Agent Config (Prod)

- **Framework:** Runable AI orchestration (external)
- **Execution:** Via `/api/runable/*` webhooks + Vercel cron (`ai/process`)
- **State:** Published configs immutable during execution; draft configs for staging
- **Monitoring:** `/api/health` → agent queue depth, last execution time, error rates
- **Escalation:** Failed campaigns → notification, human review, manual override in `/ia` (not yet public)

---

## Next Steps (Pending)

1. **Agent Tuning:** Reduce false-positive budget cuts (Q4 2026)
2. **Multi-Channel Campaigns:** Extend beyond Meta to Google Ads, TikTok (Q1 2027)
3. **Predictive ROI:** Use historical data to forecast campaign performance before launch
4. **Human-in-Loop:** Approval workflows for high-cost decisions (agent suggests, human confirms)
