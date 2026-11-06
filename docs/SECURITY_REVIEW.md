# Security review: current posture (6 November 2026 NZDT)

This is an honest engineering self-review. It is **not** a pen test or an audit. Owner: the incoming
security developer.

## Auth model
- Firebase Auth on the client. Server routes verify the Firebase ID token (`Authorization: Bearer`) and
  derive the `uid` from the token, never from a query parameter alone. Unauthenticated owner routes are
  rejected, which is covered by the specs `server-bookings-routes`, `server-quotes-routes` and
  `server-attachments` and by live spot checks: `/api/bookings?uid=…` rejected, `/api/changes?uid=x`
  returns 401, `/api/attachments/x` returns 400.
- Admin: a token's uid must be in the `ADMIN_UIDS` env var (`src/server.ts`, around line 678). If the
  variable is empty, nobody is an admin.
- Invite-only beta: `X-Robots-Tag: noindex` stays on until `SEARCH_INDEXING=on`.

## Data rules
- `firestore.rules` (52 lines) and `storage.rules` (22 lines) are at the repo root and are deployed from
  CI (`firebase.json`). The production-readiness artifact records whether that rules deploy succeeded.

## Abuse controls
- An in-memory `RateLimitStore` limits enquiries to 5/min per uid+IP, funnel events to 60/min per IP, and
  also applies SMS daily limits. It is **per instance**, so it doesn't hold across Cloud Run instances
  (gap).
- Enquiry attachments: at most 3 files, each 1 byte to 512 KB, JPEG/PNG/WebP/PDF only. They're validated
  on both client and server (`src/app/enquiry-attachments.ts`, `src/server-attachments.ts`) and stored
  privately, readable only by the owner.
- AI: per-plan daily and monthly limits plus a shared platform USD budget with reservations.
  `AI_PLATFORM_ENABLED=false` is the kill switch (`src/server-ai-budget.ts`, docs/COST_CONTROLS.md).

## Payments
- The Stripe webhook uses `express.raw` with `stripe.webhooks.constructEvent` and the
  `stripe-signature` header plus `STRIPE_WEBHOOK_SECRET`, so unsigned events are rejected. No live keys
  are configured.

## Secrets
- Secrets live in Google Secret Manager and are mounted into Cloud Run (`scripts/set-secrets.ps1`, which
  pipes values over stdin, see docs/secrets-runbook.md). CI uses Workload Identity Federation, with no
  JSON keys (docs/wif-setup-runbook.md).
- Repo scan (6 Nov): the only env-like tracked file is `.env.example`, which holds placeholders. No
  service-account JSON, `.pem`, or key files are tracked.

## Headers and XSS
- Live headers: HSTS, `nosniff`, `Referrer-Policy`, and COOP `same-origin-allow-popups`.
- **No CSP or frame policy yet.** This is intentional for now because of the Maps embed and the builder
  preview iframe (see the comment in `src/server.ts`).
- Angular escapes interpolated content. There are only two `bypassSecurityTrustResourceUrl` uses: a
  Google Maps URL with an `encodeURIComponent` address, and the constant `/preview-frame`. No
  `innerHTML` was found in app code.

## Dependency audit (`npm audit`, 6 Nov)
- Before: 65 findings (4 critical, 28 high, 33 moderate).
- Ran `npm audit fix`, which changed only the lockfile with no semver-major bumps. Lint, all 615 tests
  and the build still pass.
- After: 29 findings (0 critical, **6 high**, 23 moderate).
- The remaining high findings need major upgrades, so they're deferred to the developer:
  - `firebase` / `@firebase/firestore(-compat)` / `@grpc/grpc-js` via `@angular/fire`. npm's suggested
    "fix" is a downgrade (`@angular/fire@7`, `firebase@9`). Don't apply it. Upgrade forward to
    `@angular/fire` and `firebase` releases that pull a patched grpc-js, then test.
  - `nodemailer` (DNS-cache TLS servername advisory) is fixed in v10, a major bump. Practical risk is low
    while SMTP is unconfigured and there is a single transport. Upgrade before enabling G12.

## Known gaps for the security developer to own
1. External pen test. Scope: auth/IDOR on all `/api/*` owner routes, admin routes, enquiry and attachment
   upload, the public site API (`/api/site/:slug`), the Stripe webhook, and Firestore/Storage rules,
   tested with the emulator.
2. Design and roll out a CSP (Maps and preview-frame allowances) and `frame-ancestors`.
3. The 6 high audit findings above. Turn on Dependabot or Renovate.
4. Distributed rate limiting, using Firestore/Redis or Cloud Armor, in place of the per-instance memory store.
5. Admin model: `ADMIN_UIDS` is an env list. Consider custom claims, an audit log, and MFA for admins.
6. Confirm the rules deploy actually succeeds in CI, and add rules unit tests in the emulator.
7. Privacy/legal: NZ Privacy Act 2020 review, and data retention and deletion for enquiries and attachments.
8. Monitoring: once a Sentry DSN is set, check that PII scrubbing is in place.
