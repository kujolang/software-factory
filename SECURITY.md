# Security policy

Software Factory 0.1 is a local, single-operator workflow. Its supported execution path requires rootless Docker, seccomp, resource limits, a read-only root, no outside network, scoped input/output and native Workcell evidence. See [the boundary](factory/WORKCELL.md).

Candidate code, missions and proposals are untrusted. Software packs contain bounded test data, not executable plugins. A setup agent must review the contract and expected results before sealing a pack; a hash does not prove test quality. Controller source, trusted image, dependencies, host/VM and authentication are trusted. Containers do not prove protection against kernel/runtime exploits. Chromium runs inside the outer Workcell boundary; its nested sandbox is unavailable in the qualified image policy. This release is not qualified for public hosting, multiple tenants, production deployment or unattended crash recovery.

Do not report secrets in a public issue. For suspected vulnerabilities, use the repository's private vulnerability reporting if available, or contact the repository maintainer privately before sharing exploit details. Include the exact factory commit, dependency/image versions, expected boundary, a minimal safe reproducer and redacted evidence. Ordinary defects can use public issues.

Do not bypass preflight or execute an untrusted candidate on the host to diagnose a failed sandbox run. Preserve receipts and use scoped recovery. Dependency and image updates require fresh qualification; old evidence is not transferable.
