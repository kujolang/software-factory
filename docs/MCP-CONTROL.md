# Opt-in local MCP control

The ordinary `software-factory mcp` command remains read-only. A separate local stdio transport can prepare and submit the existing default Node application workflow, inspect its records, request review, and cancel a child it owns. It does not expose a shell, container commands, publication, deployment, release approval, arbitrary packs, or automatic recovery.

The launching POSIX user authenticates through private OS-owned files and pipes. This is not remote authentication: never proxy this transport over HTTP or expose its stdio to an untrusted principal. There is no shared bearer token to leak. The capability file must be a regular, single-link file owned by the launching UID with mode `0600`. Both roots must be canonical absolute directories owned by that UID with no group/other access and no symlink ancestors. Input and state roots must be disjoint.

Create separate private directories outside source control and a capability file with this shape, replacing the UID, paths and expiration with your actual values:

```json
{
  "schema": "kujo.factory.control-grant/v1",
  "uid": 501,
  "missionRoot": "/absolute/private/factory-missions",
  "stateRoot": "/absolute/private/factory-control-state",
  "actions": ["prepare", "submit", "cancel", "request-approval"],
  "expiresAt": "2026-11-14T00:00:00Z",
  "maxMissions": 5,
  "maxDurationMs": 3600000
}
```

Use `chmod 700` for both directories and `chmod 600` for the capability file. Put your mission text inside the mission directory. The launch grant must explicitly name the actions it allows; it cannot add actions absent from the capability file:

```sh
node bin/software-factory.mjs mcp-control --capability /absolute/private/control.json --allow prepare,submit,cancel,request-approval
```

Granting `submit` authorizes model usage through the configured provider. The server invokes the existing `bin/software-factory.mjs run` path, including doctor and all independent release gates. It uses the operator's trusted local provider/engine configuration; tool callers cannot override the environment, model, executable or CLI arguments. Each submission receives a private runs directory. Only one controller child runs per transport. The number of preparations is capped by `maxMissions` (maximum 20); duration is at most two hours and is shortened to the remaining grant lifetime. These are transport bounds, not global multi-process reservations or a monetary budget.

All requests use newline-delimited MCP JSON-RPC. Discovery returns exact schemas. The control tools are:

| Tool | Input | Authority |
| --- | --- | --- |
| `factory_control_prepare` | `missionFile` relative to mission root | Freeze 1–12000 characters of UTF-8 text (64 KiB byte cap); no execution |
| `factory_control_submit` | `preparedId`, `missionSha256` | Execute that exact frozen input once |
| `factory_control_status` | `submissionId` | Read owned controller/run status |
| `factory_control_read_evidence` | `submissionId`, `runId` | Bounded operator evidence projection |
| `factory_control_read_artifact` | `submissionId`, `runId`, `artifact` | Up to 256 KiB inert text under `artifacts/` |
| `factory_control_request_approval` | `submissionId`, `reason` | Record a request only; never grant approval |
| `factory_control_cancel` | `submissionId` | Signal only a live child handle retained by this transport |

Example preparation:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"factory_control_prepare","arguments":{"missionFile":"mission.txt"}}}
```

Inspect the returned frozen mission identity, then submit using its `submissionId` as `preparedId` and its exact `missionSha256`. This second call requires the explicit launch `submit` grant. Changing the original mission file cannot change a prepared mission. Changing frozen bytes blocks submission. Every submission intent is created exclusively before launching; a duplicate cannot rerun it.

Prepared inputs, intents, request receipts, bounded controller logs and terminal observations remain in the private state root. Receipts use exclusive writes and file/directory synchronization. Each submission permits at most 100 action receipts; controller logs stop at 2 MB and exceeding the bound requests termination. Input messages are bounded to 1 MiB. Hidden paths, traversal, symlinks and unsupported artifact types are rejected. Provider credentials are never returned by a control tool.

Cancellation records the request, sends SIGTERM to the retained child, and escalates to SIGKILL after three seconds if that same child remains live. It never reads or signals a stored PID. EOF closes the transport and requests cancellation of its active controller. The existing controller propagates termination to its subprocesses; the independent Workcell watchdog remains the sandbox backstop. A cancellation response explicitly does not claim verified cleanup. If receipt storage fails, cancellation still signals the child and reports the persistence failure. Log write failures also cancel the child; write, synchronization or close failures prevent a successful terminal observation and cannot hang transport shutdown.

After a crash, an intent without a terminal record is `uncertain-reconcile-manually`. A new session can inspect that state but cannot adopt its process or resubmit its intent. Do not delete the intent to bypass reconciliation. Safe automatic resume, external-effect reconciliation, cleanup proof, global storage retention and multi-user operation remain unqualified. An exit code of zero is only a controller observation: release authority remains in the source-bound release evidence.

The transport tests use real local fixture subprocesses, not models or Workcell. They verify permissions, schema discovery, framing, cancellation, timeout, immutable preparation, duplicate refusal, restart uncertainty, scoped reads and default read-only behavior. They do not certify external MCP hosts or live end-to-end model missions.
