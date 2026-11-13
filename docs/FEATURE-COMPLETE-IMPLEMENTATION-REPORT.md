# Feature-complete implementation report

The requested release is **incomplete and blocked**. This report's required filename is not a completeness claim. The session implemented a reviewable foundation beyond discovery while retaining the existing runtime boundaries.

## Implemented

- Source-backed audit of 77 capabilities, including every mandatory repository, named investigations, exact public commits and explicit unavailable/experimental decisions.
- Pinned complete catalogs: 85 canonical roles, 136 skills, 45 workflow kits. Discovery, inspection, source/resource verification, locked synchronization and guidance activation receipts are executable. Agent schemas and handoffs are used directly; fixed proposals stay restricted.
- Controller-owned advisory team selection for 20 software lifecycle types plus explicit specialist domains. Independent review remains mandatory; no plan grants tools, deployment or budget authority.
- Actual Spec strict validation and Dispatch-envelope export for frozen software packs, executed before pack missions. Native RunLedger begin/finalize hooks, per-attempt CaseFile failure capture, native Eval evidence checks and selected ShipCheck release controls run with private staged data and receipts. Two-stage promotion prevents publication before accounting completes.
- Provider-neutral proposal execution through restricted Codex and pinned native Kujo Ollama; deterministic mock only for tests. Cancellation, timeouts, output bounds, child credential isolation and structured-output checks. Monetary ceilings are rejected until enforceable. Missing usage remains unknown.
- Portable failed/successful evidence exports, offline integrity/binding verification, archival import, comparison and optional detached Ed25519 signatures against caller-trusted keys. Execution-start controller/harness hashes are recorded for new runs.
- Read-only stdio MCP discovery/planning/verification and read-only Factory Floor catalog inspection. Installation now assembles the reviewed catalog and accountability packages without sibling repositories.

## Reused and changed upstream

Native Dispatch and Workcell remain the execution/isolation primitives; the later reviewed Workcell pin update is recorded below. Canonical role instructions and skill packages remain upstream-owned. Spec, RunLedger, CaseFile, ShipCheck and Eval run their actual pinned CLIs. Ollama invokes the native supported client through a fixed Kujo bridge, rather than a second HTTP provider implementation.

Upstream `kujo-agents` correction `ce87309d8c920695cf5337ca76155ff188a7bf24`, branch `fix/canonical-manifest-validation`, repairs shared manifest validation for the existing VideoOps shape and adds regression coverage. All 85 manifests and 170 role schemas validate. Instructions and generators were not duplicated. That branch was pushed; it is not claimed merged. Original unrelated dirty upstream files were untouched.

Exact installation commits are in [sources.lock.json](../sources.lock.json), [accountability.lock.json](../config/accountability.lock.json) and [provider-sources.lock.json](../config/provider-sources.lock.json) and [eval-source.lock.json](../config/eval-source.lock.json). Runtime versions remain Kujo 1.9.0, Codex CLI 0.144.4, AJV 8.20.0 and ajv-formats 3.0.1 as pinned by the existing npm lock. The broader default-branch audit is an immutable baseline separate from those implementation pins.

## Verification and failures

See [release qualification](RELEASE-QUALIFICATION.md) for actual commands, outcomes and limits. Real rootless smoke/isolation/controller-death/pack checks pass. Both providers passed live structured-output smokes; complete mission outcomes are recorded separately in the qualification report. Actual accountability CLI tests pass. The stopped engine initially blocked tests, then was restored without reducing controls. An upstream VideoOps validator still fails with VM Stack underflow. Fresh-machine checks and production durable resume remain unqualified. Narrow additional CLI-runtime fixtures are recorded separately; they do not establish general language/framework compatibility. Full provider qualification remains incomplete.

## Security and release decision

No candidate host execution, candidate-controlled test mutation, provider credential mount, Docker socket mount, network fallback or deployment authorization was introduced. Skills and MCP discovery cannot grant permissions. Changed or injected package bytes fail closed, including tracked source hidden from Git status by index flags. Export checksums are integrity only; explicit trusted-key signatures authenticate attestations, not execution.

Foreman is excluded. Experimental cloud/remote/private packages remain optional or unavailable. No commercial service, BZBY or Agent City dependency was introduced. All other unimplemented capabilities remain visible in the inventory and acceptance manifest. Do not publish a feature-complete release until the continuation ledger's real execution gates pass.

## Phase B continuation

The additional lifecycle implementation is documented in [MISSION-ACCOUNTABILITY.md](MISSION-ACCOUNTABILITY.md), [EVALUATION.md](EVALUATION.md) and [RELEASE-POLICY.md](RELEASE-POLICY.md). Native Eval package 1.1.0 is pinned at `c1b263a10702c2fa8ab61ed507029a6bfec2e03d`; its emitted evaluator contract version is 2.0.0, a separate upstream version. That Phase B increment did not modify upstream source. Later adapters consume separately pinned inspected upstream contracts as recorded below. Model-backed mission and clean-checkout qualification results are recorded in the release report rather than inferred from module tests.

## Further integration continuation (2026-11-13)

The later continuation adds genuine executable paths while keeping the release blocked:

