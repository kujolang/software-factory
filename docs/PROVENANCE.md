# Source and demo provenance

Software Factory was extracted from `kujolang/agent-city`, branch `codex/software-factory`, source commit `58455d4419379f38eedbb4c5b3419e8ca41bb340`. The original live mission, hostile probes, narration and video remain in that repository as immutable historical evidence. Past release approval does not approve this checkout.

- [Original factory source](https://github.com/kujolang/agent-city/tree/58455d4419379f38eedbb4c5b3419e8ca41bb340/factory)
- [Original verification report](https://github.com/kujolang/agent-city/blob/58455d4419379f38eedbb4c5b3419e8ca41bb340/docs/FACTORY-ISOLATION-REPORT.md)
- [Original narrated demo](https://github.com/kujolang/agent-city/blob/58455d4419379f38eedbb4c5b3419e8ca41bb340/evidence/factory-isolation/media/final/factory-narrated.mp4)

The extracted runtime includes the controller, observer, native Dispatch adapter, Workcell policy and image, tests, and issue-tracker contract. Software packs now add product-specific contracts and tests without changing that controller. Video-production tooling and large historical evidence bundles are not installation dependencies.

`examples/issue-tracker` comes from the original final approved candidate, run `factory-retry-2026-11-12T23-52-20-851Z`. It is included only as a representative, untrusted smoke-test fixture. Its historical documentation is not current approval; the standalone smoke always executes fresh controller-owned tests inside Workcell.

Canonical role contracts, Dispatch and Workcell are fetched at the public commits in `sources.lock.json`; the factory does not maintain copies of those engines. Kujo and Codex runtime versions are locked npm dependencies. The observer font retains its license in `factory/web/assets/`.

The README plays the final narrated demo with the Kujo bumper through a GitHub video attachment. `docs/media/software-factory-demo.mp4` retains the unchanged source copy. Its SHA-256 is `4046393dc1e7c836ee8b944a6006ab81c8ea28aeae1c9a8a387581104ff0288e`. The retained preview image is the existing one-second frame from that video. This historical issue-tracker demonstration predates software packs.

Inline video attachment: https://github.com/user-attachments/assets/1b85bfd6-5fb6-4d32-a421-22546934389f. Uploaded directly to this repository through GitHub’s media upload endpoint; no YouTube account or issue/comment was needed.
