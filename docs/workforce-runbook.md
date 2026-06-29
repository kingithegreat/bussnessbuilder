# Workforce Operations Runbook

How the automated "workforce" (scheduled AI sessions that push `claude/**`
branches) gets its work landed on `main` — and the one-time settings only a repo
admin can flip.

## The pipeline

1. An AI session builds a feature on a `claude/**` branch and pushes it.
2. **`.github/workflows/auto-merge.yml`** (on `push` to `claude/**`) opens a PR
   into `main` and best-effort enables native auto-merge.
3. **`.github/workflows/ci.yml`** (on `pull_request`) runs lint + test + build —
   the `verify` check.
4. **`.github/workflows/auto-merge-on-green.yml`** (on CI `workflow_run`
   success) merges the PR directly once CI is green. If the branch is behind
   `main` it updates it first (CI re-runs, then it merges) so stale branches
   can't revert newer work; merged branches are deleted.

This works **without** the "Allow auto-merge" repo setting or branch
protection — the green-merger does a direct merge after independently
confirming CI passed.

Merging to `main` does **not** trigger a Cloud Run deploy until the deploy
inputs are configured (see `deploy.yml`), so autonomous merges are safe.

## One-time admin toggles (only a repo admin can do these)

A session token can't change these — they must be set in the GitHub web UI.

- [ ] **Required — let Actions open PRs.** Settings → Actions → General →
  *Workflow permissions* → enable **"Allow GitHub Actions to create and approve
  pull requests"**. Without this, `auto-merge.yml`'s `gh pr create` returns 403
  and no PR is ever opened, so nothing downstream runs.

### Optional hardening

- [ ] **Allow auto-merge** (Settings → General) — enables the native
  auto-merge path in `auto-merge.yml`. Not required; the green-merger covers it.
- [ ] **Branch protection on `main`** (Settings → Branches) requiring the
  `verify` status check — makes native auto-merge wait for green. The
  green-merger already gates on CI success, so this is belt-and-suspenders.
- [ ] **Automatically delete head branches** (Settings → General) — the
  green-merger already passes `--delete-branch`, so this is optional cleanup
  for any branches merged by other means.

## To enable production auto-deploy on merge (separate, deliberate step)

Set repo variable `GCP_PROJECT_ID` and secrets `WIF_PROVIDER` +
`WIF_SERVICE_ACCOUNT` (see `deploy.yml`). Until then, merges to `main` only
build/lint — they do not redeploy the live site.

## Bootstrapping note

`auto-merge-on-green.yml` only governs PRs once it lives on `main`
(`workflow_run` always uses the default-branch copy). The PR that first
introduces it must therefore be merged once by hand; after that the pipeline is
self-sustaining.
