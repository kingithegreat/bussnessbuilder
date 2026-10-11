# Turning on email alerts (SMTP)

Right now `GET /api/email-alerts/status` returns `{"enabled":false}`, so
BusinessFlow sends **no emails**. Enquiries, bookings, reviews and quotes all
still save. Owners see "Email alerts are off, enquiries still appear here" in
their inbox, and each skipped email is logged as a warning.

Once these five env vars are set on Cloud Run, the app sends:

* new-enquiry alerts to the owner
* booking request / confirmation / decline emails (with a calendar `.ics`)
* new-review-waiting alerts to the owner
* quotes and invoices to customers (PDF attached)

## The variables

| Name | Secret? | Example (Gmail) | Example (other provider) |
|---|---|---|---|
| `SMTP_HOST` | no | `smtp.gmail.com` | `smtp.sendgrid.net`, `smtp.office365.com` |
| `SMTP_PORT` | no | `587` | `587` (STARTTLS) or `465` (SSL) |
| `SMTP_USER` | no | `alerts@yourdomain.co.nz` | `apikey` (SendGrid) |
| `SMTP_PASS` | **yes** | 16-character Google *app password* | provider API key / password |
| `SMTP_FROM` | no | `BusinessFlow <alerts@yourdomain.co.nz>` | must be a verified sender |

Port `465` uses SSL from the start. Any other port uses STARTTLS (this is
handled in `server-email.ts`).

**Gmail / Google Workspace:** turn on 2-Step Verification for the sending
account, then create an app password at
<https://myaccount.google.com/apppasswords>. Use that as `SMTP_PASS`, not
the normal password. Gmail sends about 500 emails a day for free accounts and
2,000 for Workspace. For more, use a transactional provider (SendGrid,
Postmark, Mailgun, Amazon SES).

## Option A: gcloud (recommended)

`SMTP_PASS` is a credential, so keep it in Secret Manager. Set the others as
plain env vars. Always use `--update-…`, which merges. `--set-…` would wipe
every Stripe variable.

```bash
PROJECT=sitebuilder-b2ee6
REGION=us-central1
SERVICE=businessflow

# 1. Store the password as a secret (typed in, never in shell history):
read -rs SMTP_PASS_VALUE && printf '%s' "$SMTP_PASS_VALUE" | \
  gcloud secrets create smtp-pass --data-file=- --project "$PROJECT"
# (already exists? use: gcloud secrets versions add smtp-pass --data-file=- --project "$PROJECT")

# 2. Let the Cloud Run runtime service account read it:
SA=$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT" \
      --format='value(spec.template.spec.serviceAccountName)')
gcloud secrets add-iam-policy-binding smtp-pass --project "$PROJECT" \
  --member="serviceAccount:${SA}" --role=roles/secretmanager.secretAccessor

# 3. Point the service at it and set the other four:
gcloud run services update "$SERVICE" --region "$REGION" --project "$PROJECT" \
  --update-secrets "SMTP_PASS=smtp-pass:latest" \
  --update-env-vars "SMTP_HOST=smtp.gmail.com,SMTP_PORT=587,SMTP_USER=alerts@yourdomain.co.nz,SMTP_FROM=alerts@yourdomain.co.nz"
```

If `SA` comes back empty, the service uses the default compute service
account (`PROJECT_NUMBER-compute@developer.gserviceaccount.com`).

On Windows, `./scripts/set-secrets.ps1 -Only SMTP_PASS` does steps 1–3 for
the password (see `docs/secrets-runbook.md`). Then run the
`--update-env-vars` line for the other four.

`SMTP_FROM` containing a display name and `<…>` must be quoted carefully. If
in doubt, use just the address.

## Option B: Google Cloud console

1. **Secret Manager** → *Create secret* → name `smtp-pass` → paste the app
   password → *Create*.
2. **Cloud Run** → `businessflow` → **Edit & deploy new revision**.
3. **Variables & secrets** tab:
   * *Add variable*: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM`.
   * *Reference a secret*: secret `smtp-pass`, version `latest`, exposed as
     environment variable `SMTP_PASS`. Grant access if the console prompts
     you.
4. **Deploy**. Leave the existing variables alone, especially all the
   `STRIPE_*` ones.

The GitHub deploy merges env vars and secrets (`env_vars_update_strategy:
merge`), so these survive future merge-to-main deploys.

## Check it worked

1. `curl https://businessflow-722923667291.us-central1.run.app/api/email-alerts/status`
   should return `{"enabled":true}`.
2. The blue "Email alerts are off" notice disappears from the owner inbox.
3. Send a test enquiry from your own public site and check the owner's inbox
   (and spam folder).
4. If nothing arrives: Cloud Run → *Logs*, search `Email` / `SMTP`. You'll see
   "not sent: SMTP is not configured (missing …)" or the provider's error,
   e.g. a bad app password.

## Turning it off

```bash
gcloud run services update businessflow --region us-central1 --project sitebuilder-b2ee6 \
  --remove-env-vars SMTP_HOST --remove-secrets SMTP_PASS
```

Missing any one variable switches every email off safely.
