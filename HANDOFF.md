# Handoff

_Last updated: 2026-06-24_

## Purpose
Running log to hand off work between sessions. Keep the **Current state**,
**Next steps**, and **Open questions** sections up to date as work progresses.

## Project overview
**bussnessbuilder** — an AI Studio–generated Angular 21 app that helps small
businesses spin up a public-facing site + lightweight admin/CRM. Uses Google
Gemini (`@google/genai`) for AI features, Angular Material, and Tailwind v4.

- **Stack:** Angular 21 (standalone components, SSR via `@angular/ssr`/Express),
  Tailwind v4, Angular Material, Vitest, ESLint.
- **AI:** `@google/genai` — requires `GEMINI_API_KEY` (see `.env.example`).

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
- Branch: `claude/awesome-bell-t855cy` (clean, in sync with origin).
- Two commits on history: initial commit + Angular project scaffold.
- No open PRs or issues.
- No active task in progress yet.

## Next steps
- [ ] (fill in as work is assigned)

## Open questions
- (none yet)

## Notes / decisions
- (none yet)
