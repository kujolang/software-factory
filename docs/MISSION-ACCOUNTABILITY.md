# Accounted local releases

A successful mission now has one canonical RunLedger attempt that starts before model execution and ends with observed verification facts. CaseFile captures rejected proposals, review/test failures and stopped missions from existing logs; it never reruns candidate commands on the host. Failure packets survive corrections and retries.

The controller keeps the following stages distinct:

1. Start RunLedger and retain the mission/source identity.
2. Validate a frozen pack with Spec, then execute the native Dispatch workflow.
3. Run independent review, API/browser acceptance and fixed native Eval evidence checks. Capture each failed attempt before routing a bounded correction.
4. Execute the trusted Workcell syntax build and selected ShipCheck metadata policy. Preserve the full upstream report, including advisory failures.
5. Obtain the separate release review, repeat real acceptance, and recheck source, harness, policy and Eval identities.
6. Stage `artifacts/verified-build/` with `release-verified.json`. `release.verified` is pending evidence, not approval.
7. Finalize the same canonical RunLedger record using retained test outcomes, provider receipts, source inventory and complete failure history. Missing usage remains null.
8. Recheck ledger and gate identities, then atomically move the staged directory to `build/` and write the hash-bound local approval. Deployment remains unauthorized.

A controller interruption before promotion leaves an unapproved staged artifact. There is no automatic crash continuation or reuse of approval. Preserve the run, reconcile uncertain ledger effects explicitly, and start a fresh retry/recheck through the supported CLI. The independent Workcell watchdog remains responsible for stopping candidate execution after controller death.

If promotion fails after terminal accounting, the immutable ledger may truthfully record passed verification while the mission is failed. The controller retains the original ledger snapshot, appends a bounded canonical failure note where possible, captures the later failure and exposes no valid new approval. Do not interpret a terminal ledger `pass` as mission completion without the final release bindings.

## Evidence and inspection

Inspect `artifacts/accounting-start.json`, `mission-observations.json`, `mission-accountability.json`, `evaluation.json`, `release-policy-preflight.json`, `release-policy-final.json` and `release.json`. Their paths and hashes lead to actual native ledger/Eval/ShipCheck files. CaseFile bindings point to preserved per-attempt observations and their original record hashes. New-format audit, export and recheck refuse missing or contradictory native records; the portable verifier requires only Node.

The Factory Floor remains read-only. It shows original events and links to evidence. Candidate HTML, JavaScript and other evidence code are served as inert text, never as executable application pages.

These checks establish internally consistent retained evidence. Unsigned records do not authenticate a controller, and structural Eval checks do not substitute for application tests, security scanners or human approval. The larger factory release remains incomplete; see [known limitations](KNOWN-LIMITATIONS.md).
