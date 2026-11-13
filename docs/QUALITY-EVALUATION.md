# Deterministic quality and historical evaluation

`qualityCommand(args)` exposes three bounded controller evaluations through pinned native Kujo Eval. Every suite allows only its controller-written JSON record, denies commands, retains native execution and manifest-verification receipts, and checks exact suite/input/result identities. None grants release or deployment authority.

```
software-factory quality tests PACK.json
software-factory quality regression BEFORE_RUN AFTER_RUN
software-factory quality providers SAMPLES.json
```

Test-quality evaluation validates the closed software-pack language, then requires each requirement to reach an actual assertion rather than only navigation/input/setup steps. It checks that restart is followed by an API assertion and that negative API and browser assertions exist. Empty JSON body subsets generate advisory warnings because status assertions can still be meaningful. These checks evaluate traceability structure. They do not establish semantic relevance, mutation sensitivity or actual candidate execution; `mutationScore` remains null and `executionProof` false. Independent human/model review and trusted execution remain necessary.

Historical regression evaluation first performs complete offline release-record verification for both runs. It requires accounted approved pack runs, different run identities, and matching frozen specification, trusted harness and release-policy hashes. Changed code may then be compared under the same acceptance boundary. Changed harness/specification/policy makes the comparison fail as incomparable rather than silently implying no regression. This evaluates retained results, not fresh execution, speed improvements or untested behavior. Unsigned records establish the verifier's stated integrity, not external authentication.

Provider comparison requires 2–20 samples with an exact prompt digest, canonical output-contract digest, complete restricted provider receipt, and an assessment carrying its own evidence digest. Only like prompts, contracts, assessment kinds, fixture status and known model identities are comparable. Each sample retains actual duration and reported token usage; missing usage remains null, costs remain null, and no cost ranking is invented. Call latency is not application performance. Independent model judgments remain explicitly distinct from deterministic record checks. Raw sample input is archival data, not authenticated provider execution proof, and cannot qualify a provider or approve software by itself.

A provider sample has this shape:

```json
{
  "promptSha256": "<64 lowercase hex characters>",
  "contractSha256": "<64 lowercase hex characters>",
  "receipt": {"schema":"kujo.factory.provider-receipt/v1","provider":"codex","model":"<reported or explicitly selected model>","fixture":false,"status":"completed","code":0,"observedToolCalls":0,"durationMs":123,"usage":null},
  "assessment": {"kind":"independent-model-judgment","passed":true,"evidenceSha256":"<64 lowercase hex characters>"}
}
```

Library APIs are `evaluateTestQuality(pack, {parent?})`, `evaluateRegression(beforeDirectory, afterDirectory, {parent?})`, and `evaluateProviderComparison(samples, {parent?})`. Pure `assess*` functions produce projections for deterministic tests; they do not verify a caller's provenance claims. Only the historical execution wrapper verifies actual run records before comparison. Outputs live in `.runtime/quality-evaluation/evaluation-*/` with machine-readable binding, assessment, suite, native execution, result and manifest-verification records.

Qualification includes seven automated tests, actual native Eval rejection of nominal setup-only requirement coverage, and actual native Eval comparison of clearly labeled provider fixtures. Two retained live software runs with matching acceptance identities passed historical comparison; a later run with a changed Workcell harness was correctly rejected as incomparable. Actual retained Codex samples from different roles were also rejected as incomparable, including their unreported model identities. No new model calls or candidate execution were used for these comparisons. Evidence is retained in `.runtime/ecosystem-phase-b/quality-evaluation-qualification.json`.
