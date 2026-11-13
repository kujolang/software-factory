# WSL2 compatibility assessment

Assessment date: 2026-11-13. **Not qualified on WSL2.** This session runs on macOS (`process.platform=darwin`, `process.arch=x64`); no WSL host was available and no Windows/WSL test result is asserted.

The factory explicitly rejects native Windows in `scripts/doctor.mjs`. A WSL2 Linux distribution is a plausible execution environment, subject to the unchanged Linux preflight and real isolation tests below. That is an inference from the source contracts, not a supported-platform certification.

## Required host properties

- Run Linux Node 26.12.1, Git, npm and the pinned Linux Kujo runtime inside the distribution. Keep source, dependencies, private evidence and credential files in the Linux filesystem, not `/mnt/c`. Microsoft recommends keeping Linux-tool projects in the WSL filesystem to avoid cross-filesystem overhead. Factory owner-only mode, symlink, hardlink, UID and inode checks also require meaningful Linux filesystem semantics. [Microsoft WSL development setup](https://learn.microsoft.com/en-us/windows/wsl/setup/environment).
- Use a local **rootless** Docker daemon with seccomp, subordinate UID/GID mappings and effective cgroup resource controls. Docker documents rootless prerequisites and service configuration; installing a Docker client or selecting an arbitrary Docker Desktop endpoint does not establish these properties. [Docker rootless mode](https://docs.docker.com/engine/security/rootless/).
- WSL supports systemd configuration, which may be relevant to the Docker user service. Verify the actual distribution/session setup rather than assuming a service runs because systemd is available. [Microsoft systemd in WSL](https://learn.microsoft.com/en-us/windows/wsl/systemd/).
- `factory/workcell.mjs` requires rootless and seccomp security options, bounded memory/PIDs/CPU, a read-only root filesystem, no network, no candidate credentials/socket mounts, and verified cleanup. Default `/tmp` remains noexec. Compiled CLI v2 separately requires a genuinely read-only staged executable mount. No Windows/WSL exception or host-execution fallback exists.

## Qualification still needed on a real WSL2 host

Record Windows build, WSL version/distribution/kernel, Linux architecture, Node/npm/Git/Kujo versions, Docker server/context/security options, cgroup mode and exact factory/source/image identities. Install from a fresh checkout with fresh dependency caches and no copied factory settings or provider credentials. Preserve logs for:

```sh
npm ci
npm run setup
npm run doctor -- --offline
npm run verify
npm run doctor
npm run smoke
npm run test:isolation
npm run test:controller-death
npm run test:packs
```

Use the documented engine setup before live doctor/tests. Run representative provider missions only after separately authorized credential setup. Exercise host shutdown/controller interruption, original-deadline recovery, network denial, filesystem isolation and watchdog cleanup. A Windows suspend or WSL shutdown must not be represented as equivalent to a graceful Linux process termination. Retain failure evidence. Reject a host that cannot enforce required limits.

## Platform evidence distinctions

`.github/workflows/verify.yml` defines fresh GitHub-hosted Ubuntu 24.04 and macOS 15 jobs: checkout, pinned Node, `npm ci`, setup, offline doctor and aggregate tests. This configuration alone is not a passing CI run. The macOS job installs Docker CLI without a daemon; neither job runs live rootless isolation or model missions.

The local qualification host uses macOS with a rootless Docker daemon inside a Colima Linux guest. Those real Linux-container results are distinct from a fresh native Linux installation, a fresh macOS machine, and WSL2. `scripts/qualify-install.mjs` isolates a public checkout/HOME/npm cache on the current host; it does not provision a new OS or test upgrade/rollback. Final-source fresh CI receipts, representative installed missions and a tested upgrade/rollback sequence must be recorded separately.
