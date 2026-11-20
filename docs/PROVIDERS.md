# Proposal providers

The controller uses `executeProposal` in `factory/providers.mjs`. Every adapter
returns a schema-validated proposal plus a versioned receipt. A failure throws an
error containing a failure receipt; callers must preserve it before retrying.
Provider output is data. This interface does not materialize files, run candidate
code, approve a release, or authorize deployment.

| Provider | Interface | Limits and qualification |
|---|---|---|
| `codex` | Pinned Codex CLI, fixed JSON schema, ephemeral read-only session | Tools, apps, browser and web search disabled; unexpected tool events rejected. Existing factory provider; the extracted adapter passed a live schema smoke and a converter construction followed by a fresh independently verified retry; see RELEASE-QUALIFICATION.md for the retained initial rejection and exact scope. |
| `ollama` | Pinned Kujo Ollama `create_client`, `client_list_models`, `client_chat` through a fixed bridge | Local installed models only, JSON Schema output, no tools or streaming. Actual local structured output and bounded approved-candidate revalidation passed at their recorded commits; construction with this model remains unqualified. |
| `openai`, `anthropic`, `gemini` | Pinned native Kujo AI SDK/driver adapters | Credential-isolated, fixed HTTPS origins and schema validation; protocol fixtures pass, live cloud qualification remains unavailable without separately authorized credentials. |
| `mock` | Explicit host-supplied JSON fixture | Offline deterministic tests only. Receipt always marks `fixture: true`; never evidence of model execution. |

The optional SDK providers are implemented but are not presented as live-qualified. No provider silently falls back to another.

Current-source local Ollama qualification remains blocked. Earlier bounded revalidation passes apply only to their recorded source/model. Recent attempts produced prohibited review files, contradictory passing verdicts, resource interruption or cancellation; none established a new passing release. Read-only role schemas now declare `files` with `maxItems: 0`, matching the existing host prohibition. Independent review rejects a passing verdict with unresolved issues. Worker parent monitoring and owned-child cleanup passed actual process fixtures; both fresh-platform CI and the default rootless regression passed at `0418dbe`. Current-source live provider qualification remains incomplete.

## Controller API

```js
const {output, receipt} = await executeProposal({
  provider: 'ollama',
  model: 'an-already-installed-local-model',
  prompt: 'The bounded work order and role contract',
  schema: trustedOutputSchema,
  timeoutMs: 60000,
  maxBytes: 1500000,
  maxOutputTokens: 8192,
  signal: abortController.signal,
});
```

`provider`, model selection, endpoint, schema and limits come from trusted
controller configuration, never from a candidate or skill. The default provider
is Codex. The controller may supply role-specific selections. `ollamaHost`
defaults to `http://127.0.0.1:11434`; only the canonical IPv4 loopback origin with
an optional port is accepted. Remote hosts, credentials, query strings, paths,
redirects and hostname aliases are rejected. An upstream model-list check rejects
models carrying `remote_host` or `remote_model`, including cloud aliases exposed
by a local Ollama server. The local provider server remains trusted and can lie
about its model inventory; these checks are not network sandboxing of that server.

Run `npm run setup` to install the pinned upstream source. There is no sibling
repository requirement. Ollama itself and an already installed model are operator
prerequisites; setup does not install a daemon, download models or authenticate a
cloud account. Source revision and checkout drift are checked before each request. The immutable
`config/provider-sources.lock.json` records all 28 upstream package files, sizes
and SHA-256 digests directly from the pinned Git objects. Verification hashes the
actual complete package tree, rejects symlinks and unexpected files (including
ignored imports), and does not trust the Git index's assume-unchanged flags.

Only an explicit `mockOutput` is accepted for `mock`. Tests can supply trusted
`codexBinary`, `providerHome`, `kujoBinary` and `ollamaRoot` overrides; those are
host adapter configuration and must not be exposed as mission input.

## Boundaries and accounting

