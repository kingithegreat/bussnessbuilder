## Operating Rules (read first)
If a Notion connector is available, open "📚 Lessons & Playbook" under "Aden Brain", follow every rule, and APPEND any new lesson you learn. Always follow these baked-in rules:
1. Verify-fix gate: done only when the symptom is proven gone (reproduce → fix → prove; honesty A/B). Label verification level. Never claim a push/merge that didn't happen — confirm pushes with `git ls-remote`.
2. No stacking on unmerged work — build off main; merge stacks bottom-first.
3. Loop-breaker: if an action fails ~2× the same way, stop and change approach or escalate.
4. No filler: if the only step is padding or needs Aden (manual merge / credential / account), say so.
5. Complex planning uses the top model (Opus/Fable).
6. Name auto-mergeable branches `claude/**` (some repos gate CI/auto-merge on that glob). Persist work durably — never leave it only in a temp dir.
7. Credentials/accounts/payments are Aden's — never enter Stripe keys, create Play/Apple accounts, rotate tokens, or handle signing keys; flag them.

---

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
3. **One fresh branch per task — never reuse a branch.** Name AI-session
   branches `claude/<task>-*` (e.g. `claude/whats-next-*`), a **new** branch for
   each task, cut from current `origin/main`. Never push straight to `main`.
   **Why fresh:** the workforce auto-merge pipeline (see bottom of this file)
   merges every push to `claude/**` into `main` and then **deletes the branch**.
   Reusing one branch across tasks fights this — it can merge a half-finished
   snapshot, delete the branch out from under you mid-session, and force
   rebase/force-push churn. A unique branch per task makes each push a complete
   unit the pipeline merges once and cleans up. Push only when the task is done
   and green (lint + test + build), so the pipeline never grabs work-in-progress.
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
- **Durable backups of Notion = [`docs/brain-snapshot.md`](docs/brain-snapshot.md)
  (the 💼 BusinessFlow brief) and [`docs/playbook-snapshot.md`](docs/playbook-snapshot.md)
  (the 📚 Lessons & Playbook rulebook)**, regenerated from Notion daily (and on
  demand) by the **Snapshot Notion brain** GitHub Action. It needs one repo
  secret, `NOTION_TOKEN` (a Notion internal-integration secret; the pages must be
  shared with that integration — sharing the parent "Aden Brain" hub covers both)
  — see `.github/workflows/snapshot-notion-brain.yml` for setup. The files are
  generated; don't hand-edit them.
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

**Web sessions auto-install deps.** A SessionStart hook
(`.claude/hooks/session-start.sh`, registered in `.claude/settings.json`) runs
`npm install` before each Claude Code on the web session starts, so lint/test/
build work immediately — no manual install. It is web-only (gated on
`CLAUDE_CODE_REMOTE`), idempotent, and synchronous (the session waits for it).
Switch it to async in the hook if you want faster startup at the cost of a
race window. `settings.json` also allowlists routine read-only `git`/`npm`
commands to cut permission prompts. **Run tests via `npm test` / `ng test`, not
bare `vitest`** — the Angular builder owns the vitest config; bare `vitest`
finds no tests.

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
| `GET /robots.txt` | None | Global robots.txt (allows public pages, blocks app/API) |
| `GET /site/:uid/sitemap.xml` | None | Per-site sitemap (home + published content pages) |
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

- Custom domains — a live **connect flow** shipped (`src/app/domain-verification.ts`
  + settings UI): validated domain input, copyable A/CNAME/TXT records, and a live
  DNS-over-HTTPS status badge. Still missing: automated Cloud Run domain *mapping*
  (owner must add the mapping in GCP manually).
