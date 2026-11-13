# Factory runtime

Start with the [standalone repository README](../README.md) and [agent setup guide](../docs/AGENT-SETUP.md).

This directory contains the controller, native Dispatch adapter, software-pack validation and acceptance, the default issue-tracker contract, read-only observer and rootless Workcell harness. It has no Agent City runtime dependency. The public entry point is `npm run factory -- COMMAND`; direct `node factory/cli.mjs` is a contributor entry point that skips the wrapper’s readiness check.

See [architecture](../docs/ARCHITECTURE.md), [daily use](../docs/USAGE.md), [adaptation](../docs/ADAPT.md) and [Workcell boundary](WORKCELL.md).
