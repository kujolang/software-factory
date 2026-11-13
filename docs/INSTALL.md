# Install Software Factory

## Requirements

- Git and a POSIX host: macOS or Linux. Use WSL2 for Windows; native Windows process and socket behavior are unsupported.
- Node 26.12.1 or later 26.x with npm. `.nvmrc` names the tested version.
- Docker CLI and an explicitly selected local rootless daemon with seccomp and effective cgroup limits. Docker Desktop's usual rootful daemon does not qualify merely because it runs inside a VM.
- A Codex account or provider authentication accepted by the pinned Codex CLI. Sign-in is interactive unless importing existing local authentication.
- At least 10 GiB free for initial dependencies/image construction; doctor blocks below 2 GiB. A 4 GiB engine VM is a practical starting point for this 1 GiB-per-lease template. Allow extra disk for retained runs.

## Install in a new checkout

```sh
git clone https://github.com/kujolang/software-factory.git
cd software-factory
npm ci
npm run setup
npm run login
```

`npm ci` installs exact locked versions of Kujo 1.9.0, Codex CLI 0.144.4 and the schema validator. Do not omit optional npm dependencies: they contain the Kujo/Codex platform binaries. `setup` fetches exact Git commits for Dispatch, Workcell and Chain of Command into `.runtime/deps/`. On later runs, it checks the commit and working tree and refuses to overwrite edits. No sibling checkout, global install, Rust build, npm publication, GitHub token or Agent City installation is required.

The source lock uses public HTTPS repositories. npm and Git need network access during installation. The trusted image build also downloads Node/Chromium dependencies. Candidate execution has no external network.

Complete [engine setup](ENGINE.md), then:

```sh
npm run image:build
npm run doctor
npm run verify
npm run smoke
```

`doctor` checks versions, dependency commits, authentication, available disk, rootless/seccomp policy and the trusted image. `verify` runs deterministic tests without model calls. `smoke` runs the included representative application through real isolated API/browser checks; it does not generate software or approve a release.

For the converter and notes examples, also run `npm run test:packs`. Start the observer with `npm start`, then run a mission with `npm run factory -- run factory/mission.txt`. See [usage](USAGE.md).

## Repeat installation and upgrades

`npm ci` and `npm run setup` are repeatable. They do not replace run history or credentials. If setup was interrupted, confirm no setup process is active before removing the empty `.runtime/setup.lock` directory. Preserve changed dependency checkouts before moving them aside and retrying.

Before updating: stop new runs, let active leases finish, record the current Git commit, and back up `.runtime/runs/` plus private configuration/authentication using your normal secure backup policy. Pull the desired release, run `npm ci`, review `sources.lock.json` changes, and rerun setup, image build, doctor, verify and smoke. Keep dependency commits pinned; do not replace them with moving `main` branches.

## Remove

Stop the observer and active factory commands first. Check owned Workcell resources as described in [recovery](TROUBLESHOOTING.md). Removing the checkout removes its local dependencies, configuration, run history and factory auth copy. It does not remove your account, system tools, images, Colima VM or original Codex authentication. Preserve outputs before removal. No uninstaller deletes shared Docker resources automatically.
