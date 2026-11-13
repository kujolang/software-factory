# Offline installation and reversible versions

This installer uses supported Node 26.12.1+ with its bundled npm, and Git. Docker images, provider accounts and credentials are not bundled; installing the factory catalog offline does not make model-backed construction or a missing engine available offline.

Only export an independently reviewed factory commit. `createOfflineBundle` reads that commit's lockfiles from Git objects, never the dirty working tree. Existing installed pinned dependencies supply either exact commit/tree Git object packs (no history) or complete files verified against the committed source inventory. The bundle deduplicates repositories across destination roots. Only required platform npm tarballs are read from an explicitly chosen existing cache and checked against package-lock SHA512. No downloads, dependency execution, npm lifecycle scripts, settings or credentials are involved in export.

The transport is an ordinary directory with a versioned manifest, not an archive. The verifier checks every allowed path, complete inventory, bytes and digests; rejects symlinks/hardlinks, traversal, duplicate/unknown artifacts, oversized input and unsafe install targets; and requires an independently supplied expected manifest SHA256 and factory commit. These establish stated integrity, not authenticity. An expected checksum obtained from the same untrusted source is not independent trust. No signature or actual-execution guarantee is claimed.

Installation accepts a fresh destination only. It reconstructs exact shallow Git checkouts with hooks/templates/global configuration disabled, validates tracked file modes/types and blob identities, and copies hash-locked source closures. It uses a private empty HOME and content-only npm cache, `npm ci --offline --ignore-scripts --no-audit --no-fund`, then the existing reviewed `scripts/setup.mjs` and offline doctor. No global install or candidate execution occurs. Failed destinations/logs remain available and are never silently promoted. A fresh installation requires at least 3 GiB available disk at admission.

Use `scripts/offline-install.mjs COMMAND OPTIONS.json`. Inputs have exact fields:

- `export`: `factory`, `commit`, `destination`, `npmCache`.
- `verify`: `directory`, `expectedManifestSha256`, `expectedFactoryCommit`.
- `install`: `bundle`, `destination`, `expectedManifestSha256`, `expectedFactoryCommit`.
- `init-store`: `directory` (new private store).
- `stage`: `store`, `bundle`, `expectedManifestSha256`, `expectedFactoryCommit`.
- `status`: `store`.
- `activate`: `store`, `version` (manifest SHA256), `expectedCurrentSha256` (from status, null for initial selection), `operator`.

`scripts/offline-install.mjs run STORE [factory arguments]` invokes only the selected verified factory CLI. Staging a version never activates it. Activation takes an exclusive local lock, verifies the prior pointer digest and target factory source/installation receipt, records intent, and atomically replaces the local active pointer. An existing prior version can be explicitly selected with the same command to roll back. Invalid or stale previews fail. A crash leaves intent and the actual pointer available for reconciliation; it does not automatically repeat an operation.

Versions remain side by side. Original per-version `.runtime` state is retained; this mechanism does not migrate provider credentials, settings, running processes or mission databases. Do not copy an old approval or native recovery state into a new version. Rollback changes which version future launches use; it does not reverse external actions or database migrations. Existing factory export/import and explicit account/configuration flows remain separate.

## Qualification boundary

The actual staged install uses macOS `sandbox-exec` with `(deny network*)`, inherited by all children. A direct Node loopback socket probe returns EPERM before qualification. That OS-enforced run is different evidence from merely setting npm's offline option. Linux requires its own qualified network namespace/sandbox path; do not call npm offline mode a network-denial proof.

A fresh e6b32ea install passed npm ci, setup and offline doctor under that network-denial policy. Full tests with mock HTTP servers are not expected to run under deny-all networking; local-network test fixtures require a separately documented test environment. The initial exporter failures (Git assumed for file-only closures; absent default-cache tarball) remain retained. The corrected exporter uses the actual installed closure contracts and an existing task-private cache without downloads.

Two isolated installs at e6b32ea and 8e351be passed npm ci, setup and doctor under OS network denial. Four actual upgrade/rollback and mutation tests passed, including preserved local state, stale previews, Git assume-unchanged source tampering, executable modes and symlinks. Evidence is recorded in `.runtime/staged-offline-install/qualification.json`. These are exact historical source observations, not qualification of later source changes. No cross-platform, fresh-machine, optional-engine-image or live-provider claim follows from this same-host installation.

## Explicit operator commands

Prepare `export-options.json` with absolute paths and a full reviewed commit:

```json
{"factory":"/local/software-factory","commit":"FULL_40_CHARACTER_REVIEWED_COMMIT","destination":"/local/factory-bundle","npmCache":"/local/npm-cache"}
```

Run `node scripts/offline-install.mjs export export-options.json`. Retain the returned manifest SHA256 through an independently trusted channel. To install, supply `bundle`, a **new** `destination`, `expectedManifestSha256` and `expectedFactoryCommit` in `install-options.json`, then run `node scripts/offline-install.mjs install install-options.json`. Export and install are separate explicit mutations; verification alone never installs.

For reversible versions, initialize a new owner-only store, stage each reviewed bundle, inspect status, and activate a staged manifest identity using the exact current pointer SHA256. Initial activation uses `expectedCurrentSha256: null`. A stale pointer aborts without switching. `operator` is a local attribution string, not authenticated human approval or deployment authorization. Protect the local account and store permissions; checksums cannot defend against the account owner rewriting both artifacts and expected identities.

The standard tests are `node --test tests/offline-install.test.mjs tests/offline-versions.test.mjs`. Their synthetic version receipts test controller boundaries and are explicitly not installation proof. The historical actual-install fixture can be rerun with `FACTORY_OFFLINE_QUALIFICATION_DIRECTORY=.runtime/staged-offline-install node scripts/qualify-offline-versions.mjs`; it requires the two retained installed versions and export records. To reproduce the macOS network boundary, prefix this command with `/usr/bin/sandbox-exec -p '(version 1)(allow default)(deny network*)'` after setting the environment variable. Do not run the qualifier against an operator's active production store.
