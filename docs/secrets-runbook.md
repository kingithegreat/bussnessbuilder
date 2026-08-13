# Handling secrets without handing them to an AI

## The principle

An assistant can only act on what it can read, and anything it reads is in its
context and its transcript. So there is no "safe channel" for giving Claude a
key — a key it can see is a key that has been logged.

The workable arrangement is the opposite one: **Claude never needs the value.**
It writes and maintains the wiring; you supply the value locally; the secret
travels from your keyboard to Google without passing through a conversation.

That seam is [`scripts/set-secrets.ps1`](../scripts/set-secrets.ps1).

## What the script does

1. Enables the Secret Manager API (no-op if already on).
2. Prompts for each value with `Read-Host -AsSecureString` — hidden on screen,
   and not recorded in PowerShell history.
3. Pipes the value to `gcloud secrets versions add --data-file=-` over **stdin**,
   never as a command-line argument. Arguments are visible to other processes on
   the machine and are saved by the shell.
4. Grants the Cloud Run runtime service account `secretAccessor` on that secret.
5. Points the service at a secret *reference* with `--update-secrets`, so the
   value is not stored as a plaintext environment variable on the revision.

## Running it

```powershell
./scripts/set-secrets.ps1                      # all secrets
./scripts/set-secrets.ps1 -Only GEMINI_API_KEY # rotate just one
```

Re-run it any time to rotate: it adds a new version and Cloud Run follows
`:latest`.

## What is a secret and what isn't

Only two values here actually need protecting:

| Env var | Secret? | Why |
|---|---|---|
| `GEMINI_API_KEY` | **yes** | billable, abusable |
| `SMTP_PASS` | **yes** | a Gmail app password is full mailbox access over SMTP/IMAP, not just send |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM` | no | not sensitive; keep them as ordinary env vars |
| `ADMIN_UIDS` | no | a Firebase uid is not a credential |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | **yes** | currently plaintext env vars; worth migrating with the same script |

Set the non-secret ones the ordinary way, and note the merge flag:

```powershell
gcloud run services update businessflow --region us-central1 --project sitebuilder-b2ee6 `
  --update-env-vars "SMTP_HOST=smtp.gmail.com,SMTP_PORT=587,SMTP_USER=you@example.com,SMTP_FROM=you@example.com"
```

⚠️ `--update-env-vars` and `--update-secrets` **merge**. Their `--set-` variants
**replace the entire block** — using `--set-env-vars` here would silently delete
`ADMIN_UIDS` and every `STRIPE_*` value.

## If a secret does end up in a transcript

Treat it as public and rotate immediately — revoking is cheap, and a leaked key
does not announce itself when it is abused.

- Gemini key: <https://aistudio.google.com/apikey>
- Gmail app password: <https://myaccount.google.com/apppasswords>
- Stripe: dashboard → Developers → API keys → roll

## Status

Written without production credentials and **not yet exercised against the live
project** — read it before the first run. The steps are individually standard
`gcloud`; the risk is in the specifics of this project's IAM, not the shape.
