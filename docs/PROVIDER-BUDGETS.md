# Durable provider call budgets

New mission controllers copy a validated budget policy into `artifacts/provider-budget/policy.json`, bind its SHA-256 in `run.json`, and create a private durable state ledger. The default permits at most 100 provider attempts and 64,000,000 prompt/schema UTF-8 bytes across a mission; each installed canonical role permits at most 32 attempts and 16,000,000 such bytes. These are upper bounds, not targets. Unknown roles cannot reserve.

An operator can supply a tighter policy through the leading global CLI option:

```sh
node bin/software-factory.mjs --budget-policy POLICY.json webops-review INPUT.json
```

Example policy for the two-role WebOps advisory path:

```json
{
  "schema": "kujo.factory.provider-budget-policy/v1",
  "maxCalls": 2,
  "maxPromptBytes": 200000,
  "maxCostUsd": null,
  "roles": {
    "webops.site-qa-operator": {"maxCalls": 1, "maxPromptBytes": 100000, "maxOutputTokens": null},
    "chain.code-reviewer": {"maxCalls": 1, "maxPromptBytes": 100000, "maxOutputTokens": null}
  }
}
```

The operator file is read once during new-mission admission. Workers use its frozen copy, not a mutable external policy. The policy is not accepted from agent proposals or role instructions. Native recovery retains the original policy, consumed calls and deadline. New retry/revalidation missions receive their own explicitly new budget, never an automatic refund of prior calls.

A filesystem lock serializes reserve/reconcile operations. Reservation state is fsynced and atomically replaced before transport. Every reserved attempt permanently consumes a call and its declared prompt/schema bytes, including failure, cancellation and timeout. A crashed caller leaves a reserved record; it cannot be replayed or silently refunded. A stale lock fails closed. Reported usage is reconciled once; missing input/output token counts remain null. An unreconciled reservation or reported output-cap violation blocks final promotion. A terminal timeout with unknown usage remains a consumed uncertain attempt; it does not imply a zero-cost request.

Supported native SDK and Ollama paths receive the policy's requested output-token cap. Codex cannot enforce such a cap through the qualified CLI contract and rejects non-null caps. Provider response counts exceeding a requested cap are retained as a violation and block subsequent requests. This is a provider request limit plus observed-overage control, not a proof of provider-internal tokenization. Direct SDK calls use the same reservation mechanism; calls with an operator budget flag but no mission context reject before transport.

**Monetary ceilings remain fail-closed:** any non-null `maxCostUsd` is rejected. The pinned SDK/driver contracts expose requested token maxima and reported counts but do not establish a complete mathematical billing bound for input encoding, hidden provider processing, price changes or missing usage. No price is invented, and no estimated cost is called actual billing. Prompt-byte limits cover `prompt` plus `JSON.stringify(schema)`; they are not full wire-byte or input-token limits.

Evidence consists of policy/state identities and per-call reservation/reconciliation receipts. Counts are controller observations, not authenticated provider billing. Fixture tests exercise real locking, atomic persistence, concurrent processes, native SDK transport fixtures, cancellation, timeouts, unknown counts and overage rejection without paid cloud calls.
