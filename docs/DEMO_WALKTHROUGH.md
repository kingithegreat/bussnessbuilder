# Demo walkthrough (invite-only beta)

Live: https://businessflow-722923667291.us-central1.run.app — not indexed (noindex meta, `X-Robots-Tag`, `robots.txt: Disallow: /`).

## Showcase sites (seeded automatically on every server start, idempotent)
| Showcase | Public site | Owner login |
|---|---|---|
| Mobile Mechanic — Bay Mobile Mechanics, Tauranga | `/s/demo-bay-mobile-mechanics` | `demo.mechanic@example.com` |
| Lawn Mowing — Tauranga Lawn Co | `/s/demo-tauranga-lawn-co` | `demo.lawn@example.com` |

The owner password is the `DEMO_OWNER_PASSWORD` GitHub Actions secret (passed to Cloud Run on deploy). It is never committed. Ask Aden or the repo admin for it. Showcase accounts can't be deleted from the app.
Re-seed after demo edits by bumping `SHOWCASE_VERSION` in `src/server-showcase.ts`. Turn showcases off with `SHOWCASE_SEED=off`.

## Click order (about 10 minutes)
1. **Landing** (`/`): the "See it working for: Mobile Mechanic / Lawn Mowing" links sit under the hero.
2. **Showcase as a customer**: open Mobile Mechanic. Scroll services and GST-inclusive prices, reviews, hours and FAQ.
   - **Request a quote**: Contact form → submit. It lands in that owner's Inbox.
   - **Book**: pick a service, a day and a time → request. While email is off the page says the business will be in touch (no email promise), and offers a calendar (.ics) file.
3. Repeat with Lawn Mowing (try the Fortnightly lawn plan).
4. **Owner view of a showcase** (optional): sign in as a demo owner → Dashboard, Inbox (sample enquiries plus anything you just sent), Quotes (2 quotes and 1 invoice, NZ GST), Bookings (3 sample bookings to accept or decline).
5. **Main app as a new business**: Sign up (any email you control) → setup wizard → publish → Dashboard (launch checklist, stats, "See it working for" links) → Services → Quotes (create a quote, download the PDF) → Bookings (switch on, set hours) → AI tools (drafts from ready-made templates, clearly labelled, until the Gemini key is on).
6. Delete the test account: Settings → Delete account.

## What is off during beta (and what users see)
- Email (SMTP not set): enquiries and bookings still save to the Inbox; customers are told the business will be in touch.
- SMS (Twilio): "Text alerts need setup".
- Paid plans (Stripe): "Paid plans open after the beta. Everything on the Free plan keeps working."
- AI (Gemini): template drafts, labelled as templates.

## Going public (launch trigger)
Delete the `<meta name="robots" ...>` line in `src/index.html`, set `SEARCH_INDEXING=on` on the Cloud Run service, attach the domain, and set the Stripe/SMTP/Twilio/Gemini keys.
