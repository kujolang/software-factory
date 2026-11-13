# Typed software missions

The versioned `config/mission-workflows.json` inventory describes all twenty requested lifecycle classes. It distinguishes working delegation paths from missing specialized gates. Admission or a workflow label is never execution evidence.

The controller adapter exports `missionWorkflowCommand(args)`, `validateMissionWorkflow(input)` and `executeMissionWorkflow(input)`. The CLI integration is `mission list`, `mission inspect TYPE`, `mission validate INPUT.json`, and `mission execute INPUT.json`. Execution is authorized by invoking `execute`; validation never calls a provider, candidate runtime, or network service.

```json
{
  "schema": "kujo.factory.mission-input/v1",
  "type": "bug-repair",
  "mission": "Repair the committed greeting endpoint against the independently reviewed acceptance pack.",
  "source": "/absolute/local/repository",
  "pack": "/absolute/reviewed/pack.json"
}
```

Each entry declares required input fields, canonical role and skill references, tool dependencies, allowed effects, independent gates, outputs, approval limits and failure/recovery behavior. Unknown fields, unsupported IDs, symlink inputs, changed seals, unsupported effects and oversized inputs fail closed. Skills are guidance; the delegated controller owns actual permissions.

| Classes | Actual path and scope |
| --- | --- |
| Idea to specification | Existing native Dispatch planner, Spec Writer, pinned Spec validator and independent Code Reviewer. Reviewed specification only. |
| New application, API, frontend, integration | Existing native Dispatch application graph with canonical team consultations, sealed acceptance, Workcell, Lens, Eval, policy and accounted independent release. Dependency-free Node 26 APIs/static assets and optional SQLite; no arbitrary external integrations or frameworks. |
| Bug repair, feature, refactoring, security remediation, maintenance, test coverage | Existing committed-repository admission plus native verification/repair and release. Source stays within server.mjs, optional db.mjs and flat public assets. Test-coverage missions consume a separately reviewed, sealed expanded pack; implementation agents cannot edit it. No claim of line coverage measurement. Existing source route does not yet execute selected advisory teams. |
| GitHub issue | Actual read-only GitHub issue ingestion retained as untrusted source evidence, followed by the same bounded committed-repository path. No PR creation, comments, commits or pushes. Expanded issue+mission must fit the existing context bound. |
| Repository onboarding | Real safe Git object copy into a private local repository. No candidate execution or model assessment. |
| Documentation | Native Dispatch source-bound Documentation Writer and separate Code Reviewer. Produces inert Markdown data with frozen identity and native RunLedger; no candidate execution or software approval. |
| Release candidate and revalidation | Existing `recheck` of a previously approved run, using original frozen acceptance and fresh checks. These paths cannot prepare an unapproved source as a release without normal construction/verification. |
| Failed release | Bounded actual persisted failure observations for operator investigation. No automated root-cause claim or resume. |
| Dependency upgrade | Blocked: no qualified package installation and vulnerability gate in the dependency-free source path. |
| Database migration | Blocked: no independently qualified existing-data migration/rollback gate. SQLite creation is not migration qualification. |
| Performance optimization | Blocked: no isolated baseline/comparison and performance acceptance gate. |

Execution writes admission, fixed command delegation and bounded process/result receipts under `.runtime/mission-workflows/`. Existing commands own durable mission state, native Dispatch dependencies, bounded retries, Workcell watchdogs, provider receipts, CaseFile and release authority. The adapter adds no scheduler and cannot approve anything. A successful child exit means that command completed; inspect its own run evidence to determine artifact approval. A controller interruption is not automatic resume authorization. Preserve incomplete state and use existing recovery inspection; do not repeat uncertain effects.

All 45 pinned upstream workflow kits remain catalogued with their exact commits, maturity and executable entrypoint descriptions. The mission inventory references relevant contract patterns, including Feature Card, Agency Verified Fix Loop, Codebase Cleanup, Workcell Execution Gate, CaseFile and DocsGen. It does **not** invoke their shell entrypoints or assert those experimental/limited kits are qualified factory gates. Existing native adapters supply the actual supported behavior. Foreman is excluded.

## Reviewed documentation

```json
{
  "schema": "kujo.factory.mission-input/v1",
  "type": "documentation",
  "mission": "Describe the exported API with citations; distinguish observed source behavior from unexecuted examples.",
  "source": "/absolute/project",
  "files": ["server.mjs", "README.md"]
}
```

Only explicit source files are read: 1–32 plain UTF-8 files, at most 200 KB each and 500 KB combined. Symlinks, traversal, secret filename patterns and unsupported extensions are rejected. Explicit selection is not a general secret scanner: the operator must select appropriate source. Contents are untrusted data in model prompts. Agents have no tools. Writer proposals may contain only 1–10 `docs/NAME.md` records; the reviewer can write nothing. Markdown remains JSON text, never executed or rendered as trusted HTML.

Native Dispatch runs writer → independent reviewer → freeze. Real native RunLedger records terminal status, actual reported usage and source/document identities. Failed proposals/reviews preserve CaseFile and provider output. A passing model review is an advisory content judgment, not executable correctness, authenticated human approval or publication permission. Final metadata binds source, docs, review and accounting. No source repository files change. No automatic interruption resume is claimed.

## Qualification

`scripts/qualify-mission-workflows.mjs` runs actual private Git onboarding and native documentation Dispatch/RunLedger/CaseFile with explicitly synthetic model outputs. It preserves bounded logs and a qualification JSON. Tests cover all twenty input contracts and negative paths, not twenty successful live missions.

`scripts/qualify-canonical-roles.mjs` exercises all 28 canonical role input/output and handoff contracts with synthetic fixtures and forbidden release-record effects. `--live chain.ROLE` makes exactly one real Codex invocation for a coordinated qualification run. Its output is retained for independent human semantic evaluation; neither schema validity nor a model's self-assessment marks role performance qualified. No live calls occur by default.
