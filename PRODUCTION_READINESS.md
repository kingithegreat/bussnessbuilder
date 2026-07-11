# Production Readiness Checklist — BusinessFlow Studio

## Infrastructure

- [x] Deployed on Google Cloud Run (us-central1)
- [x] Multi-stage Dockerfile with `USER node` for security
- [x] Healthcheck endpoint (`/healthz`)
- [x] `NG_ALLOWED_HOSTS=*` configured
- [x] `trustProxyHeaders: true` for Cloud Run reverse proxy
- [ ] Custom domain mapping (manual via `gcloud run domain-mappings create`)
- [ ] Uptime monitoring (e.g. Cloud Monitoring, UptimeRobot)

## Authentication & Authorization

- [x] Firebase Auth (Email/Password + Google sign-in)
- [x] Server-side token verification via firebase-admin
- [x] COOP header set to `same-origin-allow-popups` for popup sign-in
- [x] Admin endpoints gated by ADMIN_UIDS env var
- [x] Route guards on all admin pages (authGuard, appAdminGuard)
- [x] Account deletion endpoint deletes all user data + Firebase Auth record

## Data & Storage

- [x] Firestore for per-user data (`/users/{uid}/businessData/main`)
- [x] Firestore security rules: users read/write own data only
- [x] Subscriptions collection server-write-only
- [x] Slugs collection public-read, server-write-only
- [x] Firebase Storage for user image uploads
- [x] Transactional enquiry writes (no race conditions)

## Payments (Stripe)

- [x] Stripe SDK lazy-loaded on server (not bundled in client)
- [x] Webhook signature verification via `constructEvent`
- [x] No Stripe keys committed to repo
- [x] Price IDs read from env vars at request time (not module load)
- [x] Handles checkout.session.completed, subscription.updated, subscription.deleted
- [x] Customer portal integration for self-service billing
- [ ] Switch from test keys to live keys when ready for real payments — **exact runbook: `docs/GO_LIVE_STRIPE.md`**
- [ ] Configure Stripe webhook endpoint for production domain (covered in `docs/GO_LIVE_STRIPE.md` step 2)
- [ ] Enable Stripe Radar for fraud detection

## Rate Limiting

- [x] Enquiry submissions: 5/min per IP+site combo
- [x] AI generation: 20/min per user
- [x] Bounded rate limit store (max 10,000 entries)
- [x] Automatic cleanup of expired entries every 60 seconds

## API Security

- [x] Input sanitization on enquiry submissions (trimmed, length-capped)
- [x] Form data sanitized (max 30 fields, capped key/value lengths)
- [x] Email format validation on enquiries
- [x] Firebase token verification on all authenticated endpoints
- [x] Raw body parsing for Stripe webhooks (required for signature verification)

## Email

- [x] SMTP via Gmail App Password (Nodemailer, lazy-loaded)
- [x] Fire-and-forget notification emails (don't block enquiry response)
- [x] Email notification preferences per user (opt-in)

## AI

- [x] Server-side Gemini API (lazy-loaded @google/genai)
- [x] Graceful fallback when API key missing or generation fails
- [x] Rate-limited to prevent abuse
- [x] Client-side fallback to template-only for free tier

## CI/CD

- [x] GitHub Actions workflow with lint + build checks before deploy
- [x] Workload Identity Federation (keyless auth, no JSON key files)
- [x] Workflow gates behind GCP_PROJECT_ID variable
- [x] Configure WIF_PROVIDER and WIF_SERVICE_ACCOUNT secrets in GitHub (done 2026-07-10 — auto-deploy verified live)
- [ ] Add test step once test suite is expanded

## Legal & Compliance

- [x] Privacy Policy page with real contact email
- [x] Terms of Service page with real contact email
- [x] Cookie consent banner (accept/decline, persisted to localStorage)
- [x] Terms agreement checkbox required at signup
- [x] Account deletion available to users
- [ ] Consider GDPR data export endpoint if serving EU users
- [ ] Review with a lawyer before taking real payments

## Monitoring & Error Handling

- [x] Structured console.error/console.warn logging on all endpoints
- [x] Admin metrics dashboard with user/enquiry/revenue analytics
- [x] Metrics endpoint cached (30s TTL) to reduce Firestore reads
- [ ] Add Sentry or Cloud Error Reporting for structured alerting
- [ ] Add Cloud Run request logging to BigQuery for analytics

## Performance

- [x] Static assets served with 1-year cache headers
- [x] SSR via Angular SSR for initial page load
- [x] Lazy-loaded heavy dependencies (firebase-admin, Stripe, nodemailer, @google/genai)
- [x] External dependencies excluded from Angular build (CJS compatibility)

## Pre-Launch Manual Steps

1. Switch Stripe to live mode — follow `docs/GO_LIVE_STRIPE.md` end to end (~45–60 min)
3. Set up custom domain if desired
4. Set up uptime monitoring
5. Review legal pages with a lawyer
6. Test full signup → subscription → site publish flow end-to-end

## Audit log

- **2026-07-11** — full pre-release audit: lint clean, 213/213 tests, production build compiles (font-inlining failure in sandbox is a network restriction, CI green), `npm audit` 6 moderate (all the known firebase-admin@10 major-bump cluster, tracked), Firestore/Storage rules reviewed (owner-only data, server-only payment collections, default deny — no blockers), no secrets in repo, deploy workflow env-var merge strategy made explicit so manually-set live Stripe vars survive CI deploys.
