# Portable evidence

The evidence module exports terminal successful, failed, cancelled or interrupted runs and verifies them offline. It preserves failed attempts, provider receipts, Workcell records, source files and recorded release decisions. It never executes candidate code, restores a mission, approves a release or deploys an artifact.

```sh
npm run factory -- evidence export /path/to/run /new/export
npm run factory -- evidence verify /new/export
npm run factory -- evidence import /new/export /new/archive
npm run factory -- evidence compare /first/export /second/export
```

The historical `node factory/export.mjs RUN NEW_EXPORT` entry point also works. The destination must not exist; its parent must already exist. Export refuses an active run. Reconcile an interrupted controller before assigning terminal state; changing a status label is not recovery or release approval.

For an independent operator, distribute `factory/evidence.mjs` separately from the bundle through a trusted channel. The verifier uses only Node built-ins and needs no factory installation, credentials, model, Docker daemon, sibling repositories or network:

```sh
node /trusted/evidence.mjs verify /received/export
```

Review an export before sharing it. The selected evidence can include mission text, source code, provider proposals and local paths. Export does not redact or grant permission to disclose those contents. Provider credentials and unrelated run-directory files are outside the fixed export allowlist; that does not make arbitrary artifact contents secret-free.

## Format and identities

New bundles use `kujo.factory.export/v2` in `manifest.json`. The verifier also reads existing `kujo.factory.export/v1` bundles with the same path and integrity checks.

| Field | Meaning |
| --- | --- |
| `schema` | Versioned manifest contract. Unsupported versions fail closed. |
| `runId` | Must match the included `run.json` identity. |
| `hashes` | Exact map of relative file paths to lowercase SHA-256 digests. Every regular file except the manifest must be listed. |
| `bundleId` | `sha256:` plus the SHA-256 of UTF-8 JSON encoding of sorted `[path, digest]` pairs. Required and checked for v2. |
| `exportedAt` | Exporter's recorded time; not an authenticated clock. |
| `exporterSource` | Git commit, HEAD tree and dirty flag observed at export, or null when unavailable. This is explicitly not the source used to execute a historical run. |
| `executionSource` | References the hashed `artifacts/controller-provenance.json` execution record when present, otherwise preserves a run's `sourceProvenance` or null. No historical execution identity is invented. |
| `records` | Paths to agent/provider, test, runtime and approval records. The records remain claims with their original provenance. |
| `authentication` | Describes optional detached signing; never treated as verification by itself. |
| `deploymentAuthorized` | Always false in generated manifests. Verification never grants deployment authority. |

The verification result includes `manifestSha256`, which identifies the exact manifest bytes, and `bundleId`, which identifies the artifact inventory. Export-time metadata changes the former even when the artifact inventory is unchanged. Neither identity authenticates its author without an independent trust anchor.

For recorded approved local candidates, the verifier also checks agreement between application, build, verification and review digests, and frozen pack bindings when present. It uses the factory's existing source-digest serialization. This verifies internal consistency, not correctness of the tests or proof that they ran. Harness hashes in candidate test manifests, image identities in Workcell records, model receipts and human identities remain inspectable records; the verifier does not independently attest them.

## Detached signatures

Ed25519 signatures are optional and cover a versioned domain prefix followed by the exact manifest bytes. Keep the detached signature outside the bundle. The caller must supply a public key obtained through a trusted channel; an embedded or newly encountered key is not a trust anchor.

```sh
npm run factory -- evidence sign /export /private/signing-key.pem /outside/export.sig
npm run factory -- evidence verify /export --public-key /trusted/signer.pem --signature /outside/export.sig
```

The sign command reads an existing operator-managed Ed25519 private key, writes a new signature file with mode `0600`, and does not generate, store or rotate keys. It refuses to replace an existing signature file. Never put a private key in a run, source tree, bundle or committed configuration. Key custody, trust distribution and revocation are operator responsibilities; no certificate infrastructure or timestamp authority is implemented.

