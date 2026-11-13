# Integration maintenance

Keep `sources.lock.json` as reviewed installation authority and `config/catalog.lock.json` as immutable package inventory. The initial source audit in `config/factory-capabilities.json` records baseline observations separately from implementation status.

1. Fetch upstream default branches in an isolated checkout. Compare exact commits, changelogs, manifests, schemas, agent roster, skill resources and workflow readiness. Never execute newly discovered package scripts during discovery.
2. Review a source-pin change. Preserve the previous dependency checkout, then run setup to install the new immutable pin. Modified checkouts are rejected rather than reset.
3. Run `node scripts/build-catalog.mjs` against the reviewed pins. Inspect the metadata/resource diff. Add tests for new or removed roles, changed schemas, missing resources, specialist routing and contract incompatibility.
4. Run catalog verification, `npm run verify`, and relevant real-engine qualification. Provider, runtime, dependency or policy changes invalidate prior execution qualification. Keep unknown versions and failed checks visible.
5. Review advisory security notices and source releases manually. Do not automatically adopt a breaking release. `npm run factory -- maintenance check --remote` observes pinned repositories’ current default-branch HEADs using bounded read-only Git requests. Differences or unavailable observations return a nonzero status and require review; intentional branch pins are not automatically replaced. Without `--remote`, it validates the combined reviewed pin inventory offline. Local catalog verification detects changed/removed/injected package resources. Scheduled polling, advisory feeds and automatic compatibility evaluation remain unimplemented.

The catalog generator reads Git objects rather than dirty sibling files. Full package resources remain installed for Agent Skills hosts. Canonical role instructions are never copied into factory-owned instructions. Workflow scripts retain upstream maturity and cannot be run on candidate repositories by the discovery interface.

Future adapters must reference the audited executable entry points, preserve authority boundaries and add real integration tests. Fence is architecture analysis, not a sandbox. Shipcheck is readiness policy, not proof that tests ran. Runledger records facts supplied by the controller. Casefile must ingest captured logs without rerunning untrusted code on the host. Experimental integrations cannot silently become binding release gates.

Native Eval has its own complete immutable closure in `config/eval-source.lock.json`; setup installs it alongside accountability tools. Release policy is controller-owned in `config/release-policy.json`; changes invalidate existing preflight decisions. New-format release records bind native accounting, policy and Eval artifacts, and audit/export/recheck share their offline consistency checks. Preserve the pre-accounting staged state and never promote it on the basis of an event name alone.

Additional complete source inventories live in `config/context.lock.json`, `config/change-tools.lock.json`, `config/lens-source.lock.json`, and `config/telemetry.lock.json`. Runtime compiler/interpreter identities are separate from their qualification evidence. No HEAD observation proves schema compatibility, package safety, or successful execution.

Workcell diagnostics compare every pinned tracked Git blob and executable mode, including changes hidden by index flags. Ignored generated caches remain outside that identity. The readonly workspace extension is pinned to a reviewed upstream branch; inspect its contract before repinning to a future default branch.
