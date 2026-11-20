# Optional native SDK providers

`executeSDKProposal({provider, model, prompt, schema, credentialFile, timeoutMs, maxTokens, signal, parent})` returns `{output, receipt, executionEvidence}`. Failures throw a generic coded error with a sanitized `receipt` and optional evidence directory. Provider IDs are `openai`, `anthropic` and `gemini`; an explicit model is required. `sdkProviderCatalog` describes their restricted capabilities. These paths are optional and **live-unqualified** until authorized calls with actual provider credentials pass conformance and mission gates. No key absence triggers an offline success or alternate provider.

Install exact canonical source closures with `node scripts/setup-provider-sdk.mjs`; `verifySDKDependency` checks each installed package. Copies are rehashed before native execution. The bridge uses AI SDK `create_client`/`chat_completion`; the SDK owns HTTPS transport, host policy, redirect rejection and driver normalization. The factory does not implement a parallel provider HTTP client.

| Provider | Native path and fixed origin | Factory capability |
| --- | --- | --- |
| OpenAI | AI SDK OpenAI-compatible chat-completions preset, `https://api.openai.com/v1` | JSON text parsed and strictly schema-validated by host |
| Anthropic | Canonical native Messages driver, `https://api.anthropic.com` | JSON text parsed and strictly schema-validated by host |
| Gemini | Canonical native generateContent driver, `https://generativelanguage.googleapis.com/v1beta` | JSON text parsed and strictly schema-validated by host |

The host projection has no tools, streaming, embeddings, automatic retries or fallback. Model names exclude slashes/query delimiters to prevent URL path injection. A single fixed-instruction user message carries the task and schema; no repository instructions select transport, headers or permissions. Output tool calls, incomplete finishes, malformed JSON and schema failures are rejected. Provider-native structured output is not claimed: driver/schema support differs, and selected models have not been live-qualified. SDK usage/cost governance defaults are not treated as factory budget enforcement.

Credentials come only from an explicitly selected regular file owned by the current user with mode `0600` and a single link. Ancestor symlinks, final symlinks, oversized and multiline keys are refused; the opened descriptor is rechecked. No dotenv, ambient credential variables, home-directory account stores or candidate files are searched. The key is passed only to the isolated provider process environment, never command arguments, persisted input, receipts or candidate Workcells. Raw provider output/errors are not persisted. Successful output echoing the credential is rejected. The controller and same-user processes remain trusted; this is credential scoping, not an OS sandbox against a hostile account owner.

Requests are bounded to 100 KB prompt, 64 KB schema, 16,000 requested output tokens, 1 MB native response and 2 MB combined process output. A wall timeout and AbortSignal kill the process group; controller exit kills tracked children. The SDK has one attempt, redirects disabled and an exact HTTPS host allowlist. Cancellation after transmission can leave remote execution/billing uncertain; receipts do not claim the provider rolled back. There is no automatic replay.

Native drivers and SDK normalize missing token usage to zero. The bridge deliberately reads only present raw response usage fields instead: missing input/output stays null, known values remain nonnegative integers, and costs remain null. No invented total is created. Receipts retain exact source commits, harness/prompt/schema/output hashes, fixture status, timings and observed counters. `executionProof:false` means a provider receipt is not independent proof of candidate execution or release approval.

## Exact sources and compatibility decisions

- AI SDK 1.2.0: `9083c0a8dd827dabdc840ac79a8fc07844d4888b`, complete `src/ai_sdk.kujo` and provider preset import closure.
- Anthropic native driver: `eaad591b642b80aacca40db788403109c5eed2cd`, `src/provider.kujo`.
- Gemini native driver: `329942f2c2ee220141d08bf86ce1ac4bdfd417ff`, `src/provider.kujo`.

The separately inspected OpenAI Responses driver at `c57fab7d0e1b145c7f8d79c177f8407f53c2cdea` decodes only top-level `output_text`; its raw Responses output-array path is not qualified here. The SDK's canonical chat-completions preset is used instead. Gemini's provider advertises embeddings but supplies no required embedding hooks, so the factory explicitly narrows all provider capabilities to the chat-only projection before SDK validation. No upstream source is modified or missing capability silently advertised.

`executeSDKConformance` is a separate deterministic-only API. It injects an SDK-supported fixture transport, asserts the exact HTTPS origin and absence of tools, then exercises actual native request/response normalization and host validation. `executeSDKProposal` refuses fixture fields. Tests cover all three protocols, missing and present usage, private credential requirements, schema/malformed/tool/error rejection, credential echo, timeout and cancellation. Fixture outputs never establish live provider availability or qualification. No live credentials or provider calls were used for this increment.