The subprocess environment is rebuilt from a short allowlist. Ollama receives no
provider keys, proxy configuration, shell initialization, or inherited user home.
Its Kujo bridge runs with filesystem-read and network-client capabilities only.
The bridge restricts HTTP to the selected loopback server's `/api/tags` and
`/api/chat`, disables redirects, and bounds responses. Explicitly allowing private
destinations in that child is necessary for localhost; the fixed bridge enforces
the narrower URL policy. No candidate code executes inside this controller bridge.

Codex receives only the configured private `CODEX_HOME` in addition to the base
environment. User configuration is ignored and the working directory is a private
temporary directory. Temporary prompts, schemas and responses are removed after
completion or failure. Cancellation and deadlines terminate the subprocess group.
Output and stderr have a combined byte ceiling; stderr and provider error bodies
are not copied into error receipts. Returned structured proposals may contain
private source supplied in the prompt and still need normal evidence handling.

Usage comes only from provider-reported numeric counters. Missing usage stays
`null`; Ollama cache usage is unknown. Monetary cost stays `null`. Any requested
monetary ceiling fails before dispatch because no verified cost reservation exists.
Codex rejects an output-token ceiling that its adapter cannot enforce. Ollama sends
`num_predict` and rejects truncated results. Mission-wide and role-specific call/prompt-byte reservations are durable and frozen before execution. Unknown or cancelled attempts remain consumed; recovery cannot reset the policy. These are not input-token or monetary reservations. See [PROVIDER-BUDGETS.md](PROVIDER-BUDGETS.md) and [actual budget qualification](PROVIDER-BUDGET-QUALIFICATION.json). Retryable HTTP status classification is advisory;
this adapter never retries automatically. A timeout can leave provider-side
accounting uncertain even after the local client is killed.

## Upstream contracts

