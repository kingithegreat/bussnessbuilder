# BusinessFlow demo acceptance

## Scope and truthful introduction

“This is a working website and booking-request product. I am testing a managed
service for local mobile detailers: provisional NZ$750 setup and NZ$129/month.
The owner confirms appointments. Email, SMS, payments and custom domains are
only included after their separate acceptance checks.”

The managed offer is a service proposal, not the app's self-service Pro/Business
subscription. `/api/pricing` is the authority for the configured app currency.
Do not change Stripe prices or imply the managed fee includes a second platform
subscription without agreeing the commercial arrangement. All customization
remains available on all app tiers. The wider V2 growth-agent vision remains
future work; demonstrate the existing approval-based tools as implemented.

## Keep concurrent work intact

- Fetch current main and read `CLAUDE.md` before preparing a demo release.
- Work in a separate worktree, based on main; do not reset another agent's work.
- This companion was prepared on `codex/demo-readiness-20261021`, outside the
  `claude/**` auto-merge namespace. It does not trigger a production deployment.
- Check main and open PRs before integrating. Let the existing release pipeline
  handle any later deployment; do not start a competing deploy.
- Do not put benefit, disability, bank, identity or private funding documents in
  this public repository. Keep those in the applicant's private documents.

## Public preflight

Node 22 or newer; no npm install is needed for this script:

```sh
node scripts/demo-smoke.mjs https://businessflow-722923667291.us-central1.run.app
```

For a known published demonstration business, optionally set `BF_DEMO_SITE_ID`
to its UID or slug. No site/account is created by this script. It uses GET only,
has bounded request timeouts, checks JSON shapes, and exits nonzero on failure.
It records disabled notification channels honestly. An HTTP 200 app shell does
not prove the browser workflow, and a configured sender does not prove delivery.
Do not use a green preflight as a sales or funding readiness certificate.

## Prepare a controlled demonstration

Use a dedicated owner account and a separate browser session as the customer.
Use another dedicated owner account for isolation checks. Account creation and
credentials stay with the account owner; never commit credentials or disable
authentication to make a demo work.

Create **Harbour Detail Demo — demonstration only**, type **Other**, service
area **Tauranga**, with explicitly fictional service descriptions. Use only
contact details/inboxes/phone numbers controlled by the presenter for a real
submission. `demo@example.invalid` is suitable for an unpublished wizard
rehearsal; it cannot receive delivery tests. Do not use random real numbers.

Remove invented reviews, qualifications, insurance, guarantees and hours. Use
licensed images. Label sample data on screen. Do not overwrite a real business
or treat demonstration activity as customer traction. Keep external SMS and
payments unconfigured unless their provider-specific test process is agreed.

## Eight-minute presenter walkthrough

| Time | Show | Success evidence |
| --- | --- | --- |
| 0–1 min | Explain the owner problem and managed scope | Price is provisional; requests require owner confirmation |
| 1–2 min | Setup, business details, services, branding and preview | Edits visibly appear; no unsupported factual claims |
| 2–3 min | Publish dedicated sample and reopen public URL | Saved content survives refresh and matches preview |
| 3–4 min | Send a clearly marked sample enquiry | Same record appears once in owner inbox after reload |
| 4–6 min | Request a future service slot, then owner accepts | Starts Waiting; actual saved status changes; timezone is clear |
| 6–7 min | Decline a second request and inspect availability | Decline persists; cancelled slot becomes available |
| 7–8 min | Show follow-up workflow and defined support | Explain manual contact when email is off; show next action |

Payments, advanced automation, SMS and custom domains are optional follow-ups,
not detours in the core demo. Explain customer service Payment Links separately
from BusinessFlow's own subscriptions. Do not run a live card charge for a demo.

## Acceptance record — complete with actual observations

Record date/time, source commit, deployed revision/source if available, tester,
test account labels (never passwords), pass/fail and evidence. A green build
alone does not identify the live commit. Store screenshots without private data.

| Gate | Expected result | Evidence required before marking PASS |
| --- | --- | --- |
| Anonymous setup | No signup wall before preview; refresh preserves draft | Browser rehearsal, including required-field validation |
| Owner publish | Correct public URL and saved edits after refresh/relogin | Two-session browser check |
| Enquiry | Owner receives one saved enquiry, useful validation on bad input | Public submit and owner reload |
| Booking | Waiting → accepted/declined; availability and dates agree | Future NZ-local slot, calendar file/status and duplicate-slot checks |
| Delivery | UI matches actual email/SMS outcome | Controlled inbox receipt and failure path if sold; otherwise explicitly OFF |
| Owner isolation | Second owner cannot read/change first owner's private data | Two-account checks plus deployed Firestore/Storage rule evidence |
| Mobile and keyboard | Forms/navigation usable without clipping or traps | Phone-width browser and keyboard walkthrough |
| Recovery | Relevant business data can be restored and exported | Recorded restore into an isolated target; no production overwrite |
| Support and costs | Support window/limits and cost alerts are feasible | Owner-approved scope, billing alerts and escalation contact |
| Optional integrations | Only sold integrations are claimed working | Separate Stripe, SMTP, SMS and custom-domain runbook receipts |

If a core step fails, fix/retest it before presenting that path. An unpublished
setup preview can still be shown as a limited product preview; clearly state
that the owner workflow has not been accepted. Retain failing observations.

## Starting evidence — 21 October 2026 UTC

- Source reviewed: `aa401c5d36616ffe55a6e04abba1b28cd6ff420d`, including
  Grokbot's acceptance-copy fixes in PR #43. No application files were changed
  by this companion work.
- Public HTTP observations: liveness healthy, self-service USD14/USD22,
  `gstInclusive:false`, email and SMS `enabled:false`. These are observations,
  not provider delivery tests or proof of the deployed source SHA.
- Cloud browser: landing → anonymous setup → edited fictional name, type,
  tagline, email and area → review modal. Publishing/account creation was not
  performed. Further acceptance results must be recorded, not assumed.
- Signed-in publishing, inbox, owner booking, two-account isolation, mobile,
  restore and paid-provider acceptance remain outstanding until evidenced.

For email configuration see [EMAIL_ALERTS_SETUP.md](EMAIL_ALERTS_SETUP.md);
for payments see [GO_LIVE_STRIPE.md](GO_LIVE_STRIPE.md) and
[STRIPE_NZD.md](STRIPE_NZD.md); for SMS see [SMS_SETUP.md](SMS_SETUP.md);
for domains see [domain-mapping-setup-runbook.md](domain-mapping-setup-runbook.md).
