# Canonical accountability adapters

These adapters invoke pinned upstream programs on controller-created data. They do not replace independent acceptance or approve a release. Install their verified source closure with:

```sh
node scripts/setup-accountability.mjs
node --test tests/accountability.test.mjs
```

All dependencies live under the factory's private `.runtime/accountability-deps/`. `config/accountability.lock.json` fixes each source commit and every installed file's SHA-256 and byte size. Each invocation rechecks the complete closure, rejects missing/extra files and symlinks, and uses fixed executable paths/argv, a 30-second deadline, a 1 MB combined output cap and a minimal environment. No provider credentials or user Git configuration are inherited. The Git discovery ceiling prevents tools from collecting the enclosing Factory checkout's metadata.

The normal CLI routes `software-factory accountability` to these operations:

```sh
npm run factory -- accountability spec packs/converter.json
npm run factory -- accountability record summary.json
npm run factory -- accountability failure failed-acceptance.log
npm run factory -- accountability readiness readiness-metadata.json
```

Each operation returns an evidence directory. Outputs, failed invocation receipts and original inputs remain under `.runtime/accountability/`. Preserve these private originals; CaseFile's redacted bundle is an aid, not a guarantee that arbitrary secrets are gone. Logs are never interpreted as commands.

| Operation | Actual canonical execution | Boundary |
|---|---|---|
| `spec` | Spec `validate --strict --json`, then `export --format envelope --payload-format dispatch` | Validates the existing pack first, projects all requirements and test references, binds pack/spec/envelope hashes. It does not claim semantic review or contradictory-requirement detection. |
| `record` | RunLedger `start`, `note`, `test`, optional `usage`, `finish`, `show --json` | Records supplied observations with their source reference. Unknown tokens and cost remain null. The isolated staging directory deliberately has no source Git identity; source commits must be referenced in supplied evidence. |
| `failure` | CaseFile `capture --from-log --format json` | Captures an existing log without rerunning a candidate command. Keeps `exit_code:null` for log-only capture; never invents execution status. |
| `readiness` | ShipCheck `scan --format json` | Scans an isolated metadata projection. Reports failed gates honestly. Does not scan the full candidate or execute package scripts. Advisory only. |

`record` accepts exactly this shape; usage is optional and numbers must be observed nonnegative integers:

```json
{
  "missionId": "mission-identifier",
  "provider": "provider-identity",
  "model": "model-identity",
  "status": "fail",
  "verdict": "Independent acceptance failed",
  "evidence": "Retained controller receipt path and source commit",
  "tests": [
    {"name": "API acceptance", "status": "fail", "evidence": "Retained test receipt path"}
  ]
}
```

Terminal status is `pass`, `partial`, `fail` or `abandoned`; individual test status is `pass`, `fail` or `skip`. A recorded `pass` is a caller-supplied observation, not a Factory release approval. Optional `usage` contains `input_tokens` and/or `output_tokens`. No cost is inferred from token counts.

`readiness` accepts an object mapping any subset of `README.md`, `CHANGELOG.md`, `LICENSE`, `SECURITY.md` and `package.json` to bounded text. Other paths are rejected. This intentionally limited metadata adapter is insufficient to satisfy the full ShipCheck release integration requirement.

The callable host API exports `projectPackToSpec`, `validatePackWithSpec`, `beginRunAccounting`, `inspectRunAccounting`, `finishRunAccounting`, `annotateRunAccounting`, `recordRunSummary`, `captureFailureLog` and `inspectReadiness`. Callers must remain trusted controllers. The module exposes no generic command runner. Recording accounting facts does not approve a release or establish a mandatory release policy. Eval, broader security gates and automatic retention/recovery still require separate integration and qualification.

## Persistent mission accounting

The controller starts accounting before performing work and keeps the returned lifecycle binding with its mission state:

```js
const binding = await beginRunAccounting({
  missionId: 'mission-id',
  provider: 'codex',
  model: 'unreported',
  evidence: 'artifacts/controller-provenance.json',
  sourceProvenance: { commit: null, tree: null }
}, { parent: 'CONTROLLER_OWNED_ACCOUNTING_DIRECTORY' });
// The real RunLedger record is now persisted with status in_progress.
const finished = await finishRunAccounting(binding, {
  status: 'fail',
  verdict: 'Independent API acceptance failed',
  tests: [{ name: 'API acceptance', status: 'fail', evidence: 'artifacts/acceptance.json' }],
  usage: null,
  evidence: 'events.jsonl'
});
```

