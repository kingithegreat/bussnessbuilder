# BusinessFlow reliability fixes — 15 November 2026 NZDT

Based on current main `351613b522915be4613e96d9f3c88bf80b9fbcaa`. This is a source verification record; publication must be confirmed separately.

## Corrected behaviour

- Invalid JSON shapes no longer replace the editor. Older partial website exports receive safe nested defaults. File size, collection sizes, field types, duplicate IDs and unsupported form controls are checked before state changes.
- Signed-in website imports preserve current enquiries, activities, claimed URL and setup state. Website templates preserve those records as well, including activation and fallback after template deletion. Import is explicitly a website-settings restore, not a restoration of pages, payments or other account subdocuments in the snapshot.
- Template/import replacement is rejected while a reviewed server mutation is unconfirmed, so it cannot bypass that existing recovery gate.
- The workspace shows pending, saving, saved, failed and paused states with Save/Retry. Failed supplementary writes retain immutable snapshots and serialize before later writes; different enquiry fields keep distinct retry entries. A newer successful full snapshot supersedes a failed older one.
- Explicit settings, content-page and payment-settings saves announce success only after the write resolves. A failure points to Retry instead.
- Sign-out drains pending saves first and keeps the session open if saving fails. The browser receives a before-unload warning while changes are unsaved, where supported. Export/import controls are available on phones; import uses the existing Pro entitlement and resets the file input so the same file can be chosen again.
- Image uploads now reject and clear their busy/progress state if upload completion succeeds but obtaining the download URL fails.
- Nodemailer is updated to ^10.5.0. A forward grpc-js ^1.14.7 override avoids npm's suggested Firebase/AngularFire downgrade. SDKs remain lazily loaded on the server.

## Executed verification (A)

- Baseline: 615 tests / 83 files passed.
- Reproduction: malformed-profile import and template hiding a newly received enquiry both failed against unchanged main logic.
- Final suite: **632 tests / 85 files**, including save failure/retry, failed supplementary snapshots, independent enquiry-field retries, safe imports, template preservation, unconfirmed action gates, sign-out protection and image URL failures.
- Lint passed. Production SSR build passed with `NG_BUILD_MAX_WORKERS=2`; existing CommonJS optimisation warnings remain. An earlier concurrent unbounded build hit the host's memory limit.
- Audit before: 0 critical, 6 high, 22 moderate. Audit after: **0 critical, 0 high, 22 moderate**. Audit success is not a whole-application security audit.
- Nodemailer 10 generated a message using its real stream transport, verified envelope recipient and content; no SMTP connection, credentials or email delivery.
- No private customer, funding, identity or bank records were added to the public repository.

## Unverified or unchanged (B)

Actual signed-in Firebase browser operation, two-owner acceptance, mobile UI acceptance, live delivery/payment configuration and custom domains are not established by these tests. The app's existing rules/deployment pipeline remains authoritative. Full account disaster recovery, cross-device concurrent editing, remaining dependency advisories, CSP and distributed rate limiting still need separate acceptance. Existing workflow-demo PRs #51 and #52 were not duplicated or silently incorporated. No Notion mirror could be written without its connected capability.

Use the existing protected-main verification and deployment pipeline. Do not create a second deployment after an automatic integration. Confirm main ancestry and the `/healthz/` release identity before describing these changes as live.
