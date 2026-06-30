# Workforce Operations Runbook

How the automated "workforce" (scheduled AI sessions that push `claude/**`
branches) gets its work landed on `main`.

## The pipeline

A single self-contained workflow does everything:
**`.github/workflows/workforce-merge.yml`**.

1. An AI session builds a feature on a `claude/**` branch and pushes it.
2. The workflow runs (on the push, and also hourly on a schedule + on manual
   dispatch). For each target branch it:
   - three-way **merges** the branch into a fresh checkout of current `main` —
     a real merge only applies the branch's own changes, so it can **never**
     revert newer work already on `main`; only a genuine conflict stops it;
   - runs the CI gate (`npm ci` + lint + test + build);
   - on green, pushes the merge to `main` and deletes the branch;
   - on conflict or red CI, leaves the branch untouched and emits a warning.
3. After anything lands, it best-effort kicks `deploy.yml`.

### Why it needs no admin toggles

It uses only `contents: write` (the default `GITHUB_TOKEN`) and an unprotected
`main`. There is **no PR**, so it does not need "Allow GitHub Actions to create
and approve pull requests"; there is no native auto-merge, so it does not need
"Allow auto-merge" or branch protection. The schedule trigger means branches
pushed before the workflow existed (or while it was down) still get drained —
they don't have to be re-pushed.

This **replaced** the old PR-based pair (`auto-merge.yml` +
`auto-merge-on-green.yml`). That design stalled two ways: `gh pr create` returns
403 unless an admin enables the "create and approve PRs" toggle, and it only ran
`on: push`, so the backlog of already-pushed branches never got a PR and piled
up. `ci.yml` is kept for any human-opened PRs but is no longer part of the
merge path.

Merging to `main` does **not** trigger a Cloud Run deploy until the deploy
inputs are configured (see `deploy.yml`), so autonomous merges are safe.

## Optional hardening (not required for the pipeline to work)

- [ ] **Branch protection on `main`** (Settings → Branches). Note: if you
  require PRs or status checks on `main`, the workflow's direct push is
  rejected and it will warn instead of merging — leave `main` unprotected, or
  switch back to a PR-based flow, if you enable this.
- [ ] **Automatically delete head branches** (Settings → General) — the
  workflow already deletes branches it merges, so this is optional cleanup for
  branches merged by other means.

## To enable production auto-deploy on merge (separate, deliberate step)

Set repo variable `GCP_PROJECT_ID` and secrets `WIF_PROVIDER` +
`WIF_SERVICE_ACCOUNT` (see `deploy.yml`). Until then, merges to `main` only
build/lint — they do not redeploy the live site.

## Bootstrapping note

`workforce-merge.yml`'s scheduled/dispatch runs always use the copy on the
default branch (`main`). So the change that first introduces or edits it must
reach `main` once before the new behaviour is live; after that the pipeline is
self-sustaining.
