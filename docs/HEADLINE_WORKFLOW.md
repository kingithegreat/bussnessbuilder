# Homepage headline workflow

Home's Website assistant handles requests such as “Improve my homepage headline”.
It saves a proposal with the current and suggested `profile.tagline`, the owner's
request, source, reason, actor and timestamps. Preparing a proposal does not
publish it. Approval updates the shared public homepage field; undo restores the
previous value only if the saved headline still matches the approved proposal.
Website's existing editors remain available on every subscription tier.

## API and storage

All routes verify the owner's Firebase token before accessing data:

- `POST /api/actions/headline/prepare`: `{uid,id,request,expectedHeadline}` → `{action}`
- `GET /api/actions?uid=...`: `{actions}` (the latest 20 saved proposals)
- `POST /api/actions/:id/approve` and `/undo`: `{uid}` → `{action,headline}`

The server owns `businessActions/{uid}/entries/{id}` and temporary
`businessActions/{uid}/preparations/{id}`. Firestore's default-deny rule blocks
direct client access. Account deletion recursively removes both collections.
Approval/undo compare and update the headline and audit record in one transaction,
preserving leads, unrelated profile fields and concurrent activities. Repeated
operations return their saved status and the current headline without applying
the change twice. Already-undone proposals cannot be reapplied.

Preparation uses a stable UUID, a two-minute claim and a unique claim token.
Provider calls run outside retried transactions. Successful retries reuse the
stored proposal; an expired callback cannot overwrite a newer preparation.
Free accounts, missing keys, exhausted allowance and provider failures use labelled
factual templates. Paid generations reuse the existing shared AI allowance;
there are no paid provider calls during automated verification.

## Save and recovery behavior

Owner autosaves are serialized and drained before a new action. Local edits are
flushed before preparation/approval so its expected headline matches saved state.
While an action is running, autosave pauses. Confirmed results update only the
local headline and retain other edits. Responses from a previous account are
discarded.

If an approval or undo response is lost, the request may still be running on the
server. Reading the profile or history alone cannot prove it finished. Autosave
stays paused until “Retry unconfirmed change” confirms the same idempotent
operation. New changes remain blocked during that recovery. A definite initial
HTTP rejection can instead reconcile the current headline without publishing a
new change.

## Scope and verification

This is the first typed action, not the complete V2 chat engine. Requests for
other operations point back to Website's editors. Outcome measurement, additional
typed actions, older-history pagination and signed-in browser acceptance remain
separate work.

The Angular suite covers component controls, account isolation, autosave races,
lost-response recovery, proposal deduplication and stale transactions. A real
loopback Express HTTP test runs prepare → history → approve → undo with an
in-memory Firestore fixture, and checks owner authentication and newer manual
edits. Provider tests inject a fake provider and key; they never generate paid
content. This proves the API/client behavior under those fixtures, not live
Firebase authentication or a signed-in production browser journey.
