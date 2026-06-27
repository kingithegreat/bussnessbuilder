# 🧠 Brain kit — drop-in "shared brain" for any repo

A reusable kit so every project has **one source of truth all your AIs read**,
kept current, with **durable backups**. Copy these files into any repo and set
two values. ~5 minutes per project.

## What's in here

| File | Copy it to (in the target repo) | Edit after copying? |
|---|---|---|
| `CLAUDE.template.md` | `CLAUDE.md` | **Yes** — fill in the project specifics |
| `AGENTS.md` | `AGENTS.md` | No (generic pointer to `CLAUDE.md`) |
| `copilot-instructions.md` | `.github/copilot-instructions.md` | No |
| `snapshot-notion-brain.mjs` | `scripts/snapshot-notion-brain.mjs` | No |
| `workflows/snapshot-notion-brain.yml` | `.github/workflows/snapshot-notion-brain.yml` | No |

`docs/brain-snapshot.md` is **generated** by the workflow — don't create it by hand.

## One-time global setup (do once for ALL projects)

1. **Create a single Notion integration** at <https://www.notion.so/my-integrations>
   → *New integration* → copy the **Internal Integration Secret** (starts `ntn_`).
2. **Share it at the top of your Notion tree.** Open your top-level brain page
   (e.g. **"Aden Brain"**) → ••• → **Connections** → add the integration. Every
   sub-page (each project's brief) inherits access, so you never re-share per
   project.

> You reuse this one token across every repo. (Personal GitHub accounts have no
> org-level secrets, so you add the same secret value to each repo — fast.)

## Per-project setup (repeat for each repo)

1. **Copy the files** from the table above into the repo.
2. **Fill in `CLAUDE.md`** — replace the `<…>` placeholders with this project's
   facts (stack, build/run/deploy commands, gotchas, known issues, live URL).
3. **Add the secret:** repo → *Settings → Secrets and variables → Actions →
   Secrets* → **`NOTION_TOKEN`** = the integration secret.
4. **Add the variable:** same screen, *Variables* tab → **`NOTION_BRAIN_PAGE_ID`**
   = this project's Notion page id. (Get it from the page URL — the 32-hex chunk,
   e.g. `…notion.so/MyHome-a72c8f26a29a40fd9e23febebc73e078` → that trailing id.)
5. **Run it once to verify:** Actions tab → **Snapshot Notion brain** → *Run
   workflow*. On success it commits `docs/brain-snapshot.md`. If the page wasn't
   shared or the id is wrong it **fails clearly** (403/404) — it never fakes
   success.

## How it behaves (by design)

- **Canonical brain = `CLAUDE.md`** (in git → full revertable history).
- **Mirror = your Notion brief**; **backup = `docs/brain-snapshot.md`** (daily +
  on-demand) plus Notion's own page history.
- **Fails loudly:** missing `NOTION_TOKEN`/`NOTION_BRAIN_PAGE_ID`, or a Notion
  401/403/404, or an empty page → the Action fails. No silent "success" without a
  real backup.
- **Quiet when nothing changed:** commits only on real content change (ignores
  the timestamp line).

## Tips

- **New projects:** turn a repo containing this kit (already wired up) into a
  GitHub *template repo* so every new project starts with the brain baked in.
- **Keep it current:** the habit that makes this pay off — at the end of a
  session, update `CLAUDE.md` + the Notion brief. Everything else is automatic.
