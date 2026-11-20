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

## Qualification maintenance at frozen source `e6b32ea`

Treat the following artifacts as separate versioned contracts. A current source checkout does not retroactively strengthen an older run.

| Change | Review and qualification required before adoption |
| --- | --- |
| Canonical role instructions, manifest, input/output schema or layer metadata | Rebuild the complete catalog, validate required fields and exact role identity, test permitted/prohibited effects and dependency ordering, and repeat affected independent semantic/handoff scenarios. The `routine worker` layer spelling matters to post-verification routing. A new role count alone does not qualify behavior. |
| Skill package content/resources/dependency metadata | Verify complete package identity, inspect newly required resources, update positive/negative routing and compatibility fixtures, and preserve unknown dependency metadata explicitly. Guidance never authorizes its suggested shell commands or tool access. |
| Any of the 45 workflow kit contracts | Compare actual entrypoint/scripts and schemas against the pinned contract pattern, keep maturity labels, and requalify any adapter that consumes changed fields. Catalog availability is not permission to execute upstream scripts on a candidate checkout. |
| Twenty-class mission adapter | Validate all typed inputs and unknown-field rejection; exercise each changed real route and its failure evidence. Keep blocked dependency/migration/performance entries blocked until their specialized independent gates execute. Reusing a generic Node path does not qualify a different runtime or benchmark. |
| Documentation/specification/CLI promotion bindings | Repeat success, missing-record, tampered-and-rehashed record, marker downgrade and failed-run export tests. Bind original source, role output/receipt, reviewer and native accounting records before promotion. Preserve legacy artifacts as historical, never add modern evidence claims after the fact. |
| Workcell, compiler/interpreter, runtime image or dependency build policy | Compare complete source bytes and modes, rebuild only the affected trusted image, and rerun representative functional, hostile source/write/network/credential, cleanup and controller-death cases. Go/Rust source-mount v1 remains disabled. Image availability and version output do not qualify a profile. |
| Provider SDK/authentication/schema/limit behavior | Preserve isolated credentials and tool-disabled behavior, run protocol-negative fixtures, then separately qualify live credentials/model behavior. Retain unknown model/usage/cost values. Do not infer reservable monetary ceilings from a timeout or output cap. |
| Release policy or trusted test harness | Invalidate prior preflight use, repeat exact-source/independent-review gates, and record a new run. Historical comparison must reject changed specification/harness/policy identities rather than call the change regression-free. |
| Native Dispatch recovery or operational admission | Repeat native-lock, one-use authorization, stale-source/state/receipt, crash and ownership tests. Qualify actual production continuation at frozen source before changing its status. Preserve uncertain effects for reconciliation, not automatic replay. |
| Lens browser or baseline policy | Requalify exact runtime/font/viewport/browser identities. Future visual baselines need independent review and explicit replacement authority; screenshots are not self-approving baselines. |

The new `quality` interface uses pinned native Eval over fixed controller projections. `quality tests` checks assertion structure, not empirical mutation sensitivity. `quality regression` verifies actual retained approvals before comparing their contract identities. `quality providers` compares like archival samples and preserves model judgments separately; it cannot authenticate a caller's sample or certify a provider. Keep these scope statements in reports and do not promote advisory output to release authority merely because native Eval returned pass.

Role performance records now include actual provider receipts, per-role scenarios, separate semantic-review calls, deterministic negative permission/handoff checks and preserved failure history. Retain the exact original task presented to the role **and** reviewer. The first broad role qualification exposed that an evaluator missing supplied handoff metadata can falsely call real provenance invented. A corrected evaluator must receive the original input; its new judgment must identify the superseded context-defective judgment without erasing it. Genuine subject defects require a separately recorded corrective attempt and independent review, never manual output editing.

## Remaining maintenance implementation

`maintenance check --remote` observes bounded default-branch HEADs. `maintenance compare-catalog REPOSITORY CHECKOUT COMMIT` now produces an immutable-object roster, metadata, schema, dependency and resource change packet with affected-package qualification invalidation; see [CATALOG-DRIFT.md](CATALOG-DRIFT.md). Neither command fetches a complete security-advisory database or proves semantic compatibility. Keep installation/pin adoption separately authorized and validation-gated.

Prioritize source-backed release scanning, locked dependency build qualification, existing-data migration fixtures and independent performance workloads. These are implementable engineering gaps. Cloud SDK live tests require authorized provider credentials; clean Linux/WSL tests require additional host environments; compiler/image qualification needs sufficient disk and image availability. Do not recategorize missing contracts or code as environmental blockers.

Reuse current narrow upstream APIs without inflating their authority:

- Ability: `validate_ability_definition` and `ability_definition_digest`; this is not an Ability Gateway execution grant.
- Relay: `event_chain_integrity_valid` and `receipt_sequence_valid`; this is not remote exactly-once side-effect delivery.
- Tribunal: `validate_external_receipt`; this is not a new binding approval authority or a live model tribunal.
- RAG: bounded `chunk_documents`, hash `embed_chunks` and `hybrid_search`; source citations and compact retrieval are not enterprise authorization or trusted generated knowledge.
- PackWrite: `pack_validate_manifest`, `pack_apply` and `validate_run` inside the private adapter workspace; no arbitrary repository scripts execute.
- Muzzle: `redact_text` and `error_excerpt`; redaction is not exhaustive secret scanning.
- Workcell: declared read-only workspace, resource/security constraints and `none`/default/pre-created custom network selection. A recorded egress declaration alone is not destination-level enforcement. Qualify any new network-capable build separately; runtime remains network-denied by default.

Exact inspected closures are recorded in `config/ecosystem-tools.lock.json`, `config/provider-sdk.lock.json`, runtime source/package locks and the existing accountability/context/change/telemetry locks. Foreman remains excluded. No update mechanism should silently introduce cloud hosting, public writes, proprietary dependencies or candidate host execution.