- Native Lens executes in the rootless Workcell image, with v3 approval and offline screenshot/report bindings. Existing API/browser checks and independent release authority remain required.
- Registry-backed role/skill contracts feed selected bounded Dispatch consultations; model proposals remain restricted and cannot approve implementation. A real selected-team Codex converter run completed with native v3 accounting/Lens, but source changed during execution and routing ordering changed afterward. It is not a final-source or every-role qualification.
- Git preparation uses private committed snapshots/worktrees, explicit local commits, bounded native diffs/conflict inspection and unpublished PR packets. A live public GitHub check read returned actual check runs. The standard Node repository helper preserves original files and prepares only implementation patches from independently approved v2/v3 code; no automatic commit/push occurs. One actual Node repair reached v3 approval and produced an uncommitted patch, with scoped audit/export/verification and unchanged original source.
- Pinned Scout/Scent/Redact compose bounded context with original byte provenance. Native Fence/Concord/ChangeBucket/PatchBrief and pure Kennel manifest validation operate on admitted private snapshots. These remain advisory; unimplemented retrieval, continuous telemetry and supply-chain capabilities are not implied.
- Factory Floor displays inert evidence, proposed diffs, usage and failures; an actual Workcell browser fixture checked 3 API and 17 browser cases. A separately granted local MCP transport supports owned operations without changing the default read-only surface. Tests use clearly labeled local subprocesses rather than model-success mocks.
- Native retained Dispatch inspect/plan, active-state archival snapshots, terminal evidence backup, retention dry-runs and read-only upstream pin-drift inspection are implemented. Process-kill tests show native uncertainty preservation and separate fixture approval continuation without repeating completed work. Production worker resume remains disabled.
- The independently reviewed specification path uses native Dispatch/Spec/RunLedger/CaseFile with separate restricted planner, writer and reviewer calls. It produces neither a human seal nor executed acceptance evidence. Live review qualification is recorded separately when available.
- Additional rootless CLI profiles have exact per-image positive/hostile fixture results in [CLI-RUNTIME-QUALIFICATION.json](CLI-RUNTIME-QUALIFICATION.json). Runtime availability, compiler-image construction and accepted application releases are different qualification levels.

New pins are recorded in [context.lock.json](../config/context.lock.json), [change-tools.lock.json](../config/change-tools.lock.json), [lens-source.lock.json](../config/lens-source.lock.json) and runtime source/package locks. Scout/Scent/Redact retain audited commits; Fence/Concord/PatchBrief/ChangeBucket use inspected newer snapshot/bounded-process contracts; Kennel uses only its pure validator closure. No upstream engines or instruction collections are duplicated. Source-hash/receipt tests remain evidence of the tested paths, not blanket approval of all upstream features.

The standalone adapters preserve original repository/config authority boundaries, reject symlinks/traversal, bound content and output, and never evaluate candidate code on the host. Operations additionally compares native Dispatch tracked bytes against pinned Git object identities so index flags cannot hide mutations. Failed native reports, prior test failures and blocked attempts are retained. Context intermediates contain private source and are not automatically exported or sent to agents.

See [RELEASE-QUALIFICATION.md](RELEASE-QUALIFICATION.md) for exact commands and failed cases, [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md) for remaining unsupported behavior, and [IMPLEMENTATION-LEDGER.md](IMPLEMENTATION-LEDGER.md) for continuation. Final-source aggregate checks, a complete second provider path, full role/workflow/runtime breadth and fresh-machine release gates still block the requested feature-complete release.

## Installed native CLI and local telemetry qualification

Workcell is now pinned and installed at `144ab49da88a17fd0d786d01d98030d7ec7798cb` on reviewed upstream branch `codex/workcell-readonly-workspace`. Its ancestor `099d1b6d17b38c8c247e8c6617649d8ea21ba157` adds opt-in read-only native workspace definition/policy handling and tests, preserving the existing default profile. The final commit updates official optional remote-adapter dependencies and bundled integrity metadata for security advisories. Upstream gates passed: 223 native unit, 23 portable unit, 30 adapter tests, 257 release-report checks, zero dependency audit vulnerabilities; remote live providers remain unqualified.

Factory native CLI v2 uses separate compile and execution leases and an independently observed read-only mount. Go and Rust each pass five actual functional/negative cases, seven shared security checks pass, and normal installed public CLI execution passes (Go 29.466 seconds, Rust 11.087 seconds). Exact images, logs, source hashes and evidence are in [CLI-RUNTIME-QUALIFICATION.json](CLI-RUNTIME-QUALIFICATION.json). The earlier noexec failure and v1 shared-workspace write violation remain retained; v1 is disabled. These results qualify Linux amd64 CLI fixtures, not services, frameworks or full language-specific missions.

Watchdog 1.2.2 at `7a0bd9a63d68421831ed66d6eed29805c48e1b24` supplies real native normalization, canonical validation, SQLite storage and canonical JSON export for local mission snapshots. Six tests pass after copy-integrity and dangling-symlink hardening; the prior repair mission produced 41 native records without a new model or engine call. Source hashes and sanitized metadata are retained; original source, prompts, arguments, arbitrary names and errors are excluded. Unknown token values stay null and costs are not estimated. Telemetry never grants approval or overrides a mission failure. No Watchdog upstream modification, proxy, exporter or continuous instrumentation is implied. Final-source aggregate verification remains pending.
