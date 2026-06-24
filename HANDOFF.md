# Handoff

_Last updated: 2026-06-24_

## Purpose
Running log to hand off work between sessions. Keep the **Current state**,
**Next steps**, and **Open questions** sections up to date as work progresses.

## Project overview
**bussnessbuilder** — an AI Studio–generated Angular 21 app that helps small
businesses spin up a public-facing site + lightweight admin/CRM. Uses Google
Gemini (`@google/genai`) for AI features, Angular Material, and Tailwind v4.

- **Stack:** Angular 21 (standalone components, **SSR** via Express, packaged for
  **Google Cloud Run**), Tailwind v4, Angular Material, Vitest, ESLint.
- **AI:** `@google/genai` (lazy-loaded), real Gemini calls with template
  fallback. Key entered at runtime in Admin → AI Tools (stored in browser) or
  injected as a build/host-time `GEMINI_API_KEY` global. See `.env.example`.
- **State:** local-first via `localStorage` (server only renders; SSR-safe via
  `isPlatformBrowser` guards in `data.service.ts`).

### Key scripts
- `npm install` — install deps
- `npm run dev` — serve on `:3000` (host `0.0.0.0`)
- `npm run build` — production SSR build (browser + server → `dist/app`)
- `npm run serve:ssr:app` — run the built SSR server (`:4000` locally)
- `npm test` — Vitest
- `npm run lint` — ESLint

### App structure (`src/app/`)
- **Routes** (`app.routes.ts`):
  - `/` → `LandingComponent`
  - `/setup` → `SetupWizardComponent`
  - `/public` → `PublicPageComponent` (guarded by `publicGuard`)
  - `/admin/*` → `AdminLayoutComponent` (guarded by `authGuard`) with children:
    `dashboard`, `inbox`, `content`, `ai`, `customisation`, `builder`,
    `form-builder`
- **Services:** `ai.service.ts` (Gemini calls), `data.service.ts` (app data)
- **Content editor:** `admin-content.component.ts` — tabbed CRUD for services,
  testimonials, and FAQs (local edit + Save, mirrors the form-builder pattern)
- **Guards:** `auth.guard.ts` (`authGuard`, `publicGuard`)
- **Domain types:** `types.ts` (`BusinessProfile`, `Service`, `Enquiry`,
  `Testimonial`, `FAQ`, …), presets in `presets.ts`

## Current state
- Branch: `claude/awesome-bell-t855cy`.
- **SSR on Cloud Run.** Express SSR server restored; `Dockerfile` (+ healthcheck)
  added; static-host configs (Pages/Netlify/Vercel) removed.
- AI wired to real Gemini (lazy-loaded) with graceful template fallback.
- Build verified: `npm run build` green; SSR server renders (`ng-server-context="ssr"`)
  and `/healthz` returns 200.
- **Content editor added** (`/admin/content`): manage services, testimonials,
  and FAQs in-app (previously only editable via JSON import). Demo data now
  includes sample testimonials so that section isn't empty.
- **Dynamic SEO** on the public page: `<title>` + description/OG/Twitter/
  theme-color meta from the profile. Note: profile lives in localStorage, so
  these populate client-side after hydration (SSR pass sees the empty default);
  true server-rendered SEO would need the profile on the server.

## Next steps
- [ ] Deploy: `gcloud run deploy businessflow --source . --region us-central1
      --allow-unauthenticated` (builds the `Dockerfile` via Cloud Build).
- [ ] (optional) Lock `NG_ALLOWED_HOSTS` to the real Cloud Run/custom domain
      instead of the `*` default baked into the image.
- [ ] (optional) Wire `@google/genai` streaming for faster perceived AI output.

## Notes / decisions
- 2026-06-24 (later): "Switch to Cloud Run SSR" (reverses the earlier SPA move).
  - Restored `src/server.ts` (Express + `/healthz`), `src/main.server.ts`,
    `app.config.server.ts`, `app.routes.server.ts` (`RenderMode.Server`).
  - Re-added `@angular/ssr`, `@angular/platform-server`, `express`,
    `@types/express`; restored `server`/`outputMode`/`ssr` in `angular.json`.
  - Added `Dockerfile` (multi-stage node:22-slim, non-root, HEALTHCHECK on
    `/healthz`), `.dockerignore`, `.gcloudignore`.
  - Removed `netlify.toml`, `vercel.json`, `public/_redirects`,
    `.github/workflows/deploy.yml`.
  - SSR host check: image sets `NG_ALLOWED_HOSTS=*` (Cloud Run is the TLS/proxy
    layer); override with exact domains to enforce in-app.
- 2026-06-24 (earlier): "Refine all features + get ready for deployment."
  - AI: **real Gemini**, browser-side, key resolved from runtime setting first,
    then a build/host-time `GEMINI_API_KEY` global; falls back to deterministic
    templates on missing key or error.
  - Fixed 18 a11y lint errors (caption `<label>`s → `<span>`).
  - Bumped bundle warning budget to 600kB; `p-retry` allowed as CommonJS dep.
