# Bounded CLI runtime profiles

Python 3.13.9, Kujo 1.9.0 and TypeScript 7.0.2 passed representative positive and adversarial CLI fixtures on the recorded Linux amd64 rootless Workcell images. Exact commands, image identities and evidence hashes are in [CLI-RUNTIME-QUALIFICATION.json](CLI-RUNTIME-QUALIFICATION.json). This is CLI qualification, not service/framework or cross-platform qualification. Go and Rust are blocked: functional native cases passed, but the optional workspace write boundary failed an adversarial test. Factory disables that profile before engine access. The default temporary filesystem stays noexec. No profile installs candidate dependencies.

```sh
npm run factory -- runtime list
node scripts/build-cli-runtime-image.mjs
npm run factory -- runtime verify python-cli ./candidate ./reviewed-cases.json ./evidence
```

The evidence directory and reviewed cases file must be outside the candidate tree. A case is `{ "args": ["9"], "stdout": "18\n", "exitCode": 0 }`; the file contains an array of one to four cases. Python uses `main.py`, Kujo `main.kujo`. Expected results must be authored/reviewed independently. A content hash establishes identity, not correctness. `evaluateCLI({profile,candidate,dir,cases})` is a host/controller API: never load its expected results from candidate output or candidate tests.

Each case receives a fresh native Workcell lease with the existing rootless/seccomp, no-network, read-only root, resource, timeout, credential and cleanup requirements. A controller-owned minimal health server only establishes the lease; the candidate cannot replace it. Actual CLI code runs as UID65534 under a fixed interpreter or compiler command. Compiler failure cannot count as application success. Case bytes, source identity, source lock, image identity, command results and native Workcell record hashes are retained. No shell, package lifecycle scripts, host candidate execution or deployment capability is exposed.

The optional image builder uses the exact current main-image identity and digest-pinned official Python image. It never retags the primary image. Kujo comes from the pinned runtime dependency already in the main image. Optional TypeScript/Go and Rust build scripts use pinned compiler distributions and are separate tags; they are not installed automatically. Builds require at least 6 GiB free to preserve runtime headroom. Other installed image identities can be explicitly tested, but their results are labeled `unqualified-image-diagnostic` until qualified; a passing case does not silently change the registry's qualification label.

Python fixtures exercise correct output, wrong answers, forged passing JSON, timeout, diagnostic flooding, UID/credential boundaries, protected source/image writes and denied egress. Kujo fixtures exercise correct output, wrong answers, forged passing JSON, timeout and protected image writes. These checks are bounded regression evidence, not universal sandbox escape proofs. Full application lifecycle routing, package-managed applications, external libraries and frameworks remain separate capabilities.

## Native compiler profile status

TypeScript's five real fixtures passed: positive execution, wrong output, runtime timeout, compile-time type failure, and blocked protected-image writes. Go initially compiled successfully but the default `/tmp` mount correctly denied native execution with exit 126.

A separately prepared native staging profile then passed five functional Go and five Rust fixtures. **It failed security qualification:** candidate UID65534 could create a file in the host-backed isolated-clone mount despite its reported root ownership and 0755 permissions. Ownership metadata does not establish write denial on the observed host sharing filesystem. No original host repository, provider credentials or host evidence directory was exposed; the temporary owned clone was cleaned up. The normal application profile's private parent boundary remains unchanged.

The factory now rejects `native-compiled-cli/v1` before accessing the engine. Go/Rust registry entries remain `blocked-workspace-write-boundary`; their functional passes do not qualify them as supported. Do not bypass that rejection. A safe continuation requires an explicit upstream read-only workspace mount contract and renewed adversarial qualification, or a separately qualified interpreted runtime. The current upstream Workcell contract hardcodes a writable workspace bind; no unsupported mount option is injected.

Byte-only trusted helper tests reject symlinks, hardlinks, oversized files, source replacement/mutation and destination redirection without executing artifacts on the host. Those tests and functional compiler results remain useful evidence, but neither overrides the failed actual write-boundary test. Exact logs, hashes and the enforced blocked status are recorded in the qualification JSON.
