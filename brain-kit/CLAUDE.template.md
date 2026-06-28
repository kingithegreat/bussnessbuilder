# <PROJECT NAME> — Agent Handoff

## What this is

<One paragraph: what the project does, who it's for, the stack in a sentence.>

**Live URL:** <https://… or "not deployed yet">

## Before you start (read this FIRST)

Multiple agents/sessions may work this repo in parallel. Most wasted/conflicting
work comes from acting on a stale snapshot. Before making any change:

1. **Sync to reality.** `git fetch origin && git log --oneline origin/main -5`.
   Branch from **current `origin/main`** — do not trust whatever commit was
   cloned/checked out.
2. **Read the source of truth.** This `CLAUDE.md`, then the Notion brief.
   Confirm your task isn't **already done** before redoing it.
3. **Use the branch convention.** Name AI-session branches `claude/whats-next-*`,
   one task per branch. Open a PR; never push straight to `main`.
4. **Before merging ANY branch, check it isn't stale:**
   `git log --oneline <branch>..origin/main`. If `main` has commits the branch
   lacks, merging it may **revert recent work**. Reconcile/rebase first.
5. **Leave the trail current.** Update this file and the Notion brief so the next
   session inherits accurate state.

## The brain: one source of truth + backups

- **Canonical brain = this repo.** `CLAUDE.md` is the durable source of truth.
  Every change is a git commit, so history is an automatic, revertable backup.
- **All AIs read the same brain.** `AGENTS.md` (Codex & others) and
  `.github/copilot-instructions.md` (Copilot) point here — one source, not three.
- **Human / cross-tool mirror = Notion** brief. Mirrors the key facts + decisions.
- **Durable backup of Notion = `docs/brain-snapshot.md`**, regenerated daily (and
  on demand) by the **Snapshot Notion brain** GitHub Action. Needs the
  `NOTION_TOKEN` secret + `NOTION_BRAIN_PAGE_ID` variable. The file is generated;
  don't hand-edit it.
- **End every session by syncing the brain** (this file + Notion).

## Tech stack

- <framework / language / runtime>
- <database / auth / storage>
- <hosting / deploy target>

## Build & run

```bash
<install command>
<dev command>
<build command>
<test command>
<lint command>
```

## Deploy

```bash
<deploy command(s)>
```

## Key architecture notes / gotchas

- <non-obvious rule a new agent must know>
- <…>

## Env vars / secrets

- `<NAME>` — <what it's for>

## Known issues / TODO

- <…>
