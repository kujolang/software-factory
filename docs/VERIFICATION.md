# Verification

These commands report different levels of evidence; do not substitute one for another.

| Command | Proves |
| --- | --- |
| `npm run doctor -- --offline` | Local dependency/runtime prerequisites only |
| `npm run doctor` | Provider login and live engine/image preflight in addition to prerequisites |
| `npm run verify` | Deterministic admission, source/release, setup, native Dispatch and documentation checks; no model calls |
| `npm run smoke` | Representative fixture passes fresh API/browser checks inside Workcell; no model calls or release approval |
| `npm run test:isolation` | Concrete hostile-code regression probes under the observed engine |
| `npm run test:controller-death` | Independent deadline survives host controller death; explicit scoped cleanup succeeds |
| `npm run factory -- run factory/mission.txt` | Fresh provider-backed construction/review plus isolated acceptance; inspect the final result |

The issue-tracker API gate runs 30 checks (28 baseline plus two additional checks). Browser acceptance runs 16. A local release repeats gates and verifies source/harness hashes; count alone is not evidence.

CI runs deterministic/offline prerequisites on Linux and macOS. A CI definition is not a successful CI run, and offline CI is not live isolation qualification. No hosted model calls, secret account credentials or paid media generation belong in pull-request tests.

## Standalone qualification

The 2026-11-13 standalone qualification is recorded in [qualification.json](qualification.json). It distinguishes the development checkout, a fresh installation outside the original sibling layout, live engine checks, and fresh model-backed mission evidence. Raw private run artifacts remain under `.runtime/`; only a concise sanitized summary is checked in.

The original Agent City demo remains historical evidence linked from [provenance](PROVENANCE.md). It does not qualify this extraction. Native Linux/ARM/WSL2 live-engine paths remain unqualified until separately exercised, even when offline compatibility tests pass.

The public HTTPS clone was installed outside the original sibling-repository layout. Repeated setup, full doctor, 43 deterministic/native tests and the 30 API / 16 browser smoke checks passed. Linux and macOS offline CI passed. On the observed macOS/Colima rootless engine, all 24 hostile-code probes and the controller-death deadline/recovery test passed.

A fresh model-backed construction and its first retry failed honestly. The final retry corrected a blocked project selector and passed independent review, API/browser acceptance, separate release review and repeated acceptance. Its approved source/build hash is recorded in the qualification file. Audit and export passed, including audit from the separate installation. The failed runs remain failed; the successful retry is not represented as fresh parallel construction. Parallel backend/frontend work overlapped for 149.520 seconds in the original construction.

Extraction also fixed missing Docker security metadata diagnostics, local dependency/schema resolution, browser failure retention and an activity-label assumption in the trusted browser check. Raw private receipts remain in the operator’s runtime directories. These are observed results, not a guarantee that every model-generated mission succeeds.
