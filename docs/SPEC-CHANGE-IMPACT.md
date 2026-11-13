# Reviewed specification change impact

`software-factory spec impact BEFORE_PACK.json AFTER_PACK.json` reads two independently sealed application packs and validates each projection using pinned native Kujo Spec. It retains both identities, native validation/export records, requirement additions/removals/changes, changed API/browser cases, and tests linked to changed requirements. A prose contract change recommends the complete regression suite and independent contract review.

Identical fixed GET requests with different overlapping expected values or statuses are reported as potential contradictions requiring independent review. Stateful behavior may explain a difference. This deterministic comparison cannot prove semantic completeness, identify every contradictory requirement, infer intent, or establish test sensitivity. Missing requirement coverage is rejected by the existing pack validator before native execution.

The report never changes either seal, inherits an approval, edits acceptance tests, or executes candidate code. Seal hashes identify the supplied contracts; they are not evidence of reviewer identity or correctness. A changed contract requires a new independently reviewed mission. The command does not mutate an approved or running mission.

Qualification: `node --test tests/spec-impact.test.mjs` checks requirement traceability, conflicting observations and stateful exclusions, contract-only change scope, two real native Spec validation/export calls, and rejection of a changed sealed contract before evidence allocation. These synthetic contracts test the adapter, not general natural-language requirement quality.
