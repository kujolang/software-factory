import {dispatchRoot, kujoBinary} from './settings.mjs';
/** Native adapter contract tests. Representative workers, never mission evidence. */
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dispatch = dispatchRoot;
const kujo = kujoBinary();
function probe(tasks) {
  const dir = mkdtempSync(join(tmpdir(), "kujo-factory-dispatch-test-"));
  mkdirSync(join(dir, "factory"));
  mkdirSync(join(dir, "run"));
  writeFileSync(
    join(dir, "run/workflow.json"),
    JSON.stringify({
      id: "adapter-test",
      name: "Representative test only",
      tasks,
    }),
  );
  writeFileSync(
    join(dir, "factory/worker.mjs"),
    `
    import {writeFileSync} from 'node:fs';
    const [run,task] = process.argv.slice(2); const started = Date.now();
    if(task === 'fail') process.exit(7);
    if(task === 'malformed') { console.log('not-json'); process.exit(0); }
    await new Promise(r=>setTimeout(r, task === 'slow' ? 2500 : 250));
    if(task === 'descendant') writeFileSync(run+'/descendant-ran', 'unexpected');
    console.log(JSON.stringify({ok:true,data:{started,finished:Date.now(),task}}));
  `,
  );
  const result = spawnSync(kujo, ["run", join(root, "factory/dispatch.kujo")], {
    cwd: dispatch,
    encoding: "utf8",
    timeout: 20000,
    env: {
      ...process.env,
      NODE_BIN: process.execPath,
      FACTORY_ROOT: dir,
      FACTORY_RUN_DIR: join(dir, "run"),
      DISPATCH_ALLOW_ANY_OUTPUT_ROOT: "true",
    },
  });
  return {
    dir,
    result,
    clean: () => rmSync(dir, { recursive: true, force: true }),
  };
}
test("native Dispatch runs true concurrent subprocesses then joins", () => {
  const p = probe([
    { id: "plan" },
    { id: "backend", dependsOn: ["plan"], parallelSafe: true },
    { id: "frontend", dependsOn: ["plan"], parallelSafe: true },
    { id: "review", dependsOn: ["backend", "frontend"] },
  ]);
  try {
    assert.equal(p.result.status, 0, p.result.stderr + p.result.stdout);
    const summary = JSON.parse(
      readFileSync(join(p.dir, "run/dispatch-result.json")),
    );
    const state = JSON.parse(readFileSync(join(summary.runDir, "state.json")));
    assert.equal(summary.status, "completed");
    assert.ok(
      Math.max(state.data.backend.started, state.data.frontend.started) <
        Math.min(state.data.backend.finished, state.data.frontend.finished),
      "workers must actually overlap",
    );
    assert.ok(
      state.data.review.started >=
        Math.max(state.data.backend.finished, state.data.frontend.finished),
    );
    assert.equal(summary.releaseAuthority, "independent-candidate-gate");
    assert.ok(
      readFileSync(join(p.dir, "run/dispatch-events.jsonl"), "utf8").includes(
        "step_completed",
      ),
    );
  } finally {
    p.clean();
  }
});
for (const [name, tasks] of [
  ["reject traversal IDs", [{ id: "../escape" }]],
  ["reject duplicate IDs", [{ id: "same" }, { id: "same" }]],
  [
    "reject missing or forward dependencies",
    [{ id: "task", dependsOn: ["missing"] }],
  ],
  ["reject excessive timeout", [{ id: "task", timeoutMs: 3600001 }]],
])
  test(name, () => {
    const p = probe(tasks);
    try {
      assert.notEqual(p.result.status, 0);
      assert.equal(existsSync(join(p.dir, "run/dispatch-result.json")), false);
    } finally {
      p.clean();
    }
  });
for (const task of ["fail", "malformed", "slow"])
  test(`${task} worker blocks descendants`, () => {
    const p = probe([
      { id: task, timeoutMs: 1000 },
      { id: "descendant", dependsOn: [task] },
    ]);
    try {
      assert.notEqual(p.result.status, 0);
      assert.equal(existsSync(join(p.dir, "run/descendant-ran")), false);
      const summary = JSON.parse(
        readFileSync(join(p.dir, "run/dispatch-result.json")),
      );
      assert.equal(summary.ok, false);
      assert.equal(summary.status, "failed");
    } finally {
      p.clean();
    }
  });
