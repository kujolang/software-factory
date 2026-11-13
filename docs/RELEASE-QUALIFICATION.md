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

## Subsequent integration qualification (not the final-source release matrix)

The previous tables are historical checkpoints. The continuation has additional implementation and scoped evidence; it does not replace the requirement to repeat final-source qualification after concurrent work settles. Subsequent aggregate `npm run verify` checkpoints recorded **175 tests plus eight native Dispatch tests** in `.runtime/ledger-completion/verify-resumed.log` and later **188 tests plus eight native Dispatch tests**, with 53 Markdown files, in `verify-current-retry.log`. Maintenance/audit tests and source changes followed, so neither is the final aggregate count.

| Command / evidence | Observed result | Scope and limits |
| --- | --- | --- |
| `node --test tests/git.test.mjs tests/context.test.mjs tests/change-tools.test.mjs tests/repository-mission.test.mjs tests/operations.test.mjs` | 19/19 passed | Real local Git, pinned context/change tools, source preparation and native process-kill recovery fixtures; no model calls |
| `node --test tests/repository-mission.test.mjs tests/evidence.test.mjs` | 27/27 passed | Includes v3 Lens report/screenshot and downgrade rejection; repository helper accepts verified v2/v3 gates |
| Native context setup and verification | Passed | Pinned Scout/Scent/Redact executable file closure; source fixtures remain synthetic and private |
| Native change-tool setup and verification | Passed | Fence/Concord/ChangeBucket/PatchBrief/Kennel validator closure; findings stay advisory |
| Public GitHub checks GET | Passed, two check runs, complete response | Commit `3f61c6328022ae551b8cd45eb5539bd2a6b5e00f`; `.runtime/git-qualification/github-checks.json`; no private token or external write |
| Approved repository patch replay | Passed, nonempty diff including new-file content; original README preserved | `.runtime/git-qualification/repository-repair-replay.json`; previously approved converter bytes, not a new repair mission; no commit/push |
| `node scripts/qualify-factory-floor.mjs` | Passed, 3 API and 17 browser cases | Real Workcell browser against explicitly synthetic operator observations, zero model calls; `.runtime/factory-floor-qualification/2026-11-13T18-24-20-820Z/qualification.json` |
| Lens-image `npm run smoke` | Passed, 27.147 s | Main image `sha256:c62fa7844cd38dd67d18421162af5016b2973a48d6db0a119982b2bf4b661383` |
| Lens-image `npm run test:isolation` | Passed, 34.538 s | Existing controls retained; exact log hash in `.runtime/ecosystem-phase-b/lens-image-regressions.json` |
| Lens-image `npm run test:controller-death` | Passed, 18.770 s | Independent cleanup regression; same summary contains exact log hash |
| Python and Kujo CLI qualification | Passed, 6 and 5 fixture cases | 65.073 s and 60.740 s respectively; exact image IDs, outcomes and logs in [CLI-RUNTIME-QUALIFICATION.json](CLI-RUNTIME-QUALIFICATION.json) |
| TypeScript CLI qualification | Passed, 5 fixture cases, 60.918 s | `.runtime/typescript-cli-qualification-LESJIN`; log SHA-256 `4b3937430f0df3d0e06728f9752b2e25b83710571320e083898833c263fc1d27`; service/framework missions not qualified |
| Go compile/run attempt | Compilation passed; execution failed with code 126 | Executable output was on a noexec workspace; `.runtime/go-cli-qualification-mR9v64`; boundary was not weakened to claim a pass |
| Rust image | Built and version observed | Image construction alone is not candidate execution qualification |

The selected-team live Codex run `factory-2026-11-13T18-10-35-293Z` completed at `.runtime/ledger-live/`, with seven added consultation tasks, normal construction/review tasks, native ledger pass and v3 Lens approval. Audit/export/verification records are under `.runtime/ledger-completion/codex-team-*`. Source was dirty and changed during execution, and consultation order changed afterward: this demonstrates the recorded implementation path, not qualification of final routing or all canonical roles. No token/cost totals are inferred here.

Recovery tests kill actual native process groups while a tool is running and after a durable synthetic approval pause. Inspection/snapshot never executes the uncertain tool; a separate native fixture resume preserves completed-step idempotency. This is not production factory resume qualification. Operations continues to report `resumeAllowed: false`.

The live standard Node repository repair `factory-2026-11-13T18-32-50-406Z` completed with v3 approval. Independent `verifyRunReleaseRecords` passed its source/native gate bindings. Original source commit is `47bbb44989cd7e7eabbf4c16d0ec8fc08b7fe6dd`, tree `aaa9bcc87353f467e9ad6641f2f97e713be5aa2b`; the exact run is retained under `.runtime/ledger-live/`. The review patch was prepared successfully without committing/pushing, original source remained unchanged, and audit/export/offline verification passed (`repair-patch.json`, `repair-audit-retry.json`, `repair-verify.json` under `.runtime/ledger-completion/`). The initial audit incorrectly demanded backend/frontend construction concurrency for this verify/release-only repair; the failure remains retained, and the corrected audit skips that assertion only for repository repair/revalidation while preserving it for ordinary construction. A dedicated audit regression passed. This qualifies the recorded narrow dependency-free repair path, not arbitrary repositories or final-source release readiness.

