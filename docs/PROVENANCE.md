# Source and demo provenance

Software Factory was extracted from `kujolang/agent-city`, branch `codex/software-factory`, source commit `58455d4419379f38eedbb4c5b3419e8ca41bb340`. The original live mission, hostile probes, narration and video remain in that repository as immutable historical evidence. No historical release approval is transferred to this checkout.

- [Original factory source](https://github.com/kujolang/agent-city/tree/58455d4419379f38eedbb4c5b3419e8ca41bb340/factory)
- [Original verification report](https://github.com/kujolang/agent-city/blob/58455d4419379f38eedbb4c5b3419e8ca41bb340/docs/FACTORY-ISOLATION-REPORT.md)
- [Original narrated demo](https://github.com/kujolang/agent-city/blob/58455d4419379f38eedbb4c5b3419e8ca41bb340/evidence/factory-isolation/media/final/factory-narrated.mp4)

The extracted runtime includes controller, observer, native Dispatch adapter, Workcell policy/image sources, tests and the current acceptance contract. Video-production tooling and large historical evidence bundles are not installation dependencies.

`examples/issue-tracker` comes from the original final approved candidate, run `factory-retry-2026-11-12T23-52-20-851Z`. It is included only as a representative, untrusted smoke-test fixture. Its historical documentation is not current approval; the standalone smoke always executes fresh controller-owned tests inside Workcell.

Canonical role contracts, Dispatch and Workcell are fetched at the public commits in `sources.lock.json`; they are not copied engines. Kujo and Codex runtime versions are locked npm dependencies. The observer font retains its license in `factory/web/assets/`.
