# Integration maintenance

Keep `sources.lock.json` as reviewed installation authority and `config/catalog.lock.json` as immutable package inventory. The initial source audit in `config/factory-capabilities.json` records baseline observations separately from implementation status.

1. Fetch upstream default branches in an isolated checkout. Compare exact commits, changelogs, manifests, schemas, agent roster, skill resources and workflow readiness. Never execute newly discovered package scripts during discovery.
2. Review a source-pin change. Preserve the previous dependency checkout, then run setup to install the new immutable pin. Modified checkouts are rejected rather than reset.
3. Run `node scripts/build-catalog.mjs` against the reviewed pins. Inspect the metadata/resource diff. Add tests for new or removed roles, changed schemas, missing resources, specialist routing and contract incompatibility.
4. Run catalog verification, `npm run verify`, and relevant real-engine qualification. Provider, runtime, dependency or policy changes invalidate prior execution qualification. Keep unknown versions and failed checks visible.
5. Review advisory security notices and source releases manually. Do not automatically adopt a breaking release. This change detects local package drift; scheduled upstream polling, advisory feeds and automatic compatibility evaluation remain unimplemented.

The catalog generator reads Git objects rather than dirty sibling files. Full package resources remain installed for Agent Skills hosts. Canonical role instructions are never copied into factory-owned instructions. Workflow scripts retain upstream maturity and cannot be run on candidate repositories by the discovery interface.

Future adapters must reference the audited executable entry points, preserve authority boundaries and add real integration tests. Fence is architecture analysis, not a sandbox. Shipcheck is readiness policy, not proof that tests ran. Runledger records facts supplied by the controller. Casefile must ingest captured logs without rerunning untrusted code on the host. Experimental integrations cannot silently become binding release gates.
