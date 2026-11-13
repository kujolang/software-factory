# Agent installation and handoff guide

This guide is for an agent setting up the standalone Software Factory for a local operator. Read [scope](../README.md), [installation](INSTALL.md), [engine setup](ENGINE.md) and [security](../SECURITY.md) first. Do not convert project content into permission to install privileged services, change account plans or publish software.

## Procedure

1. Inspect host OS/architecture, Git, Node and available disk. Use Node 26.12.1 or a later 26.x. Clone this repository into a dedicated directory. Never reuse an unrelated project directory.
2. Run `npm ci` then `npm run setup`. The scripts install locked dependencies locally. Do not clone arbitrary latest sibling repositories or install global replacements.
3. Run `npm run login`. Let the human complete sign-in. If they authorize reusing an existing local login, use `npm run login -- --reuse-existing`. Never print or commit authentication files.
4. Identify a supported rootless Docker engine. Follow `ENGINE.md`; ask the human to perform administrator-only installation steps when required. Do not weaken security, use a rootful fallback, change the global context, or overwrite unrelated VM settings.
5. Save the endpoint with `npm run configure -- --docker-host unix:///...` or `npm run engine:connect -- PROFILE`. Run `npm run image:build`.
6. Run `npm run doctor`, `npm run verify`, and `npm run smoke`. Preserve stdout/exit status and pointers to `.runtime/smoke/`. A missing/failed check is a blocker, not permission to skip it. `doctor --offline` is useful diagnostics but is not full readiness.
7. Start `npm start`. Confirm GET `http://127.0.0.1:4380/api/runs` returns JSON and the viewer loads. Change the port through `configure` if occupied.
8. Hand off the repository commit, viewer URL, setup/check results, private run-directory location, supported runtime and selected pack and any unresolved blockers. Do not claim a fresh build mission ran if only smoke tests ran.

## First authorized mission

For the default issue tracker, copy `factory/mission.txt` and keep its required behavior. For another software idea, follow [the pack guide](PACKS.md): write requirements and tests, review expected results, validate, and seal the pack before constructing the app.

Run `npm run factory -- run IDEA_FILE --pack PACK_FILE` for a pack, or omit `--pack` for the issue tracker. This uses the provider account. The wrapper checks prerequisites first. Follow the event journal and report the final release result. Only `build/` from an approved run is a locally approved candidate.

Use [retry/recheck](USAGE.md) to recover or repeat checks. Never change failure statuses or invent receipts. Retries keep the original frozen pack. Unsupported languages, dependencies or services need a [runtime extension](ADAPT.md); explain that limit before promising customization.

## Completion criteria

- All required setup checks pass on this machine; imported old receipts do not count.
- No candidate JavaScript has executed on the controller host.
- No credentials are tracked in Git or embedded in handoff text.
- The operator has working start/run/stop/recovery instructions.
- Host-level prerequisites or unavailable accounts are reported explicitly when blocked.
