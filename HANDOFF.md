# Handoff — BusinessFlow Studio

Updated 18 October 2026. Canonical instructions/state: [CLAUDE.md](CLAUDE.md).

The SMS and quick-AI updates PRs #41/#42 are on main and their deployments
succeeded. The current finishing work is documented in
[docs/RELEASE_FINISHING.md](docs/RELEASE_FINISHING.md), including exact verification
scope and account-side steps. The old June localStorage-only scaffold notes are
obsolete: BusinessFlow uses Firebase, Express SSR and Google Cloud Run.

Read the latest deploy run's `production-readiness` artifact/summary for release,
rules and configuration status. Check current main before making changes.
Credential entry, paid billing acceptance and a real custom-domain DNS/certificate
test remain owner-side gates; a completed code change does not prove them.

No Notion connector was available during this finishing session. Mirror the
finishing record into the BusinessFlow brief when access is restored; do not
hand-edit generated brain snapshots.
