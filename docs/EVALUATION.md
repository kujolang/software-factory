# Native verification evaluation

The factory adapter runs pinned Kujo Eval on controller-generated records. It does not execute candidate suites, package scripts, shell commands, HTTP checks or model judgments. Application execution remains exclusively in Workcell; independent review and release authority remain separate.

Setup installs the immutable Eval source from `config/eval-source.lock.json` into `.runtime/accountability-deps/eval`. The inventory covers every one of the 84 tracked files at `c1b263a10702c2fa8ab61ed507029a6bfec2e03d`. Every invocation rejects missing, changed or injected files and symlinks, including modifications hidden from Git status. The package release is 1.1.0; its producer-neutral evaluation contract identifies its evaluator version as 2.0.0, as documented by upstream package manifests.

```sh
node scripts/setup-eval.mjs
node --test tests/evaluation.test.mjs
```

The host API is:

```js
const result = await evaluateVerification({
  dir: runDirectory,
  sourceHash: currentCandidateHash,
  verification: trustedVerificationRecord,
  review: independentReviewBinding,
  browser: trustedBrowserReport,
  packHash: frozenPackHashOrNull,
});
if (!result.ok) throw Error('Verification evidence evaluation failed');
verifyEvaluationBinding(result, {
  dir: runDirectory,
  sourceHash: currentCandidateHash,
  packHash: frozenPackHashOrNull,
});
```

The adapter creates a unique `artifacts/eval/attempt-*` directory and a fixed file-only suite. Native `json_value_equals` checks require a passing verification flag, exit-zero trusted acceptance, exact verification/review source identities, an independent passing review and a passing browser report with recorded checks. Pack missions additionally require matching frozen specification identities in verification and acceptance. Browser check presence is a structural projection; the existing trusted runner still owns expected check count and semantic correctness.

Actual commands are `kujo run <pinned-eval>/main.kujo run suite.json --output-dir results --json --subject-context subject.json`, then `verify-manifest --output-dir results --json`. The child receives a private home/temp directory and minimal environment, a 30-second deadline and a 2 MB combined output limit. No provider credentials are inherited. The suite denies command execution and limits paths to the staged evidence JSON. No candidate content selects a check type, path, command or policy.

A failed check returns `ok:false` with its native failure record retained. Invocation/output/schema/manifest errors throw and cannot turn into a passing gate. Binding records include the source commit, exact source/pack hashes, staged input/suite/result hashes and producer-neutral evaluation result. Revalidation rejects another run's evidence when the caller supplies `dir`, stale source or pack identity, changed suite policy, and artifact changes. This proves the stated consistency check ran under the trusted controller, not independent authenticity of the controller's claims.

Tests execute the real pinned Eval CLI with explicitly synthetic records. They cover success, preserved failed acceptance, changed source, absent browser checks, wrong frozen pack, literal command-looking text, resource tampering and symlink refusal. These are deterministic adapter qualification, not model quality, test-quality grading, provider comparisons or historical performance evaluation. Those wider lifecycle evaluation requirements remain incomplete.