The four real Codex specification attempts are retained in `.runtime/ecosystem-phase-b/spec-live-qualification.json`. The first exposed overly strict proposal-stage verdict handling, the second exposed insufficient closed-DSL guidance, and the final two were legitimately rejected by independent semantic review. Those controller defects were fixed without relaxing validation/review. Four deterministic native-path tests pass with explicitly synthetic proposals; successful live semantic completion remains unqualified. No rejected draft was frozen, sealed or promoted.

Local Ollama revalidation `factory-recheck-2026-11-13T18-47-54-752Z` completed with native accounting and v3 approval using `qwen2.5-coder:1.5b-instruct`. Its 219-file export passed offline verification (`.runtime/ledger-completion/ollama-bounded-{audit,verify}.json`). Provider-reported usage totals are 14,131 input and 292 output tokens; cached usage and monetary cost remain unknown. This is revalidation of an existing approved candidate, not Ollama construction qualification. The earlier `qwen3.5:4b` recheck timed out and retains failure receipts, CaseFile and native failed accounting. The adapter now requests a bounded context and rejects oversized prompt/schema inputs; server/model support still requires separate observation.

The pre-upstream default-engine regression recorded in `.runtime/ledger-completion/baseline-engine.json` passed smoke (54.514 s), isolation (30.461 s), controller-death (18.913 s), and packs (75.038 s). Concurrent auxiliary integration was still ongoing; these receipts qualify the observed default path, not the final all-feature source tree. The intermediate deterministic aggregate passed 199 tests plus eight native Dispatch tests; later source changes require a fresh aggregate.

The fresh published checkout at `14842049a4de1ad8ed4680c2c893bd3ab98f0305` installed dependencies, ran setup and passed offline doctor with isolated HOME/cache and no copied authentication/settings/dependencies. Its verification found four failures: an exporter ancestor-Git identity bug and three module-context-dependent provider fixture failures. Fix `4f5a551` adds repository-root identity checking and explicit CommonJS fixture classification; 34 tests pass with TMPDIR deliberately nested under the repository. The failed install evidence remains in `.runtime/install-qualification/checkout-JfJi3Y/`. Only its reproducible npm cache/node_modules were removed to reclaim space; logs, source and pinned tool closures remain. A fresh passing final-source installation is still required.

Read-only upstream maintenance observed 20 locked repositories. Two HEAD differences were reviewed: the agent pin is a direct child compatibility patch with the same complete 85-role roster as current main; Kennel was deliberately updated to `3093c40039ddbaa10527f3121cae3b958cadc2b9`. Its declaration-only API avoids the previous validator's host-path existence/type probes. Six native change-tool tests pass; old source and the initial regression assertion failure remain retained. No other upstream revision was automatically adopted.

## Later installed native v2 and Watchdog observations

The earlier Go noexec failure, Rust image-only observation, and native v1 shared-workspace write violation remain historical evidence. V1 is disabled. Their reviewed replacement is installed at Workcell `144ab49da88a17fd0d786d01d98030d7ec7798cb`; it includes the explicit read-only contract from `099d1b6d17b38c8c247e8c6617649d8ea21ba157` plus optional remote-adapter dependency security fixes. No remote live-provider qualification is claimed.

| Check | Observed result | Evidence and scope |
| --- | --- | --- |
| Go v2 functional/negative CLI | 5 cases passed | `.runtime/go-cli-qualification-GGzbD1`; real Linux amd64 rootless compile/execution leases |
| Rust v2 functional/negative CLI | 5 cases passed | `.runtime/rust-cli-qualification-wnPt7N`; real Linux amd64 rootless compile/execution leases |
| Native v2 security | 7 checks passed | `.runtime/native-staging-qualification-lV0wjT`; actual read-only mount, symlink/hardlink/oversize, immutable source/image, UID/socket/credential and egress boundaries |
| Installed public CLI | Go 29.466 s; Rust 11.087 s, both passed | `.runtime/native-installed-qualification-Z0VI97`; `node scripts/qualify-installed-native-cli.mjs` |
| Upstream Workcell suite | Exit 0; 223 native unit, 23 portable unit, 30 adapter, 257 release-report checks; audit vulnerabilities 0 | Exact commands/log hashes in [CLI-RUNTIME-QUALIFICATION.json](CLI-RUNTIME-QUALIFICATION.json) |
| `node --test tests/telemetry.test.mjs` | 6 passed | `.runtime/ledger-completion/watchdog-hardening-tests.log`; real pinned Watchdog SQLite, native rejection and synthetic privacy/admission fixtures |
| Prior repair telemetry snapshot | 41 native records accepted | `.runtime/ledger-completion/watchdog-repair-observation.json`, `.runtime/telemetry/observation-xzjstM`; offline observation only, zero new model/engine calls |

Watchdog unknown token values remain null in canonical storage; cost is unknown. No content, external telemetry, approval or execution-proof claim is created. These results do not establish complete language missions, services, frameworks, fresh-machine installation or final-source aggregate qualification. The final aggregate is pending rather than inferred from this scoped evidence.
