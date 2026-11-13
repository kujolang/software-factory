# Retained mission operations

The operations adapter uses the pinned Dispatch `18b5c737a73904ae942f0bd1c3baa1f77c2bfb40` native `recover inspect` and `recover plan` commands. It does not implement a second scheduler, repair journal history, infer execution completion or automatically resume factory workers.

Before native execution, `bindMissionRecovery(runDirectory)` freezes the immutable mission projection, workflow bytes, frozen pack bytes, exact controller-file inventory, pinned Dispatch revision, repository-source binding and initial application hashes in `artifacts/recovery-binding.json`. The projection includes mission, roles/tasks, provider routing and execution provider, pack identity, team and repository source settings, and required accountability/Lens markers. Status and lifecycle timestamps are excluded so legitimate terminal updates do not invalidate the binding.

`factory operations inspect RUN` reports binding drift, current native step statuses and Dispatch's retained-host assessment. `factory operations plan RUN` also asks native Dispatch for permitted journal/checkpoint repair recommendations. Native source is checked against its pin before invocation. Snapshot paths, file inventories, runtime duration and captured output are bounded; source symlinks and state path mismatches fail closed. Filesystem-preservation handles outside the native run directory require separate owner inspection; this adapter will not probe arbitrary retained host paths. Concurrent checkpoint changes are explicitly reported. Retained `running` state or a leftover lock file does not establish whether a process is alive or dead; liveness is not inferred.

Native plans explicitly prohibit replay, resume, unconsuming effects and changing policy. Some retained states are unsupported or missing required authority; these remain explicit diagnostics rather than a manufactured successful assessment. Factory production workers currently use fixed artifact names, so **every operations assessment has `resumeAllowed: false`**. Uncertain execution needs owner reconciliation and a fresh authorized attempt. No API here releases an approval, repeats a tool/model call, applies a native repair plan or modifies failed evidence. A paused upstream fixture resuming successfully does not qualify factory mission resumption.

## Backups and retention

`factory operations backup RUN DEST` delegates terminal-run export to the existing evidence exporter. It preserves complete selected evidence, source bindings and failures; active runs remain refused. Existing evidence import remains archival, never executable restoration.

`factory operations snapshot RUN DEST` can retain a stable archival copy of active/native recovery state: run/workflow configuration, recovery binding and the complete bounded Dispatch state tree. It checks source identities again before publishing and verifies the staged snapshot. It does not include candidate application bytes, frozen pack contents, provider credentials or full Workcell evidence; use a full terminal backup for those selected mission artifacts. A snapshot does not restore a usable mission or approvals.

`factory operations verify-snapshot PATH` checks exact inventory hashes and rejects missing, changed, extra and symlinked files. This is unsigned integrity verification, not authentication or execution proof. The snapshot and embedded diagnostics can contain private mission information and must remain private unless deliberately shared.

`factory operations retention RUNS` reports a dry-run list for human review, using a 30-day default and explicit terminal timestamps. API callers may choose another positive day count. Missing terminal timestamps retain the run. The adapter never deletes anything; verify backups and evidence obligations before separately authorizing deletion.

## Qualification

`node --test tests/operations.test.mjs` runs the actual pinned native engine with explicitly synthetic offline tools. Tests kill the process group while a native step is running, verify retained uncertainty, inspect/snapshot without reexecution, reject tampering, then independently kill a controller after a durable native approval pause and resume that fixture through upstream `run_workflow`. The completed earlier tool is not repeated; separate fixture result files preserve both observations. No provider, application or external service executes. Tests also verify immutable workflow drift, mutable terminal timestamps and retention dry-run behavior.

This qualifies read-only diagnosis and archival operations on the tested host. Automatic production recovery, cross-host runtime restoration, cost reservation reconciliation, approval replay, source-changing repair, actual mission resume and automated deletion remain unsupported.
