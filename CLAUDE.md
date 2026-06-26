# BusinessFlow Studio — Agent Handoff

## What this is

A SaaS website builder for small businesses. Users sign up, answer a setup wizard, and get a customizable public website with an enquiry inbox/CRM, AI content tools, and payment links. Built with Angular 21 SSR + Express, deployed on Google Cloud Run.

**Live URL:** https://businessflow-722923667291.us-central1.run.app

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
- `src/app/app-admin-*.component.ts` — Owner admin panel (dashboard, users, discounts)

## Known issues / TODO

- `publicGuard` on `/pages/:slug` requires login — should be truly public via API
- Custom domains — text field + DNS instructions; no automated mapping yet
- Demo button in admin header could confuse real users
- GitHub Actions WIF secrets not configured for auto-deploy
