# EcomOS — External Integration Handoff (October 15, 2026)

This checklist separates owner-controlled account setup from code verification. Do not commit credentials, tokens, webhook secrets, customer data, or live ad spend values into GitHub.

## Before enabling integrations

- [ ] Confirm the production domain and which environment (development/staging/production) is being configured.
- [ ] Keep live campaign creation, budget changes, and autonomous actions disabled until authentication, tenant isolation, webhook verification, audit logging, and human approval limits have been reviewed.
- [ ] Store secrets only in the provider's secret manager (for production, the correct Vercel project/environment); never paste secrets into chat, issues, commits, or screenshots.
- [ ] Use a development store and test ad account first. Do not authorize spend on a live account as a smoke test.

## Shopify — owner setup and smoke test

Use the required variables listed in .env.example and the canonical OAuth/webhook instructions in INTEGRATIONS.md. The older September completion docs claimed a webhook secret was configured, but that claim was not independently confirmed in the current audit.

- [ ] In Shopify Partner/admin, verify the app belongs to the intended owner and has the required API scopes for the features being tested.
- [ ] Configure the app URL and redirect/callback URLs to match the current app routes; verify these against the code and Shopify dashboard before saving. Do not guess callback paths.
- [ ] Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, and SHOPIFY_WEBHOOK_SECRET in the intended Vercel environment. Add SHOPIFY_APP_URL only if the current app code expects it.
- [ ] Redeploy after changing Vercel environment variables.
- [ ] Connect an authorized development store; confirm the OAuth callback succeeds and the store appears in the correct business account.
- [ ] Create/update a test product and order; confirm sync and webhook delivery in both Shopify's delivery log and EcomOS.
- [ ] Confirm invalid webhook signatures are rejected and valid events are idempotent before using real store data.

**Pass evidence:** redacted deployment identifier, successful test-store connection, product/order sync result, webhook delivery result, and no secret values.

## Meta Ads — owner setup and smoke test

- [ ] Confirm the Meta app, business, ad account, and test user are the intended ones; verify required app review/permissions in Meta's developer dashboard.
- [ ] Configure app ID/secret and webhook settings only in the correct Vercel environment, following current code requirements.
- [ ] Connect a test ad account and verify read-only campaign/insight sync first.
- [ ] Confirm account/store ownership mapping and audit entries before testing any write action.
- [ ] Only after explicit budget approval, test one paused/draft campaign action with a strict spend cap; confirm pause/rollback procedure.
- [ ] Obtain any required Meta App Review approval before broad customer onboarding.

**Pass evidence:** redacted app/ad-account identifiers, permissions granted, successful read-only sync, ownership/audit check, and approved write-action limits.

## Runable — do not activate autonomous writes yet

The current progress note lists the Runable API key, webhook setup, and first agent deployment as pending. .env.example documents RUNABLE_API_KEY, RUNABLE_API_URL, RUNABLE_WEBHOOK_SECRET, RUNABLE_CALLBACK_URL, and RUNABLE_ENCRYPTION_KEY; verify each is actually consumed by the current code before configuring production.

- [ ] Confirm with the account owner/provider that the Runable account, API, endpoint, callback contract, and signature scheme are real and available for this project.
- [ ] Have engineering verify the code's authentication, business/tenant scoping, replay protection, idempotency, payload validation, and failure handling before accepting callbacks.
- [ ] Configure a staging secret and webhook first; send a harmless test event and verify signature rejection/acceptance, event logging, and duplicate delivery behavior.
- [ ] Use a read-only or recommendation-only first workflow. Do not grant campaign create/budget/pause rights until a human approval queue, strict per-business spend cap, kill switch, and auditable rollback are demonstrated.
- [ ] Deploy one test agent only after those gates pass; monitor every execution manually before considering production.

**Pass evidence:** verified provider contract, negative and positive signature tests, duplicate/replay test, tenant-isolation review, approval/kill-switch demonstration, and an audited staging execution.

## Account-owner completion record

Fill only with non-sensitive information:

- Environment configured: development / staging / production
- Provider/app identifiers: redacted or non-secret IDs only
- Deployment identifier:
- Test store/ad account:
- Smoke-test date and result:
- Remaining failures / owner:
