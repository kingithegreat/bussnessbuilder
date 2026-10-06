# BusinessFlow cost controls

Application controls updated 2026-10-07; pricing reviewed 2026-10-05.
These are application controls and illustrative estimates,
not a measurement of the current bill or a global spending ceiling.

## AI allowance

Only an active or trialing recognized paid subscription can use platform AI.
All four server AI endpoints, including homepage headline proposals, share an
atomic Firestore allowance per user:

| Plan | Requests per UTC day | Requests per UTC calendar month |
| --- | ---: | ---: |
| Free | 0 (templates) | 0 (templates) |
| Pro | 20 | 200 |
| Business | 60 | 600 |

The four `AI_DAILY_LIMIT_*` / `AI_MONTHLY_LIMIT_*` environment variables override
these defaults. Zero disables calls; invalid values fail closed. Missing provider
keys and Free/template requests do not consume an allowance. A reserved attempt
counts even when the provider fails, preventing retry loops from bypassing caps.
Exhausted or unavailable counters return labelled template/metrics fallbacks.

Server prompts plus system instructions are limited to 16,000 characters. Each
generation limits output to 2,048 tokens and disables extra thinking tokens.
The headline route uses a tighter 256-output-token limit and a 20-second provider
timeout. Generation runs outside Firestore transactions; a stored request ID
deduplicates successful proposal retries. Pending requests have a two-minute
lease so simultaneous retries do not normally purchase duplicate generations.
An expired lease can allow another attempt; every paid attempt still uses the
shared allowance. Approval, undo and history do not call the AI provider.
Customer-owned browser API keys use that output/thinking limit but are billed to
the customer's provider account and do not use the platform request allowance.

At Google's published Gemini 2.5 Flash standard text rates ($0.30 USD per million
input tokens, $2.50 per million output tokens), an illustrative 4,000-input,
2,048-output request costs $0.00632. Consuming 200 such requests is $1.264/month;
600 is $3.792/month per customer. Character counts are not token counts: this
scenario is not a hard dollar maximum. Firestore, hosting, storage, egress,
Stripe fees and taxes are additional. Aggregate spend grows with paid users.

Sources: [Google pricing](https://ai.google.dev/gemini-api/docs/pricing),
[model availability](https://ai.google.dev/gemini-api/docs/deprecations).
Existing `gemini-2.5-flash` is retained; eligibility for newer projects needs
checking before a new installation. No paid generation was used for verification.

## Infrastructure and development

The read-only Cloud Run inspection found max instances 20 and concurrency 80.
These are capacity settings, not dollar caps. Actual billing usage, idle-instance
settings and account-wide budgets were not established or changed. Consult
[Cloud Run pricing](https://cloud.google.com/run/pricing) and billing reports
before changing capacity or promising a fixed monthly bill.

Six recent successful deployments were documentation snapshot commits. The
deployment workflow now ignores docs-only changes, and workforce merges rely
on their main push instead of also dispatching a second deployment. Existing
verification gates remain in place. No new dependencies or paid services were
added; local validation runs serially with one test worker.

Lazy page imports reduced the initial production bundle from 1.38 MB to
859.06 kB (estimated transfer from 315.08 to 227.14 kB, latest headline build).
Editors download when
opened. This reduces first-page transfer; it does not imply an equal reduction
in the total monthly hosting bill.

Before scaling sales, measure tokens per successful customer outcome, include
infrastructure and payment fees in margin calculations, and configure billing
alerts in the owner's account. Billing alerts alone do not stop spend. A global
provider budget/kill switch remains future work; per-user quotas do not provide it.
