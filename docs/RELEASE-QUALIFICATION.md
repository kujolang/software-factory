# Release qualification

**Recommendation: block the requested feature-complete release.** This branch is an integration increment with explicit remaining work in [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md) and [IMPLEMENTATION-LEDGER.md](IMPLEMENTATION-LEDGER.md). Version remains 0.1.0; no release tag, merge, publication or deployment was performed.

Qualification date: 2026-11-13. Host: macOS x64, Node 26.12.1, Kujo 1.9.0. Existing rootless Colima Docker engine with seccomp was restored using `colima start default --activate=false` and `npm run engine:connect -- default`; no global Docker context or isolation policy was changed.

| Command / evidence | Result | Scope |
| --- | --- | --- |
| `npm run setup` | Passed | Actual pinned local source installation, resource integrity and catalogs; existing machine |
| `npm run verify` | Passed: 83 tests + 8 Dispatch tests; 41 Markdown files | Deterministic tests, native Dispatch subprocess tests and documentation links |
| `npm run smoke` | Passed, 34.926 seconds | Real Workcell API/browser fixture execution |
| `npm run test:isolation` | Passed, 25.119 seconds | 24 named isolation checks, including egress, credentials, mounts, output/time limits and cleanup |
| `npm run test:controller-death` | Passed, 15.650 seconds | Controller SIGKILL, independent watchdog exit 124 and scoped cleanup |
| `npm run test:packs` | Passed, 44.680 seconds | Converter 6 API/4 browser; notes 4 API/6 browser; wrong arithmetic and rendered results rejected |
| Provider conformance | Nine deterministic cases passed | Includes actual upstream Kujo HTTP fixture; not model execution proof |
| Live Codex structured output | Passed, 7,695 ms | 12,303 input / 17 output tokens; zero tools; default model identity unreported |
| Live local Ollama structured output | Passed, 6,823 ms | qwen2.5-coder:1.5b-instruct; 54 input / 8 output tokens; local model only |
| Accountability adapters | Seven real-tool tests passed | Spec, RunLedger, CaseFile and advisory ShipCheck using immutable upstream sources |
| Portable evidence | Adversarial suite plus five retained runs passed | Three failed/two completed exports; historical artifacts, not fresh mission qualification |
| Clean Linux/macOS/WSL2 installation | Not executed | Release blocker |
| Additional runtime missions and full provider missions | Not executed | Release blocker |
| Upstream VideoOps Kujo validator | Failed: VM Stack underflow | Open upstream issue; separate canonical JSON-schema checks pass |

The first four engine attempts failed because the existing daemon was stopped. Those results were preserved under `.runtime/ecosystem-qualification/first-attempt/` before retesting. Provider bridge development failures were also retained. No failing test was deleted to obtain a pass.

Raw evidence is private under `.runtime/ecosystem-qualification/`, `.runtime/qualification/providers/` and the command-specific smoke/pack directories. Public [qualification-results.json](qualification-results.json) records result summaries and log hashes. The [acceptance manifest](../config/release-acceptance.json) maps all 18 release criteria to implementation, tests, evidence and remaining blockers. Most criteria remain partial or blocked; availability and schema checks alone never qualify execution.
