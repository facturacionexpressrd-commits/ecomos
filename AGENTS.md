<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# EcomOS — agent entry point

Multi-tenant e-commerce SaaS for Dominican businesses: Shopify product/order sync, Meta Ads campaign management, supplier (CJ) fulfillment, financial metrics, approvals, and an AI operator agent. Built for SMBs that need campaign and catalog work done without a developer.

Code comments and UI copy are in **Spanish**. Keep it that way. This `ai/` layer is in English.

## Stack (VERIFIED against package.json + code, 2026-10-16)

Next.js 16.3 (App Router, `src/proxy.ts` — not `middleware.ts`) · React 19.2 · TypeScript strict · Tailwind v4 · **Prisma 7** over PostgreSQL (Supabase-hosted, `@prisma/adapter-pg`) · Supabase Auth (`@supabase/ssr`) · **Anthropic Claude** for every AI feature · Stripe billing · Shopify OAuth · Meta Graph API · pg-boss job queues · Vercel · npm · **vitest** for unit tests.

There is no OpenAI dependency, no pgvector, and no embeddings layer.

## Tenancy — read this before any query

**Isolation is application-level, not RLS.** Every tenant row carries `storeId`. Prisma connects as the Postgres **owner role, which bypasses RLS**, so a query without a `storeId` filter returns every tenant's rows.

RLS *is* enabled on tenant tables (`prisma/migrations/20260919003500_enable_rls`, `20260919_enable_rls_finance_meta`) but **with no policies at all**, and deliberately so: Supabase auto-exposes every public table over its REST API gated only by RLS, and enabling it with no policies closes that anon-key path. It does nothing for the app's own queries. Read the comment at the top of that migration before you touch it.

So: filter by `storeId` yourself, and authorize before you query.

## Authorization

`src/lib/auth/capabilities.ts` is the only enforcement point:

- `CAPABILITIES` — the capability strings (`store:read`, `orders:read`, `campaigns:manage`, `products:manage`, `ai:generate`, `approvals:decide`, `org:manage_users`, `store:sync`, `store:connect`).
- `loadStoreAccessGrants(userId)` — the user's `UserStoreAccess` rows joined to `Role.capabilities`.
- `hasCapability(grants, storeId, capability)` / `hasOrgCapability` — pure decision functions, unit-tested in `tests/rbac.test.ts`.
- `requireCapability` / `requireOrgCapability` — throw `ForbiddenError`.
- `requireStoreAccess(capability, requestedStoreId?)` — authenticates the Supabase session, loads grants and resolves the store in one call, for route handlers acting on a single store. `resolveStoreId` is its pure core (`tests/store-access.test.ts`): an explicit store must itself carry the capability, and with no store given exactly one eligible store is required — zero throws `ForbiddenError`, several throw `AmbiguousStoreError` rather than guessing.

Route handlers either call `requireStoreAccess`, or do it inline: `createClient()` → `auth.getUser()` → `loadStoreAccessGrants` → `hasCapability`. **Never trust a `storeId` from the browser without checking it against the caller's grants.** Hiding a button is not access control.

## Repository map

