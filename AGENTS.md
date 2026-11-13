# Software Factory contributor instructions

Read README.md, docs/ARCHITECTURE.md, docs/ADAPT.md and SECURITY.md before changing the runtime. For installation, follow docs/AGENT-SETUP.md.

- Never execute proposed application JavaScript on the host. Use Workcell and fail closed when isolation or evidence is unavailable.
- Keep candidate proposals separate from trusted tests, source hashes and release authority.
- Preserve failed runs as failures; retry creates a new run. Do not fabricate usage, concurrency, approval or test evidence.
- Keep credentials and runtime state out of Git. Do not change global Docker contexts or shared engine settings silently.
- `npm run verify` is the deterministic gate. After execution-policy changes, also run `npm run smoke`, `npm run test:isolation` and `npm run test:controller-death` on a qualified engine.
- Model-backed missions require user authorization because they consume provider usage. Fixtures never substitute for live mission evidence.
- Update documentation and provenance when changing contracts or dependency pins. Do not add unrelated factory types during a software-runtime fix.
