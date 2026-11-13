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

The callable host API exports `projectPackToSpec`, `validatePackWithSpec`, `recordRunSummary`, `captureFailureLog` and `inspectReadiness`. Callers must remain trusted controllers. The module exposes no generic command runner. Automatic mission lifecycle hooks are not enabled: recording data independently is not the same as wiring a mandatory release policy. Eval, broader security gates, full source-linked accounting, and automatic retention/recovery remain required follow-up work.

## Qualification

`node --test tests/accountability.test.mjs` runs the real pinned Spec, RunLedger, CaseFile and ShipCheck programs against deterministic synthetic inputs. It covers requirement/test projection, strict validation and export, retained failures, null unknown usage/cost, measured fixture usage, no parent Git discovery, log-only capture, literal malicious-looking text, nonexecution of package scripts, invalid input rejection and symlink refusal. These are real adapter execution tests with fixture data; they are not live-provider, application construction, rootless runtime or release qualification.

The first exploratory run exposed two adapter defects: Spec IDs require UUID v4, so the pack ID now lives in projection metadata; Git discovery could ascend from private staging, so the environment now enforces a discovery ceiling. The corrected tests assert both boundaries. No upstream source was changed by this adapter work.