The required start fields are `missionId`, `provider`, `model` and `evidence`. The optional `sourceProvenance` is a bounded JSON object retained in `metadata.json` and referenced by hash in a canonical RunLedger note. Its contents are supplied observations, not an authenticated source identity. RunLedger requires nonempty provider/model strings; an explicit `unreported` label means unknown identity, not a real model name. Unknown counters and costs remain null.

Persist the original lifecycle binding (schema `kujo.factory.runledger-lifecycle/v1`) rather than reconstructing it from model output. `inspectRunAccounting(binding)` validates its stored identity and metadata hash, then reads the actual pinned RunLedger record. The directory and all parent paths must be plain directories; a forged ID, changed identity, changed source metadata, or symlink is rejected. The terminal result retains the original identity under `lifecycleBinding` for later inspection. `recordRunSummary` remains compatible and now calls start/finalize rather than maintaining a second implementation.

Finalization records one immutable intent before appending tests, usage and the terminal verdict to the same ledger. An exact repeat verifies the actual record against the saved terminal result and returns it without appending any facts. A different intent is rejected. A failed or interrupted attempt preserves its intent, failed invocation receipts and the still-open or already-terminal canonical ledger; it is never automatically replayed. The controller must reconcile uncertain partial operations explicitly. A stale finalization lock similarly blocks continuation instead of assuming the previous process did nothing. These bounds do not claim general durable mission recovery or exactly-once external effects.

A terminal `pass` records the verified pre-promotion candidate outcome. The later filesystem promotion can still fail, so it does not by itself mean the controller mission completed or a release was published. `annotateRunAccounting(initialBinding, note)` appends a bounded controller observation using canonical RunLedger `note`, preserves the terminal status and original terminal snapshot, and writes a separate annotation receipt. The controller uses this for promotion failures before blocking the local release and retaining CaseFile evidence. After such an annotation, the original terminal snapshot no longer matches the live ledger; it cannot be silently reused for promotion. The final mission status and release receipt remain authoritative about completion.

Annotations are one attempted append per call. Repeated explicit calls may append the same note again; no automatic retry or deduplication is claimed. An uncertain annotation failure retains its intent and failure receipt for reconciliation. The controller must never interpret an annotation failure as permission to approve or retry an external effect.

Spawn failures also retain execution receipts with `code:null` and `reason:spawn_error`. Begin failures expose their evidence directory on the error and, when a canonical ID was already created, `error.accountingBinding`. This lets the controller preserve the original attempt rather than fabricate a successful accounting record or silently start a replacement.

## Qualification

`node --test tests/accountability.test.mjs` runs the real pinned Spec, RunLedger, CaseFile and ShipCheck programs against deterministic synthetic inputs. It covers requirement/test projection, strict validation and export, retained failures, null unknown usage/cost, measured fixture usage, no parent Git discovery, log-only capture, literal malicious-looking text, nonexecution of package scripts, invalid input rejection and symlink refusal. Persistent lifecycle tests also cover an observable in-progress record, same-ID finalization, exact-repeat idempotency, changed-intent rejection, preserved upstream spawn failure, source-identity tampering and stale-lock refusal. These are real adapter execution tests with fixture data; they are not live-provider, application construction, rootless runtime or release qualification.

The first exploratory run exposed two adapter defects: Spec IDs require UUID v4, so the pack ID now lives in projection metadata; Git discovery could ascend from private staging, so the environment now enforces a discovery ceiling. The corrected tests assert both boundaries. No upstream source was changed by this adapter work.

## Mandatory mission lifecycle

New runs declare `accountabilityRequired:true`. Workers refuse missing or non-active accounting identities. RunLedger receives source commit/tree and exact controller hashes through its retained metadata note; candidate file identities, provider/agent receipts, measured usage, historical failures and observed test outcomes are bound in `artifacts/mission-observations.json`. Unknown token fields and costs remain unknown. A failed attempt remains in the evidence even if a later correction succeeds.

Release is two-stage. Workers write `artifacts/verified-build/`, `release-verified.json` and `release.verified` only after independent tests, Eval, selected ShipCheck checks and repeated release acceptance. These are private pending evidence. After terminal accounting succeeds, the controller rechecks exact source/build/native ledger/gate identities and promotes `build/`, `release.json` and `release.approved`. Accounting failure never exposes a new approved candidate. Post-finalization promotion failure retains the prior terminal ledger observation, appends a canonical failure note where possible and records the controller mission as failed; a ledger pass alone is not final mission approval.

Successful new-format exports require actual native ledger records, immutable finish intent, policy/ShipCheck evidence, native Eval artifacts and their bound hashes. Audit and recheck use the same offline record consistency verifier. This detects missing and contradictory retained records, not an adversarial controller that forges an entirely new unsigned history. Failed runs remain exportable. Generated HTML/JavaScript under evidence is served as inert text by the read-only observer.
