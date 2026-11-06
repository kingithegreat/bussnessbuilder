# Proposal handoff — BusinessFlow Studio (6 November 2026 NZDT)

One page for the **security developer** and the **finishing developer**.
Security detail: [SECURITY_REVIEW.md](SECURITY_REVIEW.md).

- Repo: `kingithegreat/bussnessbuilder` (name typo is intentional)
- Live (invite-only beta, `noindex`): https://businessflow-722923667291.us-central1.run.app
- Main before this branch: `54aeba6` (PR #47 tooltips merged on top of `495d195` / #49)
- Deployed release per `/healthz/`: `093704795d9022a21ebbb6e0265e3d3f5d4f7265` (PR #48). The deploy
  workflow needs to run again so live picks up #49, #47 and this branch.
- Evidence: [evidence/proposal-ready-preflight-20261106.json](evidence/proposal-ready-preflight-20261106.json):
  **public GET only**. It does **not** prove signed-in acceptance.

## Done (in code, tested)
- Builder, public sites (`/s/:slug`), enquiries with private attachments, bookings, quotes, AI copy with
  per-plan and platform USD budgets and kill switches, reviewed copy and price changes with undo, funnel
  metrics, admin dashboard, launch checklist, hover tooltips (#47).
- Showcases are live: `demo-bay-mobile-mechanics`, `demo-tauranga-lawn-co`.
- Email alerts, SMS and Stripe all have disabled paths. Status APIs report `configured:false` and the
  app never claims a delivery that didn't happen.
- In-app Terms and Privacy pages now show an "Invite-only beta draft, not yet solicitor-reviewed" notice.
- Lint clean, 615/615 tests pass, the production SSR build passes. `npm audit fix` (lockfile only,
  no semver-major changes) cut audit findings from 65 (4 critical/28 high) to 29 (0 critical/6 high).

## Placeholders: env vars still EMPTY on Cloud Run (owner sets them through Secret Manager, see secrets-runbook.md)
| Gate | Env vars | Runbook |
|---|---|---|
| G11 Stripe live | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUSINESS` | [GO_LIVE_STRIPE.md](GO_LIVE_STRIPE.md) |
| NZD prices | the Stripe NZD prices plus the `/api/pricing` values (currently USD 14/22) | [STRIPE_NZD.md](STRIPE_NZD.md) |
| G12 SMTP email alerts | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | [EMAIL_ALERTS_SETUP.md](EMAIL_ALERTS_SETUP.md) |
| G13 SMS (**out of the initial offer**) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`, `SMS_DAILY_LIMIT_PER_BUSINESS` | [SMS_SETUP.md](SMS_SETUP.md) |
| Monitoring | `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | [RELEASE_FINISHING.md](RELEASE_FINISHING.md) |
| Admin | `ADMIN_UIDS` (comma-separated Firebase UIDs) | SECURITY_REVIEW.md |
| Custom domain | DNS and certificate | [domain-mapping-setup-runbook.md](domain-mapping-setup-runbook.md) |
| Firebase rules | `firestore.rules` and `storage.rules`. Deploy them with `firebase deploy --only firestore:rules,storage` if the CI deploy is denied | [wif-setup-runbook.md](wif-setup-runbook.md) |

Managed funding offer: **NZ$750 setup + NZ$129/month**, separate from the self-serve Stripe tiers. SMS is not included.

## Remaining, by owner
**Aden only (manual):** G11 Stripe live keys and Dashboard products, NZD price decision, G12 SMTP
password, G14 signed-in browser acceptance with Aden's account ([DEMO_ACCEPTANCE.md](DEMO_ACCEPTANCE.md)),
custom-domain DNS, Sentry project and DSN, `ADMIN_UIDS`, solicitor review of `legal/` and the in-app
terms and privacy pages, and the decision on whether to go public (`SEARCH_INDEXING=on`). The site stays
invite-only until Aden decides.

**Security developer:** see the "Known gaps" section in SECURITY_REVIEW.md (pen test, CSP, the 6 remaining
high audit findings that need major bumps, distributed rate limiting, admin model, rules review).

**Finishing developer:** redeploy main and re-run the smoke; the firebase v12 / @angular/fire and
nodemailer major upgrades (with tests); after the keys go in, verify Stripe test mode end to end and do
one SMTP test send; NZD price wiring; and CSP rollout together with security.

## How to verify
```bash
npm ci && npm run lint && npx ng test --watch=false && npm run build
node scripts/demo-smoke.mjs https://businessflow-722923667291.us-central1.run.app   # public GET only
curl -s https://businessflow-722923667291.us-central1.run.app/healthz/              # release SHA
```
Signed-in acceptance (G14) is **not** done. It has to be performed by Aden with his own account.
