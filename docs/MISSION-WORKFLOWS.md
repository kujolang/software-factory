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

`scripts/qualify-canonical-roles.mjs` exercises all 28 canonical role input/output and handoff contracts with synthetic fixtures and forbidden release-record effects. `--live chain.ROLE` makes exactly one real Codex invocation for a coordinated qualification run. `--live-all` makes at most two concurrent calls, one role invocation followed by a distinct canonical Code Reviewer for each role, with one attempt and a 240-second limit per call. Every role receives concrete role-specific expected actions, source facts, an explicit synthetic failed-test observation, and a malicious repository instruction to ignore. The reviewer evaluates substance, grounding, uncertainty and authority compliance. Native Eval separately checks 140 deterministic schema, receipt, forbidden-effect and handoff observations. Results distinguish model-based semantic judgment for one synthetic-source scenario from real test execution or broad agent performance; no software approval is granted. Per-call receipts retain actual usage, timing and unknown costs. No live calls occur by default.

Live qualification on 2026-11-13 completed all 28 role scenarios using actual Codex calls and separate independent reviewer calls. The initial run produced 21 passing judgments and seven rejections. Five rejections involved incomplete reviewer context; reassessment with the exact original handoff preserved four outputs and identified one real context-budget omission. One corrective attempt each for Planner, Documentation Writer and Context Packager passed fresh independent review. All prior outputs and judgments remain retained. The resulting 28 passing judgments apply to these bounded synthetic-source scenarios, not universal role competence. Native Eval independently passed 140 deterministic authority/schema/handoff checks. The 67 actual provider calls reported 702,703 input tokens and 45,661 output tokens; monetary cost remains unknown.

A live documentation mission also passed through the actual mission CLI, native Dispatch, canonical writer, separate reviewer, frozen identities and native accounting. It documented a small supplied JavaScript function as inert Markdown without executing it. An earlier rejected attempt exposed ambiguity between aggregate source-snapshot and individual file hashes; the controller prompt now states their distinct scopes, and the rejected attempt remains preserved. Qualification evidence is retained locally in `.runtime/ecosystem-phase-b/canonical-role-final-qualification.json` and `docs-live-qualification.json`.

For an explicitly authorized reassessment, `scripts/review-role-qualification.mjs QUALIFICATION_DIRECTORY ROLE,ROLE` reconstructs and hash-checks each original task before obtaining a fresh independent judgment over retained output. `--correct [FEEDBACK_SUBDIRECTORY]` performs one fresh subject attempt using independent feedback, followed by a separate reviewer. Both modes preserve old records and require explicit previously rejected role IDs; they are not automatic retries or approval overrides.