Successful signature verification reports `verified-with-caller-trusted-key` and a SHA-256 fingerprint of the trusted public key's DER SPKI encoding. With no signature, authentication is `unsigned`. Signing attests the manifest; it does not transform model claims into observed execution, identify a human reviewer, authorize deployment, or make a failed run successful.

## Import and limits

Import verifies the source, copies it through a private staging directory, verifies the copy and checks the source again before publication. The imported bundle retains its identity and recorded failure state. It is an archival copy, never a resumable or approved mission. Use a separate archive directory; factory revalidation remains a separate action with fresh trusted gates.

Verification rejects missing or extra files, malformed digests, mismatched identities, unsafe paths, symlinks, hardlinks, special files and case-colliding names. It limits depth to 32, entries to 25,000, files to 20,000, individual files to 32 MiB, manifests to 8 MiB and total input to 512 MiB. Files are opened without following a final symlink and checked for changes while read. Export copies only the existing documented run-artifact allowlist, then checks the source inventory again.

These are local single-operator filesystem operations. They do not establish isolation against another process with write access concurrently replacing ancestor directories. Stop writers and operate on a private snapshot. Empty directories carry no evidence identity. Import and verification do not fetch references, execute receipt commands, contact providers or evaluate source code.

## Qualification

`node --test tests/evidence.test.mjs` exercises real filesystem copying, hashing, offline standalone invocation, Ed25519 signing and verification, failed-run preservation, v1 compatibility, tamper rejection, symlink/hardlink rejection, source and specification binding, bounds and cross-run comparisons. Run contents in these deterministic tests are labeled fixtures; they are not execution qualification for providers or Workcell.

The implementation was also exercised against five pre-existing local mission directories: three failed runs and two completed runs, containing 13–205 files each. All exported and verified, including recorded source/build/review bindings for the completed runs. This confirms compatibility with retained evidence, not a new live mission or fresh release approval.

## CLI, specification and documentation missions

Exports retain `input.json`, `reviewed-cli.json`, `reviewed-specification.json` and `reviewed-documentation.json` when present. The standalone verifier recognizes these mission footprints and their versioned `artifacts/mission-evidence-contract.json` markers. Completed missions using these contracts require the promotion's `evidenceBindings` map: raw artifact hashes captured before promotion, including native tool receipts. Removing a contract field while retaining its marker is rejected. Failed or incomplete missions remain exportable without fabricated passing gates.

CLI checks connect the frozen input and cases to native Spec, independent role proposals and receipts, the exact single-file candidate, both Workcell verification passes, and terminal native RunLedger records. Frozen runtime profile and source-lock identities must agree with retained runtime results. Native result, case, reviewed-case and Workcell receipt hashes are checked offline, including recorded rootless/seccomp/no-network/read-only boundaries and cleanup. Compiled CLI evidence additionally requires the recorded read-only input mount. Native absolute evidence locations are resolved only to uniquely retained artifact paths; verification never accesses the original host paths.

Specification and documentation exports check frozen source/review identities, independent review receipts and native terminal accounting. Specification exports also check native Spec validation. Both families explicitly deny software release approval, human approval and deployment authorization. Usage and cost remain unknown where their source receipts are unknown; accounting must agree with those receipts.

Historical artifacts without the new frozen provenance and promotion contracts receive an explicit legacy scope. Their integrity can be checked, but missing provenance is not reconstructed. Partially upgraded completed missions carrying a new marker without required bindings are rejected. A checksum-bound receipt is still a recorded claim, not authentication or independent proof that a process ran. These consistency checks never grant deployment permission or new software approval.

`node --test tests/mission-evidence.test.mjs` covers portable standalone CLI verification with explicitly synthetic byte fixtures, rehashed-manifest semantic tampering, preserved failures, and real native Dispatch/Spec/RunLedger specification/documentation pipelines with mock model proposals. Native pipeline success in this suite qualifies receipt integration, not live model judgment or a software release.
