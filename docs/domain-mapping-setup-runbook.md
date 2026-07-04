# Custom domain mapping setup runbook

Goal: let the app automatically attach a user's verified custom domain to
this Cloud Run service, instead of Aden running `gcloud run domain-mappings
create` by hand for every user. The code for this lives in
`src/server-domain-mapping.ts` (the automation logic) and four
`/api/domain/...` endpoints in `src/server.ts`, gated to the Business tier.

You do this **once**. Everything below runs in **Google Cloud Shell** (or any
terminal with `gcloud` + you logged in as a project Owner).

---

## Why this is needed (read before running commands)

The app's existing DNS-TXT check (`src/app/domain-verification.ts`) only
proves the *user* controls their domain's DNS. Google's Domain Mappings API —
the same thing `gcloud run domain-mappings create` calls — refuses to map a
domain unless the **calling identity** is already a verified owner of that
domain in Google's own Site Verification system. That verification is scoped
per-identity, not per-project: this app's server calls the mapping API using
its own Cloud Run **runtime service account**, so that service account (not
your personal Google account) has to complete Site Verification's DNS-TXT
challenge for each domain first. The app's new `/api/domain/verification/*`
endpoints do that automatically — there's nothing to click through in Search
Console. Your one-time setup below just has to (1) let that service account
call these two Google APIs at all, and (2) enable the Site Verification API
project-wide.

---

## Values used below (confirm these first)

| Thing | Value |
|-------|-------|
| GCP project ID | `sitebuilder-b2ee6` |
| GCP project number | `722923667291` |
| Region | `us-central1` |
| Cloud Run service | `businessflow` |
| Runtime service account | `722923667291-compute@developer.gserviceaccount.com` (default compute SA) |

Confirm the project number before running:
```bash
gcloud projects describe sitebuilder-b2ee6 --format='value(projectNumber)'
```

---

## Part A — enable the Site Verification API

```bash
export PROJECT_ID=sitebuilder-b2ee6
gcloud config set project "$PROJECT_ID"
gcloud services enable siteverification.googleapis.com
```
`run.googleapis.com` is already enabled (it's what serves the live app).

> **Note:** Site Verification has no project-level IAM role to grant —
> ownership is tracked per-caller-identity by Google's Site Verification
> service itself, established automatically the first time the runtime
> service account completes the DNS-TXT challenge for a given domain (that's
> what the new `/api/domain/verification/start` + `/confirm` endpoints do).
> There's nothing else to configure here besides enabling the API.

## Part B — grant the runtime service account permission to manage domain mappings

```bash
export PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/run.developer" --condition=None
```
`roles/run.developer` is the minimal role that includes
`run.domainmappings.create/get/list/delete` without granting IAM-policy-editing
power over the project.

---

## Part C — first live test (do this yourself before real users hit it)

This automation was written and unit-tested without access to this live GCP
project, so the exact request/response wire format for the Domain Mappings
API (`src/server-domain-mapping.ts`) has **not** been exercised end-to-end.
Before announcing this feature:

1. Pick a domain you own and can edit DNS for.
2. On the Business tier, go to **Settings → Custom Domain**, enter the
   domain, and get the existing DNS-TXT check to `verified` first (unchanged
   flow).
3. Use the new **"Step 2: Connect to Google"** section: *Start Google
   verification* → add the returned TXT record at your registrar → *Confirm*
   → *Create mapping* → add the returned Cloud Run records → *Refresh status*
   until it shows **active**.
4. If any step returns an error, check the Cloud Run service logs
   (`gcloud run services logs read businessflow --region=us-central1`) for
   the `captureServerError` entry — it will include the raw Google API error,
   which is more specific than the friendly message shown in the UI.
5. If the wire format needs adjusting (e.g. a field name changed in Google's
   API), the fix is isolated to the pure builders/parsers in
   `src/server-domain-mapping.ts` — nothing else needs to change.

---

## Notes / gotchas

- Both APIs are called using Application Default Credentials — the same
  mechanism `firebase-admin` already relies on in `src/server.ts`, so there's
  no new local-dev setup beyond what Firestore access already requires
  (`gcloud auth application-default login`).
- Every failure mode (API not enabled, permission denied, domain already
  mapped elsewhere, quota exceeded, not-yet-verified) degrades to a plain-
  language message in the Settings UI — it should never show a raw error or
  crash the page. If it does, that's a bug, not expected behavior.
- Revoking access later: remove the `roles/run.developer` binding above, and/or
  disable `siteverification.googleapis.com`.
