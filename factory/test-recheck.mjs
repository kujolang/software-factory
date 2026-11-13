import {kujoBinary} from './settings.mjs';
/** CLI import tests use a zero-exit transport fixture, never a live model. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { digest, events, json } from "./core.mjs";

const cli = path.join(import.meta.dirname, "cli.mjs");
function fixture(t) {
  const base = fs.mkdtempSync(
    path.join(fs.realpathSync(os.tmpdir()), "factory-recheck-contract-"),
  );
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  // Only Dispatch is a zero-exit transport fixture; accounting uses pinned Kujo.
  const shim=path.join(base,"kujo-shim");
  fs.writeFileSync(shim,`#!${process.execPath}\nimport {spawnSync} from 'node:child_process';const args=process.argv.slice(2);if(args.some(a=>a.endsWith('/factory/dispatch.kujo')))process.exit(0);const r=spawnSync(${JSON.stringify(kujoBinary())},args,{stdio:'inherit'});process.exit(r.status??1);\n`,{mode:0o700});
  function call(id, verb = "recheck") {
    return spawnSync(process.execPath, [cli, verb, id], {
      encoding: "utf8",
      timeout: 30000,
      env: {
        ...process.env,
        FACTORY_RUNS: base,
        FACTORY_DISPATCH_ROOT: base,
        KUJO_BIN: shim,
      },
    });
  }
  function source(name = "factory-source", status = "completed") {
    const dir = path.join(base, name);
    fs.mkdirSync(path.join(dir, "application"), { recursive: true });
    fs.mkdirSync(path.join(dir, "artifacts"));
    fs.writeFileSync(
      path.join(dir, "application/server.mjs"),
      "export const fixture = true;\n",
    );
    fs.mkdirSync(path.join(dir, "application/public"));
    fs.writeFileSync(
      path.join(dir, "application/public/index.html"),
      "<!doctype html><title>Fixture</title>",
    );
    const hash = digest(path.join(dir, "application"));
    const write = (file, value) =>
      fs.writeFileSync(path.join(dir, file), JSON.stringify(value));
    write("run.json", {
      id: name,
      status,
      mission: "Representative recheck fixture",
    });
    if (status === "completed") {
      write("artifacts/release.json", {
        status: "approved-local-candidate",
        hash,
        buildHash: hash,
        reviewHash: hash,
      });
      write("artifacts/verification.json", { ok: true, hash });
      fs.writeFileSync(
        path.join(dir, "events.jsonl"),
        JSON.stringify({ type: "release.approved", data: { hash } }) + "\n",
      );
    } else {
      fs.writeFileSync(
        path.join(dir, "events.jsonl"),
        JSON.stringify({
          type: "mission.failed",
          summary: "Representative failed fixture",
        }) + "\n",
      );
    }
    return { dir, hash, name };
  }
  return { base, call, source };
}
for (const id of [
  "../escape",
  path.join(os.tmpdir(), "arbitrary-run"),
  "invalid.id",
]) {
  test(`recheck rejects non-ID input ${id}`, (t) => {
    const f = fixture(t),
      before = fs.readdirSync(f.base);
    const result = f.call(id);
    assert.notEqual(result.status, 0);
    assert.deepEqual(fs.readdirSync(f.base), before);
  });
}
for (const [name, mutate] of [
  [
    "unfinished source",
    ({ dir }) => {
      const p = path.join(dir, "run.json"),
        run = json(p);
      run.status = "running";
      fs.writeFileSync(p, JSON.stringify(run));
    },
  ],
  [
    "stale candidate",
    ({ dir }) =>
      fs.appendFileSync(path.join(dir, "application/server.mjs"), "// changed"),
  ],
  [
    "missing approval event",
    ({ dir }) => fs.writeFileSync(path.join(dir, "events.jsonl"), ""),
  ],
  [
    "candidate symlink",
    ({ dir }) =>
      fs.symlinkSync(dir, path.join(dir, "application/escape"), "dir"),
  ],
]) {
  test(`recheck rejects ${name} before creating a run`, (t) => {
    const f = fixture(t),
      source = f.source();
    mutate(source);
    const before = fs.readdirSync(f.base),
      result = f.call(source.name);
    assert.notEqual(result.status, 0);
    assert.deepEqual(fs.readdirSync(f.base), before);
  });
}
test("recheck imports exact approved source and cannot infer release from transport success", (t) => {
  const f = fixture(t),
    source = f.source(),
    result = f.call(source.name);
  assert.equal(result.status, 1, result.stderr);
  const messages = result.stdout.trim().split("\n").map(JSON.parse);
  const dir = messages[0].directory,
    run = json(path.join(dir, "run.json"));
  assert.notEqual(run.id, source.name);
  assert.equal(run.sourceRun, source.name);
  assert.equal(run.sourceHash, source.hash);
  assert.equal(digest(path.join(dir, "application")), source.hash);
  assert.deepEqual(
    run.tasks.map((task) => task.id),
    ["verify", "release"],
  );
  assert.deepEqual(run.tasks[0].dependencies, []);
  assert.deepEqual(run.tasks[1].dependencies, ["verify"]);
  assert.deepEqual(run.stages, ["Verification", "Release"]);
  assert.equal(run.tasks[0].handoffFrom, "release-verifier");
  assert.equal(run.status, "failed");
  assert.equal(run.kind, "revalidation");
  const list = events(dir);
  assert.match(list[0].summary, /no new software construction/);
  assert.equal(list[0].data.sourceHash, source.hash);
  assert.ok(!list.some((event) => event.type === "release.approved"));
  const receipt = json(path.join(dir, "artifacts/source-import.json"));
  assert.equal(receipt.sourceRun, source.name);
  assert.equal(receipt.importedHash, source.hash);
  assert.equal(json(path.join(dir, "dispatch-process.json")).code, 0);
  assert.equal(messages.at(-1).status, "failed");
});

for (const id of [
  "../escape",
  path.join(os.tmpdir(), "arbitrary-run"),
  "invalid.id",
]) {
  test(`retry rejects non-ID input ${id}`, (t) => {
    const f = fixture(t),
      before = fs.readdirSync(f.base);
    assert.notEqual(f.call(id, "retry").status, 0);
    assert.deepEqual(fs.readdirSync(f.base), before);
  });
}
for (const status of ["completed", "running", "unknown"]) {
  test(`retry rejects ${status} source status`, (t) => {
    const f = fixture(t),
      source = f.source("factory-source", status);
    const before = fs.readdirSync(f.base);
    assert.notEqual(f.call(source.name, "retry").status, 0);
    assert.deepEqual(fs.readdirSync(f.base), before);
  });
}
for (const file of ["server.mjs", "public/index.html"]) {
  test(`retry rejects missing required ${file}`, (t) => {
    const f = fixture(t),
      source = f.source("factory-source", "failed");
    fs.unlinkSync(path.join(source.dir, "application", file));
    const before = fs.readdirSync(f.base);
    assert.notEqual(f.call(source.name, "retry").status, 0);
    assert.deepEqual(fs.readdirSync(f.base), before);
  });
}
test("retry rejects candidate symlink without creating a run", (t) => {
  const f = fixture(t),
    source = f.source("factory-source", "failed");
  fs.symlinkSync(
    source.dir,
    path.join(source.dir, "application/escape"),
    "dir",
  );
  const before = fs.readdirSync(f.base);
  assert.notEqual(f.call(source.name, "retry").status, 0);
  assert.deepEqual(fs.readdirSync(f.base), before);
});
test("retry preserves failed source and imports unverified bytes without inheriting approval", (t) => {
  const f = fixture(t),
    source = f.source("factory-source", "failed");
  const before = digest(source.dir);
  const result = f.call(source.name, "retry");
  assert.equal(result.status, 1, result.stderr);
  const messages = result.stdout.trim().split("\n").map(JSON.parse);
  const dir = messages[0].directory,
    run = json(path.join(dir, "run.json"));
  assert.match(run.id, /^factory-retry-/);
  assert.equal(messages[0].kind, "retry-verification");
  assert.equal(run.kind, "retry-verification");
  assert.equal(run.sourceApproved, false);
  assert.equal(run.sourceRun, source.name);
  assert.equal(run.sourceHash, source.hash);
  assert.equal(digest(path.join(dir, "application")), source.hash);
  assert.equal(
    digest(source.dir),
    before,
    "failed source evidence must remain unchanged",
  );
  assert.deepEqual(
    run.tasks.map((t) => t.id),
    ["verify", "release"],
  );
  assert.deepEqual(run.tasks[0].dependencies, []);
  assert.equal(run.tasks[0].handoffFrom, "factory-controller");
  assert.equal(
    run.status,
    "failed",
    "transport exit zero is not release approval",
  );
  assert.equal(json(path.join(dir, "dispatch-process.json")).code, 0);
  const list = events(dir);
  assert.match(
    list[0].summary,
    /unverified candidate.*import grants no approval/,
  );
  assert.ok(
    list.some(
      (e) => e.type === "candidate.imported" && e.data.sourceApproved === false,
    ),
  );
  assert.ok(!list.some((e) => e.type === "release.approved"));
  const receipt = json(path.join(dir, "artifacts/source-import.json"));
  assert.equal(receipt.operation, "retry-verification");
  assert.equal(receipt.sourceApproved, false);
  assert.equal(receipt.importedHash, source.hash);
  assert.ok(fs.existsSync(path.join(dir, "artifacts/source-failure.json")));
  for (const name of [
    "source-release.json",
    "source-verification.json",
    "release.json",
    "verification.json",
  ])
    assert.equal(fs.existsSync(path.join(dir, "artifacts", name)), false);
});
