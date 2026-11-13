# Contributing

Install with the README, create a focused branch, and read AGENTS.md. Keep runtime changes, tests and documentation together. Explain the concrete problem, resulting behavior, verification and any limits.

Run `npm run verify`. For changes to isolation, admission, acceptance or lifecycle behavior, run the live smoke and isolation checks on a qualified engine. Distinguish representative fixtures from fresh model missions. Submit redacted evidence summaries, not credentials or large raw run archives.

Pinned dependencies are intentional. Review exact commit/version changes, rebuild the trusted image when needed, and requalify before updating the lock files. Use software packs for new products within the Node/SQLite/browser runtime. Test pack changes with `npm run test:packs`. New runtime capabilities need their own design and isolation evidence.
