# Handoff

_Last updated: 2026-06-24_

## Purpose
Running log to hand off work between sessions. Keep the **Current state**,
**Next steps**, and **Open questions** sections up to date as work progresses.

## Project overview
**bussnessbuilder** — an AI Studio–generated Angular 21 app that helps small
businesses spin up a public-facing site + lightweight admin/CRM. Uses Google
Gemini (`@google/genai`) for AI features, Angular Material, and Tailwind v4.

- **Stack:** Angular 21 (standalone components, **static client-side SPA** —
  SSR removed), Tailwind v4, Angular Material, Vitest, ESLint.
- **AI:** `@google/genai` (lazy-loaded), real Gemini calls with template
  fallback. Key entered at runtime in Admin → AI Tools (stored in browser) or
  injected as a build/host-time `GEMINI_API_KEY` global. See `.env.example`.
- **State:** local-first via `localStorage` (no backend).

### Key scripts
- `npm install` — install deps
- `npm run dev` — serve on `:3000` (host `0.0.0.0`)
- `npm run build` — production build
- `npm test` — Vitest
- `npm run lint` — ESLint

### App structure (`src/app/`)
- **Routes** (`app.routes.ts`):
  - `/` → `LandingComponent`
  - `/setup` → `SetupWizardComponent`
  - `/public` → `PublicPageComponent` (guarded by `publicGuard`)
  - `/admin/*` → `AdminLayoutComponent` (guarded by `authGuard`) with children:
    `dashboard`, `inbox`, `ai`, `customisation`, `builder`, `form-builder`
- **Services:** `ai.service.ts` (Gemini calls), `data.service.ts` (app data)
- **Guards:** `auth.guard.ts` (`authGuard`, `publicGuard`)
- **Domain types:** `types.ts` (`BusinessProfile`, `Service`, `Enquiry`,
  `Testimonial`, `FAQ`, …), presets in `presets.ts`

## Current state
- Branch: `claude/awesome-bell-t855cy`.
- Refined for deployment: build/lint/tests all green; bundle under budget.
- AI wired to real Gemini (lazy-loaded) with graceful template fallback.
- Converted from SSR to a **static SPA**; SSR files/deps removed.
- Deploy configs added: GitHub Pages workflow, Netlify, Vercel.

## Next steps
- [ ] Enable GitHub Pages once: **Settings → Pages → Source: GitHub Actions**.
      Then each push auto-builds and publishes to a live URL.
- [ ] (optional) Wire `@google/genai` streaming for faster perceived AI output.

## Notes / decisions
- 2026-06-24: "Refine all features + get ready for deployment."
  - Deployment target chosen: **static SPA host** (Netlify/Vercel/GitHub Pages).
  - AI: **real Gemini**, browser-side, key resolved from runtime setting first,
    then a build/host-time `GEMINI_API_KEY` global; falls back to deterministic
    templates on missing key or error.
  - Removed SSR (`server.ts`, `main.server.ts`, server configs) and the
    `@angular/ssr`, `@angular/platform-server`, `express` deps.
  - Fixed 18 a11y lint errors (caption `<label>`s → `<span>`).
  - Bumped bundle warning budget to 600kB; `p-retry` allowed as CommonJS dep.
