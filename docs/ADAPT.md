# Adapt the software workflow

The first release makes the tested factory portable. It does not yet provide interchangeable factory packs or automatic acceptance-test generation for arbitrary products.

## Changes that need no controller edit

Write another mission within `factory/contract.md`: choose wording, product presentation, visual treatment and priorities that preserve the required Node/SQLite API and browser behavior. Save it outside runtime code and run it through the normal command. The contract wins if a mission asks to bypass review, add network access or change mandatory endpoints.

## A different software contract

Work in a branch or fork. Treat these as trusted maintainer changes:

1. Define the product contract and independent acceptance criteria before generation. Edit `factory/contract.md`; include negative cases and required outputs.
2. Update role/task definitions in `factory/cli.mjs`, worker prompts and file allowlists in `factory/worker.mjs`, and deterministic package documentation in `factory/product-docs.mjs`.
3. Update controller-owned API acceptance and image-owned browser/build checks. Keep checks outside candidate ownership. Do not accept candidate-authored pass/fail reports as authority.
4. If adding dependencies or languages, install them in the trusted image, rebuild, and requalify. Do not enable runtime package installation or outside network access just to satisfy a generated app.
5. Update fixtures, run deterministic tests, native Dispatch tests, the smoke workflow, hostile isolation tests and a real mission. Verify source hashes, release bindings, native receipts and cleanup.
6. Document the new scope and remaining limits. Obtain fresh evidence; the issue-tracker's checks do not prove your new product works.

Keep the shared control/verification boundary intact. A model should not design its own acceptance criteria during the same untrusted run and then approve itself. Deployment and paid/external tool access require separate designs and authorization; they are not hidden setup toggles.

VideoOps, WebOps and publishing packs are deliberately outside this extraction. Generalizing the contract interface is a future change after the standalone software workflow is stable.
