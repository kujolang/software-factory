# Daily use

Run commands from the checkout. Start the read-only Factory Floor with `npm start`. In another terminal:

```sh
npm run factory -- run factory/mission.txt
# A different product, using a reviewed and sealed pack:
npm run factory -- run idea.txt --pack packs/my-app.json
# Deliberately adversarial mission for a qualified local engine:
npm run factory -- run factory/mission-untrusted.txt
```

The command prints the run directory. Each run has `run.json`, an ordered `events.jsonl`, native `dispatch/` state, role handoffs and provider usage under `artifacts/`, proposed `application/` source, and an approved `build/` only when release gates pass. Usage/cost fields remain unknown when the provider does not report them.

Do not run candidate `npm start`, build scripts or JavaScript on the host. Use the trusted Workcell API/browser harness, which creates disposable databases and blocks network access. The repository's `examples/issue-tracker/` is a representative candidate fixture, not privileged controller code.

```sh
npm run smoke
npm run factory -- retry FAILED_RUN_ID
npm run factory -- recheck APPROVED_RUN_ID
node factory/audit.mjs /absolute/run/directory
node factory/export.mjs /absolute/run/directory /new/export/directory
```

Retry creates a new run with fresh review and checks of the failed candidate. Recheck revalidates an approved candidate without pretending to build it again. Neither inherits approval. Pack runs retain the source run’s frozen contract and tests. To change those tests, review and seal a new pack and start a new mission. Export refuses to represent an invalid approved run as valid. Keep source and receipts together; absolute paths in receipts describe the machine where they were produced and are not installation instructions.

To replay exports, configure `--runs /absolute/export-parent` and start the viewer. The viewer cannot authorize release, run commands, or deploy anything.

Ctrl-C stops the observer. Ctrl-C during a mission stops its active command tree; the independent container watchdog still enforces the lease deadline. See [recovery](TROUBLESHOOTING.md) for abrupt process death. There is no claim of automatic mission resumption after a crash.
