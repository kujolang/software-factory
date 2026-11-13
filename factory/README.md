# Factory runtime

Start with the [standalone repository README](../README.md) and [agent setup guide](../docs/AGENT-SETUP.md).

This directory contains the controller, native Dispatch adapter, issue-tracker acceptance contract, read-only observer and rootless Workcell harness. It has no Agent City runtime dependency. The public entry point is `npm run factory -- COMMAND`; direct `node factory/cli.mjs` is a lower-level contributor entry point.

See [architecture](../docs/ARCHITECTURE.md), [daily use](../docs/USAGE.md), [adaptation](../docs/ADAPT.md) and [Workcell boundary](WORKCELL.md).
