import {verifyRunReleaseRecords} from './evidence.mjs';
import { runPack } from "./pack.mjs";
import { agentsRoot } from "./settings.mjs";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { json, save, events, digest } from "./core.mjs";
export function audit(dir) {
  const run = json(path.join(dir, "run.json")),
    list = events(dir);
  const pack = runPack(dir, run);
  if (pack) {
    const v = json(path.join(dir, "artifacts/verification.json")),
      r = json(path.join(dir, "artifacts/release.json"));
    assert.equal(v.packHash, run.packHash);
    assert.equal(r.packHash, run.packHash);
    assert.equal(v.acceptance.packHash, run.packHash);
    assert.equal(r.checks.packHash, run.packHash);
  }
  const checks = [];
  if(run.accountabilityRequired){
    verifyRunReleaseRecords(dir);
    const account=json(path.join(dir,'artifacts/mission-accountability.json'));
    assert.equal(account.ok,true);assert.equal(account.status,'pass');assert.equal(account.runId,run.id);
    assert.equal(account.candidateHash,digest(path.join(dir,'application')));
    assert.equal(run.status,'completed');
  }
  const check = (name, fn) => {
    fn();
    checks.push(name);
  };
  const eventValidator = addFormats(new Ajv2020({ strict: false })).compile(
    json(path.join(import.meta.dirname, "event.schema.json")),
  );
  check("versioned event schema", () => {
    for (const e of list)
      assert.ok(eventValidator(e), JSON.stringify(eventValidator.errors));
  });
  check("contiguous unique event sequence", () => {
    assert.equal(new Set(list.map((e) => e.id)).size, list.length);
    list.forEach((e, i) => {
      assert.equal(e.seq, i + 1);
      assert.equal(e.runId, run.id);
      assert.ok(Number.isFinite(Date.parse(e.timestamp)));
      if (i)
        assert.ok(Date.parse(e.timestamp) >= Date.parse(list[i - 1].timestamp));
    });
  });
  check("references resolve", () => {
    for (const e of list)
      for (const p of [...(e.artifacts || []), ...(e.evidence || [])]) {
        assert.ok(!path.isAbsolute(p) && !p.split("/").includes(".."));
        assert.ok(fs.statSync(path.join(dir, p)).isFile(), p);
      }
  });
  check("dependencies precede task execution", () => {
    for (const task of run.tasks) {
      const start = list.find(
        (e) => e.taskId === task.id && e.type === "task.started",
      );
      assert.ok(start);
      for (const dep of task.dependencies) {
        const done = list.find(
          (e) => e.taskId === dep && e.type === "task.completed",
        );
        assert.ok(done && done.seq < start.seq, dep);
      }
    }
  });
  const intervals = ["backend", "frontend"].map((id) => ({
    id,
    start: list.find((e) => e.taskId === id && e.type === "agent.started"),
    end: list.find((e) => e.taskId === id && e.type === "agent.completed"),
  }));
  let overlapMs = null;
  if (!run.sourceRun) {
    check("real concurrent implementation intervals", () => {
      assert.ok(intervals.every((i) => i.start && i.end));
      overlapMs =
        Math.min(...intervals.map((i) => Date.parse(i.end.timestamp))) -
        Math.max(...intervals.map((i) => Date.parse(i.start.timestamp)));
      assert.ok(overlapMs > 0);
    });
  }
  const schema = json(path.join(agentsRoot, "schemas/handoff.schema.json"));
  const validate = new Ajv2020({ strict: false }).compile(schema);
  check("canonical handoff schema", () => {
    for (const p of fs
      .readdirSync(path.join(dir, "artifacts"))
      .filter((p) => p.endsWith("-handoff.json"))) {
      const h = json(path.join(dir, "artifacts", p));
      assert.ok(validate(h), JSON.stringify(validate.errors));
    }
  });
  check("release exact reviewed and tested bytes", () => {
    const v = json(path.join(dir, "artifacts/verification.json")),
      r = json(path.join(dir, "artifacts/release.json"));
    assert.equal(v.hash, r.hash);
    assert.equal(r.hash, digest(path.join(dir, "application")));
    assert.equal(r.hash, digest(path.join(dir, "build")));
    assert.equal(json(path.join(dir, "artifacts", v.review)).hash, r.hash);
    assert.equal(r.deploymentAuthorized, false);
    assert.ok(list.some((e) => e.type === "release.approved"));
  });
  const receipts = fs
    .readdirSync(path.join(dir, "artifacts"))
    .filter((p) => p.endsWith("-receipt.json"))
    .map((p) => json(path.join(dir, "artifacts", p)));
  const usage = { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0 };
  for (const r of receipts)
    for (const u of r.usage || [])
      for (const k of Object.keys(usage)) usage[k] += u[k] || 0;
  const failures = list.filter((e) => e.type === "verification.failed").length;
  const result = {
    ok: true,
    checks,
    runId: run.id,
    events: list.length,
    overlapMs,
    providerCalls: receipts.length,
    usage: receipts.some(r=>r.usageKnown===false||r.usage==null) ? null : Object.fromEntries(Object.entries(usage).map(([key,total])=>[key,receipts.some(r=>(r.usage||[]).some(u=>!Number.isFinite(u[key])))?null:total])),
    observedUsageSubtotal: usage,
    cost: null,
    verificationFailures: failures,
    corrections: list.filter((e) => e.type === "correction.requested").length,
    elapsedMs: Date.parse(run.finishedAt) - Date.parse(run.startedAt),
    replay: "ordered original timestamps; no interpolation of events",
    roles: [...new Set(receipts.map((r) => r.role))],
  };
  save(path.join(dir, "audit.json"), result);
  return result;
}
if (process.argv[1] === import.meta.filename)
  console.log(JSON.stringify(audit(path.resolve(process.argv[2])), null, 2));
