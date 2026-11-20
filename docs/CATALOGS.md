# Canonical catalogs

Setup installs pinned complete source packages for Kujo Agents, Skills and Workflows under `.runtime/deps/`. No package script is executed by discovery or activation. The committed `config/catalog.lock.json` is generated from Git objects, including resource sizes and SHA-256 hashes. Instructions are read from upstream packages, never maintained as a second collection.

```sh
npm run factory -- roles list
npm run factory -- roles inspect chain.core-developer
npm run factory -- skills list
npm run factory -- skills inspect kujo-core-language
npm run factory -- skills doctor
npm run factory -- skills verify
npm run factory -- skills sync
npm run factory -- skills activate kujo-core-language
npm run factory -- workflows list
npm run factory -- team plan mission-selection.json
```

There are 85 roles (28 Chain of Command, 28 WebOps, 23 Publishing House, six VideoOps), 136 skills and 45 workflow kits in the locked README catalog. The upstream workflow audit index has 44 entries; the README additionally includes Publishing House Operator. Both inventories remain visible in the integration audit. Upstream workflow readiness is recorded verbatim; it does not qualify a kit for factory execution.

`sync` installs the reviewed source lock only. It does not track a moving branch, overwrite modified dependencies, grant permissions or execute workflows. `doctor` and `verify` compare source revisions, working trees and every indexed resource, reject injected package resources and symlinks, and validate all canonical manifests and role schemas. A successful check establishes package integrity and structural compatibility, not semantic correctness or application quality. Dependency overrides used by the worker must still match the reviewed catalog pin.

An activation produces a private receipt under `.runtime/catalog/`. It selects guidance only; permissions remain empty. Skills do not expose a uniform dependency manifest upstream, so dependencies remain explicitly unknown rather than inferred as executable grants. Standalone activation receipts do not claim execution. A `run --team` work order incorporates the selected guidance with package commit and content hashes, bounded to 16 skills and 200 KB in total. The complete packages remain available for inspection; unknown dependencies do not become permissions.

A team planning request looks like:

```json
{"type":"bug-repair","complexity":"small","risk":"low","skills":["kujo-core-language"],"requireHumanApproval":false}
```

The policy covers the 20 requested software lifecycle types plus website operations, publication and explicit media production. It adds independent reviewers, routes high risk to human review, records missing provider capabilities, and reports cost ceilings as blocked until a reservation adapter exists. It cannot authorize execution. WebOps and Publishing House skills require their matching mission types; VideoOps requires both `media-production` and `mediaRequested:true`. Ordinary development never activates those specialists or umbrella skills implicitly.

For `new-application`, execute the selected plan with `run idea.txt --pack pack.json --team mission-selection.json`. Optional `additionalRoles` contains canonical Chain IDs. Planning and execution consultations precede the existing application builders; verification, knowledge and routine consultations receive the verified candidate before release. Every manifest-declared output is required in the fixed proposal envelope. Consultations cannot write files or approve release. All 28 Chain roles are selectable; the ordinary team stays small. Other lifecycle plans and upstream workflow kits remain advisory until their executor is qualified.

`--routing routing.json` selects providers by short canonical role ID, for example `{"code-reviewer":{"provider":"ollama","model":"installed-model"}}`. Routes permit only Codex or installed local Ollama models. Human-review-required plans and unenforceable monetary budgets fail before mission allocation. There is no implicit human approval. Schema-valid deliverables remain model claims; independent controller tests determine acceptance.

The agent pin includes upstream compatibility correction `ce87309d8c920695cf5337ca76155ff188a7bf24` on `fix/canonical-manifest-validation`. That correction validates the existing VideoOps manifest shape without altering canonical instructions. It is not represented as a merged default-branch release.
