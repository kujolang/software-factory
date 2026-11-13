# Software packs

A software pack defines what to build and how to check it. Your agent writes one JSON file; the controller, worker roles, Workcell policy and release gates stay the same.

The current runtime supports dependency-free Node HTTP applications, optional SQLite storage, and static browser interfaces. It does not install packages or add languages, external services, authentication infrastructure or deployment targets. Ask for a runtime extension when an idea needs those features; do not hide them in a pack.

## Give this to your agent

> Follow docs/AGENT-SETUP.md to install Software Factory. Turn my software idea into a pack using docs/PACKS.md and the examples in packs/. Define requirements and independent expected results before generating application code. Check each requirement against its tests, including invalid inputs, persistence when needed, and browser behavior. Explain unsupported requirements. Validate and seal the reviewed pack, then run my authorized mission with --pack. Do not change the controller or let implementation workers change the tests. Report the actual release result and evidence.

The setup agent prepares tests before construction. Construction workers receive the frozen tests but cannot edit them. A seal records the reviewed bytes; it does not prove that the requirements are complete or the tests are good. Review that fit before spending provider usage.

## Prepare and run

Write your idea in `idea.txt`, then create a draft:

```sh
npm run pack -- init packs/my-app.json idea.txt
```

The draft deliberately fails validation until your agent fills in requirements and tests. It is not an automatic test generator by itself. Your coding agent does that work using this guide.

Use [converter.json](../packs/converter.json) for a stateless example and [notes.json](../packs/notes.json) for a persistent app. Replace the draft's ID, title, contract, requirements and tests. Then:

```sh
npm run pack -- validate packs/my-app.json
# After reviewing requirements, test coverage and expected results:
npm run pack -- seal packs/my-app.json --reviewed
npm run factory -- run idea.txt --pack packs/my-app.json
```

Commit the pack and its `.seal.json` beside your project configuration. Each run copies the pack into its own directory and binds its hash to verification and release. Editing the original pack does not change an existing run. Changed tests need another review and seal; retries use the original run's frozen pack.

Omit `--pack` to use the original issue-tracker workflow. Its existing acceptance checks remain available.

## Pack fields

| Field | Meaning |
| --- | --- |
| `schema` | Exactly `kujo.factory.pack/v1` |
| `id` | Lowercase ID, starting with a letter; letters, digits and hyphens; 2–64 characters |
| `title` | Product name, up to 120 characters |
| `contract` | Product behavior, API/data model, browser controls and limits; up to 16,000 characters |
| `requirements` | 1–40 objects with unique `id` and `description` |
| `api` | 3–60 ordered API/restart steps |
| `browser` | 3–60 ordered browser steps |

Every step has a unique `id` and a `covers` array of requirement IDs. Use an empty array for setup steps. Every requirement must appear in at least one test. Coverage mapping checks that IDs connect; it cannot judge whether a test proves its requirement.

Unknown fields and unsupported actions fail validation. Packs are bounded data, not JavaScript plugins. They cannot supply shell commands, evaluate browser code, change network policy or replace test runners.

## API steps

A request step has `method`, `path` and expected `status`. Supported methods are GET, POST, PUT, PATCH and DELETE. Paths start with a single `/` and target only the isolated app.

Optional fields:

- `body`: JSON request data.
- `expect`: expected JSON. Objects match the specified fields; arrays and scalar values must match exactly.
- `save`: store response JSON under a short name for later steps.

Use `${note.id}` to reference a saved response. A whole-value reference keeps its JSON type; references inside a path are URL-encoded. Missing references fail the test. There is no expression evaluation.

A restart step contains only `id`, `covers` and `restart: true`. Include a request after it to verify the required state. Packs must include a negative API case and a restart. For stateless apps, check the same result after restart. For persistent apps, create data first and read it after restart.

API tests run against a disposable database. Browser tests then use that same lease and database, so account for API-created records.

## Browser steps

| Action | Fields | Behavior |
| --- | --- | --- |
| `goto` | `value` | Open a relative app URL |
| `fill` | `selector`, `value` | Fill a form control |
| `click` | `selector` | Click a control |
| `select` | `selector`, `value` | Choose an option |
| `text` | `selector`, `value` | Require text to contain the value |
| `count` | `selector`, `count` | Require an exact element count |
| `reload` | — | Reload the current page |

Selectors use Playwright's locator syntax. Match stable controls named in the contract. Assertions wait up to five seconds; the lease also has a fixed deadline. At least one browser assertion is required. Uncaught page errors fail acceptance. Dialogs are dismissed; use an inline confirmation form if a workflow needs affirmative confirmation.

The image-owned runner receives the frozen data through stdin. It writes reports as a separate UID in a protected directory. The candidate cannot replace the runner or write a passing report.

## Runtime contract

Export `createServer({dbPath})` from `server.mjs` without listening during import. Return a Node HTTP server, close database resources when it closes, and serve `GET /api/health` as `200 {"ok":true}`. The controller supplies the database path and loopback listener. Backend proposals may write `server.mjs` and `db.mjs`; frontend proposals may write flat HTML, CSS, JS and SVG files under `public/`.

The controller adds package metadata, documentation and syntax-build instructions. It keeps input validation, safe SQL/static paths, same-origin writes, loopback Host checks and the 64 KiB request limit in the runtime contract. Product tests should exercise relevant negative cases; static review alone does not prove these controls.

## Check a pack without model calls

```sh
npm run test:packs
node factory/pack-acceptance.mjs examples/notes packs/notes.json .runtime/my-pack-check
```

The first command checks two different products and rejects a deliberately wrong implementation. The second checks a particular candidate inside Workcell. Neither approves a release. A release still needs independent review, syntax checks, repeated acceptance and matching source/pack hashes.
