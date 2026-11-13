# Troubleshooting and recovery

Start with `npm run doctor -- --json`. It reports failures without printing provider credentials. Do not paste `.runtime/provider/auth.json`, environment dumps or private prompts into bug reports.

| Symptom | Action |
| --- | --- |
| Missing runtime platform package | Re-run `npm ci` without `--omit=optional`; verify OS/architecture support. |
| Wrong Node/Kujo/Codex version | Use `.nvmrc`, locked npm packages and the local commands. Remove incompatible overrides. |
| Dependency differs from lock | Preserve local edits; move that `.runtime/deps/NAME` aside; rerun setup. Do not reset someone else's changes. |
| Setup lock exists | Confirm no installer is active, then remove the empty `.runtime/setup.lock` directory. |
| Codex authentication fails | Run `npm run login`; the factory has a separate auth home. Personal model-catalog configuration is not imported. |
| Docker socket unavailable after reboot | Restart the VM/user daemon and rerun `npm run engine:connect -- PROFILE`, or correct the saved Linux socket. |
| Rootless/seccomp/cgroup check fails | Correct the engine configuration. Rootful fallback and disabled sandbox checks are not supported. |
| Image missing or changed | Run `npm run image:build`, then doctor and smoke. |
| Registry pulls fail | Check the VM's actual DNS/gateway and Docker credentials; do not copy a gateway IP from another machine. |
| Receipt write fails / disk full | Free disk and verify retained run evidence. Treat missing receipts as failed verification; retry only in a new run. |
| Observer port occupied | `npm run configure -- --port 4389`; restart the observer. |
| Pack changed after review | Review the changed contract and tests, then seal again. Existing runs keep their frozen pack. |
| Model failed or timed out | Inspect the failed run's artifacts; use `retry` if appropriate. No automatic paid re-dispatch after uncertain outcomes. |

## Abrupt controller death

The image watchdog stops workload processes at the bounded deadline even if the whole host controller tree is killed. Host receipt finalization cannot run after SIGKILL, so stopped container metadata and disposable workspaces may remain. The factory does not automatically recover or resume that mission.

Inspect Docker containers filtered by label `dev.kujo.workcell.project`, then inspect the candidate's retained `container.json` and its exact ID. Verify it belongs to this failed run and that no live controller owns it before removing that stopped container. Never run broad prune commands. Use Workcell's own receipt/cleanup commands where evidence exists; preserve incomplete evidence as incomplete.

Disposable workspaces are under this checkout's `.runtime/workcell-tmp/`. Remove only the identified failed lease's directory after verifying its container is stopped/removed and no command is using it. Do not delete `.runtime/runs/` to resolve a lease cleanup issue. A new retry must run all gates again.
