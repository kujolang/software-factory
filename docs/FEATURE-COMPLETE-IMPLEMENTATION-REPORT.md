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

Native Dispatch and Workcell remain the execution/isolation primitives at their original latest pins. Canonical role instructions and skill packages remain upstream-owned. Spec, RunLedger, CaseFile, ShipCheck and Eval run their actual pinned CLIs. Ollama invokes the native supported client through a fixed Kujo bridge, rather than a second HTTP provider implementation.

Upstream `kujo-agents` correction `ce87309d8c920695cf5337ca76155ff188a7bf24`, branch `fix/canonical-manifest-validation`, repairs shared manifest validation for the existing VideoOps shape and adds regression coverage. All 85 manifests and 170 role schemas validate. Instructions and generators were not duplicated. That branch was pushed; it is not claimed merged. Original unrelated dirty upstream files were untouched.

Exact installation commits are in [sources.lock.json](../sources.lock.json), [accountability.lock.json](../config/accountability.lock.json) and [provider-sources.lock.json](../config/provider-sources.lock.json) and [eval-source.lock.json](../config/eval-source.lock.json). Runtime versions remain Kujo 1.9.0, Codex CLI 0.144.4, AJV 8.20.0 and ajv-formats 3.0.1 as pinned by the existing npm lock. The broader default-branch audit is an immutable baseline separate from those implementation pins.

## Verification and failures

See [release qualification](RELEASE-QUALIFICATION.md) for actual commands, outcomes and limits. Real rootless smoke/isolation/controller-death/pack checks pass. Both providers passed live structured-output smokes; complete mission outcomes are recorded separately in the qualification report. Actual accountability CLI tests pass. The stopped engine initially blocked tests, then was restored without reducing controls. An upstream VideoOps validator still fails with VM Stack underflow. Fresh-machine, multiple-language and durable-resume matrix checks remain unexecuted. Full provider qualification remains incomplete.

## Security and release decision

No candidate host execution, candidate-controlled test mutation, provider credential mount, Docker socket mount, network fallback or deployment authorization was introduced. Skills and MCP discovery cannot grant permissions. Changed or injected package bytes fail closed, including tracked source hidden from Git status by index flags. Export checksums are integrity only; explicit trusted-key signatures authenticate attestations, not execution.

Foreman is excluded. Experimental cloud/remote/private packages remain optional or unavailable. No commercial service, BZBY or Agent City dependency was introduced. All other unimplemented capabilities remain visible in the inventory and acceptance manifest. Do not publish a feature-complete release until the continuation ledger's real execution gates pass.

## Phase B continuation

The additional lifecycle implementation is documented in [MISSION-ACCOUNTABILITY.md](MISSION-ACCOUNTABILITY.md), [EVALUATION.md](EVALUATION.md) and [RELEASE-POLICY.md](RELEASE-POLICY.md). Native Eval package 1.1.0 is pinned at `c1b263a10702c2fa8ab61ed507029a6bfec2e03d`; its emitted evaluator contract version is 2.0.0, a separate upstream version. No upstream source was modified for this continuation. Model-backed mission and clean-checkout qualification results are recorded in the release report rather than inferred from module tests.
