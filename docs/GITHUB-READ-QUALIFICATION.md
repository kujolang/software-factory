# Public GitHub read qualification

On 2026-11-13T21:43:37.278Z, the real read-only adapter retrieved 4 check runs for public kujolang/software-factory main commit cfddc146e225229a9c15d3bf8ad2bfc01e2c8e24. All returned checks were completed successfully, with Ubuntu 24.04 and macOS 15 names. These remote check observations do not establish current local-source or clean-machine qualification.

The public issues list was empty. An actual issue #1 read failed closed with HTTP 404. Positive issue ingestion and issue-to-implemented-change qualification remain unavailable for this repository; no issue was created to manufacture a passing result.

An isolated local repository at that public commit produced an inert fixture commit and clean reviewable PR packet. Merge inspection reported no conflict. No branch or PR was pushed, posted or merged, and no real issue fix or release approval is claimed. The original checkout was not altered.

Evidence: `.runtime/github-read-qualification/read-QrqSPi/qualification.json`, SHA256 `8db033361d715968bf93acfb6954d8133b72265b659dc046f07c100228a4759c`; packet SHA256 `e2695127a727ed89b042744df3291a9b9618deafeffec2a27d1bc91355494b82`. Reproduce with `node scripts/qualify-github-read.mjs` (public GET requests plus local-only inert Git writes). Deterministic adapter tests: `node --test tests/git.test.mjs`.
