# EcomOS: status and what's left (2026-09-26)

## Done (in PR #2, checks passing, not merged yet)
- Bigger product image on the product page (click opens it full-size)
- First-run setup checklist on Overview (store → sync → costs → Meta → plan)
- Meta OAuth permission fix: `ads_manage` → `ads_management` (connect was being rejected)
- "Resend confirmation email" button on the login page
- `docs/LAUNCH_SUBMISSIONS.md`: Shopify public app + Meta App Review material

## Owner to do
1. [ ] Merge PR #2, close PR #1: https://github.com/facturacionexpressrd-commits/ecomos/pull/2
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
8. [ ] Meta: campaign deletion, creative upload (budget + ad sets already exist)
9. [ ] Always-on worker (Vercel drains 5 sync jobs per call; big stores need more)

## Links
- Preview: https://ecomos-git-setup-checklist-facturacionexpressrd-7513s-projects.vercel.app
- Supabase users: https://supabase.com/dashboard/project/rutentcszxqncpsqjqsc/auth/users
- Vercel env: https://vercel.com/facturacionexpressrd-7513s-projects/ecomos/settings/environment-variables
