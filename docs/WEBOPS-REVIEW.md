# Retained-evidence WebOps review

`node bin/software-factory.mjs webops-review INPUT.json` runs canonical `webops.site-qa-operator` followed by independent `chain.code-reviewer`, sequenced by native Dispatch. It produces an inert advisory report with RunLedger accounting and retained CaseFile failures. It never visits a website, invokes candidate code, edits files in the target run, or grants software approval.

Input is a closed object:

```json
{"schema":"kujo.factory.webops-review-input/v1","targetRun":"/absolute/path/to/prior/factory/run","mission":"Review the retained local Lens sample findings and identify bounded follow-up recommendations."}
```

The target must contain valid `artifacts/lens.json` and its full referenced native Lens/Workcell records, both screenshot files and a successful cleanup record. Existing `verifyLensBinding` validates source hashes, native report consistency, image identity, rootless/seccomp/resource controls and artifact hashes. The controller copies only that fixed closure into a private snapshot, bounded to 32 files and 1.4 MB of serialized evidence, and revalidates the copy at every review stage. Symlinks, hardlinks, arbitrary evidence paths, changed records and failed cleanup are rejected.

The installed canonical AGENT.md, SKILL.md, manifests and input/output schemas remain authoritative guidance. The controller provides the exact canonical WebOps inputs and requires every canonical output string through the restricted proposal envelope. OBSERVE permission, no tools and no file effects are enforced by the host. A specialist can propose recommendations, but the independent reviewer must return pass before the advisory artifact is frozen. Model output is a judgment, never a deterministic measurement or authorization.

This path uses the role's documented degraded mode: SiteProbe crawl evidence is unavailable. Coverage is only the historical local Lens sample and its recorded time. Text-only providers receive native findings and screenshot identities, not image pixels; they cannot claim a new visual inspection. There is no present-day production check, complete crawl, WCAG certification, security assurance, publication, deployment, or media operation.

`reviewed-webops.json` binds source, role outputs, accounting and the retained evidence inventory. `result.json` always reports `softwareReleaseApproval: false` and `deploymentAuthorized: false`. The read-only Factory Floor and bounded MCP mission reader expose family `webops`. Public commands never expose the deterministic test fixture seam.

Tests: `node --test tests/webops-review.test.mjs tests/mission-observer.test.mjs tests/mcp.test.mjs`. Unit review fixtures are explicitly synthetic; native Dispatch, RunLedger and failure CaseFile paths execute for real. A separately recorded live model review qualifies real provider use without claiming new browser execution.
