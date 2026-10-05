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
3. The PAT push to main triggers `deploy.yml` for code changes. There is no
   extra dispatch; docs-only pushes are excluded from deployment.

### Why it needs no admin toggles

It uses the existing `WORKFORCE_MERGE_PAT` for checkout and the protected main
push. There is **no PR**, so it does not need "Allow GitHub Actions to create
and approve pull requests"; there is no native auto-merge, so it does not need
"Allow auto-merge". The schedule trigger means branches
pushed before the workflow existed (or while it was down) still get drained —
they don't have to be re-pushed.

This **replaced** the old PR-based pair (`auto-merge.yml` +
`auto-merge-on-green.yml`). That design stalled two ways: `gh pr create` returns
403 unless an admin enables the "create and approve PRs" toggle, and it only ran
`on: push`, so the backlog of already-pushed branches never got a PR and piled
up. `ci.yml` is kept for any human-opened PRs but is no longer part of the
merge path.

Production deployment is configured: successful main-push deployments and the
matching Cloud Run commit label were checked on 2026-10-05. Push only a complete,
green task to `claude/**`; it can merge and deploy without another approval.

## Optional hardening (not required for the pipeline to work)

- Main currently requires `verify`, with admin enforcement disabled. The
  existing owner PAT can push after the workflow's own lint/test/build gate.
  Do not weaken protection to repair a pipeline. A workflow success can still
  mean a skipped merge: inspect its summary and the actual main commit.
- [ ] **Automatically delete head branches** (Settings → General) — the
  workflow already deletes branches it merges, so this is optional cleanup for
  branches merged by other means.

## Production deployment configuration

Repo variable `GCP_PROJECT_ID` and secrets `WIF_PROVIDER` +
`WIF_SERVICE_ACCOUNT` are configured (see `deploy.yml`). Their values were not
read or changed for this finishing pass. Verify the deployed revision's commit
label and `/healthz/` after the deployment completes; a green merge is not
proof that the new revision is serving traffic.

## Bootstrapping note

`workforce-merge.yml`'s scheduled/dispatch runs always use the copy on the
default branch (`main`). So the change that first introduces or edits it must
reach `main` once before the new behaviour is live; after that the pipeline is
self-sustaining.
