# Local MCP discovery

Start the read-only stdio server with:

```sh
node bin/software-factory.mjs mcp
```

A compatible host configuration is:

```json
{"mcpServers":{"software-factory":{"command":"node","args":["/absolute/path/to/software-factory/bin/software-factory.mjs","mcp"]}}}
```

The launching operating-system user owns the local pipes. No TCP listener, bearer-token service, browser control interface or multi-user authentication is provided. Do not expose the process through a network proxy. Messages use newline-delimited JSON-RPC with MCP protocol version `2025-06-18`; input buffering is bounded to 1 MiB.

Tools list the capability inventory, roles, skills and workflow kits; validate planning input; prepare advisory team plans; and verify a named export under `.runtime/exports/`. Bundle identifiers are single safe path components. The server never executes package instructions or bundle code. Every tool is read-only. No shell, container, approval, submission, cancellation, deployment or generic filesystem capability is exposed.

`factory_prepare_mission` returns a plan with `executionAuthorized:false`. It is not a queued mission. State-changing MCP tools, owned-mission authorization, artifacts/status APIs and external-host interoperability qualification remain incomplete release requirements. Local JSON-RPC tests verify discovery, denial, malformed input and actual stdio exchange; they are not certification by an external MCP client.

An opt-in separate [local control transport](MCP-CONTROL.md) supports prepared mission submission, scoped evidence and owned-child cancellation through a private OS-user grant. The default `mcp` command remains read-only. Control fixture tests do not qualify automatic crash recovery or live provider execution.

Read-only lifecycle tools now include `factory_list_mission_workflows`, `factory_validate_workflow`, `factory_list_missions`, and `factory_read_mission`. Status lookup requires a fixed family plus mission ID, never a filesystem path. Views expose bounded task graphs, provider usage with unknown values preserved, failure references and gate observations. They do not expose candidate source or grant artifact approval. Typed workflow validation is separate from the backward-compatible team planning tools and never submits work. Both transports remain local OS-user interfaces; external-host interoperability still needs separate qualification.
