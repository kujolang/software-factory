# Issue-tracker acceptance contract

Build a small local team issue tracker. Node 26, standard library only: node:http, node:sqlite DatabaseSync. No external dependencies or executable installation hooks. REST JSON API, SQLite persistence, responsive vanilla HTML/CSS/JS Kanban frontend. Local single-operator demonstration; no public hosting/authentication claim.

Start: `node server.mjs`. Bind only 127.0.0.1. PORT defaults 4381, DB_PATH defaults ./issues.sqlite. Serve public/index.html and its static assets safely, correct MIME types. Print listening URL. Expose createServer({dbPath}) returning http.Server for integration tests. Each test uses its own temporary DB. Close database on server close. Do not start listening when imported. Node ESM.

## API

Return collections as JSON arrays and objects directly, without envelopes.

- GET /api/health -> 200 {ok:true}
- GET /api/projects -> 200 [{id:number,name:string,description:string}]
- POST /api/projects {name,description?} -> 201 project
- PATCH /api/projects/:id {name?,description?} -> 200 project; DELETE -> 204 (cascade tasks)
- GET /api/tasks?projectId=N -> 200 array of tasks; missing projectId lists all
- POST /api/tasks {projectId,title,description?,status?,priority?,assignee?} -> 201 task
- PATCH /api/tasks/:id accepts title,description,status,priority,assignee (not projectId) -> 200 task
- DELETE /api/tasks/:id -> 204
- GET /api/activity?projectId=N -> 200 array, newest first, entries {id,projectId,taskId,action,createdAt}; taskId may be null for project actions.

## Data and validation

Task properties: id:number, projectId:number, title, description, status, priority, assignee. Status enum todo/doing/done (default todo); priority low/medium/high (default medium); assignee is free text (default empty).

Validate JSON objects, types, trimmed nonempty name/title, max 120 chars name, max 200 title, max 4000 descriptions, max 100 assignee. Invalid IDs/unknown fields/invalid enums -> 400; absent records -> 404; missing parent project -> 404. Malformed JSON -> 400; body >64KiB -> 413. This limit applies to every body-bearing request, including DELETE: reject oversized bodies before any mutation, leaving records unchanged. Error JSON {error:string}. Never leak stack traces or SQL. Parameterized SQL. Foreign keys enforced. Mutations plus activity atomic. Reject unsafe cross-origin browser writes (Origin present must equal http://127.0.0.1:<actual listening port> or http://localhost:<same port>); no Origin accepted for local REST tools. Enforce loopback Host with correct port for HTTP requests.

## Browser interface

Provide project creation/edit/delete, task create/edit/delete, status moves, priority and assignee fields, project filter, clear activity history, empty/error/loading states, keyboard access, responsive Kanban (stack on mobile), accessible dialog/form labels. Use textContent for user content. No remote fonts/assets. Match Kujo monochrome precision, legible typography. Explain local demo scope.

## Clarifications from the acceptance owner

Recorded 2026-11-12: “clear activity history” means a clearly readable activity history display, NOT a delete-history feature. No clearing endpoint or destructive history control is required. Activity action values are project.created/project.updated/task.created/task.updated/task.deleted. Project deletion cascades its tasks and activity; a persistent project.deleted entry is not required. Task deletion may preserve taskId as a historical scalar or null it; no live task foreign key is required on audit records. Activity project foreign key may cascade. Provide proposed implementation without claiming tests ran; the independent controller performs inspection, execution, packaging and release. Tool-free proposal workers do not need to inspect the host to implement the explicitly supplied Node contract.

## Test ownership

 automated API and browser tests are repository-contained in the trusted software-factory factory checkout, outside the generated application subtree. The controller runs them against disposable Workcell databases, then repeats them before release. Candidate-local test files or an npm test script are not required and cannot supply authoritative results. tests/README.md and tests/contract.json identify the trusted harness and its source hashes. Never restore host execution of generated code merely to bundle a test runner.
