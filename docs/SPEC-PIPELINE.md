# Idea to independently reviewed specification

`software-factory spec prepare IDEA.txt` prepares a reviewable specification for the existing dependency-free Node API/static-browser runtime. The command calls the configured provider and consumes its usage. It does not implement an application, run generated acceptance tests, grant human approval, or approve a software release.

```sh
node bin/software-factory.mjs spec prepare idea.txt
```

An idea must contain 1–12000 characters. Unsupported runtime requirements must be rejected or identified during planning and review; this path does not make other languages or frameworks compatible. The pipeline uses the existing provider configuration and restricted structured-output proposal interface. Agents have no tools or host execution capabilities.

Native pinned Dispatch runs this dependency chain, with one attempt per task:

1. **Planner:** produces canonical planning deliverables identifying requirements, risks, ambiguities and acceptance intent.
2. **Spec Writer:** produces exactly one `pack.json` under the established software-pack contract. It must contain requirements, traceability, API/browser checks, negative behavior and restart checks. It cannot propose application files.
3. **Controller:** validates the software-pack data and calls pinned Kujo Spec for strict validation and a native Dispatch-envelope export.
4. **Code Reviewer:** receives that exact draft and its native validation record through a separate restricted provider invocation. It checks semantic coherence, missing or contradictory requirements, expected values and test quality. Its output cannot change files.
5. **Controller:** verifies the unchanged pack, Spec output and independent review, then records their frozen identities.

The canonical roles' manifests and schemas are loaded from the pinned registry. Each invocation retains its provider receipt, canonical contract hash and role identity. A reviewer verdict is a model judgment, not proof that the proposed tests executed. Strict Spec validation establishes contract validity, not product correctness.

Native RunLedger starts before Dispatch. The controller finalizes it after observing the real Spec result and the separate model review. Failed workflows retain their proposals, provider receipts, Dispatch journal, native validation records and CaseFile failure packet. A failed review blocks freezing and final publication. There is no automatic retry or changed-criteria retry in the same run.

Outputs live under `.runtime/specifications/spec-*/`:

- `artifacts/pack.json`: reviewable test-data contract, never executed by this workflow.
- `artifacts/spec/receipt-*/mission.spec.json` and `spec-envelope.json`: actual pinned Spec output.
- `artifacts/*-proposal.json` and `*-receipt.json`: role proposals and provider observations.
- `artifacts/review-binding.json` and `frozen-spec.json`: exact draft/review identities.
- `artifacts/accounting-terminal.json`: native RunLedger completion binding.
- `reviewed-specification.json`: emitted only after review, validation, identity checks and required accounting succeed.
- `result.json`: success/failure and explicit authority limits.

Planner and Spec Writer may return a `proposed` verdict; only the independent Code Reviewer must return `pass`. A proposal verdict is never interpreted as independent approval.

The final artifact explicitly records `humanApproval:false`, `implementationTestsExecuted:false`, `softwareReleaseApproval:false` and `deploymentAuthorized:false`. No `.seal.json` is created. A human must review the proposed requirements and test quality before following the normal [software-pack review and seal process](PACKS.md). A frozen hash identifies reviewed bytes; it does not establish correctness. The artifact is not a deployment authorization or a substitute for subsequent independent application acceptance.

The API `verifyFrozenSpec(dir)` checks retained draft, review, role-receipt and native Spec identities on the local record. This is not a signed portable software-release export or a human-authentication mechanism. The specification workflow has no automatic interruption recovery; preserve an interrupted run and reconcile its ledger rather than rerunning its recorded accounting attempt.

Deterministic tests use the real native Dispatch, Spec, RunLedger and CaseFile paths with explicitly labeled mock proposal agents. Frozen fixture artifacts also record `fixture:true`, `reviewKind:deterministic-fixture` and `modelReview:false`. These fixtures demonstrate ordering, identity binding and rejection behavior. They do not qualify live semantic model review or establish executed software acceptance results.

Current qualification: four deterministic tests pass through the native components using explicit mock proposals. Live Codex runs reached native Spec validation and independent review, but the reviewer rejected incomplete contract details; their failing RunLedger records and CaseFile packets were retained, and no final reviewed artifact was promoted. Successful live semantic completion remains unqualified. These failures demonstrate the rejection boundary, not a successful end-to-end specification release. Further work must improve draft completeness and obtain a genuinely passing independent review without weakening the gate.