- GitHub Actions WIF secrets not configured for auto-deploy — step-by-step setup in [`docs/wif-setup-runbook.md`](docs/wif-setup-runbook.md) (one-time: ~15 min of gcloud + 2 GitHub secrets)
- Stripe is in test mode — switch keys when ready for real payments
- Admin `/users` + `/metrics` per-user Firestore reads are now **batched** via `getAllDocs` (chunked parallel `getAll`, `src/server-firestore.ts`) instead of sequential `.get()` in a loop; `/metrics` still has its 30s cache. Output shape unchanged.
- Growth reports now **auto-generate weekly**: the latest report is persisted to
  `users/{uid}/businessData/growthReport` and the Growth Coach page (`admin-growth.component.ts`)
  re-generates it on open when it's ≥7 days old (policy in `src/app/growth-schedule.ts`,
  unit-tested). Manual "Generate Report" still works; auto runs are silent (no toast).
  Persistence helpers: `DataService.loadGrowthReport/setGrowthReport`,
  `FirestoreService.loadGrowthReport/saveGrowthReport`.
- Growth recommendations: `faq`, `service`, `hero`, `cta`, and `trust` drafts auto-insert into the site (hero → tagline + description, cta → ctaText button label, trust → a testimonial). `pricing` recs (free-form guidance with no structured target) get a "Review services" deep-link to `/admin/content?tab=services` instead of an insert. Admin → Content honours `?tab=` for deep-linking.
- Data export is now **GDPR-complete**: the admin "Export" button downloads a
  full bundle (`DataService.exportAll`) — business profile **plus** content pages,
  recommendations, growth report, notification prefs, payment settings, and
  templates — as `businessflow-data-export.json`. `importState` accepts both a
  bare state export and a full bundle (restores the profile portion either way),
  so Export→Import still round-trips. `exportState` is unchanged.
- **SEO discoverability**: generated sites now expose a global `GET /robots.txt`
  (crawlable public/marketing pages; `/admin`, `/app-admin`, `/api/` disallowed)
  and a per-site `GET /site/:uid/sitemap.xml` (home + every published content
  page, with `<lastmod>`). Owners submit the sitemap URL to Search Console. Pure,
  unit-tested generators live in `src/server-seo.ts` (`buildRobotsTxt`,
  `buildSiteSitemap`, `originFromRequest`); Express routes in `server.ts` are thin
  wiring. NOTE: the `/site/:uid` body itself is still client-rendered (SSR emits
  the loading shell — see `site-view.component.ts`).
- **Crawler/social meta (done)**: `/site/:uid` and `/site/:uid/pages/:slug` now
  serve link-preview bots (Googlebot, facebookexternalhit, Twitterbot, Slackbot,
  LinkedInBot, WhatsApp…) the app shell with the site's real `<title>` +
  Open Graph / Twitter Card tags injected into `<head>` (title, description from
  tagline→description→type fallback, canonical URL, `og:image` from the branding
  logo). Real browsers are unaffected — they fall through to the normal Angular
  SSR path, so hydration is untouched. Bot detection + tag building/injection are
  pure, unit-tested functions in `src/server-meta.ts` (`isCrawler`,
  `resolveSiteMeta`, `renderMetaTags`, `injectMetaTags`); the Express route in
  `server.ts` is thin wiring that reads the built shell once and caches it.
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
before it existed never got a PR. **Both old workflow files are now deleted**
(`auto-merge.yml` lingered until 2026-07-02 and double-fired on every `claude/**`
push alongside workforce-merge — don't resurrect it). The new workflow needs no
PR at all. Full notes in [`docs/workforce-runbook.md`](docs/workforce-runbook.md).

**Stale-branch hygiene (2026-07-02):** three permanently-conflicting `claude/**`
branches were pruned and PR #18 closed — `claude/lucid-gauss-mj0y7a` (the
obsolete pre-rewrite static scaffold; merging it would have deleted
`src/server.ts`), `claude/whats-next-crawler-meta-68296` (landed as PR #19), and
`claude/whats-next-session-protocol` (content already on `main`). Do **not**
recreate or restore them. The pipeline skips conflicting branches with only a
warning on a green run, so a stuck branch is easy to miss — if a `claude/**`
branch survives more than a couple of hourly sweeps, check the workforce-merge
logs for its conflict and either rebase it or delete it.
