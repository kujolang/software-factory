import {kujoBinary} from '../factory/settings.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  readPack,
  validatePack,
  hashPack,
  readSealedPack,
  runPack,
} from "../factory/pack.mjs";
import { resolve, subset } from "../factory/pack-acceptance.mjs";
const original = readPack(new URL("../packs/converter.json", import.meta.url));
test("pack schema rejects unsafe, empty and uncovered definitions", () => {
  for (const change of [
    (p) => (p.api = []),
    (p) => (p.browser = []),
    (p) => (p.api[0].path = "https://evil.test"),
    (p) => (p.api[0].path = "//evil.test"),
    (p) => (p.api[0].command = "touch bad"),
    (p) => p.requirements.push({ id: "missing", description: "uncovered" }),
    (p) => (p.api = p.api.filter((x) => x.status !== 400)),
    (p) => (p.api = p.api.filter((x) => !x.restart)),
    (p) => (p.browser[0].value = "//evil.test"),
    (p) => (p.browser[1].action = "evaluate"),
    (p) => (p.browser = p.browser.filter((x) => x.action !== "text")),
  ]) {
    const p = structuredClone(original);
    change(p);
    assert.throws(() => validatePack(p));
  }
});
test("seal and frozen run reject changed tests", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "factory-pack-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "pack.json");
  fs.writeFileSync(file, JSON.stringify(original));
  fs.writeFileSync(
    file + ".seal.json",
    JSON.stringify({ reviewed: true, sha256: hashPack(original) }),
  );
  assert.equal(readSealedPack(file).id, original.id);
  const config = { packHash: hashPack(original) };
  assert(runPack(dir, config));
  const changed = structuredClone(original);
  changed.api[0].expect.fahrenheit = 99;
  fs.writeFileSync(file, JSON.stringify(changed));
  assert.throws(() => readSealedPack(file));
  assert.throws(() => runPack(dir, config));
});
test("references preserve JSON types and encode path segments; expectations reject wrong output", () => {
  assert.deepEqual(resolve({ id: "${item.id}" }, { item: { id: 12 } }), {
    id: 12,
  });
  assert.equal(
    resolve("/api/${item.id}", { item: { id: "a/b" } }),
    "/api/a%2Fb",
  );
  assert.throws(() => resolve("${item.__proto__}", { item: {} }));
  assert.throws(() => resolve("${missing}", {}));
  assert.throws(() => subset({ fahrenheit: 99 }, { fahrenheit: 32 }));
  subset({ id: 1, title: "hi" }, { title: "hi" });
});
test("run snapshots sealed pack and fails without release approval", (t) => {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "factory-pack-run-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "pack.json");
  fs.writeFileSync(file, JSON.stringify(original));
  fs.writeFileSync(
    file + ".seal.json",
    JSON.stringify({ reviewed: true, sha256: hashPack(original) }),
  );
  fs.writeFileSync(path.join(dir, "mission.txt"), "Build converter");
  const runtime=kujoBinary();
  const shim=path.join(dir,"kujo-shim");
  fs.writeFileSync(shim, `#!${process.execPath}\nimport {spawnSync} from 'node:child_process';const args=process.argv.slice(2);if(args.some(a=>a.endsWith('/factory/dispatch.kujo')))process.exit(0);const r=spawnSync(${JSON.stringify(runtime)},args,{stdio:'inherit'});process.exit(r.status??1);\n`,{mode:0o700});
  const cli = new URL("../factory/cli.mjs", import.meta.url);
  const r = spawnSync(
    process.execPath,
    [cli.pathname, "run", path.join(dir, "mission.txt"), "--pack", file],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        FACTORY_RUNS: dir,
        FACTORY_DISPATCH_ROOT: dir,
        KUJO_BIN: shim,
      },
      timeout: 10000,
    },
  );
  assert.equal(r.status, 1, r.stderr);
  const id = fs.readdirSync(dir).find((x) => x.startsWith("factory-"));
  const run = JSON.parse(fs.readFileSync(path.join(dir, id, "run.json")));
  assert.equal(run.status, "failed");
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,id,"artifacts/spec-binding.json"))).validation.valid,true);
  assert.ok(fs.existsSync(path.join(dir,id,"dispatch-process.json")), "Dispatch ran after real Spec validation");
  assert.deepEqual(runPack(path.join(dir, id), run), original);
});
test("retry copies its frozen pack and rejects changed pack evidence", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "factory-pack-retry-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, "factory-source");
  fs.mkdirSync(path.join(source, "application/public"), { recursive: true });
  fs.mkdirSync(path.join(source, "artifacts"));
  fs.writeFileSync(
    path.join(source, "application/server.mjs"),
    "export const fixture=true",
  );
  fs.writeFileSync(
    path.join(source, "application/public/index.html"),
    "<title>fixture</title>",
  );
  fs.writeFileSync(path.join(source, "events.jsonl"), "");
  fs.writeFileSync(path.join(source, "pack.json"), JSON.stringify(original));
  fs.writeFileSync(
    path.join(source, "run.json"),
    JSON.stringify({
      id: "factory-source",
      status: "failed",
      mission: "Converter",
      packHash: hashPack(original),
      packId: original.id,
    }),
  );
  const runtime=kujoBinary();
  const shim=path.join(dir,"kujo-shim");
  fs.writeFileSync(shim, `#!${process.execPath}\nimport {spawnSync} from 'node:child_process';const args=process.argv.slice(2);if(args.some(a=>a.endsWith('/factory/dispatch.kujo')))process.exit(0);const r=spawnSync(${JSON.stringify(runtime)},args,{stdio:'inherit'});process.exit(r.status??1);\n`,{mode:0o700});
  const call = () =>
    spawnSync(
      process.execPath,
      [
        new URL("../factory/cli.mjs", import.meta.url).pathname,
        "retry",
        "factory-source",
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          FACTORY_RUNS: dir,
          FACTORY_DISPATCH_ROOT: dir,
          KUJO_BIN: process.execPath,
        },
        timeout: 10000,
      },
    );
  const result = call();
  assert.equal(result.status, 1, result.stderr);
  const id = fs.readdirSync(dir).find((x) => x.startsWith("factory-retry-"));
  assert(id);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(dir, id, "pack.json"))),
    original,
  );
  const changed = structuredClone(original);
  changed.contract += " Changed";
  fs.writeFileSync(path.join(source, "pack.json"), JSON.stringify(changed));
  const rejected = call();
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /Run pack hash mismatch/);
});
