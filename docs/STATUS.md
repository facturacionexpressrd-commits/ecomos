# EcomOS: status and what's left (2026-09-27)

## Done (PR #2 merged 2026-09-27; PR #3 pending)
- Bigger product image on the product page (click opens it full-size)
- First-run setup checklist on Overview (store → sync → costs → Meta → plan)
- Meta OAuth permission fix: `ads_manage` → `ads_management` (connect was being rejected)
- "Resend confirmation email" button on the login page
- `docs/LAUNCH_SUBMISSIONS.md`: Shopify public app + Meta App Review material
- Meta campaign deletion: `POST /api/meta/campaigns/delete` + ⋯ menu item with confirm; cascades ad sets, creatives, spend rows, order attributions

## Owner to do
1. [x] Merge PR #2 (done); merge PR #3, close PR #1
2. [ ] Confirm account: Supabase → Authentication → Users → ⋯ → Confirm user
3. [ ] Vercel env vars (Production): `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`,
       `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `ALERT_WEBHOOK_URL`,
       `COMPLIANCE_CONTACT_EMAIL`
4. [ ] Supabase custom SMTP via Resend (sign-up emails only reach team members until then)
5. [ ] Submit Shopify public distribution + Meta App Review (see `LAUNCH_SUBMISSIONS.md`)

## Dev to do after that
6. [ ] Verify the production deploy; end-to-end test AI copy, email, billing
7. [ ] Test orders on the dev store to validate revenue/profit math

## Backlog
8. [x] Meta campaign deletion (shipped 2026-09-27)
9. [ ] Meta creative upload — punted; Meta Ads Manager handles creatives, wizard already directs users there. Revisit when AI creative studio is scoped.
10. [x] Sync keeps going until done: drains chain through `/api/cron/drain` (PR #3)
11. [x] `/data-deletion` page (already shipped; required for Meta App Review)

## Links
- Preview: https://ecomos-git-setup-checklist-facturacionexpressrd-7513s-projects.vercel.app
- Supabase users: https://supabase.com/dashboard/project/rutentcszxqncpsqjqsc/auth/users
- Vercel env: https://vercel.com/facturacionexpressrd-7513s-projects/ecomos/settings/environment-variables
