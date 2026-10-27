# BusinessFlow finishing release — 18 October 2026

This is the code/release checklist for the finishing audit. It is not a claim
that every V2 product idea or account-side integration has been accepted live.

## Implemented

- Pending SMS and AI-update work is present on current main (PRs #41 and #42).
  Their releases succeeded on 18 October. The stats beacon test clears consent
  state before running; stale consent from another test no longer blocks it.
- Public enquiry forms accept JPEG, PNG, WebP and PDF attachments (512 KB per
  file, up to three). Selection, form validation and transport are connected.
  The server validates base64, byte size, MIME signature and configured file
  fields. Private documents are committed in the enquiry transaction, outside
  the public branding-image collection. Only a Firebase-authenticated owner
  can download them, with attachment/no-store/nosniff headers. Capped-out
  enquiries' files and account deletion clean up the private records.
- Payment settings use owner-created Stripe Payment Links. Removed the unused
  account-ID input and misleading Connect instruction. This does not create
  Stripe accounts, move money or pretend to implement Stripe Connect onboarding.
- Shared server AI reservations enforce a platform USD envelope in the same
  transaction as per-user usage. Default reservations: US$0.10/call, US$5/day,
  US$25/calendar month, UTC resets. Failed calls remain reserved. Environment
  and Firestore kill switches stop funded calls across routes/replicas; missing
  storage and malformed limits fail closed. See `.env.example`.
- Website requests route to a finite set of actions: About drafts, price
  previews, seasonal posts, and exact headline/button copy. Copy and price
  proposals are stored server-side and have explicit approval, bounded history,
  idempotent retries and stale-safe undo. They share the existing autosave
  coordination so a lost response cannot immediately overwrite a remote edit.
  The original AI headline-generation assistant remains available.
- The history compares real views, enquiries and booking requests in equal
  seven-day windows before/after an applied copy/price change. It excludes the
  partial change day, waits for the complete after window, handles insufficient
  retained data and labels comparisons as observational, not proof of causation.
- Fixed custom-domain mapping requests: regional `*-run.googleapis.com` host,
  `/apis/domains.cloudrun.com/v1` path, encoded resource identifiers, no invented
  `_region` JSON property, bounded network timeout. Domain endpoint tests now
  assert the documented wire contract rather than the old incorrect host.
- Deploys set a public commit SHA in `/healthz/`. A post-deploy check verifies
  the running SHA/public routes, reports configuration presence without secrets,
  and compares Firebase releases with checked-in rules. It deploys mismatched
  rules when the existing WIF identity has permission, then confirms the release.
  The receipt is saved as the `production-readiness` Actions artifact/summary.
- `Production uptime` checks health, pricing and login every 30 minutes in
  Actions. Failures are visible in Actions and use the owner's existing GitHub
  notification settings. Sentry integration already exists; its activation
  requires an account-provided DSN.

## Account and live acceptance gates

The deployment receipt reports what can be verified with the existing identity.
A missing permission is reported as `needs_account_access`, never marked done.

| Gate | Exact action/reference |
| --- | --- |
| Real platform subscriptions | Owner completes `docs/GO_LIVE_STRIPE.md`; test upgrade, webhook entitlement, portal and cancellation before charging customers. |
| NZD subscription pricing | Owner chooses amounts and creates prices via `docs/STRIPE_NZD.md`. Existing USD customers must keep recognized price IDs. |
| Email/SMS delivery | `docs/EMAIL_ALERTS_SETUP.md` and `docs/SMS_SETUP.md`; credentials and sender provisioning belong to the owner. No paid SMS/email was sent during automated tests. |
| Rules access denied | Grant the existing deploy identity Firebase Rules permissions or run `firebase deploy --only firestore:rules,storage` from the owner's authenticated setup. The release receipt distinguishes denied access from matching rules. |
| Custom domains | `docs/domain-mapping-setup-runbook.md`; enable Site Verification, confirm runtime IAM and exercise TXT verification → mapping → certificate using a domain the owner controls. No domain was supplied for acceptance. |
| Error alert destination | Configure SENTRY_DSN and verify a test exception in that Sentry account. Uptime checks work independently. |
| Signed-in/mobile visual journey | Supported cloud-browser navigation timed out during this session. Automated HTTP/component tests are not a substitute for this acceptance. |

## Remaining V2 expansion

The typed engine now supports copy and service prices; other conventional editors
remain accessible. Arbitrary new action kinds, autonomous external lead messages,
FAQ/page mutations with server-owned rollback, historical growth-report archives
and controlled A/B attribution are not implemented by this release. Seasonal
pages retain the existing explicit draft/publish editor path. Do not describe the
entire V2 brief as complete.

## Verification

Local verification: 587/587 tests across 80 spec files, lint, and production SSR build passed.
The existing CommonJS optimization warnings remain. Local built SSR returned
200 on health, home, setup, pricing, login, privacy and robots; changes,
attachments and original headline history rejected unauthenticated requests.

Committed tests cover private downloads, file boundaries, transactional AI
budgets, action HTTP prepare/approve/history/undo, conflict rejection, account
switches, uncertain retries and autosave reconciliation. Final lint/test/build
and hosted receipts must be checked on the published commit. No real charges,
provider generation, sender provisioning or credential changes form part of the
local checks.
