# Agent instructions

This file exists so non-Claude coding agents (OpenAI Codex, etc.) use the same
"brain" as everyone else.

**The canonical source of truth is [`CLAUDE.md`](./CLAUDE.md). Read it first and
follow it exactly.** It contains:

- the project overview + **Live URL** (the app is already built and deployed),
- the **"Before you start"** ground-truth protocol (sync to current `origin/main`;
  never act on a stale snapshot; verify a branch isn't stale before merging),
- the architecture rules (lazy-load `firebase-admin` / Stripe / nodemailer /
  `@google/genai` in `server.ts`; Firestore uses bracket notation),
- the **brain / backup policy** (keep `CLAUDE.md` + the Notion brief in sync at
  the end of every session).

Do not duplicate guidance here — update `CLAUDE.md` instead, so there is one
source of truth.
