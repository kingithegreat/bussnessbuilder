# Turning on text (SMS) alerts

Owners can tick **Settings → Text alerts → Text me** and add their mobile.
While SMS isn't configured on the server, that section shows **"Text alerts
need setup"**. Their number is saved, but nothing is sent. Once you add the
env vars below, opted-in owners get a text for every new enquiry and booking
request.

The code talks to a Twilio-compatible REST API (`server-sms.ts`). Nothing
happens and nothing is called until the variables are set. No Twilio account
has been created for you.

## Costs (Twilio, checked 12 Oct 2026)

From Twilio's public NZ pricing page,
<https://www.twilio.com/en-us/sms/pricing/nz> (USD, can change without
notice):

| Item | Price |
|---|---|
| Outbound SMS to NZ (international sender number) | **US$0.105 per segment** |
| Phone number to send from (international number) | from **US$1.15/month** |
| Failed-message processing fee | US$0.001 per failed message |
| Optional SMS pumping protection | US$0.025 per message |

Alerts are kept to one 160-character segment, so each alert is about **US$0.11**.
There's also a built-in cap of **20 texts per business per day**
(`SMS_DAILY_LIMIT_PER_BUSINESS`). Worst case is about US$2.10/day per
business. Typical use is a few cents a day.

> New Zealand doesn't support alphanumeric sender IDs (like "BizFlow") on
> Twilio. Use a Twilio phone number (or a Messaging Service that contains one)
> as the sender. Check the "International Numbers" list on the pricing page for
> a number that can send to NZ.

## Steps

1. **Create a Twilio account** at <https://www.twilio.com/try-twilio>. A trial
   only sends to numbers you've verified, so test with your own mobile first.
2. **Buy a number** that can send SMS to NZ: Console → *Phone Numbers →
   Buy a number* (capability: SMS). Or create a *Messaging Service* and add
   the number to it.
3. **Upgrade** the account (add a card) so it can text owners' numbers, not
   just verified ones. Set a low balance alert under *Billing*.
4. Copy the **Account SID** and **Auth Token** from the Console home page.
5. **Store the auth token as a secret** (it's a credential), then set the rest
   as plain env vars. With the repo's helper (see `docs/secrets-runbook.md`):

   ```powershell
   # Add 'TWILIO_AUTH_TOKEN' = 'twilio-auth-token' to the map in scripts/set-secrets.ps1, then:
   ./scripts/set-secrets.ps1 -Only TWILIO_AUTH_TOKEN
   ```

   Or with gcloud directly:

   ```bash
   printf '%s' 'YOUR_AUTH_TOKEN' | gcloud secrets create twilio-auth-token --data-file=- --project sitebuilder-b2ee6
   gcloud run services update businessflow --region us-central1 --project sitebuilder-b2ee6 \
     --update-secrets "TWILIO_AUTH_TOKEN=twilio-auth-token:latest" \
     --update-env-vars "TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx,TWILIO_FROM_NUMBER=+1XXXXXXXXXX"
   ```

   The Cloud Run runtime service account needs **Secret Manager Secret
   Accessor** on `twilio-auth-token` (the helper script grants it).

   Use `--update-…` (merge), **never** `--set-…`, which would wipe the Stripe
   and SMTP settings.

6. **Check it.** `GET https://<app>/api/sms/status` should return
   `{"enabled":true}`, and the "need setup" notice disappears from Settings.
   Tick *Text me* with your own mobile, then send a test enquiry from your
   public site.

## Env vars

| Name | Required | Example | Notes |
|---|---|---|---|
| `TWILIO_ACCOUNT_SID` | yes | `AC0123…` | Console home page |
| `TWILIO_AUTH_TOKEN` | yes | (secret) | Store in Secret Manager |
| `TWILIO_FROM_NUMBER` | one of these two | `+15551234567` | E.164 Twilio number |
| `TWILIO_MESSAGING_SERVICE_SID` | one of these two | `MG0123…` | Used instead of the From number if set |
| `SMS_API_BASE_URL` | no | `https://api.twilio.com` | Only for Twilio-compatible providers |
| `SMS_DAILY_LIMIT_PER_BUSINESS` | no | `20` | Cost guard per business per day (per server instance) |

## Turning it off

Remove `TWILIO_ACCOUNT_SID` (or the token secret). Alerts stop straight away,
and owners see "Text alerts need setup" again. Their opt-in is kept.

```bash
gcloud run services update businessflow --region us-central1 --project sitebuilder-b2ee6 --remove-env-vars TWILIO_ACCOUNT_SID
```