```
src/app/dashboard/       the product: agents, approvals, campaigns, custom, customers,
                         exceptions, integrations, meta, orders, products, research,
                         stores, team
src/app/api/             agents/{chat,runable}, ai/{creative,product-copy}, approvals,
                         billing, campaigns, cron/{daily,drain,agents}, exceptions,
                         health, invitations, meta/*, onboarding, products, research,
                         runable/webhook, shopify/*, suppliers/cj/*, variants, webhooks,
                         workspace
src/app/{login,onboarding,billing,invite,pricing,privacy,terms,data-deletion}/
src/lib/agents/          EcomOS Operator: permissions registry, read-only tools, Claude loop
src/lib/ai/              Claude providers (claude.ts, claude-creative.ts), guards (verify.ts)
src/lib/auth/            capabilities.ts — capability checks, store resolution
src/lib/{finance,meta,research,shopify,suppliers,approval,notifications,email,jobs}/
src/lib/supabase/        server.ts (session) · client.ts (browser) · admin.ts (service role)
src/lib/{db,limits,crypto,money,billing,alerts,onboarding,setup,scenery}.ts
src/components/dashboard/  ui/ primitives (PageHeader, StatTile, Sparkline), nav.ts
src/components/{agents,approval,campaigns,creative,meta,orders,products,research,team,legal}/
src/worker/index.ts     pg-boss worker: sync-store and process-webhook queues
prisma/schema.prisma    the schema
prisma/migrations/      16 applied migrations
tests/                  vitest unit tests (tests/*.test.ts)
scripts/                db-check.mjs, Shopify webhook-secret setup
docs/                   STATUS.md, CAMPAIGNS_UI.md, E2E_TESTING.md, META_SYNC_SETUP.md,
                        LAUNCH_SUBMISSIONS.md
```

Most reference docs live as **root-level `*.md` files**, not under `docs/`: `ARCHITECTURE.md`, `DATABASE.md`, `DEVELOPMENT.md`, `INTEGRATIONS.md`, `RUNABLE_AI_INTEGRATION.md`, `META_WRITE_ACTIONS.md`, `ONBOARDING_GUIDE.md`, `README.md`.

## Commands

```bash
npm run dev            # next dev
npm run typecheck      # tsc --noEmit
npm run lint           # eslint --max-warnings 0  ← a single warning fails CI
npm test               # vitest run
npm run worker         # local pg-boss worker
npm run db:migrate     # prisma migrate dev
npm run db:seed        # prisma/seed.ts
npm run db:check       # scripts/db-check.mjs
```

### Before finishing — run what CI runs, in this order

```bash
npx prisma generate    # needs DATABASE_URL set to anything parseable; there is no .env here
npx next typegen       # writes LayoutProps/PageProps into .next/types
npm run typecheck
npm run lint
npm test
```

Both generate steps matter. Skip `prisma generate` and every `prisma.*` access is untyped, so the typecheck passes vacuously. Skip `next typegen` and the typecheck fails on `LayoutProps` in `src/app/layout.tsx`, which exists only once those types are built. CI (`.github/workflows`) does exactly this on Node 24 after `npm ci`. If the typecheck reports a pile of missing `@supabase/*` or `lucide-react` types, the install is incomplete — run `npm ci`.

## Non-negotiable rules

1. Every tenant row has `storeId`, and isolation is **your query filter plus a capability check** — not RLS. See "Tenancy" above.
2. `createAdminClient()` (`src/lib/supabase/admin.ts`) uses the service-role key. It is for privileged server-only work such as creating an auth user during invitation acceptance. Never import it from client code, and never use it to read data on the browser's behalf.
3. Route handlers and Server Actions authorize before they query (`requireStoreAccess` or the inline pattern).
4. The AI never invents prices or metrics: `src/lib/ai/verify.ts` withholds unbacked claims, and `src/lib/agents/` tools label estimates, partial windows and missing fields. Keep it that way.
5. Shopify and Meta tokens are encrypted at rest (`src/lib/crypto.ts`). `*_encrypted` columns never reach the browser — do not even `select` one when a `count` predicate answers the question.
6. Don't edit an applied migration. Add a new one.
7. Keep AI calls server-side. `ANTHROPIC_API_KEY` must never appear in browser code.
8. Webhooks persist before processing (`WebhookEvent`, unique on `shopifyWebhookId`, which makes double delivery a no-op).

## Context-loading protocol (progressive, keep tokens low)

Always: this file · `ai/CURRENT-TASK.md` · `ai/PROGRESS.md`.

Then only what the task needs:

