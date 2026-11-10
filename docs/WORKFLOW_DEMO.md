# Configurable job-workflow demo (`/demo/workflow`)

A public, self-contained proposal demo of BusinessFlow running a service job
from booking to completion. It opens with the **laundry pickup & return**
preset, but every business detail is configuration. Laundry is not hard-coded.

## Safety and honesty
- **Browser-local only.** State is saved in the visitor's `localStorage` (`bf.demo.workflow.v1`).
  It never writes to Firestore and never touches a real tenant. Showcase seeding is unchanged.
- **No real payments or messages.** Payment status is labelled "(demo)". No email, SMS or Stripe calls.
- **Fictional data.** Sample business names end in "(sample)". Sample customers are "Sample Customer A/B/C" at "Example Street (fictional)".
- Auth, invite-only gating, admin routes and security rules are untouched. The route is client-rendered (`RenderMode.Client`).

## What can be configured (Settings tab)
- Business profile: name, tagline, phone, service area, brand colour (validated `#rrggbb`).
- Words: what a job and a customer are called.
- Optional fields: collection/visit, return/delivery, partner/supplier, each with its own label and a partner list.
- Service catalogue with units and example prices (GST-inclusive NZD by default; GST portion shown).
- Ordered workflow stages, from 2 to 10: rename, describe, reorder, add or remove. Jobs in a removed stage move to the **nearest earlier stage that still exists** (falling back to the first stage), and that move is logged.
- **Changing settings mid-job is safe:** each booked line keeps the service name, unit and price it was booked at. Re-pricing, renaming or removing a service only affects new jobs; in-progress and paid jobs keep their totals.
- Payment status (Not invoiced / Invoice sent / Marked paid) is **separate** from the fulfilment stage.
- Presets: Laundry pickup & return, Collect-repair-return, and On-site service (no pickup).

Supported scope: businesses that take a job in, move it through ordered stages, optionally
collect and return items or use a partner, and then get paid. It is not a universal business system.

## Proposal click-through (about 3 minutes)
1. Open `/demo/workflow`. A demo banner is shown, along with the FreshRun Laundry (sample) branding and five stages with three sample orders.
2. **New order**: enter a name and address, choose a pickup time and the cleaning partner, then set the quantity for Wash, dry & fold. The total updates. Select **Create**.
3. On the board, open the order and select **Move to …** until it reaches Returned. History records each step.
4. Set Payment to **Marked paid (demo)**.
5. Reload the page. Everything persists in this browser.
6. In **Settings**, choose the **On-site service** preset or rename the business and stages, then save. The whole UI re-labels.
7. Use **Reset whole demo** to return to the laundry preset.

## Acceptance evidence
- `src/app/service-workflow.spec.ts`: presets valid; laundry end-to-end (booked → returned, totals, GST, payment separate); config changes remap stages and services; invalid config and untrusted storage rejected or normalised; sample data fictional.
- `src/app/workflow-demo.component.spec.ts`: banner, branding and board render; create, advance, persist and reload; validation; re-brand to a different business.
- Mid-journey settings pass (11 Nov 2026, headless Chromium, phone 390×844 + desktop 1440×900): book → pickup → change name/colour/labels/prices/services/stages → cleaning → drying → ready → (remove current stage) → returned → paid → re-price → reload. Covered by the spec tests `mid-journey price changes…`, `…nearest earlier stage…`, `reordering and adding stages…`, `removing a service…`.
- Still pending: keyboard and screen-reader pass; Aden's review.
