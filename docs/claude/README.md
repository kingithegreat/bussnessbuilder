# Claude Code setup files

Copy-paste config to make Claude Code behave like a real senior dev. The
source-of-truth copy also lives in Notion under **Aden Brain → ⚙️ Claude Code
Setup Settings**; these files are here so they're easy to drop onto a machine.

## Where each file goes

| File here | Put it at (Windows) | Scope |
|-----------|---------------------|-------|
| `global-settings.json` | `%USERPROFILE%\.claude\settings.json` | All projects: model, effort, plan-mode default, safe permissions |
| `global-CLAUDE.md` | `%USERPROFILE%\.claude\CLAUDE.md` | Aden's global operating rules |
| `../../.claude/settings.json` | already in this repo | Project-level permissions for BusinessFlow |

On macOS/Linux the global path is `~/.claude/settings.json` and `~/.claude/CLAUDE.md`.

## Notes
- `defaultMode` must be nested under `permissions` (not top-level) — top-level is ignored.
- Valid top-level keys used: `model`, `fallbackModel`, `effortLevel`,
  `autoCompactEnabled`, `fileCheckpointingEnabled`, `permissions`, `$schema`.
- `theme`, `verbose`, and `skillListingBudgetFraction` are NOT real settings.json
  keys — don't add them.
- Swap `model` to `claude-opus-4-8` for the hardest tasks; keep
  `claude-sonnet-4-6` for everyday speed/cost.
- Notion MCP is already connected — no need to re-run `claude mcp add ... notion`.
