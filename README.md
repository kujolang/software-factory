# Kujo Software Factory

Give a team of agents a software mission. Inspect what they built, what reviewers rejected, and which tests actually passed.

Software Factory coordinates scoped proposals through Kujo Dispatch, runs generated code inside rootless Workcell containers, and approves a local candidate only after independent checks. The Factory Floor lets you follow and replay the evidence.

**Standalone, local-first, early release.** Agent City is not required. This version ships a working **issue-tracker software template**: a Node/SQLite API and browser interface. It is reusable for missions within that contract and a documented starting point for other software contracts. It does not turn an arbitrary prompt into arbitrary verified software, deploy applications, or include VideoOps/publishing factories.

## Start here

Requirements: Git, Node **26.12.1 or later 26.x**, a Codex account, and a local **rootless Docker engine with seccomp**. npm installs the pinned Kujo and Codex CLIs locally. No global Kujo installation or sibling repositories are needed.

```sh
git clone https://github.com/kujolang/software-factory.git
cd software-factory
npm ci
npm run setup
npm run login
```

Select a rootless engine following [Engine setup](docs/ENGINE.md), then:

```sh
npm run image:build
npm run doctor
npm run verify
npm run smoke
npm start
```

In another terminal in the checkout:

```sh
npm run factory -- run factory/mission.txt
```

Open **http://127.0.0.1:4380**. Each mission gets its own directory under `.runtime/runs/`. `build/` appears only after successful local release verification. Model calls consume your provider allowance; setup, tests and smoke do not call a model.

Already signed in to Codex? `npm run login -- --reuse-existing` imports only the existing `auth.json` into a private, gitignored factory home. It never imports personal configuration, hooks, tools or instructions. Alternatively use interactive login above.

## Let your agent install it

Give your agent this instruction and the repository URL:

> Clone kujolang/software-factory and follow docs/AGENT-SETUP.md. Install its pinned dependencies, help me select a supported rootless engine, run doctor and the no-model smoke test, then report the local viewer URL and any blockers. Keep generated code inside Workcell. Ask me to complete account sign-in when needed. Do not start a paid mission or publish an application until I request it.

The [agent guide](docs/AGENT-SETUP.md) includes exact steps, success criteria and failure handling. The [installation guide](docs/INSTALL.md) explains supported environments and prerequisites.

## What happens in a run

1. A commander interprets the mission and an architect defines scoped work.
2. Backend and frontend proposal workers run concurrently.
3. The controller admits only their allowed files.
4. Independent review, API checks and browser checks gate bounded corrections.
5. A separate release review and repeated checks bind approval to the exact source hash.

Workers propose text and files; they cannot run commands. Generated applications execute only inside Workcell. The observer is read-only. Model statements are never substituted for test results.

## Operate and adapt

- [Run, retry, inspect and export](docs/USAGE.md)
- [Configuration and dependency upgrades](docs/CONFIGURATION.md)
- [Adapt the software contract](docs/ADAPT.md)
- [Architecture and authority](docs/ARCHITECTURE.md)
- [Execution isolation](factory/WORKCELL.md)
- [Troubleshooting and recovery](docs/TROUBLESHOOTING.md)
- [Verification and qualification](docs/VERIFICATION.md)
- [Source extraction and demo provenance](docs/PROVENANCE.md)
- [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

## Scope

This is a local, single-operator factory. Rootless containers have bounded network, filesystem, process, memory and runtime access; they are not proof against kernel or runtime exploits. Hosted multi-tenant service, unattended crash recovery and public application deployment are not qualified. Windows users need Linux/WSL2; native Windows is unsupported. Platform qualification is recorded separately from intended compatibility.

MIT licensed. Kujo dependencies retain their own licenses. The included Departure Mono font retains its license.
