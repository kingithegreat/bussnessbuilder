# BusinessFlow Studio — Agent Handoff

## What this is

A SaaS website builder for small businesses. Users sign up, answer a setup wizard, and get a customizable public website with an enquiry inbox/CRM, AI content tools, and payment links. Built with Angular 21 SSR + Express, deployed on Google Cloud Run.

**Live URL:** https://businessflow-722923667291.us-central1.run.app

## Before you start (read this FIRST)

Multiple agents work this repo in parallel, and the app is **already built and
deployed** (Live URL above). Most wasted/conflicting work comes from acting on a
stale snapshot. Before making any change:

1. **Sync to reality.** `git fetch origin && git log --oneline origin/main -5`.
   Branch from **current `origin/main`** — do not trust whatever commit was
   cloned/checked out.
2. **Read the source of truth.** This `CLAUDE.md`, then the Notion brief
   (Projects → 💼 BusinessFlow). Confirm your task isn't **already done** before
   redoing it — check the Live URL and `git log origin/main`.
3. **Use the branch convention.** Name AI-session branches `claude/whats-next-*`,
   one task per branch. Open a PR; never push straight to `main`.
4. **Before merging ANY branch, check it isn't stale:**
   `git log --oneline <branch>..origin/main`. If `main` has commits the branch
   lacks, merging it may **revert recent work** (e.g. a branch that predates a
   feature will delete it). Reconcile/rebase first.
5. **Leave the trail current.** Update this file and the Notion brief so the next
   session inherits accurate state.

## The brain: one source of truth + backups

So context/tasks never need re-explaining and every AI stays current:

- **Canonical brain = this repo.** `CLAUDE.md` is the durable source of truth.
  Every change is a git commit, so the full history is an automatic, revertable
  **backup** — if the brain is ever wrong, `git log -p CLAUDE.md` and revert.
- **All AIs read the same brain.** `AGENTS.md` (Codex & other agents) and
  `.github/copilot-instructions.md` (Copilot) just point here — one source, not
  three drifting copies. Update *this* file; the others never need editing.
- **Human / cross-tool mirror = Notion** (Projects → 💼 BusinessFlow). Mirrors
  the key facts for quick reading + the decisions log. Notion keeps its own page
  version history as a **second backup**.
- **Durable backup of Notion = [`docs/brain-snapshot.md`](docs/brain-snapshot.md)**,
  regenerated from the Notion brief daily (and on demand) by the **Snapshot Notion
  brain** GitHub Action. It needs one repo secret, `NOTION_TOKEN` (a Notion
  internal-integration secret; the brain page must be shared with that
  integration) — see `.github/workflows/snapshot-notion-brain.yml` for setup. The
  file is generated; don't hand-edit it.
- **End every session by syncing the brain:** update this file *and* the Notion
  brief with what changed, what's deployed, and what's next. Stale brain =
  repeated work.
- **Recovery:** the same critical facts live in both git and Notion, so a bad
  edit in one is restorable from the other (git history / Notion page history).

## Critical design rule

ALL site customization features (branding, page builder, form builder, sections, layouts, colors, fonts) are available on ALL tiers. Only AI tools, enquiry/service limits, and admin extras are tier-gated.

## Tech stack

- **Angular 21** (standalone components, signals, `@`-syntax control flow)
- **Express** SSR server (`src/server.ts`)
- **Tailwind CSS v4** + **Angular Material 21**
- **Firebase Auth** (Email/Password + Google sign-in)
- **Firestore** for per-user data at `/users/{uid}/businessData/main` (plus sub-docs for pages, notifications, payments, templates)
- **Firebase Storage** for user image uploads
- **Google Gemini AI** (`@google/genai` — lazy-loaded, template fallback)
- **Stripe** subscriptions (lazy-loaded on server)

## Build & run

```bash
npm install          # uses .npmrc legacy-peer-deps because @angular/fire@20 vs Angular 21
npm run dev          # dev server on port 3000
npm run build        # production SSR build
npm run lint         # ESLint
npm test -- --watch=false  # Vitest
```

## Deploy

```bash
gcloud run deploy businessflow --source . --region us-central1 --set-env-vars="NG_ALLOWED_HOSTS=*"
```

GitHub Actions (`deploy.yml`) exists but needs WIF secrets configured. Manual `gcloud run deploy` is the current method.

## Key architecture notes

- **firebase-admin MUST be lazy-loaded** in `server.ts` via `await import(...)` because it uses CommonJS/`__dirname` which breaks Angular's ESM build
- **Stripe SDK also lazy-loaded** for the same reason
- **nodemailer also lazy-loaded** for the same reason
- **@google/genai lazy-loaded** on server for AI endpoint
- **Firestore DocumentData** requires bracket notation (`data['field']`) not dot notation
- **COOP header** must be `same-origin-allow-popups` for Firebase Auth popup sign-in
- **`AngularNodeAppEngine`** requires `trustProxyHeaders: true` for Cloud Run reverse proxy
- **DataService** has a 1.5s debounced save effect to Firestore; `initialized` flag prevents reload
- **Signal-based change detection**: computed signals compare by reference

## Pricing tiers

- **Free**: Template-only AI, 3 services, 10 enquiries
- **Pro ($14/mo)**: Real AI, unlimited services/enquiries, export/import
- **Business ($22/mo)**: Priority AI, custom domain, analytics, remove branding

## Env vars (Cloud Run)

- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_PRICE_ID_PRO` or `STRIPE_PRO_PRICE_ID` — Pro price ID (server reads both)
- `STRIPE_PRICE_ID_BUSINESS` or `STRIPE_BUSINESS_PRICE_ID` — Business price ID (server reads both)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `GEMINI_API_KEY` — Server-side Gemini API key for AI endpoint
- `ADMIN_UIDS` — Comma-separated Firebase UIDs that can access `/app-admin`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — Email notifications
- `ENQUIRY_WEBHOOK_URL` — Optional. If set, new enquiries are fire-and-forget POSTed here (event `enquiry.created`) for owners opted in to new-enquiry notifications. See `src/server-webhook.ts`.
- `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` — Optional. Server-side error monitoring (no-op unless `SENTRY_DSN` set). See `src/server-monitoring.ts`. Browser DSN is the `sentryDsn` field in `src/environments/environment*.ts`.
- `NG_ALLOWED_HOSTS` — Angular SSR host check (set to `*` for Cloud Run)

## Server API endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /healthz` | None | Liveness probe |
| `GET /api/site/:uid` | None | Public site data (accepts UID or slug) |
| `GET /api/site/:uid/pages/:slug` | None | Public content page by slug |
| `POST /api/site/:uid/enquiry` | None (rate-limited) | Public enquiry submission |
| `POST /api/slugs/claim` | Firebase token | Claim a URL slug for a site |
| `GET /api/admin/verify` | Firebase token + ADMIN_UIDS | Verify admin access |
| `GET /api/admin/users` | Admin only | List all users with metrics |
| `GET /api/admin/metrics` | Admin only | Aggregate platform metrics |
| `GET /api/admin/discounts` | Admin only | List discount codes |
| `POST /api/admin/discounts` | Admin only | Create a discount code |
| `DELETE /api/admin/discounts/:code` | Admin only | Delete a discount code |
| `POST /api/ai/generate` | Firebase token | Server-side AI text generation |
| `POST /api/ai/growth-report` | Firebase token | AI growth report with metrics + recommendations |
| `POST /api/ai/draft-recommendation` | Firebase token | Draft improvement for a growth recommendation |
| `DELETE /api/account/:uid` | Firebase token (own UID) | Delete account and all data |
| `POST /api/stripe/create-checkout-session` | Firebase token | Create Stripe checkout |
| `POST /api/stripe/customer-portal` | Firebase token | Open Stripe billing portal |
| `POST /api/stripe/webhook` | Stripe signature | Handle Stripe events |

## File structure (key files)

- `src/server.ts` — Express server, all API endpoints
- `src/app/data.service.ts` — Central state management (signals)
- `src/app/subscription.service.ts` — Tier management, Stripe integration
- `src/app/auth.service.ts` — Firebase Auth wrapper
- `src/app/auth.guard.ts` — Route guards (authGuard, setupGuard, publicGuard)
- `src/app/public-page.component.ts` — The generated public website (huge template)
- `src/app/site-view.component.ts` — Public site viewer at `/site/:uid`
- `src/app/admin-layout.component.ts` — Admin shell with sidebar
- `src/app/setup.component.ts` — Setup wizard
- `src/app/types.ts` — All TypeScript interfaces
- `src/app/admin-growth.component.ts` — AI Growth Coach page with recommendation actions
- `src/app/firestore.service.ts` — Firestore persistence (pages, recommendations, notifications, payments, templates)
- `src/app/app-admin-*.component.ts` — Owner admin panel (dashboard, users, discounts)

## Known issues / TODO

- Custom domains — text field + DNS instructions; no automated mapping yet
- GitHub Actions WIF secrets not configured for auto-deploy
- Stripe is in test mode — switch keys when ready for real payments
- Admin metrics endpoint does O(N) Firestore reads (mitigated by 30s cache)
- Growth reports are on-demand only — weekly auto-generation is planned
- Growth recommendations: `faq`, `service`, `hero`, `cta`, and `trust` drafts auto-insert into the site (hero → tagline + description, cta → ctaText button label, trust → a testimonial). `pricing` recs (free-form guidance with no structured target) get a "Review services" deep-link to `/admin/content?tab=services` instead of an insert. Admin → Content honours `?tab=` for deep-linking.
- Page builder section insertion deferred to v1.3
- Deploy `firestore.rules` to enable analytics tracking: `firebase deploy --only firestore:rules`

## Workforce auto-merge pipeline

Scheduled AI sessions push `claude/**` branches; **`.github/workflows/workforce-merge.yml`**
lands them on `main` autonomously so work doesn't pile up. It is fully
self-contained and needs **zero admin toggles** — only `contents: write` (the
default `GITHUB_TOKEN`) and an unprotected `main`. Per branch it three-way
*merges* the branch into current `main` (a real merge can't revert newer work —
only a genuine conflict stops it), runs the CI gate (lint + test + build), and
on green pushes to `main` and deletes the branch; conflicts/red CI are left
alone with a warning. It triggers on push to `claude/**` (fast path) **and on an
hourly schedule + manual dispatch**, so any backlog of already-pushed branches
gets drained. Merging to `main` does NOT deploy (deploy is gated on GCP/WIF
config), so it's safe; after a merge it best-effort kicks `deploy.yml`.

This replaced the old PR-based pair (`auto-merge.yml` + `auto-merge-on-green.yml`),
which stalled because `gh pr create` 403s without the "Allow Actions to create
and approve PRs" admin toggle and it only ran `on: push`, so branches pushed
before it existed never got a PR. The new workflow needs no PR at all. Full
notes in [`docs/workforce-runbook.md`](docs/workforce-runbook.md).
