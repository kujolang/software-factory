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

`factory_prepare_mission` returns a plan with `executionAuthorized:false`. It is not a queued mission. A separate explicitly granted control transport provides bounded preparation/submission, owned cancellation, status and inert evidence reads; see [MCP-CONTROL.md](MCP-CONTROL.md). Local JSON-RPC tests verify discovery, denial, malformed input and actual stdio exchange; they are not certification by an external MCP client.

An opt-in separate [local control transport](MCP-CONTROL.md) supports prepared mission submission, scoped evidence and owned-child cancellation through a private OS-user grant. The default `mcp` command remains read-only. Control fixture tests do not qualify automatic crash recovery or live provider execution.

Read-only lifecycle tools now include `factory_list_mission_workflows`, `factory_validate_workflow`, `factory_list_missions`, and `factory_read_mission`. Status lookup requires a fixed family plus mission ID, never a filesystem path. Views expose bounded task graphs, provider usage with unknown values preserved, failure references and gate observations. They do not expose candidate source or grant artifact approval. Typed workflow validation is separate from the backward-compatible team planning tools and never submits work. Both transports remain local OS-user interfaces. Official SDK interoperability has the bounded qualification below; editor-specific hosts remain unqualified.

## Official SDK interoperability

`node scripts/qualify-mcp-client.mjs --install` installs the optional, exact-lock qualification client with lifecycle scripts disabled and runs real local stdio calls. Later runs omit `--install`. This developer qualification dependency is separate from normal factory installation. The [official SDK client interface](https://ts.sdk.modelcontextprotocol.io/client) provides initialization, discovery and tool calls; the factory retains its own authority checks.

SDK1.32.2 passed discovery of11 read-only tools,85roles/136skills/45upstream workflows, planning without execution, traversal and unknown-effect rejection, and separately granted control preparation/status with submission denied. No model call or Workcell execution occurred. Exact package integrity, controller identity and evidence hash are in [MCP-CLIENT-QUALIFICATION.json](MCP-CLIENT-QUALIFICATION.json). This is a real SDK transport test, not certification for every editor or remote deployment.
