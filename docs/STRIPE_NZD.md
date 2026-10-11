# Charging BusinessFlow subscriptions in NZD

Today the Pro (US$14/mo) and Business (US$22/mo) plans are **USD** Stripe
prices, and the pricing page says so. The app can now also sell the same plans
in **NZD**, but only after you create NZD prices in Stripe and tell Cloud Run
their IDs. Until then nothing changes: the pricing page and checkout keep
using the USD prices.

Nothing in the code creates, edits or archives anything in Stripe. You do the
Stripe part yourself.

## What the app does once NZD is configured

* `GET /api/pricing` reads the two NZD prices from Stripe (read-only, cached
  for 1 hour) and the pricing page shows `NZ$<amount>` plus "Prices are in New
  Zealand dollars (NZD), including GST".
* Checkout uses the NZD price for that plan.
* Webhooks and subscription sync recognise **both** USD and NZD price IDs, so
  existing USD subscribers keep their tier and new NZD subscribers get the
  right tier.
* If Stripe can't be reached, or either price isn't actually `nzd`, the page
  quietly falls back to USD.

## 1. Create the NZD prices in Stripe (Dashboard, about 5 minutes)

Do this in **test mode** first, then repeat in live mode.

1. Stripe Dashboard → **Product catalogue** → open the existing **Pro**
   product (the one whose USD price is `STRIPE_PRICE_ID_PRO`).
2. Click **+ Add another price**.
3. Set:
   * **Pricing model:** Flat rate (Standard pricing)
   * **Amount:** your NZD price, e.g. `25.00`
   * **Currency:** `NZD`
   * **Billing period:** Monthly (recurring)
   * **Include tax in price:** **Yes / Inclusive** if you want the amount
     shown to be GST-inclusive (normal for NZ consumer pricing).
4. Save. Copy the new price ID (`price_...`).
5. Repeat for the **Business** product.

Keep the USD prices **active**. Existing subscribers are on them.

> GST: if BusinessFlow is GST-registered, turn on Stripe Tax or add a NZ GST
> tax rate so invoices show GST. If it isn't registered, untick the GST
> wording by setting `STRIPE_NZD_GST_INCLUSIVE=false` (see below).

## 2. Tell Cloud Run the price IDs

Price IDs aren't secrets, so plain env vars are fine. Use
`--update-env-vars`, which **merges**. Never use `--set-env-vars`, because it
would wipe the existing Stripe keys.

```bash
gcloud run services update businessflow \
  --region us-central1 --project sitebuilder-b2ee6 \
  --update-env-vars "STRIPE_PRICE_ID_PRO_NZD=price_XXXX,STRIPE_PRICE_ID_BUSINESS_NZD=price_YYYY"
```

Optional:

| Env var | Default | Meaning |
|---|---|---|
| `STRIPE_PRICE_ID_PRO_NZD` | unset | NZD monthly price for Pro. **Both** NZD IDs must be set or NZD stays off. |
| `STRIPE_PRICE_ID_BUSINESS_NZD` | unset | NZD monthly price for Business. |
| `STRIPE_NZD_GST_INCLUSIVE` | `true` | Set to `false` to drop "including GST" from the pricing page. |

Console alternative: Cloud Run → **businessflow** → **Edit & deploy new
revision** → **Variables & secrets** → add the variables → **Deploy**.

The deploy workflow merges env vars (`env_vars_update_strategy: merge`), so
these survive every merge-to-main deploy.

## 3. Check it

1. Open `https://<app>/api/pricing`. You should see
   `{"currency":"NZD","pro":25,"business":39,"gstInclusive":true}`.
   It's cached for up to an hour per instance, so redeploy or wait if you
   just changed it.
2. Open `/pricing`. Prices should show as `NZ$…`.
3. In **test mode**, click Upgrade and check that Stripe Checkout shows NZD.
   Pay with `4242 4242 4242 4242`, then confirm the dashboard shows the right
   plan.

## Rolling back

Remove the two variables:

```bash
gcloud run services update businessflow --region us-central1 --project sitebuilder-b2ee6 \
  --remove-env-vars STRIPE_PRICE_ID_PRO_NZD,STRIPE_PRICE_ID_BUSINESS_NZD
```

The page goes back to USD. Anyone already subscribed in NZD keeps their tier
only while their price ID is still recognised, so **don't** remove the
variables while NZD subscribers exist. Leave them set and stop *showing* NZD
instead (ask a developer to pin `/api/pricing` to USD).
