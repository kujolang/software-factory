# Software Factory repository hardening

## Repository and baseline

- Repository `kujolang/software-factory`. Audit branch `codex/factory-hardening`.
- Start `0a8d8967a94e81e678f25a6b0ab48ac50d34d28c`, the merged ecosystem integration. The checkout was clean.
- Verified code commit `b787c6b44ce3408ca3e0f6bba492dd0dd0d1e1ad` before this report.
- Product scope is local-first software construction with canonical Kujo catalogs, native Dispatch and Workcell, independent release verification, and portable evidence. Key pinned packages include Kujo Runtime 1.9.0, Codex CLI 0.144.4, Ajv 8.20.0 and ajv-formats 3.0.1.
- Baseline `npm run verify` passed 433 tests and eight native Dispatch tests. `node scripts/doctor.mjs --json` passed on macOS x64 with Node 26.12.1, Kujo 1.9.0 and the configured rootless engine.
- The previously verified GitHub converter repair identified an out-of-order response in the shipped seed. The baseline client failed the supplemental real-browser ordering check at the final assertion. The independent qualification record identifies the prior run and distinguishes the unpublished seed-branch patch. [GitHub issue qualification](../GITHUB-ISSUE-QUALIFICATION.json)

## Findings and resolution

| ID | Priority | Area | Evidence and cause | Change and verification |
| --- | --- | --- | --- | --- |
| H1 | P1 | Subprocess output | `command()` checked the limit after converting each chunk and concatenating it. Bytes delivered after termination could still accumulate. Chunk-wise decoding corrupted split UTF-8. | `factory/core.mjs` caps retained raw bytes independently per stream, preserves the first stop cause, and decodes after capture. Tests exercise both streams and a split code point. |
| H2 | P2 | Factory Floor | `/api/runs` built a complete operator projection for each run before selecting four metadata fields. The detail journal and raw evidence route performed additional whole-file reads. | `factory/cli.mjs` lists bounded run metadata directly, bounds the detail journal at 8,000,000 bytes, and applies the existing 32 MiB portable-evidence file limit to raw downloads. The observer regression covers malformed journals, inert downloads, rejected symlinks and HTTP 413 for oversized evidence. |
| H3 | P2 | Local MCP | Both stdio transports concatenated retained input for each chunk, applied the cap to the aggregate chunk, and ignored output backpressure. | Shared `factory/mcp-transport.mjs` validates UTF-8 and enforces the existing 1 MiB limit per frame. Backpressure pauses input consumption. Tests exercise coalesced requests, bad UTF-8, slow writes, malformed control tool names and real stdio. The official SDK verifies discovery, scoped preparation and denial. |
| H4 | P2 | Source identity | `digest()` collected all encoded file bytes and made a second combined string before hashing. | Incremental SHA-256 updates preserve the existing serialization. Tests compare empty, nested, binary and non-ASCII cases with the original algorithm. |
| H5 | P2 | Converter browser | The public client allowed late success or failure to replace the current result. | `examples/converter/public/app.js` checks request order on both paths. The new supplemental Workcell check controls response completion while loading the shipped script. The sealed pack retains its existing acceptance contract. |
| H6 | P2 | Acceptance fixture | The initial pack qualification failed after the browser change because its text replacement no longer matched. | `scripts/test-packs.mjs` asserts each negative fixture mutation has exactly one target before invoking the real acceptance runner. Both intentionally wrong outputs are still required to fail. |
| H7 | P3 | Qualification documentation | Adaptation, architecture and security docs described some separately qualified paths as still pending. | Updated the docs to point to the recorded qualification scopes and clarify the default MCP interface. |

| H8 | P2 | Git onboarding | Linux CI observed Git removing `.git/objects/maintenance.lock` between enumeration and inspection. | Retry the complete bounded scan once for that specific disappearance. A targeted real Git fixture injects the lock removal and verifies the same commit is onboarded. Deterministic repository fixtures disable automatic maintenance. |

## Audit coverage

| Phase | Evidence inspected |
| --- | --- |
| 0. Repository | Contributor guidance, architecture, adaptation, security, supported routes, existing release qualification and implementation ledger. |
| 1. Baseline | Clean Git state, dependency pins, live doctor, prior browser-order evidence, deterministic/native verification and synthetic benchmarks. |
| 2. Complexity | Removed duplicate MCP framing and decoupled the run list from construction of detailed evidence views. The two transports continue to own their distinct dispatch and authority logic. |
| 3. Runtime | Measured the Factory Floor run list and source hashing. No application load benchmark was run. |
| 4. Memory | Inspected subprocess output accumulation, digest encoding, MCP buffering and operator evidence read limits. |
| 5. Context | Reviewed bounded context selection and skill/role activation alongside provider budget and receipt boundaries. No new model calls or token measurements were needed. |
| 6. Command output | Checked subprocess per-stream byte limits, stop classifications and structured MCP streams. |
| 7. Failure semantics | Examined error precedence, malformed framing, grant-scoped cleanup, detached process ownership and independent Workcell deadlines. |
| 8. Security | Reviewed source binding, portable evidence limits, observer loopback and MIME handling, MCP grants, credential isolation and the rootless Workcell policy. |
| 9. Concurrency | Inspected the converter request race, process shutdown, Git maintenance and admission policy. Retained probes verify controller death independently of the controller. |
| 10. Contracts | Checked CLI output, observer response fields, sealed pack identity, MCP protocol and prior digest bytes. Malformed UTF-8 receives a parse error and oversized observer file requests return 413. |
| 11. Supply chain | Inspected the npm lock, pinned GitHub actions and offline prerequisites. npm's production dependency advisory query returned zero known vulnerabilities. |
| 12. Tests | Added focused regressions and an executable supplemental browser check. Independent Workcell qualification covers runtime behavior. |
| 13. CI | Inspected the clean-install Linux/macOS matrix and retained its deterministic qualification scope. Live engine evidence is recorded separately. |
| 14. Docs | Reconciled support claims with existing qualification, clarified framing and documented the supplemental browser check. |
| 15. Developer experience | Verified the unchanged CLI entrypoints and added the browser repro command to the verification guide. |
| 16. Dead weight | Removed redundant transport and list-path work. Left public handlers and historical failure evidence in place. |
| 17. Implementation | Scoped changes to Software Factory. Each behavior change has an independently reviewable commit. |
| 18. Verification | Commands and observed results appear below. |

