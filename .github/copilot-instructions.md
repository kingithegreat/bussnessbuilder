# Copilot instructions

The canonical source of truth for this repo is **[`CLAUDE.md`](../CLAUDE.md)** —
read it before suggesting or making changes.

Key points it covers (do not act without these):

- **Before you start:** sync to current `origin/main`; the app is already built
  and deployed, so don't redo finished work or act on a stale snapshot.
- **Architecture:** `firebase-admin`, Stripe, nodemailer, and `@google/genai`
  MUST stay lazy-loaded in `src/server.ts` (CommonJS breaks Angular's ESM build);
  Firestore `DocumentData` uses bracket notation (`data['field']`).
- **Brain policy:** keep `CLAUDE.md` + the Notion brief updated at the end of a
  session so all AIs stay current.
