# BusinessFlow self-service pricing (NZD) and Stripe setup

**Status (27 Nov 2026, F13):** the app now advertises NZD-native plans. Nothing
in the code creates, edits or archives anything in Stripe, and no Stripe
products, prices or webhooks were touched by this change. You create the
Stripe prices yourself, then tell Cloud Run their IDs.

Source of the numbers: *Beta-to-Live Execution Plan* (Gate 2 and section 3) and
the *Grand Master Plan* (section 2.1).

## The price list

| Plan | Price | Booking fee | Notes |
|---|---|---|---|
| Free | NZ$0 | 0% | 3 services, 10 enquiries, template-only AI |
| **Starter** | **NZ$29 / month** | 0% | Unlimited services and enquiries, data export and import. No managed AI. |
| **Pro** | **NZ$59 / month** | 0% | Everything in Starter, plus managed AI tools and email notifications |
| **Business** | **NZ$99 / month** | 0% | Everything in Pro, plus custom domain and removable branding |
| Done-for-you setup | NZ$750 one-time | n/a | Sold directly, no in-app checkout |
| Managed care | NZ$129 / month | n/a | Sold directly, no in-app checkout |

**GST wording.** The plans don't say whether these prices include GST, so every
price in the app is labelled **"NZD, excl. GST"**. If you decide on GST-inclusive
prices, change `PRICE_GST_NOTE` in `src/app/plans.ts` (and the amounts, if
needed) and create the Stripe prices as tax-inclusive.

**Product decision to confirm:** the plans define the prices but not which
features sit in Starter. This change gives Starter the old Pro limits without
managed AI (AI stays Pro and up, because platform AI calls cost money). Change
`TIER_LIMITS` in `src/app/subscription.service.ts` and `hasManagedAi` in
`src/app/effective-tier.ts` if you want it different.

Where the amounts live (change them in one place): `src/app/plans.ts`. The
pricing page, landing line, dashboard labels, `/api/pricing` and the checkout
price check all read from it.

## What the app does

* `/pricing` and `GET /api/pricing` show the NZD amounts above. They no longer
  read amounts from Stripe and never fall back to USD.
* Checkout uses **NZD price IDs only**. If a plan's NZD ID isn't set, that plan
  can't be bought yet and checkout answers `plan_unavailable` (503). It never
  falls back to a legacy USD price.
* Before creating a Checkout session the server reads the configured Stripe
  price (read-only) and refuses unless it is **monthly, NZD, and exactly the
  advertised amount** (NZ$29 / NZ$59 / NZ$99). A wrong or archived price can't
  sell a plan at the wrong amount.
* Webhooks and subscription sync recognise the three NZD IDs **and** the legacy
  USD Pro/Business IDs, so existing USD subscribers keep their tier. An ID set
  for two plans grants nothing.

## 1. Create the NZD prices in Stripe (you do this, test mode first)

1. Stripe Dashboard, **Product catalogue**. Create (or open) products for
   **Starter**, **Pro** and **Business**.
2. On each, **Add price**: flat rate, **NZD**, **monthly** recurring, amount
   `29.00`, `59.00` and `99.00` respectively. Copy each `price_...` ID.
3. Optional, for your own records only (no app checkout uses them): a one-time
   NZ$750.00 price for done-for-you setup and a monthly NZ$129.00 price for
   managed care.
4. Keep the legacy USD Pro/Business prices **active**. Existing subscribers are
   on them. Repeat in live mode only when you are ready to go live (see
   [GO_LIVE_STRIPE.md](GO_LIVE_STRIPE.md)).

The Beta-to-Live plan lists placeholders `price_1Q...StarterNZD`,
`price_1Q...ProNZD` and `price_1Q...BusinessNZD`. Replace them with the real IDs
below; never commit real IDs or keys into the repo.

## 2. Tell Cloud Run the price IDs

Price IDs aren't secrets, so plain env vars are fine. Use `--update-env-vars`,
which **merges**. Never use `--set-env-vars`: it would wipe the Stripe keys.

```bash
gcloud run services update businessflow \
  --region us-central1 --project sitebuilder-b2ee6 \
  --update-env-vars "STRIPE_PRICE_ID_STARTER_NZD=price_XXXX,STRIPE_PRICE_ID_PRO_NZD=price_YYYY,STRIPE_PRICE_ID_BUSINESS_NZD=price_ZZZZ"
```

| Env var | Meaning |
|---|---|
| `STRIPE_PRICE_ID_STARTER_NZD` | Monthly NZ$29 price for Starter |
| `STRIPE_PRICE_ID_PRO_NZD` | Monthly NZ$59 price for Pro |
| `STRIPE_PRICE_ID_BUSINESS_NZD` | Monthly NZ$99 price for Business |
| `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUSINESS` | **Legacy USD** IDs. Keep them set so existing subscribers keep their tier. Not used for new checkouts. |

Each plan is independent: you can set just one and the others stay "opens after
the beta".

## 3. Check it (test mode)

1. `https://<app>/api/pricing` should return `"currency":"NZD"`,
   `"plans":{"starter":29,"pro":59,"business":99}`, `"bookingFeePercent":0`,
   `"gstNote":"NZD, excl. GST"`, and `checkoutAvailable` true for each plan
   whose ID you set.
2. `/pricing` shows NZ$29 / NZ$59 / NZ$99, "NZD, excl. GST", the NZ$750 and
   NZ$129/month services, and the 0% booking fee line.
3. In **test mode**, upgrade and confirm Stripe Checkout shows the same NZD
   amount. Pay with `4242 4242 4242 4242` and confirm the tier flips.

## Rolling back

Remove the NZD IDs for a plan and it stops being purchasable:

```bash
gcloud run services update businessflow --region us-central1 --project sitebuilder-b2ee6 \
  --remove-env-vars STRIPE_PRICE_ID_STARTER_NZD,STRIPE_PRICE_ID_PRO_NZD,STRIPE_PRICE_ID_BUSINESS_NZD
```

Don't remove an NZD ID while subscribers are on it: their tier is recognised by
that ID, and removing it would drop them to Free.
