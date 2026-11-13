# Kujo Software Factory

[![Version](https://img.shields.io/badge/version-0.1.0-black)](package.json)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)
[![built with Kujo](https://img.shields.io/badge/built%20with-Kujo-white.svg)](https://github.com/kujolang/kujo)
[![Verification](https://img.shields.io/github/actions/workflow/status/kujolang/software-factory/verify.yml?branch=main&label=verification&color=black)](https://github.com/kujolang/software-factory/actions/workflows/verify.yml)

Give a team of agents a software mission. Inspect what they built, what reviewers rejected, and which tests actually passed.

https://github.com/user-attachments/assets/1b85bfd6-5fb6-4d32-a421-22546934389f

Software Factory coordinates scoped proposals through Kujo Dispatch, runs generated code inside rootless Workcell containers, and approves a local candidate only after independent checks. The Factory Floor lets you follow and replay the evidence.

**Standalone, local, early release.** Give your agent an idea and the [software-pack guide](docs/PACKS.md). It can define the product contract and tests without rewriting the controller. Packs support Node APIs, SQLite when needed, and static browser interfaces. The issue tracker remains the default; converter and notes packs show other products. Agent City is not required.

## Ecosystem integration increment

This branch adds complete pinned [catalogs](docs/CATALOGS.md), bounded team planning, [portable evidence verification](docs/EVIDENCE.md), and [read-only MCP discovery](docs/MCP.md). It is **not feature-complete**. See [release qualification](docs/RELEASE-QUALIFICATION.md) and [known limitations](docs/KNOWN-LIMITATIONS.md) before relying on new capabilities. The Node application workflow now includes native Lens and accounted release gates. Additional bounded interfaces cover [reviewed specifications](docs/SPEC-PIPELINE.md), [repository repairs](docs/REPOSITORY-MISSIONS.md), [CLI runtimes](docs/CLI-RUNTIMES.md), [context preparation](docs/CONTEXT-PIPELINE.md), [change inspection](docs/CHANGE-TOOLS.md), and [operations](docs/OPERATIONS.md), and [local telemetry](docs/TELEMETRY.md). Each has a separately stated qualification scope.

## Start here

Requirements: Git, Node **26.12.1 or later 26.x**, a Codex account or an installed local Ollama model, and a local **rootless Docker engine with seccomp**. npm installs the pinned Kujo and Codex CLIs locally. No global Kujo installation or sibling repositories are needed.

```sh
git clone https://github.com/kujolang/software-factory.git
cd software-factory
npm ci
npm run setup
npm run login
```

Codex is the default provider. For local Ollama, skip login and follow [provider selection](docs/PROVIDERS.md); no cloud alias is accepted by the local adapter.

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

> Clone kujolang/software-factory and follow docs/AGENT-SETUP.md. Set up the pinned tools and rootless engine, then turn my software idea into a reviewed contract and tests using docs/PACKS.md. Validate and seal the pack before construction. Keep generated code inside Workcell. Help me complete sign-in when needed, and report any unsupported requirements. Run paid missions only when I authorize them.

The [agent guide](docs/AGENT-SETUP.md) includes exact steps, success criteria and failure handling. The [installation guide](docs/INSTALL.md) explains supported environments and prerequisites.

## Build a different product

Your agent fills a pack from your idea, reviews its expected results and seals it. Run the idea against that pack:

```sh
npm run factory -- run idea.txt --pack packs/my-app.json
```

See the [pack guide](docs/PACKS.md) for the full workflow. Test the shipped converter and notes fixtures with `npm run test:packs`; this makes no model calls. Packs define tests as data. They cannot change the sandbox, run shell commands or approve their own output.

## What happens in a run

1. A commander interprets the mission and an architect defines scoped work.
2. Backend and frontend proposal workers run concurrently.
3. The controller admits only their allowed files.
4. Independent review, API checks and browser checks gate bounded corrections.
5. A separate release review, native Eval and selected ShipCheck controls repeat source-bound checks.
6. Canonical accounting completes before verified files become an approved local candidate. Rejected attempts remain in CaseFile evidence.

Workers propose text and files; they cannot run commands. Generated applications execute only inside Workcell. The observer is read-only. Model statements are never substituted for test results.

## Operate and adapt

- [Run, retry, inspect and export](docs/USAGE.md)
- [Configuration and dependency upgrades](docs/CONFIGURATION.md)
- [Create a software pack](docs/PACKS.md)
- [Extend the runtime](docs/ADAPT.md)
- [Architecture and authority](docs/ARCHITECTURE.md)
- [Execution isolation](factory/WORKCELL.md)
- [Troubleshooting and recovery](docs/TROUBLESHOOTING.md)
- [Verification and qualification](docs/VERIFICATION.md)
- [Source extraction and demo provenance](docs/PROVENANCE.md)
- [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

## Scope

This is a local, single-operator factory. Workcell limits network, filesystem, process, memory and runtime access. These controls do not prove protection against kernel or runtime exploits. Hosted multi-tenant service, unattended crash recovery and public application deployment are not qualified. Windows users need Linux/WSL2; native Windows is unsupported. Platform qualification is recorded separately from intended compatibility.

MIT licensed. Kujo dependencies retain their own licenses. The included Departure Mono font retains its license.