| Task touches | Read |
|---|---|
| structure, data flow | `ARCHITECTURE.md` |
| schema, RLS, migrations | `DATABASE.md` + `prisma/schema.prisma` (the schema is the truth) |
| local setup, env vars | `DEVELOPMENT.md` |
| Shopify / Meta / CJ provider rules | `INTEGRATIONS.md`, `META_WRITE_ACTIONS.md` |
| Meta campaign UI | `docs/CAMPAIGNS_UI.md`, `docs/META_SYNC_SETUP.md` |
| the Operator agent, its tools or permissions | `src/lib/agents/` (code first — it is small) |
| Runable orchestration | `RUNABLE_AI_INTEGRATION.md` + `src/lib/runable/` |
| where the product stands | `docs/STATUS.md` |
| end-to-end test plan | `docs/E2E_TESTING.md` |
| onboarding / store connection | `ONBOARDING_GUIDE.md` |

There is no `docs/PRODUCT.md`, `docs/PROJECT_CONSTITUTION.md`, `docs/API.md`, `docs/UI-UX.md`, `docs/DEPLOY.md`, `docs/ROADMAP.md`, `src/lib/contracts.ts`, `ai/RULES.md`, `ai/DECISIONS.md`, `ai/ERRORS.md`, or `plans/` directory. Don't send the next agent after them.

Code is the source of truth. If a doc disagrees with code, fix the doc.

## Session protocol

Start: read the three Level-1 files → load task-specific docs → inspect the source you will change → implement → run the CI sequence above.

End: update `ai/PROGRESS.md` and `ai/CURRENT-TASK.md`. Touch other docs only if your change made them inaccurate. Never rewrite every doc per task.

Stop and explain before: schema changes, auth changes, billing changes, production config, dependency swaps, or changing what an agent is allowed to do.

## Agent layer — what is actually wired

Two separate things live under "agents". Don't conflate them.

### EcomOS Operator (working)

`/dashboard/agents` → `POST /api/agents/chat` → `src/lib/agents/`. A Claude tool-use loop that runs **in this app**, on the provider in `src/lib/ai/providers/claude.ts`.

- `permissions.ts` — skill registry with a `PermissionLevel` union (`auto | confirm | approval | human | never`). A skill with no real backing is `available: false` and the UI labels it unavailable instead of simulating it.
- `tools.ts` — seven **read-only** tools: saved research opportunities (scored by the existing `OpportunityScorer`), store summary, catalog, orders, fulfillment exceptions, Meta campaigns, integration status. Every query filters by the server-verified `storeId`; no tool schema accepts a `storeId`; no customer PII, tokens or `raw` blobs leave the server.
- `loop.ts` — bounded: 5 rounds, 8 tool calls, 1600 output tokens, 6000 chars per tool result. Tools resolve from the caller's allowed list, so a tool the user lacks the capability for is refused without touching the database.
- Quota: `agentChatQuotaExceeded` in `src/lib/limits.ts`, counted from `AuditLog` rows with action `agent.chat` (10/min, 200/day per store).

It has **no write tools**. Adding one means a capability check, an explicit user confirmation, and the existing approvals flow — not a new tool on its own.

### Runable (external, largely unfinished — do not describe it as live)

`src/lib/runable/`, `/api/agents/runable`, `/api/runable/webhook`. A shell around the third-party `api.runable.ai` with a per-store encrypted vendor key.

Verified state, not aspiration:

- Three agent types exist (`campaign_manager`, `product_copy`, `performance_optimizer`). **Only `campaign_manager` has a workflow**; the other two return `"not yet implemented"` from `// TODO` branches in `src/lib/runable/executor.ts`.
- `/api/cron/agents` exists as a route but is **not scheduled** — `vercel.json` registers one cron, `/api/cron/daily` at 06:00.
- No `RUNABLE_API_KEY` is configured, so nothing executes.
- `src/components/agents/agents-dashboard.tsx` is **not mounted on any page**.
- `/api/health` is a database ping returning `{ ok: true }`. It reports no queue depth, execution times or error rates.

The nightly job that *does* run is `/api/cron/daily` → `runDaily()` in `src/lib/jobs/daily.ts`: Shopify webhook registration, store sync enqueue, webhook drain, CJ order and link sync, Meta account sync, and approval recommendations.
