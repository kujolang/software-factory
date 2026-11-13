# Upgrade and rollback

This branch is an incomplete integration increment, not a feature-complete release. Back up the repository revision, `sources.lock.json`, settings and private run evidence before updating. Do not commit provider credentials or runtime directories.

Stop active missions. Preserve `.runtime/deps/kujo-agents` outside `.runtime/deps/` before setup because this increment changes its pin. Setup refuses to overwrite mismatched or dirty source checkouts. Other previously pinned Workcell and Dispatch revisions are unchanged.

```sh
npm ci
npm run setup
npm run factory -- skills verify
npm run doctor -- --offline
npm run verify
```

New catalogs install through setup; manual sibling clones are unnecessary. Initial setup needs network access to the pinned Git sources and npm packages. Once installed, catalog inspection and verification, deterministic tests, planning, and evidence verification work offline. Provider execution and engine qualification have separate prerequisites.

For rollback, check out the prior factory commit, preserve the new dependency checkouts, restore the old reviewed pins with setup, and rerun its qualification. Never reuse a release approval for changed source or harness bytes. Do not delete evidence to conceal a failed upgrade. V1 export verification remains available in the new standalone verifier; V2 exports can be archived independently. Import is archival and never resumes an old mission or restores approval authority.

Clean Linux/macOS installation and rollback tests for this increment are still release blockers until executed on fresh environments. Existing local setup is not clean-machine evidence.
