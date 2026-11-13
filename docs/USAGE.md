# Daily use

Run commands from the checkout. Start the read-only Factory Floor with `npm start`. In another terminal:

```sh
npm run factory -- run factory/mission.txt
# A different product, using a reviewed and sealed pack:
npm run factory -- run idea.txt --pack packs/my-app.json
# Deliberately adversarial mission for a qualified local engine:
npm run factory -- run factory/mission-untrusted.txt
```

The command prints the run directory. Each run has `run.json`, an ordered `events.jsonl`, native `dispatch/` state, role handoffs and provider usage under `artifacts/`, proposed `application/` source, and an approved `build/` only when release gates pass. Usage/cost fields remain unknown when the provider does not report them.

Do not run candidate `npm start`, build scripts or JavaScript on the host. Use the trusted Workcell API/browser harness, which creates disposable databases and blocks network access. The repository's `examples/issue-tracker/` is a representative candidate fixture, not privileged controller code.

```sh
npm run smoke
npm run factory -- retry FAILED_RUN_ID
npm run factory -- recheck APPROVED_RUN_ID
node factory/audit.mjs /absolute/run/directory
node factory/export.mjs /absolute/run/directory /new/export/directory
```

Retry creates a new run with fresh review and checks of the failed candidate. Recheck revalidates an approved candidate without pretending to build it again. Neither inherits approval. Pack runs retain the source run’s frozen contract and tests. To change those tests, review and seal a new pack and start a new mission. Export refuses to represent an invalid approved run as valid. Keep source and receipts together; absolute paths in receipts describe the machine where they were produced and are not installation instructions.

To replay exports, configure `--runs /absolute/export-parent` and start the viewer. The viewer cannot authorize release, run commands, or deploy anything.

Ctrl-C stops the observer. Ctrl-C during a mission stops its active command tree; the independent container watchdog still enforces the lease deadline. See [recovery](TROUBLESHOOTING.md) for abrupt process death. There is no claim of automatic mission resumption after a crash.

## Integration interfaces

See [catalogs and team planning](CATALOGS.md), [accountability commands](ACCOUNTABILITY.md), [provider selection](PROVIDERS.md), [portable evidence](EVIDENCE.md) and [read-only MCP](MCP.md). These additions do not qualify arbitrary lifecycle workflows or additional languages. Review [known limitations](KNOWN-LIMITATIONS.md) before execution.

New missions use [accounted local releases](MISSION-ACCOUNTABILITY.md): verified files remain private until mandatory RunLedger and native gate bindings complete. An interrupted run is not automatically resumable, and a ledger pass by itself is not release approval.

## Additional bounded workflows

```sh
npm run factory -- spec prepare idea.txt
npm run factory -- run repair.txt --source /absolute/repository --pack packs/converter.json
npm run factory -- repository patch /absolute/completed/run
npm run factory -- runtime list
npm run factory -- operations inspect /absolute/run
npm run factory -- operations backup /absolute/completed/run /new/backup
```

The [specification pipeline](SPEC-PIPELINE.md) produces a model-reviewed draft and native Spec evidence. A human must still review its requirements and tests before sealing it. [Repository repair](REPOSITORY-MISSIONS.md) operates on an isolated committed Node source snapshot and prepares a local patch after independent release checks. It does not publish, merge or alter the original repository. [CLI runtime profiles](CLI-RUNTIMES.md) execute separately reviewed cases inside Workcell and report their narrow qualification scope.

[Operations](OPERATIONS.md) inspects native recovery plans and creates verifiable archival backups. It does not replay uncertain actions or restore approval. The [optional MCP control interface](MCP-CONTROL.md) requires a separate private capability file and explicit launch action allowlist; the Factory Floor remains read-only.

[Local telemetry](TELEMETRY.md) uses native Watchdog for content-free terminal snapshots. `npm run factory -- telemetry verify` checks its pinned closure; `npm run factory -- telemetry collect /absolute/run` creates a separate private observation without executing the mission.
