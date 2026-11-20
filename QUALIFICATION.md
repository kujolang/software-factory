# Deliberately broken converter qualification branch

This branch is an isolated Software Factory end-to-end qualification fixture. It is not a release candidate and must not be merged into the default branch.

The only software mutation changes `examples/converter/server.mjs` from `n*9/5+32` to `n*9/5+99`. This is the exact intentionally wrong arithmetic already exercised by `scripts/test-packs.mjs`. The normal converter example on the development/default branches remains unchanged.

Use the unchanged reviewed `packs/converter.json` and its seal to demonstrate that independent Workcell acceptance rejects this seed, then run the GitHub-issue development route and prepare a separately reviewable repair branch. Publish neither a PR nor a release automatically. A passing repair applies only to this deliberate fixture and is not a claim that a production defect was found.

The supported runtime consumes a committed projection of `examples/converter` into a local repository. Its provenance must retain this full repository commit, the subdirectory and all projected source hashes. Map only independently approved admitted files back to `examples/converter` in a full-repository worktree based on this seed. The eventual proposed PR targets `codex/qualification-converter-seed`, never the default branch.
