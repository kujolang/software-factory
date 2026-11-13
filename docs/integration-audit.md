# Integration audit

Audit date: 2026-11-13. Source baseline: `cfddc146e225229a9c15d3bf8ad2bfc01e2c8e24`. Default branches were fetched without changing sibling working trees. Every source below is pinned to the fetched commit; version labels do not substitute for the pin. This is source-contract review, not a claim that upstream tests or integrations passed. The machine-readable inventory is [factory-capabilities.json](../config/factory-capabilities.json).

The factory already imports native Dispatch and enforces Workcell isolation. It uses a fixed seven-role subset, Codex, independent Node/API/browser checks, software-pack seals and journals. Preserve those boundaries while adding catalogs and portable evidence. The inspected canonical registry has **85 agents, including all 28 Chain of Command roles**, and **136 skill packages**. Catalog availability does not imply executable role or runtime qualification.

## software-factory

- Source: `cfddc146e225229a9c15d3bf8ad2bfc01e2c8e24`; version 0.1.0; default branch `main`.
- Classification: present but incomplete; core. Maturity: Existing production implementation.
- Capability: Scoped Node proposal construction, rootless acceptance, immutable pack hashes, journal and export.
- Entry points: `bin/software-factory.mjs`.
- Contract evidence: `factory/bundle.schema.json`, `factory/contract.md`, `factory/event.schema.json`.
- Boundary: Factory controller owns release; local approval is not deployment authorization.
- Existing coverage inspected: `scripts/test-packs.mjs`, `tests/observer.test.mjs`, `tests/packs.test.mjs`, `tests/settings.test.mjs`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Retain independent gates; extend registry and evidence without expanding candidate effects.
- Source evidence: [README.md](https://github.com/kujolang/software-factory/blob/cfddc146e225229a9c15d3bf8ad2bfc01e2c8e24/README.md), [package.json](https://github.com/kujolang/software-factory/blob/cfddc146e225229a9c15d3bf8ad2bfc01e2c8e24/package.json), [CHANGELOG.md](https://github.com/kujolang/software-factory/blob/cfddc146e225229a9c15d3bf8ad2bfc01e2c8e24/CHANGELOG.md), [bin/software-factory.mjs](https://github.com/kujolang/software-factory/blob/cfddc146e225229a9c15d3bf8ad2bfc01e2c8e24/bin/software-factory.mjs), [factory/bundle.schema.json](https://github.com/kujolang/software-factory/blob/cfddc146e225229a9c15d3bf8ad2bfc01e2c8e24/factory/bundle.schema.json), [factory/contract.md](https://github.com/kujolang/software-factory/blob/cfddc146e225229a9c15d3bf8ad2bfc01e2c8e24/factory/contract.md), [scripts/test-packs.mjs](https://github.com/kujolang/software-factory/blob/cfddc146e225229a9c15d3bf8ad2bfc01e2c8e24/scripts/test-packs.mjs), [tests/observer.test.mjs](https://github.com/kujolang/software-factory/blob/cfddc146e225229a9c15d3bf8ad2bfc01e2c8e24/tests/observer.test.mjs).

## kujo

- Source: `7a13207019a51e61d3db448bc13f59d5b0e332e5`; version 1.9.0; default branch `main`.
- Classification: already integrated and verified; core. Maturity: Pinned runtime in package-lock.json.
- Capability: Language runtime, bounded processes, JSON/YAML/TOML, native docgen and package primitives.
- Entry points: `src/benchmarks/runner.rs`, `src/cli_output.rs`.
- Contract evidence: `benchmarks/langarena/UNSAFE_CONTRACT_REVIEW_2026_10_31.md`, `benchmarks/langarena/indexed-publication-contracts-2026-10-27.json`, `benchmarks/langarena/probes/native-call-contracts.kujo`, `benchmarks/langarena/probes/native-region-contracts.kujo`, `docs/CLI_MACHINE_READABLE_CONTRACTS.md`, `docs/EFFECT_CONTRACT_DIRECTION.md`, `docs/PROTOCOL_CONTRACTS.md`, `docs/research/token-efficiency/07-tool-schema-and-output-overhead.md`.
- Boundary: Trusted interpreter is not by itself Workcell isolation.
- Existing coverage inspected: `benchmarks/langarena/tests/compare-suite.sh`, `tests/agent_project_contracts.rs`, `tests/ai_redirect_policy.rs`, `tests/ai_replay_hermeticity_contract.rs`, `tests/ai_tool_history_contracts.rs`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Retain exact npm runtime 1.9.0; source head inventory does not upgrade binary.
- Source evidence: [README.md](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/README.md), [Cargo.toml](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/Cargo.toml), [CHANGELOG.md](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/CHANGELOG.md), [src/benchmarks/runner.rs](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/src/benchmarks/runner.rs), [src/cli_output.rs](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/src/cli_output.rs), [benchmarks/langarena/UNSAFE_CONTRACT_REVIEW_2026_10_31.md](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/benchmarks/langarena/UNSAFE_CONTRACT_REVIEW_2026_10_31.md), [benchmarks/langarena/indexed-publication-contracts-2026-10-27.json](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/benchmarks/langarena/indexed-publication-contracts-2026-10-27.json), [benchmarks/langarena/tests/compare-suite.sh](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/benchmarks/langarena/tests/compare-suite.sh), [tests/agent_project_contracts.rs](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/tests/agent_project_contracts.rs).

## dispatch

- Source: `18b5c737a73904ae942f0bd1c3baa1f77c2bfb40`; version 1.4.1; default branch `main`.
- Classification: already integrated and verified; core. Maturity: Existing native adapter; advanced recovery unqualified.
- Capability: DAG scheduling, typed steps, bounded concurrency/retries, approval and durable state.
- Entry points: `src/cli/bundled_workflow.kujo`, `src/cli/cli_args.kujo`.
- Contract evidence: `docs/audits/effect-assurance-contract-inventory.md`, `docs/contracts/assurance-profile.json`, `docs/contracts/beta-migration.md`, `docs/contracts/bindings-v1beta1.schema.json`, `docs/contracts/effect-set/decision.md`, `docs/contracts/effect-set/one-effect-admission.md`, `docs/contracts/effect-set/protocol.md`, `docs/contracts/effect-set/remote-threat-model.md`.
- Boundary: Dispatch owns orchestration/replay; effect correlation never grants replay authority.
- Existing coverage inspected: `interop/python-participant/tests/sdk_conformance.py`, `interop/python-participant/tests/test_codec.py`, `interop/python-participant/tests/test_sdk.py`, `tests/ability_assurance_fixture.kujo`, `tests/ability_assurance_integration.sh`. Tests were not executed by this audit.
- Factory overlap: Native orchestration already used.
- Decision: Extend existing factory/dispatch.kujo imports; qualify resume and resource controls before enabling.
- Source evidence: [README.md](https://github.com/kujolang/dispatch/blob/18b5c737a73904ae942f0bd1c3baa1f77c2bfb40/README.md), [kennel.toml](https://github.com/kujolang/dispatch/blob/18b5c737a73904ae942f0bd1c3baa1f77c2bfb40/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/dispatch/blob/18b5c737a73904ae942f0bd1c3baa1f77c2bfb40/CHANGELOG.md), [src/cli/bundled_workflow.kujo](https://github.com/kujolang/dispatch/blob/18b5c737a73904ae942f0bd1c3baa1f77c2bfb40/src/cli/bundled_workflow.kujo), [src/cli/cli_args.kujo](https://github.com/kujolang/dispatch/blob/18b5c737a73904ae942f0bd1c3baa1f77c2bfb40/src/cli/cli_args.kujo), [docs/audits/effect-assurance-contract-inventory.md](https://github.com/kujolang/dispatch/blob/18b5c737a73904ae942f0bd1c3baa1f77c2bfb40/docs/audits/effect-assurance-contract-inventory.md), [docs/contracts/assurance-profile.json](https://github.com/kujolang/dispatch/blob/18b5c737a73904ae942f0bd1c3baa1f77c2bfb40/docs/contracts/assurance-profile.json), [interop/python-participant/tests/sdk_conformance.py](https://github.com/kujolang/dispatch/blob/18b5c737a73904ae942f0bd1c3baa1f77c2bfb40/interop/python-participant/tests/sdk_conformance.py), [interop/python-participant/tests/test_codec.py](https://github.com/kujolang/dispatch/blob/18b5c737a73904ae942f0bd1c3baa1f77c2bfb40/interop/python-participant/tests/test_codec.py).

## workcell

- Source: `189d7ab6e975301a0e5100b65e8ad3fe4a584573`; version 1.3.0; default branch `main`.
- Classification: already integrated and verified; core. Maturity: Existing local adapter; remote and Git assurance experimental.
- Capability: Docker/Podman local isolation, strict definitions, receipt verification; alpha remote providers.
- Entry points: `main.kujo`, `src/backend/client.kujo`.
- Contract evidence: `docs/contracts/assurance-profile.json`, `docs/contracts/bindings-v1beta1.schema.json`, `docs/contracts/git-assurance-profile.md`, `docs/contracts/git-process-handoff-v1alpha1.schema.json`, `docs/plans/backend-matrix/07-backend-contract.md`, `docs/plans/backend-matrix/BACKEND_CONTRACT_PROPOSAL.json`, `schemas/execution-result-v1.schema.json`, `schemas/preservation-outcome-v1.schema.json`.
- Boundary: Never fall back to host; credentials and Docker socket stay outside candidate.
- Existing coverage inspected: `tests/adapter_release_candidate.sh`, `tests/adversarial.sh`, `tests/artifact_archive_test.kujo`, `tests/backend_matrix_productionization.json`, `tests/backend_test.kujo`. Tests were not executed by this audit.
- Factory overlap: Rootless execution and receipt checks already used.
- Decision: Preserve existing rootless Docker/seccomp profile; qualify new images and backends individually.
- Source evidence: [README.md](https://github.com/kujolang/workcell/blob/189d7ab6e975301a0e5100b65e8ad3fe4a584573/README.md), [VERSION](https://github.com/kujolang/workcell/blob/189d7ab6e975301a0e5100b65e8ad3fe4a584573/VERSION), [kennel.toml](https://github.com/kujolang/workcell/blob/189d7ab6e975301a0e5100b65e8ad3fe4a584573/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/workcell/blob/189d7ab6e975301a0e5100b65e8ad3fe4a584573/CHANGELOG.md), [main.kujo](https://github.com/kujolang/workcell/blob/189d7ab6e975301a0e5100b65e8ad3fe4a584573/main.kujo), [src/backend/client.kujo](https://github.com/kujolang/workcell/blob/189d7ab6e975301a0e5100b65e8ad3fe4a584573/src/backend/client.kujo), [docs/contracts/assurance-profile.json](https://github.com/kujolang/workcell/blob/189d7ab6e975301a0e5100b65e8ad3fe4a584573/docs/contracts/assurance-profile.json), [docs/contracts/bindings-v1beta1.schema.json](https://github.com/kujolang/workcell/blob/189d7ab6e975301a0e5100b65e8ad3fe4a584573/docs/contracts/bindings-v1beta1.schema.json), [tests/adapter_release_candidate.sh](https://github.com/kujolang/workcell/blob/189d7ab6e975301a0e5100b65e8ad3fe4a584573/tests/adapter_release_candidate.sh), [tests/adversarial.sh](https://github.com/kujolang/workcell/blob/189d7ab6e975301a0e5100b65e8ad3fe4a584573/tests/adversarial.sh).

## kujo-agents

- Source: `a7e9d0236d6e64b5db30273b32f4ad8c124f5173`; version 1.5.0; default branch `main`.
- Classification: present but incomplete; core. Maturity: Canonical registry available; current factory runs fixed subset.
- Capability: 85 canonical role packages including 28 Chain of Command roles, role schemas and skills.
- Entry points: `agent-registry.json`, `chain-of-command/general-commander/manifest.json`.
- Contract evidence: `chain-of-command/backend-developer/input.schema.json`, `chain-of-command/backend-developer/output.schema.json`, `chain-of-command/chief-of-staff/input.schema.json`, `chain-of-command/chief-of-staff/output.schema.json`, `chain-of-command/code-reviewer/input.schema.json`, `chain-of-command/code-reviewer/output.schema.json`, `chain-of-command/context-packager/input.schema.json`, `chain-of-command/context-packager/output.schema.json`.
- Boundary: Canonical instructions are guidance; role output does not authorize release or tools.
- Existing coverage inspected: `videoops/tools/tests/run.sh`, `videoops/tools/tests/test_audio_qa.py`, `videoops/tools/tests/test_media.py`, `videoops/tools/tests/test_review.py`. Tests were not executed by this audit.
- Factory overlap: Seven fixed roles referenced.
- Decision: Pin full registry; select per mission and enforce permissions in host.
- Source evidence: [README.md](https://github.com/kujolang/kujo-agents/blob/a7e9d0236d6e64b5db30273b32f4ad8c124f5173/README.md), [VERSION](https://github.com/kujolang/kujo-agents/blob/a7e9d0236d6e64b5db30273b32f4ad8c124f5173/VERSION), [CHANGELOG.md](https://github.com/kujolang/kujo-agents/blob/a7e9d0236d6e64b5db30273b32f4ad8c124f5173/CHANGELOG.md), [agent-registry.json](https://github.com/kujolang/kujo-agents/blob/a7e9d0236d6e64b5db30273b32f4ad8c124f5173/agent-registry.json), [chain-of-command/general-commander/manifest.json](https://github.com/kujolang/kujo-agents/blob/a7e9d0236d6e64b5db30273b32f4ad8c124f5173/chain-of-command/general-commander/manifest.json), [chain-of-command/backend-developer/input.schema.json](https://github.com/kujolang/kujo-agents/blob/a7e9d0236d6e64b5db30273b32f4ad8c124f5173/chain-of-command/backend-developer/input.schema.json), [chain-of-command/backend-developer/output.schema.json](https://github.com/kujolang/kujo-agents/blob/a7e9d0236d6e64b5db30273b32f4ad8c124f5173/chain-of-command/backend-developer/output.schema.json), [videoops/tools/tests/run.sh](https://github.com/kujolang/kujo-agents/blob/a7e9d0236d6e64b5db30273b32f4ad8c124f5173/videoops/tools/tests/run.sh), [videoops/tools/tests/test_audio_qa.py](https://github.com/kujolang/kujo-agents/blob/a7e9d0236d6e64b5db30273b32f4ad8c124f5173/videoops/tools/tests/test_audio_qa.py).

## agents-sdk

- Source: `70cd1fb780cf102dd4d09d2d5ba4d24a85ce462c`; version 1.1.3; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released SDK; controlled interoperability experimental.
- Capability: Agent runner/tools/context/budgets.
- Entry points: `src/agents/index.kujo`, `src/agents/runner.kujo`.
- Contract evidence: `docs/CONTEXT_CONTRACTS.md`, `schemas/ability-handoff-v1alpha1.schema.json`, `src/agents/abilities/contract.kujo`, `tests/ability_contract_tests.kujo`, `tests/arch_event_contract_tests.kujo`, `tests/artifact_store_contract_tests.kujo`, `tests/budget_limits_contract_tests.kujo`, `tests/handoff_contract_tests.kujo`.
- Boundary: Tool policy is host-owned; unknown usage remains unknown; mock output is not live qualification.
- Existing coverage inspected: `tests/ability_contract_tests.kujo`, `tests/agents_sdk_eval.json`, `tests/ai_adapter_boundary_tests.kujo`, `tests/arch_core_types_tests.kujo`, `tests/arch_error_model_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Reuse reviewed SDK contracts behind restricted factory provider adapter; preserve fixed output boundary.
- Source evidence: [README.md](https://github.com/kujolang/agents-sdk/blob/70cd1fb780cf102dd4d09d2d5ba4d24a85ce462c/README.md), [kennel.toml](https://github.com/kujolang/agents-sdk/blob/70cd1fb780cf102dd4d09d2d5ba4d24a85ce462c/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/agents-sdk/blob/70cd1fb780cf102dd4d09d2d5ba4d24a85ce462c/CHANGELOG.md), [src/agents/index.kujo](https://github.com/kujolang/agents-sdk/blob/70cd1fb780cf102dd4d09d2d5ba4d24a85ce462c/src/agents/index.kujo), [src/agents/runner.kujo](https://github.com/kujolang/agents-sdk/blob/70cd1fb780cf102dd4d09d2d5ba4d24a85ce462c/src/agents/runner.kujo), [docs/CONTEXT_CONTRACTS.md](https://github.com/kujolang/agents-sdk/blob/70cd1fb780cf102dd4d09d2d5ba4d24a85ce462c/docs/CONTEXT_CONTRACTS.md), [schemas/ability-handoff-v1alpha1.schema.json](https://github.com/kujolang/agents-sdk/blob/70cd1fb780cf102dd4d09d2d5ba4d24a85ce462c/schemas/ability-handoff-v1alpha1.schema.json), [tests/ability_contract_tests.kujo](https://github.com/kujolang/agents-sdk/blob/70cd1fb780cf102dd4d09d2d5ba4d24a85ce462c/tests/ability_contract_tests.kujo), [tests/agents_sdk_eval.json](https://github.com/kujolang/agents-sdk/blob/70cd1fb780cf102dd4d09d2d5ba4d24a85ce462c/tests/agents_sdk_eval.json).

## ai-sdk

- Source: `9083c0a8dd827dabdc840ac79a8fc07844d4888b`; version 1.2.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released SDK; provider capabilities differ.
- Capability: Provider-neutral model/embedding calls, structured output, capability and usage contracts.
- Entry points: `src/provider_driver.kujo`, `src/providers.kujo`.
- Contract evidence: `docs/API_CONTRACT_POLICY.md`, `docs/KUJO_PROVIDER_PACKAGE_CONTRACT_V1.md`, `docs/KUJO_PROVIDER_PACKAGE_CONTRACT_V1_CONFORMANCE.md`, `docs/PROVIDER_PACKAGE_CONTRACT_V1_IMPLEMENTATION_REPORT.md`, `schemas/contracts/1.0.0/chat_success.schema.json`, `schemas/contracts/1.0.0/embeddings_success.schema.json`, `schemas/contracts/1.0.0/error.schema.json`, `tests/provider_driver_contract_tests.kujo`.
- Boundary: Tool policy is host-owned; unknown usage remains unknown; mock output is not live qualification.
- Existing coverage inspected: `tests/ai_sdk_eval.json`, `tests/atomic_accounting_tests.kujo`, `tests/bugfix_regression_tests.kujo`, `tests/external_driver_fixture_tests.kujo`, `tests/fallback_governance_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Reuse reviewed SDK contracts behind restricted factory provider adapter; preserve fixed output boundary.
- Source evidence: [README.md](https://github.com/kujolang/ai-sdk/blob/9083c0a8dd827dabdc840ac79a8fc07844d4888b/README.md), [kennel.toml](https://github.com/kujolang/ai-sdk/blob/9083c0a8dd827dabdc840ac79a8fc07844d4888b/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/ai-sdk/blob/9083c0a8dd827dabdc840ac79a8fc07844d4888b/CHANGELOG.md), [src/provider_driver.kujo](https://github.com/kujolang/ai-sdk/blob/9083c0a8dd827dabdc840ac79a8fc07844d4888b/src/provider_driver.kujo), [src/providers.kujo](https://github.com/kujolang/ai-sdk/blob/9083c0a8dd827dabdc840ac79a8fc07844d4888b/src/providers.kujo), [docs/API_CONTRACT_POLICY.md](https://github.com/kujolang/ai-sdk/blob/9083c0a8dd827dabdc840ac79a8fc07844d4888b/docs/API_CONTRACT_POLICY.md), [docs/KUJO_PROVIDER_PACKAGE_CONTRACT_V1.md](https://github.com/kujolang/ai-sdk/blob/9083c0a8dd827dabdc840ac79a8fc07844d4888b/docs/KUJO_PROVIDER_PACKAGE_CONTRACT_V1.md), [tests/ai_sdk_eval.json](https://github.com/kujolang/ai-sdk/blob/9083c0a8dd827dabdc840ac79a8fc07844d4888b/tests/ai_sdk_eval.json), [tests/atomic_accounting_tests.kujo](https://github.com/kujolang/ai-sdk/blob/9083c0a8dd827dabdc840ac79a8fc07844d4888b/tests/atomic_accounting_tests.kujo).

## kujo-skills

- Source: `76c249632b08bc6e2c6d08846094040ac94f4b91`; version 0.7.1; default branch `main`.
- Classification: available upstream and ready for integration; core. Maturity: Technical preview catalog 0.7.1.
- Capability: 136 full skill packages with routing guidance and optional resources.
- Entry points: `scripts/validate_skills.py`, `skills/kujo-way-development/SKILL.md`.
- Contract evidence: `docs/webops-toolchain-contract.json`, `skills/kujo-cli-contracts/SKILL.md`, `skills/kujo-release-video/references/input-contract.md`, `skills/kujo-video-styles/references/00-shared-contract.md`, `skills/webops-schema-and-metadata/SKILL.md`.
- Boundary: Untrusted guidance is not a permission mechanism.
- Existing coverage inspected: `tests/clean-checkout.sh`, `tests/eval.json`, `tests/launch-preflight.sh`, `tests/release-readiness.sh`, `tests/tool-artifacts-guard.sh`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Install complete pinned packages; hash and validate all resources; activation cannot grant effects.
- Source evidence: [README.md](https://github.com/kujolang/kujo-skills/blob/76c249632b08bc6e2c6d08846094040ac94f4b91/README.md), [package.json](https://github.com/kujolang/kujo-skills/blob/76c249632b08bc6e2c6d08846094040ac94f4b91/package.json), [VERSION](https://github.com/kujolang/kujo-skills/blob/76c249632b08bc6e2c6d08846094040ac94f4b91/VERSION), [CHANGELOG.md](https://github.com/kujolang/kujo-skills/blob/76c249632b08bc6e2c6d08846094040ac94f4b91/CHANGELOG.md), [scripts/validate_skills.py](https://github.com/kujolang/kujo-skills/blob/76c249632b08bc6e2c6d08846094040ac94f4b91/scripts/validate_skills.py), [skills/kujo-way-development/SKILL.md](https://github.com/kujolang/kujo-skills/blob/76c249632b08bc6e2c6d08846094040ac94f4b91/skills/kujo-way-development/SKILL.md), [docs/webops-toolchain-contract.json](https://github.com/kujolang/kujo-skills/blob/76c249632b08bc6e2c6d08846094040ac94f4b91/docs/webops-toolchain-contract.json), [skills/kujo-cli-contracts/SKILL.md](https://github.com/kujolang/kujo-skills/blob/76c249632b08bc6e2c6d08846094040ac94f4b91/skills/kujo-cli-contracts/SKILL.md), [tests/clean-checkout.sh](https://github.com/kujolang/kujo-skills/blob/76c249632b08bc6e2c6d08846094040ac94f4b91/tests/clean-checkout.sh), [tests/eval.json](https://github.com/kujolang/kujo-skills/blob/76c249632b08bc6e2c6d08846094040ac94f4b91/tests/eval.json).

## kujo-workflows

- Source: `d766eae4fd9a131e51c34796d029fd3bc6974689`; version 0.6.2; default branch `main`.
- Classification: available upstream but requiring an adapter; core. Maturity: Technical preview catalog 0.6.2.
- Capability: Local workflow kits, fixture harnesses, and documented handoffs.
- Entry points: `scripts/validate_catalog.py`, `loop-engineering/scripts/run-workflow.sh`.
- Contract evidence: `agency-runner/schemas/recipe.schema.json`, `agency-runner/schemas/run-state.schema.json`, `agency-runner/schemas/site-profile.schema.json`, `contracts/README.md`, `contracts/examples/publishing-house-agent-step-receipt.json`, `contracts/examples/publishing-house-agent-step-request.json`, `contracts/examples/publishing-house-approval-pause.json`, `contracts/examples/publishing-house-capability-receipt.json`.
- Boundary: Workflow scripts are trusted executable code, not declarative authorization.
- Existing coverage inspected: `codebase-cleanup/tests/cleanup_tests.kujo`, `publishing-house-operator/tests/test_operator.py`, `tests/clean-checkout.sh`, `tests/fixtures/videoops/expected/integration-proof.json`, `tests/publishing-house-install.sh`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Catalog all kits; validate and adapt mission templates to native Dispatch, never execute arbitrary kit shell from a mission.
- Source evidence: [README.md](https://github.com/kujolang/kujo-workflows/blob/d766eae4fd9a131e51c34796d029fd3bc6974689/README.md), [package.json](https://github.com/kujolang/kujo-workflows/blob/d766eae4fd9a131e51c34796d029fd3bc6974689/package.json), [VERSION](https://github.com/kujolang/kujo-workflows/blob/d766eae4fd9a131e51c34796d029fd3bc6974689/VERSION), [CHANGELOG.md](https://github.com/kujolang/kujo-workflows/blob/d766eae4fd9a131e51c34796d029fd3bc6974689/CHANGELOG.md), [scripts/validate_catalog.py](https://github.com/kujolang/kujo-workflows/blob/d766eae4fd9a131e51c34796d029fd3bc6974689/scripts/validate_catalog.py), [loop-engineering/scripts/run-workflow.sh](https://github.com/kujolang/kujo-workflows/blob/d766eae4fd9a131e51c34796d029fd3bc6974689/loop-engineering/scripts/run-workflow.sh), [agency-runner/schemas/recipe.schema.json](https://github.com/kujolang/kujo-workflows/blob/d766eae4fd9a131e51c34796d029fd3bc6974689/agency-runner/schemas/recipe.schema.json), [agency-runner/schemas/run-state.schema.json](https://github.com/kujolang/kujo-workflows/blob/d766eae4fd9a131e51c34796d029fd3bc6974689/agency-runner/schemas/run-state.schema.json), [codebase-cleanup/tests/cleanup_tests.kujo](https://github.com/kujolang/kujo-workflows/blob/d766eae4fd9a131e51c34796d029fd3bc6974689/codebase-cleanup/tests/cleanup_tests.kujo), [publishing-house-operator/tests/test_operator.py](https://github.com/kujolang/kujo-workflows/blob/d766eae4fd9a131e51c34796d029fd3bc6974689/publishing-house-operator/tests/test_operator.py).

## spec

- Source: `36da0d7216587809e32dedb91dee3cf4b9e50af1`; version 1.0.2; default branch `main`.
- Classification: available upstream but requiring an adapter; core. Maturity: Local CLI; integration unqualified.
- Capability: Validated task contracts, JSON/YAML/TOML conversion and agent export envelopes.
- Entry points: `src/common.kujo`, `src/convert.kujo`.
- Contract evidence: `schema/spec.schema.json`.
- Boundary: Spec validation checks structure, not correctness or completeness of acceptance.
- Existing coverage inspected: `tests/benchmark.sh`, `tests/benchmark_trend_budgets.json`, `tests/fuzz.sh`, `tests/run_tests.sh`, `tests/test_helpers.sh`. Tests were not executed by this audit.
- Factory overlap: Pack contract validation/sealing.
- Decision: Project reviewed packs to Spec JSON, validate/export before sealing; freeze original and projection hashes.
- Source evidence: [README.md](https://github.com/kujolang/spec/blob/36da0d7216587809e32dedb91dee3cf4b9e50af1/README.md), [package.json](https://github.com/kujolang/spec/blob/36da0d7216587809e32dedb91dee3cf4b9e50af1/package.json), [VERSION](https://github.com/kujolang/spec/blob/36da0d7216587809e32dedb91dee3cf4b9e50af1/VERSION), [kennel.toml](https://github.com/kujolang/spec/blob/36da0d7216587809e32dedb91dee3cf4b9e50af1/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/spec/blob/36da0d7216587809e32dedb91dee3cf4b9e50af1/CHANGELOG.md), [src/common.kujo](https://github.com/kujolang/spec/blob/36da0d7216587809e32dedb91dee3cf4b9e50af1/src/common.kujo), [src/convert.kujo](https://github.com/kujolang/spec/blob/36da0d7216587809e32dedb91dee3cf4b9e50af1/src/convert.kujo), [schema/spec.schema.json](https://github.com/kujolang/spec/blob/36da0d7216587809e32dedb91dee3cf4b9e50af1/schema/spec.schema.json), [tests/benchmark.sh](https://github.com/kujolang/spec/blob/36da0d7216587809e32dedb91dee3cf4b9e50af1/tests/benchmark.sh), [tests/benchmark_trend_budgets.json](https://github.com/kujolang/spec/blob/36da0d7216587809e32dedb91dee3cf4b9e50af1/tests/benchmark_trend_budgets.json).

## eval

- Source: `c1b263a10702c2fa8ab61ed507029a6bfec2e03d`; version 1.1.0; default branch `main`.
- Classification: available upstream but requiring an adapter; core. Maturity: Stable upstream; factory adapter unqualified.
- Capability: 27 deterministic checks, artifact manifests, run comparison, producer-neutral evaluation results.
- Entry points: `main.kujo`, `src/cli.kujo`.
- Contract evidence: `examples/enterprise_api_contract_gate.json`, `examples/fixtures/api_contract_response.json`, `examples/fixtures/contracts/artifact-manifest.fixture.json`, `examples/fixtures/contracts/cli-summary.fixture.json`, `examples/fixtures/contracts/policy-explain-input-suite.json`, `examples/fixtures/contracts/policy-explain.fixture.json`, `examples/fixtures/contracts/summary.fixture.json`, `schema/eval-suite.schema.json`.
- Boundary: A suite can execute commands; candidate-owned suites cannot run on controller host.
- Existing coverage inspected: `tests/benchmark_tests.kujo`, `tests/cli_integration_tests.kujo`, `tests/contract_tests.kujo`, `tests/control_contract_tests.kujo`, `tests/coverage_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: Node deterministic tests and trusted acceptance.
- Decision: Run controller-owned suites on evidence; execute candidate commands only inside Workcell.
- Source evidence: [README.md](https://github.com/kujolang/eval/blob/c1b263a10702c2fa8ab61ed507029a6bfec2e03d/README.md), [kennel.toml](https://github.com/kujolang/eval/blob/c1b263a10702c2fa8ab61ed507029a6bfec2e03d/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/eval/blob/c1b263a10702c2fa8ab61ed507029a6bfec2e03d/CHANGELOG.md), [main.kujo](https://github.com/kujolang/eval/blob/c1b263a10702c2fa8ab61ed507029a6bfec2e03d/main.kujo), [src/cli.kujo](https://github.com/kujolang/eval/blob/c1b263a10702c2fa8ab61ed507029a6bfec2e03d/src/cli.kujo), [examples/enterprise_api_contract_gate.json](https://github.com/kujolang/eval/blob/c1b263a10702c2fa8ab61ed507029a6bfec2e03d/examples/enterprise_api_contract_gate.json), [examples/fixtures/api_contract_response.json](https://github.com/kujolang/eval/blob/c1b263a10702c2fa8ab61ed507029a6bfec2e03d/examples/fixtures/api_contract_response.json), [tests/benchmark_tests.kujo](https://github.com/kujolang/eval/blob/c1b263a10702c2fa8ab61ed507029a6bfec2e03d/tests/benchmark_tests.kujo), [tests/cli_integration_tests.kujo](https://github.com/kujolang/eval/blob/c1b263a10702c2fa8ab61ed507029a6bfec2e03d/tests/cli_integration_tests.kujo).

## shipcheck

- Source: `7eedd9e02d8730d65e06e16f4984d909d23539bc`; version 1.0.2; default branch `main`.
- Classification: available upstream but requiring an adapter; core. Maturity: Production-forward alpha.
- Capability: Repository readiness scanner and deterministic error-level gate.
- Entry points: `shipcheck.kujo`, `src/checks.kujo`.
- Contract evidence: `schemas/shipcheck-report.schema.json`.
- Boundary: Readiness metadata is not actual test execution, security certification, or deploy authorization.
- Existing coverage inspected: `tests/benchmark.py`, `tests/cli-output-contract.sh`, `tests/git-portability.mjs`, `tests/hardening-contract.py`, `tests/shipcheck_eval.json`. Tests were not executed by this audit.
- Factory overlap: Independent release verifier and recheck.
- Decision: Consume gate JSON as additional evidence under the existing release authority.
- Source evidence: [README.md](https://github.com/kujolang/shipcheck/blob/7eedd9e02d8730d65e06e16f4984d909d23539bc/README.md), [kennel.toml](https://github.com/kujolang/shipcheck/blob/7eedd9e02d8730d65e06e16f4984d909d23539bc/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/shipcheck/blob/7eedd9e02d8730d65e06e16f4984d909d23539bc/CHANGELOG.md), [shipcheck.kujo](https://github.com/kujolang/shipcheck/blob/7eedd9e02d8730d65e06e16f4984d909d23539bc/shipcheck.kujo), [src/checks.kujo](https://github.com/kujolang/shipcheck/blob/7eedd9e02d8730d65e06e16f4984d909d23539bc/src/checks.kujo), [schemas/shipcheck-report.schema.json](https://github.com/kujolang/shipcheck/blob/7eedd9e02d8730d65e06e16f4984d909d23539bc/schemas/shipcheck-report.schema.json), [tests/benchmark.py](https://github.com/kujolang/shipcheck/blob/7eedd9e02d8730d65e06e16f4984d909d23539bc/tests/benchmark.py), [tests/cli-output-contract.sh](https://github.com/kujolang/shipcheck/blob/7eedd9e02d8730d65e06e16f4984d909d23539bc/tests/cli-output-contract.sh).

## runledger

- Source: `ab0ec5d2edb7ffd913f48d092aa6fc17cab58d13`; version 1.2.1; default branch `main`.
- Classification: available upstream but requiring an adapter; core. Maturity: Local stable receipt CLI.
- Capability: Local run receipts with Git facts and supplied usage, tests and verdicts.
- Entry points: `src/cli.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Records supplied claims; does not execute tests or independently prove their truth.
- Existing coverage inspected: `tests/cli_integration.sh`, `tests/run.sh`, `tests/runledger_test.kujo`. Tests were not executed by this audit.
- Factory overlap: Per-run JSON and event journal.
- Decision: Start one record per mission/agent; append observed test and usage facts, preserve unknown costs.
- Source evidence: [README.md](https://github.com/kujolang/runledger/blob/ab0ec5d2edb7ffd913f48d092aa6fc17cab58d13/README.md), [VERSION](https://github.com/kujolang/runledger/blob/ab0ec5d2edb7ffd913f48d092aa6fc17cab58d13/VERSION), [kennel.toml](https://github.com/kujolang/runledger/blob/ab0ec5d2edb7ffd913f48d092aa6fc17cab58d13/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/runledger/blob/ab0ec5d2edb7ffd913f48d092aa6fc17cab58d13/CHANGELOG.md), [src/cli.kujo](https://github.com/kujolang/runledger/blob/ab0ec5d2edb7ffd913f48d092aa6fc17cab58d13/src/cli.kujo), [tests/cli_integration.sh](https://github.com/kujolang/runledger/blob/ab0ec5d2edb7ffd913f48d092aa6fc17cab58d13/tests/cli_integration.sh), [tests/run.sh](https://github.com/kujolang/runledger/blob/ab0ec5d2edb7ffd913f48d092aa6fc17cab58d13/tests/run.sh).

## casefile

- Source: `92e1d9bee2faaba322476e82dcea7510850885e0`; version 1.0.2; default branch `main`.
- Classification: available upstream but requiring an adapter; core. Maturity: Local CLI; no hostile-workspace sandbox.
- Capability: Failure bundles, command/log capture, redaction, reproduction and classification.
- Entry points: `casefile.kujo`, `src/capture.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Command capture executes trusted host code; never pass candidate commands. Pattern redaction is incomplete.
- Existing coverage inspected: `tests/casefile_cli_test_v2.kujo`, `tests/casefile_eval.json`, `tests/measure_capture.py`, `tests/native-smoke.mjs`, `tests/test_hardening.py`. Tests were not executed by this audit.
- Factory overlap: Failed acceptance artifacts.
- Decision: Capture existing failed Workcell logs with log mode; retain every failed attempt.
- Source evidence: [README.md](https://github.com/kujolang/casefile/blob/92e1d9bee2faaba322476e82dcea7510850885e0/README.md), [VERSION](https://github.com/kujolang/casefile/blob/92e1d9bee2faaba322476e82dcea7510850885e0/VERSION), [kennel.toml](https://github.com/kujolang/casefile/blob/92e1d9bee2faaba322476e82dcea7510850885e0/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/casefile/blob/92e1d9bee2faaba322476e82dcea7510850885e0/CHANGELOG.md), [casefile.kujo](https://github.com/kujolang/casefile/blob/92e1d9bee2faaba322476e82dcea7510850885e0/casefile.kujo), [src/capture.kujo](https://github.com/kujolang/casefile/blob/92e1d9bee2faaba322476e82dcea7510850885e0/src/capture.kujo), [tests/casefile_cli_test_v2.kujo](https://github.com/kujolang/casefile/blob/92e1d9bee2faaba322476e82dcea7510850885e0/tests/casefile_cli_test_v2.kujo), [tests/casefile_eval.json](https://github.com/kujolang/casefile/blob/92e1d9bee2faaba322476e82dcea7510850885e0/tests/casefile_eval.json).

## lens

- Source: `91049646d70c11bf0c6071f39cf7dfac6b1ba70b`; version 1.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released 1.1.1; factory image adapter unqualified.
- Capability: Browser checks, flows, console/network/layout/accessibility evidence, screenshots and reports.
- Entry points: `src/provider.kujo`, `src/runner.kujo`.
- Contract evidence: `examples/flow.schema.json`.
- Boundary: Browser URLs/content are untrusted; do not run candidate browser code on host.
- Existing coverage inspected: `scripts/test-benchmark-harness.py`, `scripts/test-visual-diff.py`, `tests/fixtures/scoped_clone.kujo`, `tests/lens_eval.json`, `tests/lens_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: Trusted browser acceptance.
- Decision: Run pinned Lens browser bridge in qualified trusted Workcell image and preserve current oracle.
- Source evidence: [README.md](https://github.com/kujolang/lens/blob/91049646d70c11bf0c6071f39cf7dfac6b1ba70b/README.md), [kennel.toml](https://github.com/kujolang/lens/blob/91049646d70c11bf0c6071f39cf7dfac6b1ba70b/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/lens/blob/91049646d70c11bf0c6071f39cf7dfac6b1ba70b/CHANGELOG.md), [src/provider.kujo](https://github.com/kujolang/lens/blob/91049646d70c11bf0c6071f39cf7dfac6b1ba70b/src/provider.kujo), [src/runner.kujo](https://github.com/kujolang/lens/blob/91049646d70c11bf0c6071f39cf7dfac6b1ba70b/src/runner.kujo), [examples/flow.schema.json](https://github.com/kujolang/lens/blob/91049646d70c11bf0c6071f39cf7dfac6b1ba70b/examples/flow.schema.json), [scripts/test-benchmark-harness.py](https://github.com/kujolang/lens/blob/91049646d70c11bf0c6071f39cf7dfac6b1ba70b/scripts/test-benchmark-harness.py), [scripts/test-visual-diff.py](https://github.com/kujolang/lens/blob/91049646d70c11bf0c6071f39cf7dfac6b1ba70b/scripts/test-visual-diff.py).

## watchdog

- Source: `7a0bd9a63d68421831ed66d6eed29805c48e1b24`; version 1.2.2; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released local telemetry; host configuration required.
- Capability: Local model proxy and metadata telemetry, native event ingestion and optional exporters.
- Entry points: `dashboard_server.kujo`, `demo.kujo`.
- Contract evidence: `docs/native-event-contract.md`, `docs/plans/telemetry-interoperability/02-current-telemetry-contracts.md`, `docs/plans/telemetry-interoperability/10-ingestion-adapter-contract.md`, `docs/plans/telemetry-interoperability/11-exporter-contract.md`, `docs/plans/telemetry-interoperability/TELEMETRY_SCHEMA_PROPOSAL.json`, `schemas/telemetry-trace-v1.schema.json`, `schemas/telemetry-v2.schema.json`, `schemas/watchdog-exporter-v1.schema.json`.
- Boundary: Observational only; telemetry never grants retry/approval, no raw source or secrets by default.
- Existing coverage inspected: `tests/agents_sdk_shared_client_integration.mjs`, `tests/claude_code_adapter_suite.mjs`, `tests/connected_sources_eval.json`, `tests/fixtures/agents_sdk_watchdog_batch.kujo`, `tests/fixtures/http_server_smoke.kujo`. Tests were not executed by this audit.
- Factory overlap: Factory event journal and provider usage.
- Decision: Emit bounded content-off lifecycle events; explicit consent for proxy/exporters.
- Source evidence: [README.md](https://github.com/kujolang/watchdog/blob/7a0bd9a63d68421831ed66d6eed29805c48e1b24/README.md), [VERSION](https://github.com/kujolang/watchdog/blob/7a0bd9a63d68421831ed66d6eed29805c48e1b24/VERSION), [kennel.toml](https://github.com/kujolang/watchdog/blob/7a0bd9a63d68421831ed66d6eed29805c48e1b24/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/watchdog/blob/7a0bd9a63d68421831ed66d6eed29805c48e1b24/CHANGELOG.md), [dashboard_server.kujo](https://github.com/kujolang/watchdog/blob/7a0bd9a63d68421831ed66d6eed29805c48e1b24/dashboard_server.kujo), [demo.kujo](https://github.com/kujolang/watchdog/blob/7a0bd9a63d68421831ed66d6eed29805c48e1b24/demo.kujo), [docs/native-event-contract.md](https://github.com/kujolang/watchdog/blob/7a0bd9a63d68421831ed66d6eed29805c48e1b24/docs/native-event-contract.md), [docs/plans/telemetry-interoperability/02-current-telemetry-contracts.md](https://github.com/kujolang/watchdog/blob/7a0bd9a63d68421831ed66d6eed29805c48e1b24/docs/plans/telemetry-interoperability/02-current-telemetry-contracts.md), [tests/agents_sdk_shared_client_integration.mjs](https://github.com/kujolang/watchdog/blob/7a0bd9a63d68421831ed66d6eed29805c48e1b24/tests/agents_sdk_shared_client_integration.mjs), [tests/claude_code_adapter_suite.mjs](https://github.com/kujolang/watchdog/blob/7a0bd9a63d68421831ed66d6eed29805c48e1b24/tests/claude_code_adapter_suite.mjs).

## concord

- Source: `f8812e7f00f55e4d1d3f46e70d902bce89ec7be7`; version 1.1.2; default branch `main`.
- Classification: experimental or requiring additional qualification; optional. Maturity: Explicit experimental/early manifest.
- Capability: Heuristic CLI/docs/manifest/version artifact drift checks.
- Entry points: `src/checks/cli_docs.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Scanner is not a sandbox or proof of documentation completeness.
- Existing coverage inspected: `tests/concord_eval.json`, `tests/concord_tests.kujo`, `tests/continuous_loop_tests.sh`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Advisory scan against reviewed repository snapshot; only approved explicit checks may block.
- Source evidence: [README.md](https://github.com/kujolang/concord/blob/f8812e7f00f55e4d1d3f46e70d902bce89ec7be7/README.md), [kennel.toml](https://github.com/kujolang/concord/blob/f8812e7f00f55e4d1d3f46e70d902bce89ec7be7/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/concord/blob/f8812e7f00f55e4d1d3f46e70d902bce89ec7be7/CHANGELOG.md), [src/checks/cli_docs.kujo](https://github.com/kujolang/concord/blob/f8812e7f00f55e4d1d3f46e70d902bce89ec7be7/src/checks/cli_docs.kujo), [tests/concord_eval.json](https://github.com/kujolang/concord/blob/f8812e7f00f55e4d1d3f46e70d902bce89ec7be7/tests/concord_eval.json), [tests/concord_tests.kujo](https://github.com/kujolang/concord/blob/f8812e7f00f55e4d1d3f46e70d902bce89ec7be7/tests/concord_tests.kujo).

## mcp

- Source: `8ae321844dece12d5e5f5c33614e7806555ad021`; version 1.3.3; default branch `main`.
- Classification: available upstream but requiring an adapter; core. Maturity: Local framework ready; remote deployment requires qualification.
- Capability: MCP tools/resources, guarded file operations, Ability projection and lifecycle telemetry.
- Entry points: `src/make/schemas.kujo`.
- Contract evidence: `schema/mcp-ability-handoff-v1alpha1.schema.json`, `schemas/mcp-manifest.schema.json`, `src/make/schemas.kujo`, `tests/test_01_schema_validation.kujo`, `tests/test_05_make_schema_contract.kujo`.
- Boundary: No generic shell/container tool; MCP correlation cannot supply authority.
- Existing coverage inspected: `tests/ability_compatibility_matrix_test.mjs`, `tests/ability_connector_cli_test.mjs`, `tests/ability_contract_drift_test.mjs`, `tests/ability_gateway_live_evidence_test.mjs`, `tests/ability_host_bridge_test.mjs`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Expose fixed read-only factory operations first; separately authenticated bounded mutations.
- Source evidence: [README.md](https://github.com/kujolang/mcp/blob/8ae321844dece12d5e5f5c33614e7806555ad021/README.md), [kennel.toml](https://github.com/kujolang/mcp/blob/8ae321844dece12d5e5f5c33614e7806555ad021/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/mcp/blob/8ae321844dece12d5e5f5c33614e7806555ad021/CHANGELOG.md), [src/make/schemas.kujo](https://github.com/kujolang/mcp/blob/8ae321844dece12d5e5f5c33614e7806555ad021/src/make/schemas.kujo), [schema/mcp-ability-handoff-v1alpha1.schema.json](https://github.com/kujolang/mcp/blob/8ae321844dece12d5e5f5c33614e7806555ad021/schema/mcp-ability-handoff-v1alpha1.schema.json), [schemas/mcp-manifest.schema.json](https://github.com/kujolang/mcp/blob/8ae321844dece12d5e5f5c33614e7806555ad021/schemas/mcp-manifest.schema.json), [tests/ability_compatibility_matrix_test.mjs](https://github.com/kujolang/mcp/blob/8ae321844dece12d5e5f5c33614e7806555ad021/tests/ability_compatibility_matrix_test.mjs), [tests/ability_connector_cli_test.mjs](https://github.com/kujolang/mcp/blob/8ae321844dece12d5e5f5c33614e7806555ad021/tests/ability_connector_cli_test.mjs).

## rag

- Source: `12899c1e60b90cddbd0dda8e8c54cbe5334b4631`; version 1.1.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Starter kit with deployment-specific qualification.
- Capability: Local ingest, hybrid retrieval, citations, offline hash embeddings and optional model embeddings.
- Entry points: `main.kujo`, `src/cli_args.kujo`.
- Contract evidence: `config/config_schema_reference.json`, `docs/config-schema-reference.md`, `docs/openapi-contract-sdk.md`, `scripts/run_config_schema_review.kujo`, `scripts/run_openapi_contract_review.kujo`, `tests/test_api_bind_contract.kujo`, `tests/test_api_contract.kujo`, `tests/test_backend_contract.kujo`.
- Boundary: Sources are untrusted data; retrieval is not verification; scope roots and review redaction.
- Existing coverage inspected: `tests/cloudflare_access_proxy.test.mjs`, `tests/fixtures/audit_fail_closed_server.kujo`, `tests/fixtures/complete_keepalive_http_client.kujo`, `tests/fixtures/qdrant_staged_alias_probe.kujo`, `tests/fixtures/qdrant_sync_probe.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Retrieve scoped cited context; separately opt in to service and provider features.
- Source evidence: [README.md](https://github.com/kujolang/rag/blob/12899c1e60b90cddbd0dda8e8c54cbe5334b4631/README.md), [VERSION](https://github.com/kujolang/rag/blob/12899c1e60b90cddbd0dda8e8c54cbe5334b4631/VERSION), [kennel.toml](https://github.com/kujolang/rag/blob/12899c1e60b90cddbd0dda8e8c54cbe5334b4631/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/rag/blob/12899c1e60b90cddbd0dda8e8c54cbe5334b4631/CHANGELOG.md), [main.kujo](https://github.com/kujolang/rag/blob/12899c1e60b90cddbd0dda8e8c54cbe5334b4631/main.kujo), [src/cli_args.kujo](https://github.com/kujolang/rag/blob/12899c1e60b90cddbd0dda8e8c54cbe5334b4631/src/cli_args.kujo), [config/config_schema_reference.json](https://github.com/kujolang/rag/blob/12899c1e60b90cddbd0dda8e8c54cbe5334b4631/config/config_schema_reference.json), [docs/config-schema-reference.md](https://github.com/kujolang/rag/blob/12899c1e60b90cddbd0dda8e8c54cbe5334b4631/docs/config-schema-reference.md), [tests/cloudflare_access_proxy.test.mjs](https://github.com/kujolang/rag/blob/12899c1e60b90cddbd0dda8e8c54cbe5334b4631/tests/cloudflare_access_proxy.test.mjs), [tests/fixtures/audit_fail_closed_server.kujo](https://github.com/kujolang/rag/blob/12899c1e60b90cddbd0dda8e8c54cbe5334b4631/tests/fixtures/audit_fail_closed_server.kujo).

## packwrite

- Source: `b8467535c74263abc59fd3f48028b67d42cd7e68`; version 1.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Local planning tool; provider credentials required for generation.
- Capability: Model-generated validated execution packs, phase plans and review prompts.
- Entry points: `packwrite.kujo`, `src/ai.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Dry-run still calls model; model instructions cannot authorize writes or weaken gates.
- Existing coverage inspected: `tests/cli_integration.sh`, `tests/fixture.kujo`, `tests/packwrite_eval.json`, `tests/packwrite_test.kujo`, `tests/run.sh`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use for reviewed planning exports only; retain controller-owned acceptance.
- Source evidence: [README.md](https://github.com/kujolang/packwrite/blob/b8467535c74263abc59fd3f48028b67d42cd7e68/README.md), [VERSION](https://github.com/kujolang/packwrite/blob/b8467535c74263abc59fd3f48028b67d42cd7e68/VERSION), [kennel.toml](https://github.com/kujolang/packwrite/blob/b8467535c74263abc59fd3f48028b67d42cd7e68/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/packwrite/blob/b8467535c74263abc59fd3f48028b67d42cd7e68/CHANGELOG.md), [packwrite.kujo](https://github.com/kujolang/packwrite/blob/b8467535c74263abc59fd3f48028b67d42cd7e68/packwrite.kujo), [src/ai.kujo](https://github.com/kujolang/packwrite/blob/b8467535c74263abc59fd3f48028b67d42cd7e68/src/ai.kujo), [tests/cli_integration.sh](https://github.com/kujolang/packwrite/blob/b8467535c74263abc59fd3f48028b67d42cd7e68/tests/cli_integration.sh), [tests/fixture.kujo](https://github.com/kujolang/packwrite/blob/b8467535c74263abc59fd3f48028b67d42cd7e68/tests/fixture.kujo).

## muzzle

- Source: `2d508d338537a25f000170c8bb4dc10ef3d75aeb`; version 1.1.3; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released local tool.
- Capability: Quiet trusted workflow execution with complete logs and compact status.
- Entry points: `src/cli.kujo`, `src/runner.kujo`.
- Contract evidence: `schemas/muzzle-command.schema.json`, `schemas/muzzle-error.schema.json`, `schemas/muzzle-manifest.schema.json`, `schemas/muzzle-policy.schema.json`, `schemas/muzzle-run.schema.json`.
- Boundary: Not a sandbox; arbitrary workflow commands must never execute candidate code on host.
- Existing coverage inspected: `tests/muzzle_eval.json`, `tests/muzzle_hardening_regression.py`, `tests/muzzle_install_regression.sh`, `tests/muzzle_process_regression.sh`, `tests/muzzle_wrapper_regression.sh`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Wrap fixed trusted diagnostics only; pass evidence references to agents.
- Source evidence: [README.md](https://github.com/kujolang/muzzle/blob/2d508d338537a25f000170c8bb4dc10ef3d75aeb/README.md), [kennel.toml](https://github.com/kujolang/muzzle/blob/2d508d338537a25f000170c8bb4dc10ef3d75aeb/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/muzzle/blob/2d508d338537a25f000170c8bb4dc10ef3d75aeb/CHANGELOG.md), [src/cli.kujo](https://github.com/kujolang/muzzle/blob/2d508d338537a25f000170c8bb4dc10ef3d75aeb/src/cli.kujo), [src/runner.kujo](https://github.com/kujolang/muzzle/blob/2d508d338537a25f000170c8bb4dc10ef3d75aeb/src/runner.kujo), [schemas/muzzle-command.schema.json](https://github.com/kujolang/muzzle/blob/2d508d338537a25f000170c8bb4dc10ef3d75aeb/schemas/muzzle-command.schema.json), [schemas/muzzle-error.schema.json](https://github.com/kujolang/muzzle/blob/2d508d338537a25f000170c8bb4dc10ef3d75aeb/schemas/muzzle-error.schema.json), [tests/muzzle_eval.json](https://github.com/kujolang/muzzle/blob/2d508d338537a25f000170c8bb4dc10ef3d75aeb/tests/muzzle_eval.json), [tests/muzzle_hardening_regression.py](https://github.com/kujolang/muzzle/blob/2d508d338537a25f000170c8bb4dc10ef3d75aeb/tests/muzzle_hardening_regression.py).

## scout

- Source: `f3a874fa0e95e26c52ef9ec4d23b0f52d8372089`; version 1.1.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Local released tool; heuristic analysis.
- Capability: Repository mapping, dependency/routes heuristics and context manifests.
- Entry points: `scout.kujo`.
- Contract evidence: `tests/fixtures/hardening/sort_contract.kujo`, `tests/fixtures/schemas/kennel.index.schema.json`, `tests/fixtures/schemas/kennel.metadata.schema.json`, `tests/fixtures/schemas/scan_manifest.schema.json`, `tests/fixtures/schemas/security.jsonl.entry.schema.json`, `tests/fixtures/schemas/security.sarif.schema.json`.
- Boundary: Heuristic findings are not security proofs; source remains untrusted.
- Existing coverage inspected: `tests/analysis_targets.json`, `tests/fixtures/analysis-corpus/dependencies/javascript_package_json/package.json`, `tests/fixtures/analysis-corpus/dependencies/php_composer/composer.json`, `tests/fixtures/analysis-corpus/labels.json`, `tests/fixtures/analysis-corpus/routes/javascript_fastify/routes.ts`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Scan confined snapshots and pass bounded source citations into context planning.
- Source evidence: [README.md](https://github.com/kujolang/scout/blob/f3a874fa0e95e26c52ef9ec4d23b0f52d8372089/README.md), [VERSION](https://github.com/kujolang/scout/blob/f3a874fa0e95e26c52ef9ec4d23b0f52d8372089/VERSION), [kennel.toml](https://github.com/kujolang/scout/blob/f3a874fa0e95e26c52ef9ec4d23b0f52d8372089/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/scout/blob/f3a874fa0e95e26c52ef9ec4d23b0f52d8372089/CHANGELOG.md), [scout.kujo](https://github.com/kujolang/scout/blob/f3a874fa0e95e26c52ef9ec4d23b0f52d8372089/scout.kujo), [tests/fixtures/hardening/sort_contract.kujo](https://github.com/kujolang/scout/blob/f3a874fa0e95e26c52ef9ec4d23b0f52d8372089/tests/fixtures/hardening/sort_contract.kujo), [tests/fixtures/schemas/kennel.index.schema.json](https://github.com/kujolang/scout/blob/f3a874fa0e95e26c52ef9ec4d23b0f52d8372089/tests/fixtures/schemas/kennel.index.schema.json), [tests/analysis_targets.json](https://github.com/kujolang/scout/blob/f3a874fa0e95e26c52ef9ec4d23b0f52d8372089/tests/analysis_targets.json), [tests/fixtures/analysis-corpus/dependencies/javascript_package_json/package.json](https://github.com/kujolang/scout/blob/f3a874fa0e95e26c52ef9ec4d23b0f52d8372089/tests/fixtures/analysis-corpus/dependencies/javascript_package_json/package.json).

## scent

- Source: `d71da6cbb6f4a1fb9d438743a4ad9e00614da266`; version 1.1.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Local CLI; factory adapter unqualified.
- Capability: Task-focused context packs, budgets, manifest and pattern redaction.
- Entry points: `scent.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Token counts estimated; redaction not complete; never promote summaries above source.
- Existing coverage inspected: `tests/hardening.py`, `tests/scent_eval.json`. Tests were not executed by this audit.
- Factory overlap: Worker snapshot context.
- Decision: Build bounded task context from approved repository roots; retain original source hashes.
- Source evidence: [README.md](https://github.com/kujolang/scent/blob/d71da6cbb6f4a1fb9d438743a4ad9e00614da266/README.md), [VERSION](https://github.com/kujolang/scent/blob/d71da6cbb6f4a1fb9d438743a4ad9e00614da266/VERSION), [kennel.toml](https://github.com/kujolang/scent/blob/d71da6cbb6f4a1fb9d438743a4ad9e00614da266/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/scent/blob/d71da6cbb6f4a1fb9d438743a4ad9e00614da266/CHANGELOG.md), [scent.kujo](https://github.com/kujolang/scent/blob/d71da6cbb6f4a1fb9d438743a4ad9e00614da266/scent.kujo), [tests/hardening.py](https://github.com/kujolang/scent/blob/d71da6cbb6f4a1fb9d438743a4ad9e00614da266/tests/hardening.py), [tests/scent_eval.json](https://github.com/kujolang/scent/blob/d71da6cbb6f4a1fb9d438743a4ad9e00614da266/tests/scent_eval.json).

## fence

- Source: `d3173049b5365af975624fddd48e943d39738c75`; version 1.1.0; default branch `main`.
- Classification: available upstream but requiring an adapter; core. Maturity: Released best-effort line-based import scanner.
- Capability: Import/architecture boundary checking for six language families.
- Entry points: `src/cli.kujo`, `src/cliargs.kujo`.
- Contract evidence: `docs/JSON_SCHEMA.md`, `docs/audits/confined-output-runtime-contract.md`, `docs/consumer-contract-matrix.md`, `tests/consumer_contract_eval.json`, `tests/contracts/check-v1.json`, `tests/contracts/sarif-v2.1.0.json`.
- Boundary: Fence does not validate arbitrary host effects or replace Workcell/host authorization.
- Existing coverage inspected: `tests/cli_smoke.sh`, `tests/conformance/v1/expected.json`, `tests/conformance/v1/javascript.ts`, `tests/conformance/v1/kujo.kujo`, `tests/conformance/v1/python.py`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Run approved fence.toml policy on isolated snapshots; supplement host permission controls.
- Source evidence: [README.md](https://github.com/kujolang/fence/blob/d3173049b5365af975624fddd48e943d39738c75/README.md), [kennel.toml](https://github.com/kujolang/fence/blob/d3173049b5365af975624fddd48e943d39738c75/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/fence/blob/d3173049b5365af975624fddd48e943d39738c75/CHANGELOG.md), [src/cli.kujo](https://github.com/kujolang/fence/blob/d3173049b5365af975624fddd48e943d39738c75/src/cli.kujo), [src/cliargs.kujo](https://github.com/kujolang/fence/blob/d3173049b5365af975624fddd48e943d39738c75/src/cliargs.kujo), [docs/JSON_SCHEMA.md](https://github.com/kujolang/fence/blob/d3173049b5365af975624fddd48e943d39738c75/docs/JSON_SCHEMA.md), [docs/audits/confined-output-runtime-contract.md](https://github.com/kujolang/fence/blob/d3173049b5365af975624fddd48e943d39738c75/docs/audits/confined-output-runtime-contract.md), [tests/cli_smoke.sh](https://github.com/kujolang/fence/blob/d3173049b5365af975624fddd48e943d39738c75/tests/cli_smoke.sh), [tests/conformance/v1/expected.json](https://github.com/kujolang/fence/blob/d3173049b5365af975624fddd48e943d39738c75/tests/conformance/v1/expected.json).

## changebucket

- Source: `030eea63c60449f82c9ba2680227485d318fdb6d`; version 1.1.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released local CLI.
- Capability: Diff footprint, category budgets, change gate and structured reports.
- Entry points: `src/cli.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Git config and clean filters remain trusted; not a sandbox.
- Existing coverage inspected: `tests/benchmarks/top_churn.kujo`, `tests/benchmarks/untracked.py`, `tests/changebucket_eval.json`, `tests/changebucket_test.kujo`, `tests/fixtures/category_cases.json`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use fixed read-only Git inspection with explicit refs and bounded output.
- Source evidence: [README.md](https://github.com/kujolang/changebucket/blob/030eea63c60449f82c9ba2680227485d318fdb6d/README.md), [VERSION](https://github.com/kujolang/changebucket/blob/030eea63c60449f82c9ba2680227485d318fdb6d/VERSION), [kennel.toml](https://github.com/kujolang/changebucket/blob/030eea63c60449f82c9ba2680227485d318fdb6d/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/changebucket/blob/030eea63c60449f82c9ba2680227485d318fdb6d/CHANGELOG.md), [src/cli.kujo](https://github.com/kujolang/changebucket/blob/030eea63c60449f82c9ba2680227485d318fdb6d/src/cli.kujo), [tests/benchmarks/top_churn.kujo](https://github.com/kujolang/changebucket/blob/030eea63c60449f82c9ba2680227485d318fdb6d/tests/benchmarks/top_churn.kujo), [tests/benchmarks/untracked.py](https://github.com/kujolang/changebucket/blob/030eea63c60449f82c9ba2680227485d318fdb6d/tests/benchmarks/untracked.py).

## patchbrief

- Source: `92c5cc833730dc427b54a069e9a275bad5969ddc`; version 1.0.3; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released heuristic CLI.
- Capability: Bounded diff summary, suggested tests and reviewer handoff.
- Entry points: `patchbrief.kujo`, `src/common.kujo`.
- Contract evidence: `schemas/patchbrief-handoff.schema.json`, `schemas/patchbrief-summary.schema.json`.
- Boundary: Suggested tests are recommendations; never execute suggestions as authorization.
- Existing coverage inspected: `tests/git-portability.mjs`, `tests/patchbrief_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: Source digests and file lists.
- Decision: Generate advisory change context with truncation metadata; retain original diff.
- Source evidence: [README.md](https://github.com/kujolang/patchbrief/blob/92c5cc833730dc427b54a069e9a275bad5969ddc/README.md), [kennel.toml](https://github.com/kujolang/patchbrief/blob/92c5cc833730dc427b54a069e9a275bad5969ddc/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/patchbrief/blob/92c5cc833730dc427b54a069e9a275bad5969ddc/CHANGELOG.md), [patchbrief.kujo](https://github.com/kujolang/patchbrief/blob/92c5cc833730dc427b54a069e9a275bad5969ddc/patchbrief.kujo), [src/common.kujo](https://github.com/kujolang/patchbrief/blob/92c5cc833730dc427b54a069e9a275bad5969ddc/src/common.kujo), [schemas/patchbrief-handoff.schema.json](https://github.com/kujolang/patchbrief/blob/92c5cc833730dc427b54a069e9a275bad5969ddc/schemas/patchbrief-handoff.schema.json), [schemas/patchbrief-summary.schema.json](https://github.com/kujolang/patchbrief/blob/92c5cc833730dc427b54a069e9a275bad5969ddc/schemas/patchbrief-summary.schema.json), [tests/git-portability.mjs](https://github.com/kujolang/patchbrief/blob/92c5cc833730dc427b54a069e9a275bad5969ddc/tests/git-portability.mjs), [tests/patchbrief_tests.kujo](https://github.com/kujolang/patchbrief/blob/92c5cc833730dc427b54a069e9a275bad5969ddc/tests/patchbrief_tests.kujo).

## kennel

- Source: `3093c40039ddbaa10527f3121cae3b958cadc2b9`; version 1.2.1; default branch `main`.
- Classification: available upstream but requiring an adapter; core. Maturity: Released official registry client.
- Capability: Immutable first-party package distribution, exact lock/digest verification, local installs.
- Entry points: `cli.kujo`, `src/cli.kujo`.
- Contract evidence: `docs/contracts/index.example.json`, `docs/contracts/index.schema.json`, `docs/contracts/package-metadata.schema.json`, `docs/contracts/packages/ai-sdk.json`, `docs/contracts/packages/mcp.json`, `docs/contracts/registry-v1-index.schema.json`, `docs/contracts/registry-v1-package.schema.json`, `docs/contracts/registry-v1-provenance.schema.json`.
- Boundary: Registry integrity is not package behavior qualification; no global mutation required.
- Existing coverage inspected: `tests/contracts/cli-and-core-contract_tests.kujo`, `tests/contracts/hosted-registry-contract_tests.kujo`, `tests/contracts/registry-index-contract_tests.kujo`, `tests/declaration_inspection.kujo`, `tests/kennel_contract_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use project-local verified packages where compatible; preserve pinned source fallback and rollback.
- Source evidence: [README.md](https://github.com/kujolang/kennel/blob/3093c40039ddbaa10527f3121cae3b958cadc2b9/README.md), [kennel.toml](https://github.com/kujolang/kennel/blob/3093c40039ddbaa10527f3121cae3b958cadc2b9/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/kennel/blob/3093c40039ddbaa10527f3121cae3b958cadc2b9/CHANGELOG.md), [cli.kujo](https://github.com/kujolang/kennel/blob/3093c40039ddbaa10527f3121cae3b958cadc2b9/cli.kujo), [src/cli.kujo](https://github.com/kujolang/kennel/blob/3093c40039ddbaa10527f3121cae3b958cadc2b9/src/cli.kujo), [docs/contracts/index.example.json](https://github.com/kujolang/kennel/blob/3093c40039ddbaa10527f3121cae3b958cadc2b9/docs/contracts/index.example.json), [docs/contracts/index.schema.json](https://github.com/kujolang/kennel/blob/3093c40039ddbaa10527f3121cae3b958cadc2b9/docs/contracts/index.schema.json), [tests/contracts/cli-and-core-contract_tests.kujo](https://github.com/kujolang/kennel/blob/3093c40039ddbaa10527f3121cae3b958cadc2b9/tests/contracts/cli-and-core-contract_tests.kujo), [tests/contracts/hosted-registry-contract_tests.kujo](https://github.com/kujolang/kennel/blob/3093c40039ddbaa10527f3121cae3b958cadc2b9/tests/contracts/hosted-registry-contract_tests.kujo).

## howl

- Source: `caf57b3f89da5e4ac25f2c2c7767a8fafc859722`; version 1.2.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Stable offline renderer.
- Capability: Deterministic example cards and SVG/Markdown/HTML galleries.
- Entry points: `src/cli.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Presentation artifacts are not execution evidence; no ordinary mission requirement.
- Existing coverage inspected: `tests/benchmark.py`, `tests/fixtures/release/howl.json`, `tests/golden/release-fixture.sha256.json`, `tests/hardening_regression.py`, `tests/howl_eval.json`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Opt in for launch/documentation artifacts grounded in actual examples.
- Source evidence: [README.md](https://github.com/kujolang/howl/blob/caf57b3f89da5e4ac25f2c2c7767a8fafc859722/README.md), [VERSION](https://github.com/kujolang/howl/blob/caf57b3f89da5e4ac25f2c2c7767a8fafc859722/VERSION), [kennel.toml](https://github.com/kujolang/howl/blob/caf57b3f89da5e4ac25f2c2c7767a8fafc859722/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/howl/blob/caf57b3f89da5e4ac25f2c2c7767a8fafc859722/CHANGELOG.md), [src/cli.kujo](https://github.com/kujolang/howl/blob/caf57b3f89da5e4ac25f2c2c7767a8fafc859722/src/cli.kujo), [tests/benchmark.py](https://github.com/kujolang/howl/blob/caf57b3f89da5e4ac25f2c2c7767a8fafc859722/tests/benchmark.py), [tests/fixtures/release/howl.json](https://github.com/kujolang/howl/blob/caf57b3f89da5e4ac25f2c2c7767a8fafc859722/tests/fixtures/release/howl.json).

## ability

- Source: `54764e38787403ed82f51efaea1bf78e321d7546`; version 1.3.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Stable definitions; experimental assurance extensions.
- Capability: Portable versioned operation definitions, schemas, effect policy and receipts.
- Entry points: `src/index.kujo`.
- Contract evidence: `docs/contracts/application-assurance-profile.md`, `docs/contracts/assurance-profile.json`, `docs/contracts/bindings-v1beta1.schema.json`, `schema/ability-pack-entry.schema.json`, `schema/ability-profile.schema.json`, `schema/ability-registry-policy.schema.json`, `schema/ability.schema.json`, `schema/application-assurance-v1alpha1.schema.json`.
- Boundary: Not authentication service or sandbox; effect-assurance beta experimental.
- Existing coverage inspected: `tests/application_assurance.mjs`, `tests/application_commitment_vectors.kujo`, `tests/application_profile_schema.kujo`, `tests/check_consumers.sh`, `tests/contract_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use canonical definitions for bounded external tool exposure; host remains authority.
- Source evidence: [README.md](https://github.com/kujolang/ability/blob/54764e38787403ed82f51efaea1bf78e321d7546/README.md), [kennel.toml](https://github.com/kujolang/ability/blob/54764e38787403ed82f51efaea1bf78e321d7546/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/ability/blob/54764e38787403ed82f51efaea1bf78e321d7546/CHANGELOG.md), [src/index.kujo](https://github.com/kujolang/ability/blob/54764e38787403ed82f51efaea1bf78e321d7546/src/index.kujo), [docs/contracts/application-assurance-profile.md](https://github.com/kujolang/ability/blob/54764e38787403ed82f51efaea1bf78e321d7546/docs/contracts/application-assurance-profile.md), [docs/contracts/assurance-profile.json](https://github.com/kujolang/ability/blob/54764e38787403ed82f51efaea1bf78e321d7546/docs/contracts/assurance-profile.json), [tests/application_assurance.mjs](https://github.com/kujolang/ability/blob/54764e38787403ed82f51efaea1bf78e321d7546/tests/application_assurance.mjs), [tests/application_commitment_vectors.kujo](https://github.com/kujolang/ability/blob/54764e38787403ed82f51efaea1bf78e321d7546/tests/application_commitment_vectors.kujo).

## ability-gateway

- Source: `037241d3da562ef750a3c2b018d0ed979e0b0d4c`; version 0.1.1; default branch `main`.
- Classification: experimental or requiring additional qualification; optional. Maturity: Controlled hosted beta.
- Capability: OAuth remote MCP control plane, tenant catalogs and one-use approvals.
- Entry points: `src/index.ts`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Cloudflare Workers/KV/D1 and remote identity required; not local-first core.
- Existing coverage inspected: `test/approval-binding.test.ts`, `test/auth.test.ts`, `test/control-plane.test.ts`, `test/identity.test.ts`, `test/operations-drill.test.ts`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Optional separate hosted connector only; never a core dependency.
- Source evidence: [README.md](https://github.com/kujolang/ability-gateway/blob/037241d3da562ef750a3c2b018d0ed979e0b0d4c/README.md), [package.json](https://github.com/kujolang/ability-gateway/blob/037241d3da562ef750a3c2b018d0ed979e0b0d4c/package.json), [CHANGELOG.md](https://github.com/kujolang/ability-gateway/blob/037241d3da562ef750a3c2b018d0ed979e0b0d4c/CHANGELOG.md), [src/index.ts](https://github.com/kujolang/ability-gateway/blob/037241d3da562ef750a3c2b018d0ed979e0b0d4c/src/index.ts), [test/approval-binding.test.ts](https://github.com/kujolang/ability-gateway/blob/037241d3da562ef750a3c2b018d0ed979e0b0d4c/test/approval-binding.test.ts), [test/auth.test.ts](https://github.com/kujolang/ability-gateway/blob/037241d3da562ef750a3c2b018d0ed979e0b0d4c/test/auth.test.ts).

## redact

- Source: `8bb7a0c251a82044320b42654e22a5371b76a9f6`; version 1.1.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released local aid; pinned older runtime requires compatibility test.
- Capability: Deterministic text/Markdown redaction, dictionaries, leakage verification and audit.
- Entry points: `src/ai_provider.kujo`, `src/cli.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Not universal PII detection; requires operator privacy review.
- Existing coverage inspected: `tests/bug_regressions.kujo`, `tests/cli_bug_regressions.sh`, `tests/cli_contract.sh`, `tests/examples_smoke.sh`, `tests/hardening_contract.py`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Apply reviewed policy to outgoing context and exports, retain private original evidence separately.
- Source evidence: [README.md](https://github.com/kujolang/redact/blob/8bb7a0c251a82044320b42654e22a5371b76a9f6/README.md), [VERSION](https://github.com/kujolang/redact/blob/8bb7a0c251a82044320b42654e22a5371b76a9f6/VERSION), [kennel.toml](https://github.com/kujolang/redact/blob/8bb7a0c251a82044320b42654e22a5371b76a9f6/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/redact/blob/8bb7a0c251a82044320b42654e22a5371b76a9f6/CHANGELOG.md), [src/ai_provider.kujo](https://github.com/kujolang/redact/blob/8bb7a0c251a82044320b42654e22a5371b76a9f6/src/ai_provider.kujo), [src/cli.kujo](https://github.com/kujolang/redact/blob/8bb7a0c251a82044320b42654e22a5371b76a9f6/src/cli.kujo), [tests/bug_regressions.kujo](https://github.com/kujolang/redact/blob/8bb7a0c251a82044320b42654e22a5371b76a9f6/tests/bug_regressions.kujo), [tests/cli_bug_regressions.sh](https://github.com/kujolang/redact/blob/8bb7a0c251a82044320b42654e22a5371b76a9f6/tests/cli_bug_regressions.sh).

## relay

- Source: `d6fee554540bd4c7d83e34ecc2e77a779ffe62dd`; version 1.0.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Stable local/operator-controlled v1.
- Capability: Bounded missions, worktrees, policy-bound Agents SDK tools, export and HMAC evidence.
- Entry points: `main.kujo`, `src/cli.kujo`.
- Contract evidence: `release/contracts.json`, `schemas/README.md`, `schemas/agents.schema.json`, `schemas/aggregate-metrics.schema.json`, `schemas/benchmark.schema.json`, `schemas/chat.schema.json`, `schemas/doctor.schema.json`, `schemas/event-bundle.schema.json`.
- Boundary: SHA256 integrity differs from HMAC authentication; Dispatch remains factory replay authority.
- Existing coverage inspected: `tests/fixtures/cli/agents-v1.json`, `tests/fixtures/cli/benchmark-v1.json`, `tests/fixtures/cli/chat-v1.json`, `tests/fixtures/cli/models-v1.json`, `tests/fixtures/contracts/dispatch-v1.json`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use explicit lifecycle handoff/import adapter; do not nest competing orchestration or release authorities.
- Source evidence: [README.md](https://github.com/kujolang/relay/blob/d6fee554540bd4c7d83e34ecc2e77a779ffe62dd/README.md), [VERSION](https://github.com/kujolang/relay/blob/d6fee554540bd4c7d83e34ecc2e77a779ffe62dd/VERSION), [kennel.toml](https://github.com/kujolang/relay/blob/d6fee554540bd4c7d83e34ecc2e77a779ffe62dd/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/relay/blob/d6fee554540bd4c7d83e34ecc2e77a779ffe62dd/CHANGELOG.md), [main.kujo](https://github.com/kujolang/relay/blob/d6fee554540bd4c7d83e34ecc2e77a779ffe62dd/main.kujo), [src/cli.kujo](https://github.com/kujolang/relay/blob/d6fee554540bd4c7d83e34ecc2e77a779ffe62dd/src/cli.kujo), [release/contracts.json](https://github.com/kujolang/relay/blob/d6fee554540bd4c7d83e34ecc2e77a779ffe62dd/release/contracts.json), [schemas/README.md](https://github.com/kujolang/relay/blob/d6fee554540bd4c7d83e34ecc2e77a779ffe62dd/schemas/README.md), [tests/fixtures/cli/agents-v1.json](https://github.com/kujolang/relay/blob/d6fee554540bd4c7d83e34ecc2e77a779ffe62dd/tests/fixtures/cli/agents-v1.json), [tests/fixtures/cli/benchmark-v1.json](https://github.com/kujolang/relay/blob/d6fee554540bd4c7d83e34ecc2e77a779ffe62dd/tests/fixtures/cli/benchmark-v1.json).

## tribunal

- Source: `fa4ffd2c9bb6ee5d8285dfb5c161b844e6e75b7c`; version 1.0.2; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released local v1; live providers separately configured.
- Capability: Multi-model decision review, local evidence, signatures, import/export and audit.
- Entry points: `src/cli.kujo`, `src/signing_provider.kujo`.
- Contract evidence: `schemas/access-policy.schema.json`, `schemas/adoption-aggregate.schema.json`, `schemas/algorithm-registry.schema.json`, `schemas/artifact-manifest.schema.json`, `schemas/artifact-store-index.schema.json`, `schemas/audit-report.schema.json`, `schemas/bulk-verification.schema.json`, `schemas/bundle.schema.json`.
- Boundary: Mock default is not live judgment; panel opinions never replace tests or human authorization.
- Existing coverage inspected: `tests/adversarial/malicious_server.kujo`, `tests/audit_regressions.kujo`, `tests/cli_integration.kujo`, `tests/enterprise_tests.kujo`, `tests/fixtures/cancellable_worker.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use advisory panels for high-risk decisions; approved release policy determines binding status.
- Source evidence: [README.md](https://github.com/kujolang/tribunal/blob/fa4ffd2c9bb6ee5d8285dfb5c161b844e6e75b7c/README.md), [VERSION](https://github.com/kujolang/tribunal/blob/fa4ffd2c9bb6ee5d8285dfb5c161b844e6e75b7c/VERSION), [kennel.toml](https://github.com/kujolang/tribunal/blob/fa4ffd2c9bb6ee5d8285dfb5c161b844e6e75b7c/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/tribunal/blob/fa4ffd2c9bb6ee5d8285dfb5c161b844e6e75b7c/CHANGELOG.md), [src/cli.kujo](https://github.com/kujolang/tribunal/blob/fa4ffd2c9bb6ee5d8285dfb5c161b844e6e75b7c/src/cli.kujo), [src/signing_provider.kujo](https://github.com/kujolang/tribunal/blob/fa4ffd2c9bb6ee5d8285dfb5c161b844e6e75b7c/src/signing_provider.kujo), [schemas/access-policy.schema.json](https://github.com/kujolang/tribunal/blob/fa4ffd2c9bb6ee5d8285dfb5c161b844e6e75b7c/schemas/access-policy.schema.json), [schemas/adoption-aggregate.schema.json](https://github.com/kujolang/tribunal/blob/fa4ffd2c9bb6ee5d8285dfb5c161b844e6e75b7c/schemas/adoption-aggregate.schema.json), [tests/adversarial/malicious_server.kujo](https://github.com/kujolang/tribunal/blob/fa4ffd2c9bb6ee5d8285dfb5c161b844e6e75b7c/tests/adversarial/malicious_server.kujo), [tests/audit_regressions.kujo](https://github.com/kujolang/tribunal/blob/fa4ffd2c9bb6ee5d8285dfb5c161b844e6e75b7c/tests/audit_regressions.kujo).

## site-kit

- Source: `74cff7b73f2f21d658fc0219ac7f4d44f7f93efd`; version 1.2.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Versioned web tooling; factory runtime not qualified.
- Capability: Web components, recipes, schemas and CLI scaffolding.
- Entry points: `playwright.config.mjs`.
- Contract evidence: `components/accordion/accordion.schema.json`, `components/alert/alert.schema.json`, `components/avatar/avatar.schema.json`, `components/badge/badge.schema.json`, `components/bento-grid/bento-grid.schema.json`, `components/breadcrumbs/breadcrumbs.schema.json`, `components/button/button.schema.json`, `components/card/card.schema.json`.
- Boundary: Generated frontend still requires isolated browser checks; no publish authority.
- Existing coverage inspected: `tests/browser/code-themes.spec.mjs`, `tests/browser/gap-closure.spec.mjs`, `tests/browser/global-setup.mjs`, `tests/browser/hardening.spec.mjs`, `tests/browser/integration-v1.1.spec.mjs`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Activate for frontend/static-site missions after runtime/image qualification.
- Source evidence: [README.md](https://github.com/kujolang/site-kit/blob/74cff7b73f2f21d658fc0219ac7f4d44f7f93efd/README.md), [package.json](https://github.com/kujolang/site-kit/blob/74cff7b73f2f21d658fc0219ac7f4d44f7f93efd/package.json), [CHANGELOG.md](https://github.com/kujolang/site-kit/blob/74cff7b73f2f21d658fc0219ac7f4d44f7f93efd/CHANGELOG.md), [playwright.config.mjs](https://github.com/kujolang/site-kit/blob/74cff7b73f2f21d658fc0219ac7f4d44f7f93efd/playwright.config.mjs), [components/accordion/accordion.schema.json](https://github.com/kujolang/site-kit/blob/74cff7b73f2f21d658fc0219ac7f4d44f7f93efd/components/accordion/accordion.schema.json), [components/alert/alert.schema.json](https://github.com/kujolang/site-kit/blob/74cff7b73f2f21d658fc0219ac7f4d44f7f93efd/components/alert/alert.schema.json), [tests/browser/code-themes.spec.mjs](https://github.com/kujolang/site-kit/blob/74cff7b73f2f21d658fc0219ac7f4d44f7f93efd/tests/browser/code-themes.spec.mjs), [tests/browser/gap-closure.spec.mjs](https://github.com/kujolang/site-kit/blob/74cff7b73f2f21d658fc0219ac7f4d44f7f93efd/tests/browser/gap-closure.spec.mjs).

## ssg

- Source: `e0e909f1b08f43cbffea7899992a3a13fc2cc27d`; version 1.2.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released SSG; factory runtime not qualified.
- Capability: Static build pipeline, DocGen bridge, search and experimental WebMCP.
- Entry points: `build.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Default build is trusted mode; candidate build needs Workcell; WebMCP experimental.
- Existing coverage inspected: `scripts/test-ability-contract.sh`, `scripts/test-ability-pack-integration.sh`, `scripts/test-bug-regressions.sh`, `scripts/test-cli-contract.sh`, `scripts/test-content-boundaries.py`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned build in constrained runtime for documentation/static-site missions.
- Source evidence: [README.md](https://github.com/kujolang/ssg/blob/e0e909f1b08f43cbffea7899992a3a13fc2cc27d/README.md), [kennel.toml](https://github.com/kujolang/ssg/blob/e0e909f1b08f43cbffea7899992a3a13fc2cc27d/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/ssg/blob/e0e909f1b08f43cbffea7899992a3a13fc2cc27d/CHANGELOG.md), [build.kujo](https://github.com/kujolang/ssg/blob/e0e909f1b08f43cbffea7899992a3a13fc2cc27d/build.kujo), [scripts/test-ability-contract.sh](https://github.com/kujolang/ssg/blob/e0e909f1b08f43cbffea7899992a3a13fc2cc27d/scripts/test-ability-contract.sh), [scripts/test-ability-pack-integration.sh](https://github.com/kujolang/ssg/blob/e0e909f1b08f43cbffea7899992a3a13fc2cc27d/scripts/test-ability-pack-integration.sh).

## openai

- Source: `c57fab7d0e1b145c7f8d79c177f8407f53c2cdea`; version 0.1.2; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/openai/blob/c57fab7d0e1b145c7f8d79c177f8407f53c2cdea/README.md), [kennel.toml](https://github.com/kujolang/openai/blob/c57fab7d0e1b145c7f8d79c177f8407f53c2cdea/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/openai/blob/c57fab7d0e1b145c7f8d79c177f8407f53c2cdea/CHANGELOG.md), [src/provider.kujo](https://github.com/kujolang/openai/blob/c57fab7d0e1b145c7f8d79c177f8407f53c2cdea/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/openai/blob/c57fab7d0e1b145c7f8d79c177f8407f53c2cdea/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/openai/blob/c57fab7d0e1b145c7f8d79c177f8407f53c2cdea/tests/installed_consumer_smoke.kujo).

## anthropic

- Source: `eaad591b642b80aacca40db788403109c5eed2cd`; version 0.1.3; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `provider.kujo`, `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/fixtures.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/anthropic/blob/eaad591b642b80aacca40db788403109c5eed2cd/README.md), [kennel.toml](https://github.com/kujolang/anthropic/blob/eaad591b642b80aacca40db788403109c5eed2cd/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/anthropic/blob/eaad591b642b80aacca40db788403109c5eed2cd/CHANGELOG.md), [provider.kujo](https://github.com/kujolang/anthropic/blob/eaad591b642b80aacca40db788403109c5eed2cd/provider.kujo), [src/provider.kujo](https://github.com/kujolang/anthropic/blob/eaad591b642b80aacca40db788403109c5eed2cd/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/anthropic/blob/eaad591b642b80aacca40db788403109c5eed2cd/tests/driver_tests.kujo), [tests/fixtures.kujo](https://github.com/kujolang/anthropic/blob/eaad591b642b80aacca40db788403109c5eed2cd/tests/fixtures.kujo).

## gemini

- Source: `329942f2c2ee220141d08bf86ce1ac4bdfd417ff`; version 0.1.3; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/fixtures.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/gemini/blob/329942f2c2ee220141d08bf86ce1ac4bdfd417ff/README.md), [kennel.toml](https://github.com/kujolang/gemini/blob/329942f2c2ee220141d08bf86ce1ac4bdfd417ff/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/gemini/blob/329942f2c2ee220141d08bf86ce1ac4bdfd417ff/CHANGELOG.md), [src/provider.kujo](https://github.com/kujolang/gemini/blob/329942f2c2ee220141d08bf86ce1ac4bdfd417ff/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/gemini/blob/329942f2c2ee220141d08bf86ce1ac4bdfd417ff/tests/driver_tests.kujo), [tests/fixtures.kujo](https://github.com/kujolang/gemini/blob/329942f2c2ee220141d08bf86ce1ac4bdfd417ff/tests/fixtures.kujo).

## ollama

- Source: `5821d7baee785ac8c10cf07dae8f29dc43b846ab`; version 0.1.11; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `provider.kujo`, `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_client_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/ollama/blob/5821d7baee785ac8c10cf07dae8f29dc43b846ab/README.md), [kennel.toml](https://github.com/kujolang/ollama/blob/5821d7baee785ac8c10cf07dae8f29dc43b846ab/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/ollama/blob/5821d7baee785ac8c10cf07dae8f29dc43b846ab/CHANGELOG.md), [provider.kujo](https://github.com/kujolang/ollama/blob/5821d7baee785ac8c10cf07dae8f29dc43b846ab/provider.kujo), [src/provider.kujo](https://github.com/kujolang/ollama/blob/5821d7baee785ac8c10cf07dae8f29dc43b846ab/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/ollama/blob/5821d7baee785ac8c10cf07dae8f29dc43b846ab/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/ollama/blob/5821d7baee785ac8c10cf07dae8f29dc43b846ab/tests/installed_consumer_smoke.kujo).

## kujo-openai

- Source: `1ac402d8b5223477090240aefe28dda510016251`; version 0.1.0; default branch `main`.
- Classification: experimental or requiring additional qualification; optional. Maturity: Native public plugin explicitly blocked.
- Capability: External agent-host bridge to canonical Kujo tools and receipts.
- Entry points: `bin/kujo-openai-remote.mjs`, `bin/kujo-openai.mjs`.
- Contract evidence: `native/internal/bundle/assets/mcp/src/make/schemas.kujo`, `schemas/mcp.schema.json`, `schemas/plugin.schema.json`, `tests/projection-contract.kujo`.
- Boundary: Host integration permissions differ from factory; no inherited authority or automatic provider parity.
- Existing coverage inspected: `native/internal/bundle/assets/vendor/ability/tests/contract_tests.kujo`, `native/internal/bundle/assets/vendor/ability/tests/fixtures/semantics_conformance.json`, `native/internal/bundle/assets/vendor/ability/tests/runtime_contract_tests.kujo`, `scripts/test-native-demo.mjs`, `scripts/test-native-package.py`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Expose bounded factory operations through host adapter only after fixed-output conformance; do not substitute external shell agents.
- Source evidence: [README.md](https://github.com/kujolang/kujo-openai/blob/1ac402d8b5223477090240aefe28dda510016251/README.md), [package.json](https://github.com/kujolang/kujo-openai/blob/1ac402d8b5223477090240aefe28dda510016251/package.json), [CHANGELOG.md](https://github.com/kujolang/kujo-openai/blob/1ac402d8b5223477090240aefe28dda510016251/CHANGELOG.md), [bin/kujo-openai-remote.mjs](https://github.com/kujolang/kujo-openai/blob/1ac402d8b5223477090240aefe28dda510016251/bin/kujo-openai-remote.mjs), [bin/kujo-openai.mjs](https://github.com/kujolang/kujo-openai/blob/1ac402d8b5223477090240aefe28dda510016251/bin/kujo-openai.mjs), [native/internal/bundle/assets/mcp/src/make/schemas.kujo](https://github.com/kujolang/kujo-openai/blob/1ac402d8b5223477090240aefe28dda510016251/native/internal/bundle/assets/mcp/src/make/schemas.kujo), [schemas/mcp.schema.json](https://github.com/kujolang/kujo-openai/blob/1ac402d8b5223477090240aefe28dda510016251/schemas/mcp.schema.json), [native/internal/bundle/assets/vendor/ability/tests/contract_tests.kujo](https://github.com/kujolang/kujo-openai/blob/1ac402d8b5223477090240aefe28dda510016251/native/internal/bundle/assets/vendor/ability/tests/contract_tests.kujo), [native/internal/bundle/assets/vendor/ability/tests/fixtures/semantics_conformance.json](https://github.com/kujolang/kujo-openai/blob/1ac402d8b5223477090240aefe28dda510016251/native/internal/bundle/assets/vendor/ability/tests/fixtures/semantics_conformance.json).

## kujo-opencode

- Source: `818f70a9bdbfe753dac38d3feeda5bf208ebc1c4`; version 0.2.1; default branch `codex/opencode-ability-integration`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Host-specific upstream qualification; factory path unqualified.
- Capability: External agent-host bridge to canonical Kujo tools and receipts.
- Entry points: `bin/kujo-opencode-mcp.mjs`, `bin/kujo-opencode.mjs`.
- Contract evidence: `.generated/GATEWAY-CONTRACT.json`, `.generated/gateway-contract.ts`.
- Boundary: Host integration permissions differ from factory; no inherited authority or automatic provider parity.
- Existing coverage inspected: `docs/walkthrough/demo/tests/all_pass.kujo`, `docs/walkthrough/demo/tests/empty.kujo`, `docs/walkthrough/demo/tests/malformed.kujo`, `docs/walkthrough/demo/tests/mixed.kujo`, `docs/walkthrough/demo/tests/summary_test.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Expose bounded factory operations through host adapter only after fixed-output conformance; do not substitute external shell agents.
- Source evidence: [README.md](https://github.com/kujolang/kujo-opencode/blob/818f70a9bdbfe753dac38d3feeda5bf208ebc1c4/README.md), [package.json](https://github.com/kujolang/kujo-opencode/blob/818f70a9bdbfe753dac38d3feeda5bf208ebc1c4/package.json), [CHANGELOG.md](https://github.com/kujolang/kujo-opencode/blob/818f70a9bdbfe753dac38d3feeda5bf208ebc1c4/CHANGELOG.md), [bin/kujo-opencode-mcp.mjs](https://github.com/kujolang/kujo-opencode/blob/818f70a9bdbfe753dac38d3feeda5bf208ebc1c4/bin/kujo-opencode-mcp.mjs), [bin/kujo-opencode.mjs](https://github.com/kujolang/kujo-opencode/blob/818f70a9bdbfe753dac38d3feeda5bf208ebc1c4/bin/kujo-opencode.mjs), [.generated/GATEWAY-CONTRACT.json](https://github.com/kujolang/kujo-opencode/blob/818f70a9bdbfe753dac38d3feeda5bf208ebc1c4/.generated/GATEWAY-CONTRACT.json), [.generated/gateway-contract.ts](https://github.com/kujolang/kujo-opencode/blob/818f70a9bdbfe753dac38d3feeda5bf208ebc1c4/.generated/gateway-contract.ts), [docs/walkthrough/demo/tests/all_pass.kujo](https://github.com/kujolang/kujo-opencode/blob/818f70a9bdbfe753dac38d3feeda5bf208ebc1c4/docs/walkthrough/demo/tests/all_pass.kujo), [docs/walkthrough/demo/tests/empty.kujo](https://github.com/kujolang/kujo-opencode/blob/818f70a9bdbfe753dac38d3feeda5bf208ebc1c4/docs/walkthrough/demo/tests/empty.kujo).

## kujo-pi

- Source: `fe15c9ac0c8a4d854833730e833b698a78127604`; version 1.2.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Host-specific upstream qualification; factory path unqualified.
- Capability: External agent-host bridge to canonical Kujo tools and receipts.
- Entry points: `bin/kujo-pi-setup.mjs`, `src/capabilities.mjs`.
- Contract evidence: `docs/contracts.md`, `schemas/approval-v1.schema.json`, `schemas/integration-registry-v1.schema.json`, `schemas/receipt-v1.schema.json`, `schemas/result-v1.schema.json`, `tests/extension-contract.ts`.
- Boundary: Host integration permissions differ from factory; no inherited authority or automatic provider parity.
- Existing coverage inspected: `tests/capabilities-contract.mjs`, `tests/consumer-contract.mjs`, `tests/core-contract.mjs`, `tests/docs-contract.mjs`, `tests/extension-contract.ts`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Expose bounded factory operations through host adapter only after fixed-output conformance; do not substitute external shell agents.
- Source evidence: [README.md](https://github.com/kujolang/kujo-pi/blob/fe15c9ac0c8a4d854833730e833b698a78127604/README.md), [package.json](https://github.com/kujolang/kujo-pi/blob/fe15c9ac0c8a4d854833730e833b698a78127604/package.json), [CHANGELOG.md](https://github.com/kujolang/kujo-pi/blob/fe15c9ac0c8a4d854833730e833b698a78127604/CHANGELOG.md), [bin/kujo-pi-setup.mjs](https://github.com/kujolang/kujo-pi/blob/fe15c9ac0c8a4d854833730e833b698a78127604/bin/kujo-pi-setup.mjs), [src/capabilities.mjs](https://github.com/kujolang/kujo-pi/blob/fe15c9ac0c8a4d854833730e833b698a78127604/src/capabilities.mjs), [docs/contracts.md](https://github.com/kujolang/kujo-pi/blob/fe15c9ac0c8a4d854833730e833b698a78127604/docs/contracts.md), [schemas/approval-v1.schema.json](https://github.com/kujolang/kujo-pi/blob/fe15c9ac0c8a4d854833730e833b698a78127604/schemas/approval-v1.schema.json), [tests/capabilities-contract.mjs](https://github.com/kujolang/kujo-pi/blob/fe15c9ac0c8a4d854833730e833b698a78127604/tests/capabilities-contract.mjs), [tests/consumer-contract.mjs](https://github.com/kujolang/kujo-pi/blob/fe15c9ac0c8a4d854833730e833b698a78127604/tests/consumer-contract.mjs).

## kujo-hermes

- Source: `bfa94add10a73d5bda6455dda54c36cb56d8f14c`; version 0.1.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Host-specific upstream qualification; factory path unqualified.
- Capability: External agent-host bridge to canonical Kujo tools and receipts.
- Entry points: .
- Contract evidence: `demo/checkout-video/evidence/run/contract-receipt.json`, `demo/walkthrough/evidence/demo-contract.json`, `demo/walkthrough/evidence/v2-contract-check.json`, `docs/hackathon/evidence/contract-receipt.json`.
- Boundary: Host integration permissions differ from factory; no inherited authority or automatic provider parity.
- Existing coverage inspected: `tests/hermes_e2e.py`, `tests/test_approval.py`, `tests/test_core.py`, `tests/test_failure_boundaries.py`, `tests/test_hardening.py`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Expose bounded factory operations through host adapter only after fixed-output conformance; do not substitute external shell agents.
- Source evidence: [README.md](https://github.com/kujolang/kujo-hermes/blob/bfa94add10a73d5bda6455dda54c36cb56d8f14c/README.md), [CHANGELOG.md](https://github.com/kujolang/kujo-hermes/blob/bfa94add10a73d5bda6455dda54c36cb56d8f14c/CHANGELOG.md), [demo/checkout-video/evidence/run/contract-receipt.json](https://github.com/kujolang/kujo-hermes/blob/bfa94add10a73d5bda6455dda54c36cb56d8f14c/demo/checkout-video/evidence/run/contract-receipt.json), [demo/walkthrough/evidence/demo-contract.json](https://github.com/kujolang/kujo-hermes/blob/bfa94add10a73d5bda6455dda54c36cb56d8f14c/demo/walkthrough/evidence/demo-contract.json), [tests/hermes_e2e.py](https://github.com/kujolang/kujo-hermes/blob/bfa94add10a73d5bda6455dda54c36cb56d8f14c/tests/hermes_e2e.py), [tests/test_approval.py](https://github.com/kujolang/kujo-hermes/blob/bfa94add10a73d5bda6455dda54c36cb56d8f14c/tests/test_approval.py).

## source

- Source: `022d3036072a443727987389c673e0e5a1257880`; version 0.2.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Local/hosted source-control product; deployment qualification separate.
- Capability: Evidence-linked proposals, exact-candidate review and Git promotion.
- Entry points: .
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Source promotion requires Source approval; factory local pass does not grant it.
- Existing coverage inspected: `tests/fixtures/kujo/eval-pass/artifact-manifest.json`, `tests/fixtures/kujo/eval-pass/last_run.json`, `tests/fixtures/kujo/eval-pass/summary.json`, `tests/fixtures/kujo/eval/artifact-manifest.json`, `tests/fixtures/kujo/eval/last_run.json`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use review-first artifact handoff, explicitly authorize remote writes; avoid second release authority.
- Source evidence: [README.md](https://github.com/kujolang/source/blob/022d3036072a443727987389c673e0e5a1257880/README.md), [package.json](https://github.com/kujolang/source/blob/022d3036072a443727987389c673e0e5a1257880/package.json), [CHANGELOG.md](https://github.com/kujolang/source/blob/022d3036072a443727987389c673e0e5a1257880/CHANGELOG.md), [tests/fixtures/kujo/eval-pass/artifact-manifest.json](https://github.com/kujolang/source/blob/022d3036072a443727987389c673e0e5a1257880/tests/fixtures/kujo/eval-pass/artifact-manifest.json), [tests/fixtures/kujo/eval-pass/last_run.json](https://github.com/kujolang/source/blob/022d3036072a443727987389c673e0e5a1257880/tests/fixtures/kujo/eval-pass/last_run.json).

## intake

- Source: `e7577b5c871eeb168d802ea2425fdb82ba2130b5`; version 0.3.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Source release; optional intake subsystem.
- Capability: Normalized issue/webhook/file queue and human-reviewed actions.
- Entry points: .
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Inbound text is hostile data; queue routing cannot authorize external writes.
- Existing coverage inspected: `tests/smoke.mjs`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Read normalized issues as mission input; no automatic outbound action.
- Source evidence: [README.md](https://github.com/kujolang/intake/blob/e7577b5c871eeb168d802ea2425fdb82ba2130b5/README.md), [package.json](https://github.com/kujolang/intake/blob/e7577b5c871eeb168d802ea2425fdb82ba2130b5/package.json), [CHANGELOG.md](https://github.com/kujolang/intake/blob/e7577b5c871eeb168d802ea2425fdb82ba2130b5/CHANGELOG.md), [tests/smoke.mjs](https://github.com/kujolang/intake/blob/e7577b5c871eeb168d802ea2425fdb82ba2130b5/tests/smoke.mjs).

## versionseal

- Source: `f005374d72026a57c5246b6ed38473209e4bfc32`; version 0.3.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released local approval records.
- Capability: Exact-version approvals, revocation, quorum, optional signatures.
- Entry points: `src/domain.kujo`.
- Contract evidence: `docs/contracts.md`, `schemas/config.schema.json`, `schemas/output-envelope.schema.json`, `schemas/record.schema.json`.
- Boundary: No hosted identity; checksum integrity is not authentication.
- Existing coverage inspected: `tests/audit_test.kujo`, `tests/directory_test.kujo`, `tests/domain_test.kujo`, `tests/hardening_test.kujo`, `tests/query_test.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Bind human approval to artifact identity without replacing factory release gate.
- Source evidence: [README.md](https://github.com/kujolang/versionseal/blob/f005374d72026a57c5246b6ed38473209e4bfc32/README.md), [VERSION](https://github.com/kujolang/versionseal/blob/f005374d72026a57c5246b6ed38473209e4bfc32/VERSION), [kennel.toml](https://github.com/kujolang/versionseal/blob/f005374d72026a57c5246b6ed38473209e4bfc32/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/versionseal/blob/f005374d72026a57c5246b6ed38473209e4bfc32/CHANGELOG.md), [src/domain.kujo](https://github.com/kujolang/versionseal/blob/f005374d72026a57c5246b6ed38473209e4bfc32/src/domain.kujo), [docs/contracts.md](https://github.com/kujolang/versionseal/blob/f005374d72026a57c5246b6ed38473209e4bfc32/docs/contracts.md), [schemas/config.schema.json](https://github.com/kujolang/versionseal/blob/f005374d72026a57c5246b6ed38473209e4bfc32/schemas/config.schema.json), [tests/audit_test.kujo](https://github.com/kujolang/versionseal/blob/f005374d72026a57c5246b6ed38473209e4bfc32/tests/audit_test.kujo), [tests/directory_test.kujo](https://github.com/kujolang/versionseal/blob/f005374d72026a57c5246b6ed38473209e4bfc32/tests/directory_test.kujo).

## dossier

- Source: `670def8c62e690bcd3c0936cd85b224257ca4a03`; version 0.2.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released local evidence ledger.
- Capability: Claims/evidence ledger, source classification, optional signatures and citations.
- Entry points: `src/domain.kujo`.
- Contract evidence: `docs/contracts.md`, `schemas/config.schema.json`, `schemas/history-events.schema.json`, `schemas/output-envelope.schema.json`, `schemas/record.schema.json`, `tests/audit_contract_test.kujo`.
- Boundary: Assertions are not verified facts, rights or consent.
- Existing coverage inspected: `tests/audit_contract_test.kujo`, `tests/audit_test.kujo`, `tests/contention_receipt.kujo`, `tests/crypto_contention_receipt.kujo`, `tests/domain_test.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use for research/provenance in explicitly requested documentation missions.
- Source evidence: [README.md](https://github.com/kujolang/dossier/blob/670def8c62e690bcd3c0936cd85b224257ca4a03/README.md), [VERSION](https://github.com/kujolang/dossier/blob/670def8c62e690bcd3c0936cd85b224257ca4a03/VERSION), [kennel.toml](https://github.com/kujolang/dossier/blob/670def8c62e690bcd3c0936cd85b224257ca4a03/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/dossier/blob/670def8c62e690bcd3c0936cd85b224257ca4a03/CHANGELOG.md), [src/domain.kujo](https://github.com/kujolang/dossier/blob/670def8c62e690bcd3c0936cd85b224257ca4a03/src/domain.kujo), [docs/contracts.md](https://github.com/kujolang/dossier/blob/670def8c62e690bcd3c0936cd85b224257ca4a03/docs/contracts.md), [schemas/config.schema.json](https://github.com/kujolang/dossier/blob/670def8c62e690bcd3c0936cd85b224257ca4a03/schemas/config.schema.json), [tests/audit_contract_test.kujo](https://github.com/kujolang/dossier/blob/670def8c62e690bcd3c0936cd85b224257ca4a03/tests/audit_contract_test.kujo), [tests/audit_test.kujo](https://github.com/kujolang/dossier/blob/670def8c62e690bcd3c0936cd85b224257ca4a03/tests/audit_test.kujo).

## contentgraph

- Source: `79e82ae96c0b9e55bd5b182e2ef4d1415cbdb95b`; version 0.3.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released local WebOps component.
- Capability: Deterministic web corpus relationship and internal-link analysis.
- Entry points: `src/main.kujo`.
- Contract evidence: `schemas/adapter-cache-entry.schema.json`, `schemas/analysis.schema.json`, `schemas/clusters.schema.json`, `schemas/cms-export.schema.json`, `schemas/config.schema.json`, `schemas/doctor.schema.json`, `schemas/edge.schema.json`, `schemas/explanation.schema.json`.
- Boundary: Inferred content relations remain advisory.
- Existing coverage inspected: `tests/contentgraph_tests.kujo`, `tests/native_primitives_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Activate only for WebOps/site documentation work.
- Source evidence: [README.md](https://github.com/kujolang/contentgraph/blob/79e82ae96c0b9e55bd5b182e2ef4d1415cbdb95b/README.md), [VERSION](https://github.com/kujolang/contentgraph/blob/79e82ae96c0b9e55bd5b182e2ef4d1415cbdb95b/VERSION), [kennel.toml](https://github.com/kujolang/contentgraph/blob/79e82ae96c0b9e55bd5b182e2ef4d1415cbdb95b/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/contentgraph/blob/79e82ae96c0b9e55bd5b182e2ef4d1415cbdb95b/CHANGELOG.md), [src/main.kujo](https://github.com/kujolang/contentgraph/blob/79e82ae96c0b9e55bd5b182e2ef4d1415cbdb95b/src/main.kujo), [schemas/adapter-cache-entry.schema.json](https://github.com/kujolang/contentgraph/blob/79e82ae96c0b9e55bd5b182e2ef4d1415cbdb95b/schemas/adapter-cache-entry.schema.json), [schemas/analysis.schema.json](https://github.com/kujolang/contentgraph/blob/79e82ae96c0b9e55bd5b182e2ef4d1415cbdb95b/schemas/analysis.schema.json), [tests/contentgraph_tests.kujo](https://github.com/kujolang/contentgraph/blob/79e82ae96c0b9e55bd5b182e2ef4d1415cbdb95b/tests/contentgraph_tests.kujo), [tests/native_primitives_tests.kujo](https://github.com/kujolang/contentgraph/blob/79e82ae96c0b9e55bd5b182e2ef4d1415cbdb95b/tests/native_primitives_tests.kujo).

## searchbridge

- Source: `c1b2f5e7983988a5d3758267863c236834ed6ecf`; version 1.0.2; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released WebOps CLI; provider coverage varies.
- Capability: Normalized search/analytics evidence with provider provenance.
- Entry points: `src/cli.kujo`, `src/provider_runtime.kujo`.
- Contract evidence: `SEARCHBRIDGE_PROVIDER_EXPANSION/06-contract-design.md`, `SEARCHBRIDGE_PROVIDER_EXPANSION/ADAPTER_CONTRACT_PROPOSAL.json`, `docs/output-contract.md`, `docs/row-contracts.md`, `fixtures/provider-contracts.json`, `schemas/adapter-conformance.schema.json`, `schemas/adapter-manifest-v2.schema.json`, `schemas/adapter-manifest.schema.json`.
- Boundary: Measured search evidence does not approve code or imply deployment permission.
- Existing coverage inspected: `sdk/rust/tests/contracts.rs`, `tests/hardening_tests.kujo`, `tests/http_fault_server.rs`, `tests/legacy_budget_tests.kujo`, `tests/metric_contract.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Optional WebOps measurements with explicit credentials/network authority.
- Source evidence: [README.md](https://github.com/kujolang/searchbridge/blob/c1b2f5e7983988a5d3758267863c236834ed6ecf/README.md), [VERSION](https://github.com/kujolang/searchbridge/blob/c1b2f5e7983988a5d3758267863c236834ed6ecf/VERSION), [kennel.toml](https://github.com/kujolang/searchbridge/blob/c1b2f5e7983988a5d3758267863c236834ed6ecf/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/searchbridge/blob/c1b2f5e7983988a5d3758267863c236834ed6ecf/CHANGELOG.md), [src/cli.kujo](https://github.com/kujolang/searchbridge/blob/c1b2f5e7983988a5d3758267863c236834ed6ecf/src/cli.kujo), [src/provider_runtime.kujo](https://github.com/kujolang/searchbridge/blob/c1b2f5e7983988a5d3758267863c236834ed6ecf/src/provider_runtime.kujo), [SEARCHBRIDGE_PROVIDER_EXPANSION/06-contract-design.md](https://github.com/kujolang/searchbridge/blob/c1b2f5e7983988a5d3758267863c236834ed6ecf/SEARCHBRIDGE_PROVIDER_EXPANSION/06-contract-design.md), [SEARCHBRIDGE_PROVIDER_EXPANSION/ADAPTER_CONTRACT_PROPOSAL.json](https://github.com/kujolang/searchbridge/blob/c1b2f5e7983988a5d3758267863c236834ed6ecf/SEARCHBRIDGE_PROVIDER_EXPANSION/ADAPTER_CONTRACT_PROPOSAL.json), [sdk/rust/tests/contracts.rs](https://github.com/kujolang/searchbridge/blob/c1b2f5e7983988a5d3758267863c236834ed6ecf/sdk/rust/tests/contracts.rs), [tests/hardening_tests.kujo](https://github.com/kujolang/searchbridge/blob/c1b2f5e7983988a5d3758267863c236834ed6ecf/tests/hardening_tests.kujo).

## kennel-registry

- Source: `000282323a620837081635d2913156ec8b1f4cd7`; version not declared in inspected top-level metadata; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Official first-party package registry.
- Capability: Static package index, immutable distribution metadata and provenance.
- Entry points: .
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Trust pins and digests; registry availability is optional after installed closure.
- Existing coverage inspected: No selected test file; qualification remains open. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Consume through verified Kennel protocol; do not embed registry service.
- Source evidence: [README.md](https://github.com/kujolang/kennel-registry/blob/000282323a620837081635d2913156ec8b1f4cd7/README.md).

## openrouter

- Source: `8f6c239d99b15518e35fd9c9e317c238bde1c054`; version 0.1.2; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/openrouter/blob/8f6c239d99b15518e35fd9c9e317c238bde1c054/README.md), [kennel.toml](https://github.com/kujolang/openrouter/blob/8f6c239d99b15518e35fd9c9e317c238bde1c054/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/openrouter/blob/8f6c239d99b15518e35fd9c9e317c238bde1c054/CHANGELOG.md), [src/provider.kujo](https://github.com/kujolang/openrouter/blob/8f6c239d99b15518e35fd9c9e317c238bde1c054/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/openrouter/blob/8f6c239d99b15518e35fd9c9e317c238bde1c054/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/openrouter/blob/8f6c239d99b15518e35fd9c9e317c238bde1c054/tests/installed_consumer_smoke.kujo).

## xai

- Source: `3eb8a4a247d4ecf1f7e15b10ed2d42aef0abfdf9`; version 0.1.2; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/xai/blob/3eb8a4a247d4ecf1f7e15b10ed2d42aef0abfdf9/README.md), [kennel.toml](https://github.com/kujolang/xai/blob/3eb8a4a247d4ecf1f7e15b10ed2d42aef0abfdf9/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/xai/blob/3eb8a4a247d4ecf1f7e15b10ed2d42aef0abfdf9/CHANGELOG.md), [src/provider.kujo](https://github.com/kujolang/xai/blob/3eb8a4a247d4ecf1f7e15b10ed2d42aef0abfdf9/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/xai/blob/3eb8a4a247d4ecf1f7e15b10ed2d42aef0abfdf9/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/xai/blob/3eb8a4a247d4ecf1f7e15b10ed2d42aef0abfdf9/tests/installed_consumer_smoke.kujo).

## together

- Source: `573a2b135f36c5410c1504e27e78a86acdaf244a`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/together/blob/573a2b135f36c5410c1504e27e78a86acdaf244a/README.md), [kennel.toml](https://github.com/kujolang/together/blob/573a2b135f36c5410c1504e27e78a86acdaf244a/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/together/blob/573a2b135f36c5410c1504e27e78a86acdaf244a/CHANGELOG.md), [src/provider.kujo](https://github.com/kujolang/together/blob/573a2b135f36c5410c1504e27e78a86acdaf244a/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/together/blob/573a2b135f36c5410c1504e27e78a86acdaf244a/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/together/blob/573a2b135f36c5410c1504e27e78a86acdaf244a/tests/installed_consumer_smoke.kujo).

## groq

- Source: `b2fa9929fc6060d84f66f22b5347419e333e01f2`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/groq/blob/b2fa9929fc6060d84f66f22b5347419e333e01f2/README.md), [kennel.toml](https://github.com/kujolang/groq/blob/b2fa9929fc6060d84f66f22b5347419e333e01f2/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/groq/blob/b2fa9929fc6060d84f66f22b5347419e333e01f2/CHANGELOG.md), [src/provider.kujo](https://github.com/kujolang/groq/blob/b2fa9929fc6060d84f66f22b5347419e333e01f2/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/groq/blob/b2fa9929fc6060d84f66f22b5347419e333e01f2/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/groq/blob/b2fa9929fc6060d84f66f22b5347419e333e01f2/tests/installed_consumer_smoke.kujo).

## mistral

- Source: `d8f98a0d00d1aed63c648cd8898c1da0495f3861`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/mistral/blob/d8f98a0d00d1aed63c648cd8898c1da0495f3861/README.md), [kennel.toml](https://github.com/kujolang/mistral/blob/d8f98a0d00d1aed63c648cd8898c1da0495f3861/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/mistral/blob/d8f98a0d00d1aed63c648cd8898c1da0495f3861/CHANGELOG.md), [src/provider.kujo](https://github.com/kujolang/mistral/blob/d8f98a0d00d1aed63c648cd8898c1da0495f3861/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/mistral/blob/d8f98a0d00d1aed63c648cd8898c1da0495f3861/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/mistral/blob/d8f98a0d00d1aed63c648cd8898c1da0495f3861/tests/installed_consumer_smoke.kujo).

## fireworks

- Source: `101c9f2bb9511deee97d8ddcfdb319cab2833954`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/fireworks/blob/101c9f2bb9511deee97d8ddcfdb319cab2833954/README.md), [kennel.toml](https://github.com/kujolang/fireworks/blob/101c9f2bb9511deee97d8ddcfdb319cab2833954/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/fireworks/blob/101c9f2bb9511deee97d8ddcfdb319cab2833954/CHANGELOG.md), [src/provider.kujo](https://github.com/kujolang/fireworks/blob/101c9f2bb9511deee97d8ddcfdb319cab2833954/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/fireworks/blob/101c9f2bb9511deee97d8ddcfdb319cab2833954/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/fireworks/blob/101c9f2bb9511deee97d8ddcfdb319cab2833954/tests/installed_consumer_smoke.kujo).

## cerebras

- Source: `3b2fe9d4d5d8e6514450984d0cb86f6a1f85e959`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/cerebras/blob/3b2fe9d4d5d8e6514450984d0cb86f6a1f85e959/README.md), [kennel.toml](https://github.com/kujolang/cerebras/blob/3b2fe9d4d5d8e6514450984d0cb86f6a1f85e959/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/cerebras/blob/3b2fe9d4d5d8e6514450984d0cb86f6a1f85e959/CHANGELOG.md), [src/provider.kujo](https://github.com/kujolang/cerebras/blob/3b2fe9d4d5d8e6514450984d0cb86f6a1f85e959/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/cerebras/blob/3b2fe9d4d5d8e6514450984d0cb86f6a1f85e959/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/cerebras/blob/3b2fe9d4d5d8e6514450984d0cb86f6a1f85e959/tests/installed_consumer_smoke.kujo).

## cloudflare-ai

- Source: `3193948765dd66c0e05efbca2c196d37dfabaebb`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/cloudflare-ai/blob/3193948765dd66c0e05efbca2c196d37dfabaebb/README.md), [kennel.toml](https://github.com/kujolang/cloudflare-ai/blob/3193948765dd66c0e05efbca2c196d37dfabaebb/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/cloudflare-ai/blob/3193948765dd66c0e05efbca2c196d37dfabaebb/CHANGELOG.md), [src/provider.kujo](https://github.com/kujolang/cloudflare-ai/blob/3193948765dd66c0e05efbca2c196d37dfabaebb/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/cloudflare-ai/blob/3193948765dd66c0e05efbca2c196d37dfabaebb/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/cloudflare-ai/blob/3193948765dd66c0e05efbca2c196d37dfabaebb/tests/installed_consumer_smoke.kujo).

## deepseek

- Source: `033935514114488a91c74865ff9714cf4440d97a`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/deepseek/blob/033935514114488a91c74865ff9714cf4440d97a/README.md), [kennel.toml](https://github.com/kujolang/deepseek/blob/033935514114488a91c74865ff9714cf4440d97a/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/deepseek/blob/033935514114488a91c74865ff9714cf4440d97a/CHANGELOG.md), [src/provider.kujo](https://github.com/kujolang/deepseek/blob/033935514114488a91c74865ff9714cf4440d97a/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/deepseek/blob/033935514114488a91c74865ff9714cf4440d97a/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/deepseek/blob/033935514114488a91c74865ff9714cf4440d97a/tests/installed_consumer_smoke.kujo).

## deepinfra

- Source: `70b914e091355d79f0bc58879c1c909682895ea6`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/deepinfra/blob/70b914e091355d79f0bc58879c1c909682895ea6/README.md), [kennel.toml](https://github.com/kujolang/deepinfra/blob/70b914e091355d79f0bc58879c1c909682895ea6/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/deepinfra/blob/70b914e091355d79f0bc58879c1c909682895ea6/CHANGELOG.md), [src/provider.kujo](https://github.com/kujolang/deepinfra/blob/70b914e091355d79f0bc58879c1c909682895ea6/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/deepinfra/blob/70b914e091355d79f0bc58879c1c909682895ea6/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/deepinfra/blob/70b914e091355d79f0bc58879c1c909682895ea6/tests/installed_consumer_smoke.kujo).

## baseten

- Source: `5c6fc17afc6f18ad55526b770718a9228cbc1d35`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `provider.kujo`, `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/baseten/blob/5c6fc17afc6f18ad55526b770718a9228cbc1d35/README.md), [kennel.toml](https://github.com/kujolang/baseten/blob/5c6fc17afc6f18ad55526b770718a9228cbc1d35/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/baseten/blob/5c6fc17afc6f18ad55526b770718a9228cbc1d35/CHANGELOG.md), [provider.kujo](https://github.com/kujolang/baseten/blob/5c6fc17afc6f18ad55526b770718a9228cbc1d35/provider.kujo), [src/provider.kujo](https://github.com/kujolang/baseten/blob/5c6fc17afc6f18ad55526b770718a9228cbc1d35/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/baseten/blob/5c6fc17afc6f18ad55526b770718a9228cbc1d35/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/baseten/blob/5c6fc17afc6f18ad55526b770718a9228cbc1d35/tests/installed_consumer_smoke.kujo).

## fal

- Source: `94033188fb48aa806976a1fca65489ea63b473cb`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: .
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/fal/blob/94033188fb48aa806976a1fca65489ea63b473cb/README.md), [kennel.toml](https://github.com/kujolang/fal/blob/94033188fb48aa806976a1fca65489ea63b473cb/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/fal/blob/94033188fb48aa806976a1fca65489ea63b473cb/CHANGELOG.md), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/fal/blob/94033188fb48aa806976a1fca65489ea63b473cb/tests/installed_consumer_smoke.kujo), [tests/native_tests.kujo](https://github.com/kujolang/fal/blob/94033188fb48aa806976a1fca65489ea63b473cb/tests/native_tests.kujo).

## zai

- Source: `798a5eaae177af1d267114657c8a1eb82d6bdc96`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `provider.kujo`, `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/zai/blob/798a5eaae177af1d267114657c8a1eb82d6bdc96/README.md), [kennel.toml](https://github.com/kujolang/zai/blob/798a5eaae177af1d267114657c8a1eb82d6bdc96/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/zai/blob/798a5eaae177af1d267114657c8a1eb82d6bdc96/CHANGELOG.md), [provider.kujo](https://github.com/kujolang/zai/blob/798a5eaae177af1d267114657c8a1eb82d6bdc96/provider.kujo), [src/provider.kujo](https://github.com/kujolang/zai/blob/798a5eaae177af1d267114657c8a1eb82d6bdc96/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/zai/blob/798a5eaae177af1d267114657c8a1eb82d6bdc96/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/zai/blob/798a5eaae177af1d267114657c8a1eb82d6bdc96/tests/installed_consumer_smoke.kujo).

## perplexity

- Source: `459184fa4ba918b41b92fc75ce08aef3800ac68d`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `provider.kujo`, `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/perplexity/blob/459184fa4ba918b41b92fc75ce08aef3800ac68d/README.md), [kennel.toml](https://github.com/kujolang/perplexity/blob/459184fa4ba918b41b92fc75ce08aef3800ac68d/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/perplexity/blob/459184fa4ba918b41b92fc75ce08aef3800ac68d/CHANGELOG.md), [provider.kujo](https://github.com/kujolang/perplexity/blob/459184fa4ba918b41b92fc75ce08aef3800ac68d/provider.kujo), [src/provider.kujo](https://github.com/kujolang/perplexity/blob/459184fa4ba918b41b92fc75ce08aef3800ac68d/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/perplexity/blob/459184fa4ba918b41b92fc75ce08aef3800ac68d/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/perplexity/blob/459184fa4ba918b41b92fc75ce08aef3800ac68d/tests/installed_consumer_smoke.kujo).

## nvidia-nim

- Source: `d706ea6c38ec28eaa52b952804d012da0041ca52`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `provider.kujo`, `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/nvidia-nim/blob/d706ea6c38ec28eaa52b952804d012da0041ca52/README.md), [kennel.toml](https://github.com/kujolang/nvidia-nim/blob/d706ea6c38ec28eaa52b952804d012da0041ca52/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/nvidia-nim/blob/d706ea6c38ec28eaa52b952804d012da0041ca52/CHANGELOG.md), [provider.kujo](https://github.com/kujolang/nvidia-nim/blob/d706ea6c38ec28eaa52b952804d012da0041ca52/provider.kujo), [src/provider.kujo](https://github.com/kujolang/nvidia-nim/blob/d706ea6c38ec28eaa52b952804d012da0041ca52/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/nvidia-nim/blob/d706ea6c38ec28eaa52b952804d012da0041ca52/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/nvidia-nim/blob/d706ea6c38ec28eaa52b952804d012da0041ca52/tests/installed_consumer_smoke.kujo).

## vertex-ai

- Source: `677eb9bfffa141e8e96e4350352e3e001bd32068`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: .
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/vertex-ai/blob/677eb9bfffa141e8e96e4350352e3e001bd32068/README.md), [kennel.toml](https://github.com/kujolang/vertex-ai/blob/677eb9bfffa141e8e96e4350352e3e001bd32068/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/vertex-ai/blob/677eb9bfffa141e8e96e4350352e3e001bd32068/CHANGELOG.md), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/vertex-ai/blob/677eb9bfffa141e8e96e4350352e3e001bd32068/tests/installed_consumer_smoke.kujo), [tests/native_tests.kujo](https://github.com/kujolang/vertex-ai/blob/677eb9bfffa141e8e96e4350352e3e001bd32068/tests/native_tests.kujo).

## azure-ai

- Source: `a11891ccc287b1d4b23f528c3f0501406e1b2da3`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: .
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/azure-ai/blob/a11891ccc287b1d4b23f528c3f0501406e1b2da3/README.md), [kennel.toml](https://github.com/kujolang/azure-ai/blob/a11891ccc287b1d4b23f528c3f0501406e1b2da3/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/azure-ai/blob/a11891ccc287b1d4b23f528c3f0501406e1b2da3/CHANGELOG.md), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/azure-ai/blob/a11891ccc287b1d4b23f528c3f0501406e1b2da3/tests/installed_consumer_smoke.kujo), [tests/native_tests.kujo](https://github.com/kujolang/azure-ai/blob/a11891ccc287b1d4b23f528c3f0501406e1b2da3/tests/native_tests.kujo).

## bedrock

- Source: `ea2106405a75a352c9a5ccd081e779d92798dedf`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: .
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/bedrock/blob/ea2106405a75a352c9a5ccd081e779d92798dedf/README.md), [kennel.toml](https://github.com/kujolang/bedrock/blob/ea2106405a75a352c9a5ccd081e779d92798dedf/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/bedrock/blob/ea2106405a75a352c9a5ccd081e779d92798dedf/CHANGELOG.md), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/bedrock/blob/ea2106405a75a352c9a5ccd081e779d92798dedf/tests/installed_consumer_smoke.kujo), [tests/native_tests.kujo](https://github.com/kujolang/bedrock/blob/ea2106405a75a352c9a5ccd081e779d92798dedf/tests/native_tests.kujo).

## cohere

- Source: `97f6e9008c532bb3d2c98866a589ebe3bd49f3c9`; version 0.1.1; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `provider.kujo`, `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/cohere/blob/97f6e9008c532bb3d2c98866a589ebe3bd49f3c9/README.md), [kennel.toml](https://github.com/kujolang/cohere/blob/97f6e9008c532bb3d2c98866a589ebe3bd49f3c9/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/cohere/blob/97f6e9008c532bb3d2c98866a589ebe3bd49f3c9/CHANGELOG.md), [provider.kujo](https://github.com/kujolang/cohere/blob/97f6e9008c532bb3d2c98866a589ebe3bd49f3c9/provider.kujo), [src/provider.kujo](https://github.com/kujolang/cohere/blob/97f6e9008c532bb3d2c98866a589ebe3bd49f3c9/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/cohere/blob/97f6e9008c532bb3d2c98866a589ebe3bd49f3c9/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/cohere/blob/97f6e9008c532bb3d2c98866a589ebe3bd49f3c9/tests/installed_consumer_smoke.kujo).

## replicate

- Source: `1598bc7d24c99039b3c050ef54da2811138334c2`; version 0.1.0; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: .
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/replicate/blob/1598bc7d24c99039b3c050ef54da2811138334c2/README.md), [kennel.toml](https://github.com/kujolang/replicate/blob/1598bc7d24c99039b3c050ef54da2811138334c2/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/replicate/blob/1598bc7d24c99039b3c050ef54da2811138334c2/CHANGELOG.md), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/replicate/blob/1598bc7d24c99039b3c050ef54da2811138334c2/tests/installed_consumer_smoke.kujo), [tests/native_tests.kujo](https://github.com/kujolang/replicate/blob/1598bc7d24c99039b3c050ef54da2811138334c2/tests/native_tests.kujo).

## huggingface

- Source: `cf6f72fd09bcc999c3c00c8c95761e1855c09dbb`; version 0.1.2; default branch `main`.
- Classification: available upstream but requiring an adapter; optional. Maturity: Released adapter; factory live conformance not run.
- Capability: AI SDK native provider driver with encode/decode/capability contracts.
- Entry points: `provider.kujo`, `src/provider.kujo`.
- Contract evidence: CLI/module structures; no standalone schema found in selected paths.
- Boundary: Provider capability/auth differences explicit; credentials never enter Workcell or evidence.
- Existing coverage inspected: `tests/driver_tests.kujo`, `tests/installed_consumer_smoke.kujo`, `tests/native_tests.kujo`. Tests were not executed by this audit.
- Factory overlap: No direct production adapter found at baseline; overlapping guidance may exist.
- Decision: Use pinned AI SDK provider driver in fixed-output, tool-disabled worker; require conformance and real provider qualification.
- Source evidence: [README.md](https://github.com/kujolang/huggingface/blob/cf6f72fd09bcc999c3c00c8c95761e1855c09dbb/README.md), [kennel.toml](https://github.com/kujolang/huggingface/blob/cf6f72fd09bcc999c3c00c8c95761e1855c09dbb/kennel.toml), [CHANGELOG.md](https://github.com/kujolang/huggingface/blob/cf6f72fd09bcc999c3c00c8c95761e1855c09dbb/CHANGELOG.md), [provider.kujo](https://github.com/kujolang/huggingface/blob/cf6f72fd09bcc999c3c00c8c95761e1855c09dbb/provider.kujo), [src/provider.kujo](https://github.com/kujolang/huggingface/blob/cf6f72fd09bcc999c3c00c8c95761e1855c09dbb/src/provider.kujo), [tests/driver_tests.kujo](https://github.com/kujolang/huggingface/blob/cf6f72fd09bcc999c3c00c8c95761e1855c09dbb/tests/driver_tests.kujo), [tests/installed_consumer_smoke.kujo](https://github.com/kujolang/huggingface/blob/cf6f72fd09bcc999c3c00c8c95761e1855c09dbb/tests/installed_consumer_smoke.kujo).

## Named surfaces and discovery limits

The latest organization catalog was enumerated through GitHub before fetching 71 default branches. All 25 provider package sources were inspected, including native encode/decode and capability contracts. Live provider calls were not made. Source release metadata and asset names were inspected for the initial 50 repositories; downloaded release assets were not executed. The full records are in the machine inventory.

### docsgen

kujo docgen scan-only multilingual documentation, symbol/gap model, JSON/Markdown/HTML and CI gates. Use built-in kujo docgen on scoped snapshots; adapt docsgen-repo-contract-runner without executing arbitrary candidate build steps. No source execution/import/build or model calls by default; heuristic extraction and parser prototype limits remain visible. Evidence: [docs/DOCGEN.md](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/docs/DOCGEN.md), [src/docgen/core.rs](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/src/docgen/core.rs), [src/docgen/model.rs](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/src/docgen/model.rs), [tests/docgen_universal.rs](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/tests/docgen_universal.rs).

### agent-development-platform

Repository-owned Agent Project scaffold, inspect/run/eval/auth/doctor with seven profiles. Reuse agent.project.json schema and installed dependency patterns; do not replace Factory controller or permit arbitrary project entrypoint host execution. kujo agent run executes a project entrypoint; factory candidates still require Workcell and explicit tool authority. Evidence: [docs/AGENT_PROJECT_IMPLEMENTATION_REPORT.md](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/docs/AGENT_PROJECT_IMPLEMENTATION_REPORT.md), [src/agent_project.rs](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/src/agent_project.rs), [schemas/agent-project.schema.json](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/schemas/agent-project.schema.json), [tests/agent_project_contracts.rs](https://github.com/kujolang/kujo/blob/7a13207019a51e61d3db448bc13f59d5b0e332e5/tests/agent_project_contracts.rs).

### strata

Authenticated local Markdown knowledge CLI/HTTP, compact context search, revision-bound notes and provenance. Optional user-owned memory connector; deduplicate and preserve source authority; install independently, never require cloud memory. Every API request needs owner token; retrieved notes remain data, not permissions; never access internal SQLite directly. Evidence: [README.md](https://github.com/robertdevore/strata/blob/957fef2650394fc4f0df4c12e0dbce2b07a2b545/README.md), [API.md](https://github.com/robertdevore/strata/blob/957fef2650394fc4f0df4c12e0dbce2b07a2b545/API.md), [app/cli/commands/agent.ts](https://github.com/robertdevore/strata/blob/957fef2650394fc4f0df4c12e0dbce2b07a2b545/app/cli/commands/agent.ts), [app/main/api/notesApiServer.ts](https://github.com/robertdevore/strata/blob/957fef2650394fc4f0df4c12e0dbce2b07a2b545/app/main/api/notesApiServer.ts).

### capsule

Local benchmark handoff capsule with stable JSON/Markdown/manifest, bounded previews and shallow redaction. Keep disabled until a canonical redistributable source pin and install contract exist; use Scent/Scout for supported context adapters. No public kujolang/capsule repository resolved; local benchmark is not a released package, secret exclusions are incomplete. Evidence: [skills/kujo-benchmarks-capsule-workflows/SKILL.md](https://github.com/kujolang/kujo-skills/blob/76c249632b08bc6e2c6d08846094040ac94f4b91/skills/kujo-benchmarks-capsule-workflows/SKILL.md).

### ward

Named ecosystem security/policy capability with no public kujolang source contract resolved. Disabled; obtain public versioned source and security contracts before any integration. Unavailable implementation is not a release gate or execution permission. Evidence: [chain-of-command/00-ecosystem-inventory.md](https://github.com/kujolang/kujo-agents/blob/a7e9d0236d6e64b5db30273b32f4ad8c124f5173/chain-of-command/00-ecosystem-inventory.md).

### github-evidence-checks

Requested GitHub evidence checks integration; no exact public package resolved. Implement commit-linked CI evidence adapter only against reviewed GitHub APIs; never infer a package API from its name. Unavailable implementation is not a release gate or execution permission. Evidence: [chain-of-command/00-ecosystem-inventory.md](https://github.com/kujolang/kujo-agents/blob/a7e9d0236d6e64b5db30273b32f4ad8c124f5173/chain-of-command/00-ecosystem-inventory.md).

The canonical chain ecosystem prose still says 135 skills in one historical paragraph; counting the pinned skill packages yields 136. Use catalog validation and counts, not old prose. The workflow audit catalog has 44 active entries. The Agent Development Platform is implemented as Kujo Agent Project, not a standalone repository.

Workflow catalog drift: the README lists **45** workflow packages, whereas the machine audit catalog contains **44**. `publishing-house-operator` appears only in the README list. Preserve all 45 installable packages; the stale audit catalog must not silently exclude it.
