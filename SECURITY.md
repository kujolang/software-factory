# Security policy

Software Factory 0.1 is a local, single-operator workflow. Its supported execution path requires rootless Docker, seccomp, resource limits, a read-only root, no outside network, scoped input/output and native Workcell evidence. See [the boundary](factory/WORKCELL.md).

Candidate code, missions and proposals are untrusted. Software packs contain bounded test data, not executable plugins. A setup agent must review the contract and expected results before sealing a pack; a hash does not prove test quality. Controller source, trusted image, dependencies, host/VM and authentication are trusted. Containers do not prove protection against kernel/runtime exploits. Chromium runs inside the outer Workcell boundary; its nested sandbox is unavailable in the qualified image policy. This release is not qualified for public hosting, multiple tenants, production deployment or unattended crash recovery.

Do not report secrets in a public issue. For suspected vulnerabilities, use the repository's private vulnerability reporting if available, or contact the repository maintainer privately before sharing exploit details. Include the exact factory commit, dependency/image versions, expected boundary, a minimal safe reproducer and redacted evidence. Ordinary defects can use public issues.

Do not bypass preflight or execute an untrusted candidate on the host to diagnose a failed sandbox run. Preserve receipts and use scoped recovery. Dependency and image updates require fresh qualification; old evidence is not transferable.

## Integration increment

Catalog packages are pinned and integrity checked; guidance never authorizes tools. All proposal roles retain disabled tools and independent acceptance. Specialist routing is controller-owned. The stdio MCP surface is read-only and scoped to the launching OS user. Portable evidence checks hashes and internal bindings; unsigned evidence cannot authenticate its producer. Optional Ed25519 signatures authenticate a manifest attestation against an independently supplied trusted key, not actual execution, human approval or deployment permission. See [evidence boundaries](docs/EVIDENCE.md). New runtime/provider/recovery claims remain blocked by qualification.

Required lifecycle accounting precedes implementation; absent or uncertain records fail closed. Verified candidates remain under private artifacts until native ledger finalization and source/gate rechecks complete. New-format offline verification requires actual bound native ledger, ShipCheck and Eval records. The observer returns generated evidence code as inert text and rejects symlink ancestors. No policy or accounting result grants deployment authority.

Canonical consultations are fixed-output, tool-free proposals. All manifest deliverables are required, and the controller rejects role-disallowed file effects. Skill guidance has no authorization authority. Native Lens runs in the existing protected browser boundary and its report, observations, screenshots and effective Workcell identity are bound to the approved source.

The optional MCP control service is a separate local stdio process with an OS-user-owned, mode-0600 capability grant and explicit action intersection. Approval requests are records only; they cannot approve or deploy software. Git and context adapters inspect confined snapshots. Repository repairs never execute source on the host and publish no external changes. Review their scope and limits in the linked user guides before enabling them.
