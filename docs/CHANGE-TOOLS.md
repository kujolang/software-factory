# Native change and architecture observations

`factory changes inspect BEFORE AFTER OPTIONS.json` runs native PatchBrief and ChangeBucket observations over a controller-owned Git snapshot, Concord's native drift checks over its admitted private snapshot, and optional Fence and Kennel library checks. `factory changes verify` checks dependency integrity offline. Install with the normal setup integration or `node scripts/setup-change-tools.mjs`.

The options require `files`, an explicit union of relative paths in the before/after source directories. At most 100 UTF-8 files, 100 KB per file and 1 MB per side are admitted. A missing file represents addition/deletion. Source symlinks, traversal, special files and common credential/metadata paths are rejected. The controller retains exact source hashes and omitted-coverage warnings, then creates fresh Git metadata and a synthetic baseline commit. It stages the after snapshot, including newly added or ignored files. This baseline is an analysis aid, not a claim about the original repository's commit history. No original source directory or original Git metadata is modified or executed.

PatchBrief `summarize --format json` supplies native heuristic purpose, file and risk summaries. Truncated/error analysis is rejected. ChangeBucket `--json --repo SNAPSHOT` supplies native footprint/categories/budget observations. The adapter does not invent semantic conclusions or enforce an unapproved footprint release budget. Generated suggested commands remain inert text.

Concord uses `validate_snapshot_references` before any native checker, then its six canonical check functions and JSON reporter. References that could inspect external paths block the attempt and preserve evidence. Concord remains experimental/early; findings remain advisory. CLI documentation checks inspect source and do not execute candidate help commands. Omitted files may produce incomplete findings; no claim of whole-repository consistency is made.

An optional `fencePolicy` is a controller-supplied JSON policy. The native normalizer and validator run before `select_inventory_files` and `analyze_snapshot`. Import resolution consults only the admitted inventory. Executable parser adapters, composed policy includes, and unsupported top-level policy fields are refused rather than silently discarded. Fence failures remain failed observations in the final binding; a report being produced does not mean an architecture gate passed. Fence measures import boundaries and does not replace Workcell host isolation or tool permissions.

When `kennel.toml` is present in the after snapshot, the adapter calls native Kennel `validate_manifest_declarations` on parsed TOML. The result retains errors and warnings, including unpinned dependency warnings. This is manifest structure/source-reference validation only: no resolution, installation, network lookup, package scripts, checksum verification, vulnerability scan or signature validation occurs. Absence is represented by `kennel: null`.

All native invocations use minimal environments, 30-second timeouts and bounded output. Original repository config, hooks, filters and provider credentials are not inherited. Runtime modules and licenses are pinned by full commit and per-file hashes in `config/change-tools.lock.json`; custom harness identities are recorded separately. The installer fetches immutable Git objects without checkout or upstream installer execution. Actual upstream check logic is reused rather than reconstructed in JavaScript.

Artifacts under the private review workspace include source snapshots, synthetic Git history, native stdout/stderr receipts, reports, source identities and a final binding or failure record. They can contain private source; do not automatically export them or feed them to agents. None of these observations grant release, deployment, merge or host-execution authority. The adapter is not yet a mandatory mission release policy.

## Qualified contracts

`node --test tests/change-tools.test.mjs` exercises real pinned tools with synthetic fixture inputs on Kujo 1.9.0. It covers a retained Fence denial, a passing configured boundary, native change counts, a new staged file, native Kennel unpinned warnings, refusal of executable adapters and external Concord references, symlinks/path traversal, and retained failure receipts. These tests do not qualify arbitrary language parsers, supply-chain security or public release readiness.

Pinned source revisions:

- Fence: `d3173049b5365af975624fddd48e943d39738c75` (inventory-confined analysis).
- Concord: `f8812e7f00f55e4d1d3f46e70d902bce89ec7be7` (snapshot reference preflight).
- ChangeBucket: `030eea63c60449f82c9ba2680227485d318fdb6d` (native footprint).
- PatchBrief: `92c5cc833730dc427b54a069e9a275bad5969ddc` (bounded diff analysis).
- Kennel: `3093c40039ddbaa10527f3121cae3b958cadc2b9` (1.2.1 declaration-only validator and its transitive modules).

These revisions deliberately use the inspected upstream snapshot contracts; they do not automatically adopt future default-branch changes. The new lock is separate from the historical inventory audit and records the precise adapter runtime closure.

## Reviewed declaration boundary correction

The previous Kennel pin used `validate_manifest`, which checked the existence/type of local dependency paths outside the snapshot. The reviewed 1.2.1 declaration API parses those references without normalizing or probing their paths. The legacy installer API is deliberately not called. Native regression inputs include existing directories, ordinary files, nonexistent paths, `file:` references and relative source references; their existence does not affect declaration validation. This qualifies the selected library closure, not the upstream installer or registry service. Existing installed closures must be preserved separately before installing the new pin; setup refuses an integrity mismatch rather than overwriting it.

The agent registry intentionally remains pinned to `ce87309d8c920695cf5337ca76155ff188a7bf24`, a direct child of observed main `a7e9d0236d6e64b5db30273b32f4ad8c124f5173`. Their 85 agent packages are identical (28 Chain, 28 WebOps, 23 Publishing, 6 VideoOps); the child corrects schema validation for all six VideoOps packages. It is a reviewed compatibility patch, not a claim that the pin equals latest main.
