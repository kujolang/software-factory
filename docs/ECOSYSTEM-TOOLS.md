# Bounded native ecosystem adapters

`runEcosystemTool(tool, inputFile, {parent})` reads bounded JSON and invokes only the selected native library harness in a fresh private workspace. `ecosystemToolsCommand` exposes `verify [TOOL]` and `inspect TOOL INPUT.json` for CLI integration. Install the complete pinned import closures with `node scripts/setup-ecosystem-tools.mjs`. The installer reads immutable Git blobs; existing mismatched installations are refused, not reset. Every installed and copied module is checked against the commit-bound byte inventory before native execution.

| Tool | Actual native path | Input and resulting artifact | Limits of qualification |
| --- | --- | --- | --- |
| Ability | `validate_ability_definition`, `ability_definition_digest` | Portable Ability definition; native validation/digest | No handler execution, policy decision, approval or Gateway access |
| Relay | `event_chain_integrity_valid`, `receipt_sequence_valid` | Existing `events` and `receipts` arrays; native integrity verdicts | No replacement orchestrator, lifecycle execution, replay or handoff approval; hashes are unkeyed |
| PackWrite | `pack_validate_manifest`, `pack_apply`, `validate_run` | Canonical `files: [{path,content}]` manifest; validated private `agent/` package | Actual deterministic materialization/structural checks, no model generation or semantic correctness claim |
| Muzzle | `redact_text`, `error_excerpt` | `text`; redacted complete output and last 20 redacted lines | No workflow runner or candidate scripts; pattern redaction is not exhaustive |
| RAG | `chunk_documents`, `embed_chunks`, `hybrid_search` | `query` and `documents: [{path,content}]`; private `index.json`, top-five native retrieval results | Explicit offline hash embeddings, caller-supplied bytes, line citations/source hashes; no model answer, crawling, parser subprocess, connectors, remote vectors or automatic trust |
| Tribunal | `validate_external_receipt` | Canonical ingestion receipt; native JSON Schema verdict | Schema only, not signatures, decision review, governance authority or completed Tribunal lifecycle integration |

These are deliberately narrow capabilities, not complete integrations of every upstream feature. All observations remain advisory unless a separately reviewed policy explicitly consumes them. Pack instructions, retrieval results and receipt payloads remain untrusted data; the controller does not execute them or promote them into permissions. A valid portable Ability can declare dangerous effects without gaining permission to perform them.

Inputs are at most 1 MB; ancestor/file symlinks and special files are refused. Relay admits 1–100 records of each kind. PackWrite admits at most 100 files and 100 KB per content string; its canonical path/config/content checks then govern creation under the fresh workspace. Muzzle admits 100 KB of text. RAG accepts 1–20 unique inert relative document paths, 20 KB each, and a 4,000-character query; arbitrary supplied provider/config/metadata fields are discarded. Native documents retain byte SHA-256 in chunk metadata and line numbers generated from those exact strings. The adapter does not claim those strings were read from a verified original repository.

Native execution has a 30-second timeout, a 4 MB output ceiling, private HOME/TMPDIR and a minimal environment with no provider credentials. No external network endpoint, model, shell handler, upstream CLI configuration or candidate workflow is invoked. Complete native stdout/stderr and admitted inputs may contain private source or secrets; all workspaces are private and must not be automatically exported. In particular, Muzzle's result is redacted but its raw input stays private. Failure receipts and negative validation results are retained; an inspection operation completing is not a passing validation verdict.

## Exact reviewed sources

- Ability: `54764e38787403ed82f51efaea1bf78e321d7546`, `src/contract.kujo` and its internal helper closure. Its unrelated experimental publication/assurance paths are excluded.
- Relay: `6ce9d23bda46e28c549ad9523eb12c140e4d7383`, `src/contracts.kujo` closure. The existing native Dispatch remains factory orchestration authority.
- PackWrite: `b8467535c74263abc59fd3f48028b67d42cd7e68`, deterministic pack/config/validation closure. The canonical `tests/fixture.kujo` is included solely as a clearly labeled qualification fixture.
- Muzzle: `2d508d338537a25f000170c8bb4dc10ef3d75aeb`, native redaction/common/CLI helper closure; no runner module.
- RAG: `406965813653a2ddfdc938177e14720c3370153a`, chunking/embedding/retrieval/config/common/preferences closure. `embedding_provider` is fixed to `hash` and cache persistence disabled; there is no silent provider fallback.
- Tribunal: `fa4ffd2c9bb6ee5d8285dfb5c161b844e6e75b7c`, contracts/common/storage closure plus the exact ingestion receipt schema. No reviewer, signing provider or connector executes.

All source file hashes and byte counts are in [ecosystem-tools.lock.json](../config/ecosystem-tools.lock.json). No upstream source was modified. Tests use actual pinned libraries: Ability and Tribunal positive/negative contracts; native-generated Relay fixture/tamper rejection; complete canonical PackWrite fixture creation/content validation/traversal denial; Muzzle secret patterns; RAG cited retrieval; admission bounds/symlinks and copied-byte tampering. These fixtures are not model-backed mission evidence.

## Remaining source-backed constraints

Ability Gateway's inspected `README.md` identifies a Cloudflare Workers/KV/D1 OAuth control plane and remote MCP transport. It is not installed or required by this local-first adapter; remote authenticated execution needs separate operator setup and qualification. Source: [Gateway README](https://github.com/kujolang/ability-gateway/blob/main/README.md).

Capsule's audited source is a local benchmark skill, not a resolved public redistributable `kujolang/capsule` package. No fake Capsule implementation is introduced. The supported context alternatives remain Scout/Scent and the explicit RAG path. See the source evidence in [integration audit](integration-audit.md).

Strata is a separately authenticated user-owned Markdown knowledge application. Its audited API requires an owner token and revision/provenance-aware writes. This adapter does not access internal SQLite or silently enroll a user's knowledge store. Authenticated durable knowledge integration remains open; source contracts and pin are recorded in [integration audit](integration-audit.md).

Full Relay lifecycle handoff routing, Tribunal model-reviewed decisions, signed receipt verification, PackWrite provider generation, continuous Muzzle workflow compression and durable RAG/Strata knowledge lifecycle remain unqualified. Do not mark their broader release requirements complete from these bounded paths.
