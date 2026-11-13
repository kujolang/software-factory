# Review-only canonical catalog comparison

Use `software-factory maintenance compare-catalog REPOSITORY CHECKOUT COMMIT` after obtaining an upstream checkout. `REPOSITORY` is exactly `kujo-agents`, `kujo-skills`, or `kujo-workflows`; `COMMIT` must be the full immutable commit ID. No branch name, executable, hook, or package script is accepted. The command reads bounded Git objects with hooks, filesystem monitoring, global configuration and replacement objects disabled. It does not install or execute the checkout.

The report identifies added/removed/metadata-changed roles, skills and workflows; package resource changes; schema/manifest changes; dependency declarations; and documentation changes. Changed packages are listed for renewed qualification. `ok:true` means the comparison completed, while `reviewRequired:true` means its changes still require review. Compatibility remains explicitly unestablished. An unchanged package inventory does not prove an unchanged repository is vulnerability-free.

The shared immutable-object reader also powers `scripts/build-catalog.mjs`; rebuilding the existing pins reproduces the existing 85-role, 136-skill and 45-workflow lock without a diff. The normal comparison never rewrites that lock. Source adoption remains a separate maintainer action after review, adapter tests and relevant actual execution qualification.

Tests cover exact reproduction of the pinned role/resource inventory, roster and permission changes, schema and dependency changes, and rejection of ambiguous revisions or unrelated repositories. Remote advisory feeds and automatic semantic compatibility judgments are not implemented by this command.