- [Ollama 0.1.11 native API](https://github.com/kujolang/ollama/blob/5821d7baee785ac8c10cf07dae8f29dc43b846ab/src/ollama.kujo)
  supplies request encoding, HTTP handling, response decoding and native usage.
  The factory adds a fixed transport-policy callback, not a competing provider
  protocol implementation.
- [Ollama structured-output example](https://github.com/kujolang/ollama/blob/5821d7baee785ac8c10cf07dae8f29dc43b846ab/examples/structured_output.kujo)
  and README recommend the native surface for provider-specific JSON Schema.
- [AI SDK contract](https://github.com/kujolang/ai-sdk/blob/9083c0a8dd827dabdc840ac79a8fc07844d4888b/README.md)
  describes normalized provider drivers and SDK-owned transport. The factory uses
  the supported native Ollama surface here to retain its JSON Schema contract;
  the separate OpenAI/Anthropic/Gemini paths use the pinned AI SDK and provider drivers. This does not claim a second Agents SDK orchestration engine.

## Verification

Current scoped evidence includes real Codex React construction with four calls, repeated Workcell checks and standalone export verification ([REACT-MISSION-QUALIFICATION.json](REACT-MISSION-QUALIFICATION.json)); real two-call budget success and one-call pre-transport rejection ([PROVIDER-BUDGET-QUALIFICATION.json](PROVIDER-BUDGET-QUALIFICATION.json)); and a fresh-checkout advisory mission ([INSTALLED-MISSION-QUALIFICATION.json](INSTALLED-MISSION-QUALIFICATION.json)). Local Ollama revalidation `factory-recheck-2026-11-13T18-47-54-752Z` passed two actual calls and a standalone verified export, reporting 14,131 input and 292 output tokens. This qualifies that bounded revalidation path, not arbitrary construction or model interchangeability.

The following initial transport-smoke observations are historical and do not supersede the later mission records.

```sh
node --test tests/providers.test.mjs
```

The initial nine deterministic tests cover real process cancellation/deadlines, environment
isolation, tool rejection, output and schema bounds, unknown usage, symlink output,
and the real pinned Kujo Ollama client against an HTTP fixture, including redirect
and cloud-alias denial. A separate regression hides a modified source file from
Git status with assume-unchanged and verifies that byte inventory validation still
rejects it before any provider request. The HTTP fixture test explicitly skips when setup has not
installed Ollama source; a skip does not qualify that path.

On 2026-11-13, the local `qwen2.5-coder:1.5b-instruct` model returned the exact
schema-constrained answer `factory-conformance` through this adapter, reporting
54 input and 8 output tokens in 6,823 ms. The receipt is in the private qualification
artifact `.runtime/qualification/providers/ollama-local-schema-retry.json`. A prior
bridge implementation failure is preserved separately in
`.runtime/qualification/providers/ollama-local-schema.json`. This is a single
local structured-output smoke, not software-construction or two-provider release
qualification. Later Ollama revalidation evidence is recorded above; final release acceptance still requires its current-source matrix.

The extracted Codex adapter also passed a live schema smoke on 2026-11-13 with the
existing private factory login: the exact `factory-conformance` response, 12,303
input and 17 output tokens, zero observed tool calls, and 7,695 ms. Its CLI default
model was not independently reported and remains `null`; no model name or monetary
cost is inferred. The private receipt is
`.runtime/qualification/providers/codex-schema.json`. Thus both actual provider
transports have a passing live schema smoke, while neither smoke proves the full
new-adapter mission lifecycle or the feature-complete release acceptance matrix.

Local Ollama requests explicitly set `num_ctx:65536` and reject combined prompt/schema inputs above 48,000 UTF-8 bytes before a request. This prevents inheriting an unbounded server context default; model support and actual memory use still require qualification. The receipt records requested context and input byte counts. These are transport limits, not proof that a model attended to every source token. A retained first full-review attempt used the earlier server default of 262,144 tokens (about 12.9 GB reported model memory); subsequent runs use the bounded adapter.

## Optional native SDK API providers

OpenAI, Anthropic and Gemini can be selected through the same proposal interface and role routes. They are credential-gated and **not live-qualified** by deterministic conformance. Set `FACTORY_PROVIDER` and an explicit `FACTORY_MODEL`; supply the path to an owner-only mode-0600 key file through `FACTORY_OPENAI_CREDENTIAL_FILE`, `FACTORY_ANTHROPIC_CREDENTIAL_FILE` or `FACTORY_GEMINI_CREDENTIAL_FILE`. No key belongs in mission JSON, source, prompts or chat. Setup installs pinned native SDK/driver closures. The adapter fixes HTTPS endpoints, rejects redirects and tools, bounds output/deadlines, and validates JSON against the host schema. Provider-native schema enforcement, streaming and identical provider behavior are not claimed. See [SDK-PROVIDERS.md](SDK-PROVIDERS.md) for actual contracts, immutable pins and conformance limits. Monetary ceilings remain fail-closed because none of these adapters establishes billed-cost reservation.


## Optional Hermes Nous Portal provider

Connect the local default Hermes profile with `hermes auth add nous --type oauth`.
Select `FACTORY_PROVIDER=hermes` to use `tencent/hy4-flash:free`. The adapter uses
the Hermes Python environment (override its absolute interpreter path with
`FACTORY_HERMES_PYTHON`). It uses the Hermes OAuth credential resolver directly
and submits text and a JSON Schema to the official Nous inference endpoint over
HTTPS. Only the exact free model is eligible. Missing or nonzero live catalog
pricing, a changed response model, missing or nonzero reported cost, unexpected
tool requests and invalid JSON all fail closed. Requests disable reasoning,
require a durable budget reservation, default to 1,536 output tokens and cap at
4,096. Native application workers request at most 4,096 for implementation
roles and 2,048 for other roles. The operator’s budget can lower any request.
The Hermes HTTP transport permits up to 40 seconds for a response inside the
45-second process deadline. There is no model fallback or retry inside the adapter.

Use `--budget-policy POLICY.json` with a strict mission-level and per-role call
limit for live qualification. Mission content is sent to Nous after Factory's
existing credential checks. The adapter neither launches the Hermes agent nor
requires a Discord gateway, and the local OAuth token is never serialized into
an evidence bundle.
