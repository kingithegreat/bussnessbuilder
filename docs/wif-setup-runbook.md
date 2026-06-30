# Auto-deploy setup runbook — Workload Identity Federation (WIF)

Goal: let the **Deploy to Cloud Run** GitHub Action (`.github/workflows/deploy.yml`)
deploy to Cloud Run on every push to `main`, using **keyless** auth (no JSON
service-account keys). Until this is done, the deploy job stays **skipped (green)**
and you ship with a manual `gcloud run deploy`.

You do this **once**. ~15 minutes. Everything in Part A runs in **Google Cloud
Shell** (or any terminal with `gcloud` + you logged in as a project Owner). Part B
is clicking in the **GitHub** UI.

---

## Values used below (confirm these first)

| Thing | Value |
|-------|-------|
| GCP project ID | `sitebuilder-b2ee6` |
| GCP project number | `722923667291` (matches the live URL) |
| Region | `us-central1` |
| Cloud Run service | `businessflow` |
| GitHub repo | `kingithegreat/bussnessbuilder` |

Confirm the project id/number before running:
```bash
gcloud projects describe sitebuilder-b2ee6 --format='value(projectId,projectNumber)'
```
If they differ, substitute your real values throughout.

---

## Part A — run in Google Cloud Shell (one block at a time)

### 1. Select project + enable the APIs the deploy needs
```bash
export PROJECT_ID=sitebuilder-b2ee6
gcloud config set project "$PROJECT_ID"

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com \
  iam.googleapis.com
```

### 2. Create the deployer service account
```bash
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions Cloud Run deployer"

export SA="github-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
```

### 3. Grant the deployer the roles it needs
```bash
for ROLE in \
  roles/run.admin \
  roles/cloudbuild.builds.editor \
  roles/artifactregistry.writer \
  roles/storage.admin \
  roles/iam.serviceAccountUser ; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA}" --role="$ROLE" --condition=None
done
```
Also let the deployer "act as" the Cloud Run **runtime** service account
(the default compute SA) so it can deploy a revision that runs as it:
```bash
export PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud iam service-accounts add-iam-policy-binding \
  "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --member="serviceAccount:${SA}" --role="roles/iam.serviceAccountUser"
```

### 4. Create the Workload Identity pool + GitHub OIDC provider
```bash
gcloud iam workload-identity-pools create github-pool \
  --location=global --display-name="GitHub Actions pool"

gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub OIDC provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner=='kingithegreat'"
```
> The `--attribute-condition` is **required** by recent `google-github-actions/auth`
> and scopes the trust to your GitHub org. Without it, setup is rejected.

### 5. Let *only this repo* impersonate the deployer SA
```bash
gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/kingithegreat/bussnessbuilder"
```

### 6. Print the two values you'll paste into GitHub
```bash
echo "WIF_SERVICE_ACCOUNT = ${SA}"
echo "WIF_PROVIDER        = $(gcloud iam workload-identity-pools providers describe github-provider \
  --location=global --workload-identity-pool=github-pool --format='value(name)')"
```
`WIF_PROVIDER` looks like:
`projects/722923667291/locations/global/workloadIdentityPools/github-pool/providers/github-provider`

---

## Part B — set the GitHub repo variables + secrets

GitHub → repo **Settings → Secrets and variables → Actions**.

**Variables** tab → *New repository variable*:
| Name | Value |
|------|-------|
| `GCP_PROJECT_ID` | `sitebuilder-b2ee6` |
| `GCP_REGION` *(optional)* | `us-central1` |
| `CLOUD_RUN_SERVICE` *(optional)* | `businessflow` |

**Secrets** tab → *New repository secret*:
| Name | Value |
|------|-------|
| `WIF_PROVIDER` | the `WIF_PROVIDER` value printed in step 6 |
| `WIF_SERVICE_ACCOUNT` | the `WIF_SERVICE_ACCOUNT` value printed in step 6 |

The deploy job's gate flips to active only when **`GCP_PROJECT_ID` + both
`WIF_*` secrets** are all present.

---

## Part C — trigger and verify

- Either push any commit to `main`, or **Actions → Deploy to Cloud Run → Run
  workflow**.
- Expected: `build-and-check` ✅, then `deploy` runs (no longer skipped) and the
  **Show service URL** step prints the Cloud Run URL.
- Confirm the live site updated:
  https://businessflow-722923667291.us-central1.run.app

---

## Notes / gotchas

- The `businessflow` service **already exists and is public**, so a redeploy keeps
  its public (unauthenticated) access — no extra flag needed. (If you ever recreate
  it from scratch, add `flags: --allow-unauthenticated` to the deploy step.)
- Deploys build from `source: .` via **Cloud Build + the repo `Dockerfile`** — that's
  why the Cloud Build + Artifact Registry APIs and roles are required.
- This is **keyless** — there is no JSON key to leak or rotate. To revoke access
  later, delete the WIF pool or the `github-deployer` service account.
- Nothing here changes app behavior; it only wires CI → Cloud Run. Merging to `main`
  will start deploying automatically once Part B is saved.
