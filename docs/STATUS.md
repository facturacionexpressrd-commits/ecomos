# EcomOS: status and what's left (2026-09-29)

## Done since 2026-09-27

- PR #1, #2, #3 all merged 2026-09-27.
- Supabase user `advariqai@gmail.com` confirmed 2026-09-27.
- 2026-09-29 ops sweep:
  - 13 covering indexes added for the FKs flagged by the performance advisor
    (migration `20260929000000_add_fk_covering_indexes`).
  - 4 test/probe orgs + 2 orphan users purged from prod. Prod DB now: 2 orgs, 2 users,
    1 store (`fe-multi-store-dev.myshopify.com` with 17 products).
  - Verified live: `/api/health` 200, all 3 GDPR compliance webhooks reject bad HMAC 401,
    all 42 tables RLS-on.
  - Verified Vercel Prod env: every required var already set except `RESEND_API_KEY` and
    `ALERT_WEBHOOK_URL`. STATUS was stale — `ANTHROPIC_API_KEY`, `EMAIL_FROM`,
    `COMPLIANCE_CONTACT_EMAIL`, `SHOPIFY_ALT_*` (trendpilotus wiring) all present.

## Owner to do (external, ~10 min of dashboard clicks + weeks of external reviews)

### Fast (~10 min total)
1. [ ] Sign up at https://resend.com → create API key → paste `RESEND_API_KEY` into Vercel
       Prod (Settings → Env Vars). Also set `EMAIL_FROM` — for now
       `onboarding@resend.dev` works without domain verification.
2. [ ] Supabase → Auth → Policies → toggle **Prevent use of leaked passwords** (30 sec).
3. [ ] Supabase → Auth → SMTP settings → point at Resend
       (host `smtp.resend.com`, port `465`, user `resend`, password = the Resend API key).
4. [ ] Shopify Partner Dashboard → Apps → EcomOS Sync → App setup → Compliance webhooks
       (paste 3 URLs at `/api/shopify/compliance/{customers-data-request,customers-redact,shop-redact}`).

### Slow (weeks; external reviews)
5. [ ] Submit Meta App Review for the `ads_management` scope. Draft material lives in
       `docs/LAUNCH_SUBMISSIONS.md`. Until approved, `MetaAccount` rows won't land in
       prod because only devs/testers on the Meta app can authorize the scope.
6. [ ] Optional: submit Shopify public distribution app for App Store listing. Not
       required if you're only onboarding specific stores privately — the alt-app
       (SHOPIFY_ALT_* env vars) already covers custom-distribution installs.

## Backlog

- [ ] Meta creative upload — punted; Ads Manager already covers this. Revisit when the AI
      creative studio is scoped.
- [ ] Billing (Stripe) — intentionally skipped 2026-09-22 for solo use. Code is fully
      wired (`src/app/api/billing/*`), needs only `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
      `STRIPE_WEBHOOK_SECRET` to flip on.
- [ ] Separate staging DB. Preview deployments share the prod Supabase project today.
- [ ] Sentry (or similar) beyond `ALERT_WEBHOOK_URL`.

## Links

- Repo: https://github.com/facturacionexpressrd-commits/ecomos
- Live: https://ecomos-omega.vercel.app
- Supabase project: https://supabase.com/dashboard/project/rutentcszxqncpsqjqsc
- Vercel project: https://vercel.com/facturacionexpressrd-7513s-projects/ecomos
