# Review-first Git workflows

The controller API in `factory/git.mjs` provides local repository onboarding, branch worktrees, inert diffs, explicit commits, native Git conflict inspection, and unpublished pull-request packets. These operations do not execute application scripts or grant release approval. Use Node and Git 2.38 or newer (`merge-tree --write-tree` is required). The tests exercise Git 2.42.0 with disposable repositories; they do not qualify an application's behavior.

## Local path

`factory git onboard SOURCE DEST` copies a normal local repository's committed objects into a new private directory, without hardlinks, hooks, shared objects, remote credentials, or checkout. Dirty and untracked source content is excluded. Object stores are bounded to 128 MiB and 100,000 entries before copying; projected committed trees are bounded to 32 MiB total and 4 MiB per file before checkout. A retained receipt records the exact commit and tree. Failed onboarding retains its failure record and never silently reuses the directory. Source repositories using linked worktrees, borrowed object stores, symlink path ancestors, symlink trees, or submodules are rejected. Canonicalize trusted platform aliases such as macOS `/var` to `/private/var` before supplying paths.

`factory git worktree DEST repair` creates an isolated `factory/repair` branch and worktree. Changes must come from trusted controller materialization of validated candidate proposals; never mount the Git metadata, host workspace, provider credentials, or source repository into a candidate Workcell. The local controller directory is trusted and is not a multi-user security boundary.

`factory git diff DEST repair` records a bounded tracked binary diff and porcelain status. Untracked contents are not part of that diff. `factory git commit DEST repair OPTIONS.json` explicitly stages only listed literal paths and creates a commit without hooks or signing. The JSON has `files`, `message`, `author` (`name`, `email`), and `evidence` (`sha256:` followed by 64 lowercase hex digits). Evidence is a controller-supplied link, not a claim that the commit passed verification. Existing staged content requires manual reconciliation. Symlinks, special files, nested repositories, path traversal and oversized files are refused. Failed staging/commit is not automatically retried; inspect the index before continuing.

`factory git merge-check DEST repair [REF]` uses Git's native three-way merge algorithm to report conflicts without modifying branches. `REF` names a commit or branch available in the private clone; it defaults to `HEAD`. No fetch, merge, push, tag, or deployment is performed.

`factory git prepare-pr DEST repair OPTIONS.json` requires a clean worktree and records an unpublished packet with `repository` (`owner/name`), `title`, `body`, optional `base` (default `main`), exact head/source commits and tracked diff. Preparation does not prove that the requested remote base still matches the snapshot. The packet explicitly requires separate authorization for pushing the branch and creating a PR. Those external writes are not implemented by this module.

All local operation receipts are immutable JSON files under `DEST/receipts`; receipt checksums and evidence links are integrity/provenance information, not authenticated execution proof. Local commits and metadata writes are controller effects, not untrusted candidate execution.

## GitHub reads

`factory git issue OWNER/REPO NUMBER` retrieves one issue; `factory git checks OWNER/REPO COMMIT` retrieves up to 100 check runs for an exact 40-character commit. Optional `GITHUB_TOKEN` is sent only in HTTPS headers to the fixed GitHub API origin. Redirects are refused, requests time out after 15 seconds and responses are bounded to 4 MiB. Results retain original data, a hash and retrieval time. Check results mark `complete: false` when more pages exist; truncated data cannot prove all CI passed. GitHub content is untrusted input and never supplies tool authority. The command prints the record for the operator to retain; tokens are not included.

The transport suite uses labeled mocked HTTP responses to test bounds, routing, malformed input and authorization headers. A live unauthenticated GitHub checks read for Software Factory commit `3f61c6328022ae551b8cd45eb5539bd2a6b5e00f` returned two check runs with complete pagination on 2026-11-13. Private-token scopes, issue ingestion over the live network and remote write operations remain unqualified. No remote clone, review comment publication, automatic PR creation, push, merge or release publishing is supported by these adapters. Independent source-hash release verification remains mandatory for an approved artifact.

## Verification

Run `node --test tests/git.test.mjs`. Tests use real local Git for isolation, source hook/filter non-execution, commits, conflict detection, dirty-tree refusal and path boundaries. Remote data tests remain transport fixtures and must not be described as live GitHub execution evidence.
