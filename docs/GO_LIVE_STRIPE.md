# Go Live: Stripe Test → Live — BusinessFlow Studio

The single remaining launch blocker, as an exact command sequence. Budget ~45–60 min.
Everything here was audited against the actual server code on 2026-07-11: the server
reads `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, and
`STRIPE_PRICE_ID_BUSINESS` (legacy names `STRIPE_PRO_PRICE_ID` / `STRIPE_BUSINESS_PRICE_ID`
also work as fallbacks — use the primary names). The webhook route is
`POST /api/stripe/webhook` and it verifies signatures via `constructEvent`, handling
`checkout.session.completed`, `customer.subscription.updated`, and
`customer.subscription.deleted`.

> **Safe with CI:** live values you set on the Cloud Run service survive every
> auto-deploy. The deploy workflow's env-var strategy is explicitly `merge`
> (see `.github/workflows/deploy.yml`), so CI only ever adds/updates its own
> `NG_ALLOWED_HOSTS` var and never wipes yours.

---

## Step 0 — Prerequisites (one-time)

1. **Activate live payments** in the Stripe Dashboard (Settings → Business).
   Stripe NZ will ask for your business type — *individual/sole trader* works fine
   and does not require a registered company. **This is the same decision as the
   Terms-of-Service legal-entity question** — whatever you tell Stripe here, mirror
   it in the ToS entity name so they agree.
2. `gcloud auth login` and `gcloud config set project sitebuilder-b2ee6` on the
   machine you're running these commands from (Cloud Shell is fine).

## Step 1 — Create live products & prices

Stripe Dashboard → toggle **from Test to Live mode** (top-right) → Products:

1. Create **BusinessFlow Pro** with its recurring monthly price → copy the live
   price ID (`price_...`).
2. Create **BusinessFlow Business** with its recurring monthly price → copy its ID.

Live mode has none of your test products — these are fresh creations; match the
amounts to what the pricing page advertises.

## Step 2 — Create the live webhook endpoint

First get the exact service URL:

```bash
gcloud run services describe businessflow --region us-central1 --format 'value(status.url)'
```

Stripe Dashboard (still in **Live mode**) → Developers → Webhooks → Add endpoint:

- Endpoint URL: `<service-url>/api/stripe/webhook`
- Events to send (exactly these three):
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Copy the endpoint's **signing secret** (`whsec_...`).

## Step 3 — Put the live values on Cloud Run

**Option A — recommended (secrets in Secret Manager, price IDs as plain vars):**

```bash
# one-time secret creation
printf '%s' 'sk_live_XXXX' | gcloud secrets create stripe-secret-key --data-file=-
printf '%s' 'whsec_XXXX'   | gcloud secrets create stripe-webhook-secret --data-file=-

# let the Cloud Run runtime service account read them
SA=$(gcloud run services describe businessflow --region us-central1 --format 'value(spec.template.spec.serviceAccountName)')
SA=${SA:-$(gcloud iam service-accounts list --filter='displayName:Compute Engine default' --format='value(email)')}
gcloud secrets add-iam-policy-binding stripe-secret-key     --member="serviceAccount:${SA}" --role='roles/secretmanager.secretAccessor'
gcloud secrets add-iam-policy-binding stripe-webhook-secret --member="serviceAccount:${SA}" --role='roles/secretmanager.secretAccessor'

# wire them into the service + set the (non-secret) price IDs
gcloud run services update businessflow --region us-central1 \
  --update-secrets  STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest \
  --update-env-vars STRIPE_PRICE_ID_PRO=price_XXXX,STRIPE_PRICE_ID_BUSINESS=price_XXXX
```

**Option B — quick (everything as plain env vars):**

```bash
gcloud run services update businessflow --region us-central1 \
  --update-env-vars STRIPE_SECRET_KEY=sk_live_XXXX,STRIPE_WEBHOOK_SECRET=whsec_XXXX,STRIPE_PRICE_ID_PRO=price_XXXX,STRIPE_PRICE_ID_BUSINESS=price_XXXX
```

Both create a new revision immediately. Use `--update-env-vars` / `--update-secrets`
only — **never** `--set-env-vars`, which deletes every variable not in its list.

**Key rotation later:** if you ever swap keys, roll a new secret version
(`gcloud secrets versions add ...`) and redeploy a revision — no code change needed.

## Step 4 — Verify (10 min)

```bash
# service healthy on the new revision
curl -s "$(gcloud run services describe businessflow --region us-central1 --format 'value(status.url)')/healthz"

# tail logs while you test
gcloud beta run services logs tail businessflow --region us-central1
```

Then the real-money smoke test (live mode has no test cards):

1. Sign up with a fresh account → subscribe to **Pro** with a real card.
2. Watch the logs for `checkout.session.completed` arriving and the subscription
   doc being written; confirm the account's tier flips in the app.
3. Stripe Dashboard → Webhooks → your endpoint → confirm the event shows
   **Succeeded** (a 2xx from the service).
4. Open the customer portal from the app (verifies `STRIPE_SECRET_KEY` on the
   portal endpoint too), then cancel the subscription there and confirm
   `customer.subscription.deleted` downgrades the account.
5. Refund the charge in the Dashboard (Payments → refund). Note Stripe keeps the
   processing fee on refunds — the smoke test costs you a few cents, not the sub.

## Step 5 — Rollback (if anything misbehaves)

Point the service back at test keys (checkout will stop accepting real cards
immediately) and route traffic to the previous known-good revision if needed:

```bash
gcloud run services update businessflow --region us-central1 \
  --update-env-vars STRIPE_SECRET_KEY=sk_test_XXXX,STRIPE_WEBHOOK_SECRET=whsec_test_XXXX

gcloud run revisions list --service businessflow --region us-central1
gcloud run services update-traffic businessflow --region us-central1 --to-revisions REVISION_NAME=100
```

## After go-live (non-blocking)

- Enable **Stripe Radar** rules review (Dashboard → Radar) — on by default for
  standard accounts, worth a skim.
- Disable/delete the old **test-mode** webhook endpoint to stop noise.
- Tick off the corresponding items in `PRODUCTION_READINESS.md`.
