# Upgrade and rollback

The integration candidate remains subject to the [acceptance manifest](../config/release-acceptance.json). Before changing versions, stop active missions and preserve the factory revision, lockfiles, private settings and run evidence. Provider credentials and runtime directories must stay outside Git.

Use a fresh checkout for an upgrade. This keeps the old source, dependencies and evidence available while the new version is qualified:

```sh
npm ci --ignore-scripts
npm run setup
npm run factory -- skills verify
npm run doctor -- --offline
npm run verify
```

Setup installs complete pinned catalogs and component closures without sibling repositories. It refuses to overwrite mismatched or dirty dependency checkouts. Agent, Workcell, Kennel and other pins changed during this integration; consult all committed lockfiles rather than assuming only one component changed. Preserve an old closure outside its expected installation path before installing a different pin, or retain the entire prior checkout. Never reset modified upstream source to force setup through.

Initial online setup needs the pinned Git sources and npm packages. [Offline installation](OFFLINE-INSTALL.md) uses a separately verified bundle and a fresh destination; it does not include Docker images, provider accounts or credentials. Its version store stages versions without selecting them, then requires an exact current-pointer digest for activation. A stale activation request fails. Rollback selects a retained verified version for future launches and preserves per-version state; it does not reverse external actions or database migrations.

Fresh Linux/macOS CI installation and current-source macOS offline installation/upgrade/rollback have passed at their recorded commits. See [CI-QUALIFICATION.json](CI-QUALIFICATION.json), [INSTALLED-MISSION-QUALIFICATION.json](INSTALLED-MISSION-QUALIFICATION.json) and [OFFLINE-FINAL-QUALIFICATION.json](OFFLINE-FINAL-QUALIFICATION.json). Existing-host checks do not establish every clean operating-system configuration; WSL2 has an assessment rather than a live execution result. Installed advisory execution is distinct from installed software-construction qualification.

New missions freeze the provider budget, specification and controller identities. A resumed mission retains its original budget and deadline; an upgrade must not rewrite that identity or replay uncertain effects. Keep in-progress missions with their original controller until they reach a safe terminal state. Imported evidence is archival: it never restores execution or approval authority.

Keep the matching standalone verifier with every export. Legacy evidence remains readable under its original contract, but an older verifier cannot certify newer budget, secret-scan, runtime or native-gate bindings. A failed or interrupted run remains evidence even if a later version succeeds. Never reuse approval for changed source or harness bytes.

Use the separately qualified image for each runtime. Default Node/Lens and optional CLI, React or visual-comparison profiles have distinct contracts and qualification records. Rebuilding or changing an image requires new qualification; an old image receipt does not transfer automatically. Local approval never authorizes merge, publication, deployment or production migration.

Private qualification staging dependencies were reclaimed after the recorded offline upgrade/rollback checks to recover disk space. Reinstall their pinned dependencies before reusing those staging checkouts; retained results and evidence do not imply the temporary installations remain runnable.