## Compatibility and security

Existing CLI commands, configuration, environment variables, evidence schemas, sealed acceptance packs and source digest identities remain compatible. Clients consuming a truncated subprocess stream now receive the bounded prefix. The observer list can return metadata for a run whose journal cannot be inspected, and its detail or file route can reject oversized inputs. MCP clients can send several valid frames in one write and continue after a parse error. No new dependency, provider calls, network exposure, approval mechanism, or candidate authority was added.

Raw bytes are bounded before decoding and MIME handling still serves candidate evidence inertly. The observer is an OS-user-local status surface. Source identities and portable verification still bind the underlying evidence. The rootless engine remains responsible for execution isolation and its watchdog deadline.

## Remaining work

- P0 and P1. No unresolved findings from this pass.
- P2 and P3. No actionable residual findings from the reviewed paths.
- Needs more evidence. Benchmarks are synthetic and do not establish full-history operator performance, model token savings or other runtime claims.
- Not worth changing without a demonstrated cost. Public response pagination or changes to canonical evidence serialization would expand compatibility risk.
- Cross-repository dependencies. No upstream modification is required for the fixes.

## Performance and efficiency

The local harness replayed the same generated files before and after the changes, using fresh processes for each sample group. Baseline implementation came from the starting commit. Verification activity overlapped the timed runs, so the measurements describe this fixture and host. One early pair is shown below. Under later contention, hashing latency varied in both directions and does not establish a speed gain.

| Workload | Before | After | Identity and scope |
| --- | --- | --- | --- |
| Factory Floor list, 20 runs with 100 events and 30 receipt files each, 17 measured requests after warmup | 217.0 ms median, 377.2 ms p95 | 8.5 ms median, 11.8 ms p95 | Response SHA-256 `1af66043257699d0b1415f4913aa9af5d26514df83183178f2ce9b8c1b856139` on both. The handler avoids opening all 20 journals and 600 receipt files for this request. |
| Tree hash, 20 binary files of 180,000 bytes, 35 measured iterations after warmup | 31.4 ms median, 166,608 KiB process peak RSS | 25.7 ms median, 56,080 KiB process peak RSS | Source SHA-256 `715860c53f9bab3745e90356b01d49c296ae8509b8d9af5dc384664d5a923a6d` on both. All sampled processes showed lower peak RSS. |

Subprocess output has an enforced raw-byte cap before decoding. Runtime dependency surface stayed fixed. Build time, distribution size and model usage were outside the measured paths.

## Verification receipt

| Command | Observed result |
| --- | --- |
| `node scripts/doctor.mjs --json` | Passed baseline live preflight. |
| `npm run verify` | Passed locally with 437 deterministic tests, eight native Dispatch tests and the docs checker. This run started before the final MCP name and Git maintenance cases. The final changes have separate targeted results and the PR matrix verifies the final tree. |
| `node --test tests/{control-mcp,mcp,core-hardening,observer}.test.mjs` | Passed all 27 focused tests after the final MCP change. |
| `node --test tests/{git,repository-mission}.test.mjs` | Passed all 10 focused tests, including the Git maintenance regression. |
| `node scripts/qualify-mcp-client.mjs` | Passed after the final MCP change with SDK 1.32.2. |
| `node scripts/qualify-converter-response-order.mjs` | Passed 3 API and 9 browser checks on rootless Workcell, using the shipped client SHA-256 `cf09dd40410ed220a67644c73dfeae0c5430104fc6bbdf402096258e21248447`. |
| `npm run test:packs` | Passed after fixing the fixture mutation target. Converter and Notes passed, and intentionally wrong API and browser results were rejected. |
| `npm run smoke` | Passed representative API and browser checks on rootless Workcell. |
| `npm run test:isolation` | Passed all 24 observed rootless isolation probes. |
| `npm run test:controller-death` | Passed. The independent deadline stopped the lease with exit code 124 after controller kill, and recovery removed the stopped container and its workspaces. |
| `npm audit --omit=dev --json` | Passed with zero reported production dependency advisories at the time of inspection. |
| `node scripts/check-docs.mjs` and `git diff --check` | Passed. |

The initial pack test failure remains in the local logs. The earlier Linux CI failure exposed the Git maintenance race and is preserved separately from the final-head checks. [Initial Linux CI run](https://github.com/kujolang/software-factory/actions/runs/44674529446)
