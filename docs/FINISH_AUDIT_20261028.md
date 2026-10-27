# Finishing audit — 28 October 2026 (NZDT)

## Current result

Audited fresh main `9459f2c4a40082e514fcdf2b103d2196fd701526`. The running beta is not a fully accepted production service. Earlier finishing commit `578bb1f` was only local; this branch reconciles it with current main and incorporates existing PR #45's fictional-demo disclosure. PR #47's separate tooltip work is untouched.

The reconciled features include private enquiry attachments, explicit payment-link setup, shared AI reservations/kill switches, reviewed copy/price changes with history/undo and seven-day observations, corrected regional domain mapping, release/rules verification and uptime checks. Existing beta settings, showcases, photos and demo password configuration are retained.

New defects reproduced and fixed here: custom form inputs arrived after construction but their controls were never created; every multi-select checkbox wrote the same boolean; hidden required fields blocked submission. Form controls now follow customization changes, selections are retained as separate options, conditional visibility responds to selections, and only visible fields validate/submit. Required consent checkboxes require true.

## Fresh verification

- Lint: pass.
- Angular tests: **603 passed in 82 files** (fresh baseline: 573 in 75 files).
- New form controls: old code failed all three regression cases with missing `work` control; corrected code passes all 19 public-page component cases.
- Production SSR build: pass; existing CommonJS optimization warnings remain.
- Built server: six public routes returned 200; real changes, private attachment and bookings endpoints rejected unauthenticated requests with 401.
- Live beta GET-only preflight: all checks passed, including both published showcases and booking availability. Email/SMS reported off. This checks existing production, not this branch's deployment.
- Initial HTTP probe used invented history paths and omitted the required uid; it received the Angular fallback/400. The corrected probe uses the actual route contracts above. It proves no authenticated flow.

## Release and account gates

The Workforce auto-merge job fails during checkout, before tests: run 40510249305/job 122209949238 reports `could not read Username for https://github.com`. The existing WORKFORCE_MERGE_PAT needs owner-side repair; no credential was read, changed or replaced. The Notion snapshot workflow is also failing; its cause has not been qualified in this audit, and no connected Notion capability is available.

Before claiming production complete: reconcile this branch through review/CI and the existing deployment; inspect exact release/rules receipt; exercise signed-in publish/relogin, enquiry and booking accept/decline, two-owner isolation, restore and mobile. Owner setup/acceptance remains for live Stripe/webhooks, email/SMS delivery, domain DNS/HTTPS and any paid AI. No charge, provider generation or account provisioning was performed.

The wider V2 scope in RELEASE_FINISHING.md remains explicitly separate from this release. This is tested source, not a claim that all possible future features or owner integrations are finished.

## Published beta receipt

PR #48 merged as `093704795d9022a21ebbb6e0265e3d3f5d4f7265`. Tested, remote and merged trees are exactly `e7af8f5f5579eb203945c36f752b6781bd2de5c9`. Main deployment [40557317103](https://github.com/kingithegreat/bussnessbuilder/actions/runs/40557317103) passed its fresh lint/test/SSR build and deployment jobs. Ready revision: `businessflow-00102-z28`. Direct live health returned 200 with this exact release SHA. The postdeploy GET-only preflight also passed, including both showcases and booking availability. See `docs/evidence/finish-postdeploy-preflight-20261028.json`.

The `production-readiness` Actions artifact 12758008222 verifies live release, public routes and the regional domain-mapping API. It reports Stripe configured but untested; NZD price configuration, email, SMS and Sentry need owner setup. Firestore/Storage rules inspection and domain-verification API access returned HTTP 403 to the deployment identity. Those are unverified access gates, not deployed-rule matches. These results do not accept a real payment, owner isolation, delivery or custom-domain HTTPS.

PR #45 was closed as superseded only after a merge-tree check proved all its changes are present in main; its branch is retained. The workforce credential is still broken; PR #48 was integrated through GitHub after its exact-head `verify` check passed. This documentation receipt does not change the deployed runtime or trigger another deployment.
