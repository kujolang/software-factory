# Verification

Each command checks a different part of the factory. One passing check does not replace the others.

| Command | Proves |
| --- | --- |
| `npm run doctor -- --offline` | Local dependency/runtime prerequisites only |
| `npm run doctor` | Provider login and live engine/image preflight in addition to prerequisites |
| `npm run verify` | Deterministic admission, source/release, setup, native Dispatch and documentation checks; no model calls |
| `npm run smoke` | Representative fixture passes fresh API/browser checks inside Workcell; no model calls or release approval |
| `npm run test:packs` | Converter and persistent-notes fixtures pass their packs; a wrong converter result fails; no model calls or release approval |
| `npm run test:isolation` | Concrete hostile-code regression probes under the observed engine |
| `npm run test:controller-death` | Independent deadline survives host controller death; explicit scoped cleanup succeeds |
| `npm run factory -- run factory/mission.txt` | Fresh provider-backed construction/review plus isolated acceptance; inspect the final result |

The issue-tracker API gate runs 30 checks (28 baseline plus two additional checks). Browser acceptance runs 16. A local release repeats gates and verifies source/harness hashes; count alone is not evidence.

CI runs deterministic/offline prerequisites on Linux and macOS. A CI definition is not a successful CI run, and offline CI is not live isolation qualification. No hosted model calls, secret account credentials or paid media generation belong in pull-request tests.

## Standalone qualification

The 2026-11-13 standalone qualification is recorded in [qualification.json](qualification.json). It distinguishes the development checkout, a fresh installation outside the original sibling layout, live engine checks, and fresh model-backed mission evidence. Raw private run artifacts remain under `.runtime/`; only a concise sanitized summary is checked in.

The original Agent City demo remains historical evidence linked from [provenance](PROVENANCE.md). It does not qualify this extraction. Native Linux/ARM/WSL2 live-engine paths remain unqualified until separately exercised, even when offline compatibility tests pass.

The public HTTPS clone was installed outside the original sibling-repository layout. Repeated setup, full doctor, 43 deterministic/native tests and the 30 API / 16 browser smoke checks passed. Linux and macOS offline CI passed. On the observed macOS/Colima rootless engine, all 24 hostile-code probes and the controller-death deadline/recovery test passed.

A fresh model-backed construction and its first retry failed. The final retry corrected a blocked project selector and passed independent review, API/browser acceptance, separate release review and repeated acceptance. Its approved source/build hash is recorded in the qualification file. Audit and export passed, including audit from the separate installation. The failed runs remain failed; the successful retry is not represented as fresh parallel construction. Parallel backend/frontend work overlapped for 149.520 seconds in the original construction.

Extraction also fixed missing Docker security metadata diagnostics, local dependency/schema resolution, browser failure retention and an activity-label assumption in the trusted browser check. Raw private receipts remain in the operator’s runtime directories. These are observed results, not a guarantee that every model-generated mission succeeds.

## Software-pack qualification

On November 12, 2026 (America/Detroit), the converter and persistent-notes fixtures passed their API and browser steps through the same controller. Deliberately wrong API and browser results failed. Tests also rejected changed seals, changed frozen packs and changed exported tests. All 27 repository Markdown files passed link and portable-path checks after the prose review.

A fresh model-backed converter mission completed with independent review, syntax build, pack acceptance, separate release review and repeated acceptance. Audit and export passed. Backend and frontend work overlapped for 66.607 seconds. The run retained an earlier image-change rejection; it did not skip that failed gate.

All 40 unit tests, eight native Dispatch tests, the original 30 API/16 browser smoke checks, 24 hostile-code probes and controller-death recovery passed. The final local regression run was sequential after overlapping qualification jobs caused failures. Linux and macOS CI also passed. See [pack-qualification.json](pack-qualification.json) for hashes, run IDs, failure history and scope. These results cover the supported Node/SQLite/browser runtime, not arbitrary languages or test completeness.
