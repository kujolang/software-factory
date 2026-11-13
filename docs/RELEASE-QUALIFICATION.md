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
| Additional runtime missions and full provider matrix | Incomplete | Codex construction/retry results below; Ollama full mission remains unqualified |
| Upstream VideoOps Kujo validator | Failed: VM Stack underflow | Open upstream issue; separate canonical JSON-schema checks pass |

The first four engine attempts failed because the existing daemon was stopped. Those results were preserved under `.runtime/ecosystem-qualification/first-attempt/` before retesting. Provider bridge development failures were also retained. No failing test was deleted to obtain a pass.

Raw evidence is private under `.runtime/ecosystem-qualification/`, `.runtime/qualification/providers/` and the command-specific smoke/pack directories. Public [qualification-results.json](qualification-results.json) records result summaries and log hashes. The [acceptance manifest](../config/release-acceptance.json) maps all 18 release criteria to implementation, tests, evidence and remaining blockers. Most criteria remain partial or blocked; availability and schema checks alone never qualify execution.

## Phase B continuation qualification

Implementation checkpoint: `fc96648c15dd006f9a110f6a712d72a6662f5f63`. `npm run verify` passed **118 tests and eight native Dispatch tests**, no failures or skips; 43 Markdown files passed link/path checks. New tests include persistent ledger attempts, CaseFile failure retention, native Eval, selected ShipCheck controls, two-stage promotion and offline native-record tamper rejection. Synthetic receipt tests are labeled and do not substitute for real missions.

A fresh clone of the public branch, with an isolated HOME/npm cache and no copied state, passed `npm ci` (28.614 s), setup (24.210 s), offline doctor (8.492 s) and verification (33.627 s). Its 118+8 tests passed, checkout remained clean, and npm reported zero dependency vulnerabilities. This establishes clean-checkout portability on the current macOS host, not a clean independent machine or Linux/WSL compatibility. Logs and hashes are in `.runtime/ecosystem-phase-b/clean-install-results.json`.

The first complete Codex converter mission (`factory-2026-11-13T16-42-35-479Z`) failed at independent release review after 277.999 seconds. Actual API/browser acceptance, native Eval and the configured metadata policy passed; the reviewer treated the full upstream ShipCheck aggregate as a required gate because individual outcomes and staging scope were missing from its prompt. The failure retained two CaseFile captures, a failed RunLedger record and no approved build. Its 220-file export verified independently. Commit `5b5422c` exposes unchanged native check results and policy scope; it does not override the verdict or relax any required gate. A new run is required for retry.

The fresh Codex retry (`factory-retry-2026-11-13T16-50-44-314Z`, source `5b5422cb2f66c0e6b8eb854e258c05ec8d24bd58`) completed in 107.131 seconds. It repeated independent review, actual API/browser acceptance, native Eval, ShipCheck, build, release review and final acceptance before native accounting and local promotion. Its native ledger reports 27,029 input / 1,180 output tokens; cost remains unknown. Audit, export and offline verification passed. The original failed run remains unchanged. This qualifies recovery through a fresh verification run for the constructed converter, not automatic checkpoint recovery, every mission type or the second provider.

After the live retry, all real runtime regressions passed: smoke 45.930 s; isolation 37.454 s (24 named checks); controller-death 19.212 s (SIGKILL, independent watchdog exit 124 and scoped cleanup); packs 61.469 s (converter 6 API/4 browser, notes 4 API/6 browser and wrong-answer rejection). Qualification metadata retains log hashes and the explicit source-checkpoint caveat: per-command HEAD was not captured while unrelated verifier/docs commits advanced, but the runtime execution modules were unchanged from the live retry source.

Offline review found and fixed two consistency gaps: a removed accounting marker could downgrade a new approval to legacy checks, and changed native ledger facts could contradict its immutable finish intent. The verifier now rejects both, preserves ordered failed-test history and distinguishes unknown usage from zero. These are integrity/consistency guarantees, not authentication of unsigned execution claims.

Final production-source checkpoint `dce41c7f471fa3815102d4f8b63153c77c6d6be7`: `npm run verify` passed **121 tests + eight native Dispatch tests**, zero failures/skips, and all 44 Markdown files (38.979 s). The same verifier passed the completed retry audit and both retained failed/successful offline exports. Exact commands and SHA-256 log identities are in qualification-results.json. Later commits update documentation and qualification metadata only.
