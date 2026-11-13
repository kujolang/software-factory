# Configuration

`npm run configure -- OPTIONS` saves nonsecret values to `.runtime/settings.json` with private permissions. Credentials live separately under `.runtime/provider/`. Both are gitignored.

| Option | Meaning |
| --- | --- |
| `--docker-host unix:///absolute/socket` | Local rootless daemon socket |
| `--docker-context NAME` | Existing local Docker context; exclusive with host |
| `--docker-config PATH` | Existing Docker CLI configuration directory |
| `--runs PATH` | Run storage; relative paths resolve from this checkout |
| `--port 4380` | Loopback observer port, 1024–65535 |
| `--model MODEL` | Explicit model supported by your Codex account |

Ordinary setup uses repository-local defaults. Advanced trusted overrides remain available: `KUJO_BIN`, `FACTORY_AGENTS_ROOT`, `FACTORY_DISPATCH_ROOT`, `FACTORY_WORKCELL_BIN`, `FACTORY_WORKCELL_KUJO`, `FACTORY_WORKCELL_IMAGE`, `FACTORY_CODEX_BIN`, `FACTORY_RUNS`, `FACTORY_PORT`, and `FACTORY_MODEL`. Docker environment variables take precedence over saved engine selection. Do not use these overrides to bypass qualification. Full qualification checks the pinned local producers; advanced source modifications are a contributor workflow.

`sources.lock.json` pins complete source commits. `package-lock.json` pins npm integrity hashes and platform packages. The image records its actual local digest on every lease. Image source/tag alone is not execution evidence; observed Docker settings and native receipt verification remain mandatory.

After changing the trusted image source, rebuild it. After changing acceptance code, regenerate candidate harness metadata through the controller and run fresh verification. Old approvals never cover changed source or changed test ownership.
