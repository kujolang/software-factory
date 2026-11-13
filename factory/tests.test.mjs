import {evaluateVerification} from './evaluation.mjs';
import {startMissionAccounting} from './lifecycle.mjs';
import {controllerProvenance} from './provenance.mjs';
import {dependency} from './settings.mjs';
import test from "node:test";
import { productDocs } from "./product-docs.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { materialize, digest, event, events, command } from "./core.mjs";

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "factory-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test("worker proposal cannot write controller checks or release receipts", (t) => {
  const dir = fixture(t);
  const allowed = (p) => ["server.mjs", "db.mjs"].includes(p);
  for (const target of [
    "../acceptance.mjs",
    "../artifacts/release.json",
    "/tmp/factory-escape",
    "public/../server.mjs",
    "server.mjs/../../release.json",
    "..\\release.json",
  ]) {
    assert.throws(() =>
      materialize(
        dir,
        { files: [{ path: target, content: "bypass" }] },
        allowed,
      ),
    );
  }
  assert.deepEqual(fs.readdirSync(dir), []);
});

test("all proposed paths validate before any artifact write", (t) => {
  const dir = fixture(t);
  assert.throws(() =>
    materialize(
      dir,
      {
        files: [
          { path: "server.mjs", content: "valid" },
          { path: "../release.json", content: "invalid" },
        ],
      },
      (p) => p === "server.mjs",
    ),
  );
  assert.equal(fs.existsSync(path.join(dir, "server.mjs")), false);
});

test("proposal paths cannot follow a parent directory symlink outside candidate", (t) => {
  const dir = fixture(t),
    app = path.join(dir, "app"),
    outside = path.join(dir, "outside");
  fs.mkdirSync(app);
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(app, "public"), "dir");
  assert.throws(() =>
    materialize(
      app,
      { files: [{ path: "public/app.js", content: "escape" }] },
      (p) => p === "public/app.js",
    ),
  );
  assert.equal(fs.existsSync(path.join(outside, "app.js")), false);
});

test("proposal paths cannot overwrite a final symlink", (t) => {
  const dir = fixture(t),
    target = path.join(dir, "protected");
  fs.writeFileSync(target, "original");
  fs.symlinkSync(target, path.join(dir, "server.mjs"));
  assert.throws(() =>
    materialize(
      dir,
      { files: [{ path: "server.mjs", content: "escape" }] },
      (p) => p === "server.mjs",
    ),
  );
  assert.equal(fs.readFileSync(target, "utf8"), "original");
});

test("candidate digest changes when reviewed bytes or artifact names change", (t) => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, "server.mjs"), "one");
  const before = digest(dir);
  fs.writeFileSync(path.join(dir, "server.mjs"), "two");
  assert.notEqual(digest(dir), before);
  fs.writeFileSync(path.join(dir, "server.mjs"), "one");
  fs.renameSync(path.join(dir, "server.mjs"), path.join(dir, "db.mjs"));
  assert.notEqual(digest(dir), before);
});

test("journal records retain exact ordered event identity and timestamp on reread", (t) => {
  const dir = fixture(t);
  const original = [
    event(dir, "task.started", { taskId: "backend", summary: "start" }),
    event(dir, "verification.failed", { taskId: "verify", summary: "failure" }),
    event(dir, "correction.requested", {
      taskId: "verify",
      summary: "correct",
    }),
    event(dir, "verification.passed", { taskId: "verify", summary: "pass" }),
  ];
  assert.deepEqual(events(dir), original);
  assert.deepEqual(
    events(dir).map((e) => e.seq),
    [1, 2, 3, 4],
  );
  assert.equal(new Set(original.map((e) => e.id)).size, 4);
  assert.ok(original.every((e) => Number.isFinite(Date.parse(e.timestamp))));
});

test("parallel processes append unique sequential journal records without loss", async (t) => {
  const dir = fixture(t);
  const moduleUrl = pathToFileURL(
    path.join(import.meta.dirname, "core.mjs"),
  ).href;
  const source = `import {event} from ${JSON.stringify(moduleUrl)}; for(let i=0;i<12;i++)event(process.argv[1],'task.progress',{taskId:process.argv[2],summary:String(i)});`;
  const results = await Promise.all(
    ["backend", "frontend", "qa"].map((id) =>
      command(
        process.execPath,
        ["--input-type=module", "-e", source, dir, id],
        { timeout: 10000 },
      ),
    ),
  );
  assert.ok(
    results.every((r) => r.code === 0),
    JSON.stringify(results),
  );
  const journal = events(dir);
  assert.equal(journal.length, 36);
  assert.deepEqual(
    journal.map((e) => e.seq),
    Array.from({ length: 36 }, (_, i) => i + 1),
  );
  assert.equal(new Set(journal.map((e) => e.id)).size, 36);
});

test("command deadline stops an otherwise unbounded child", async () => {
  const r = await command(
    process.execPath,
    ["-e", "setInterval(()=>{},1000)"],
    { timeout: 100 },
  );
  assert.equal(r.reason, "timeout");
  assert.notEqual(r.code, 0);
  assert.ok(r.durationMs < 5000);
});

test("command output cap terminates an unbounded producer", async () => {
  const r = await command(
    process.execPath,
    ["-e", "setInterval(()=>process.stdout.write('x'.repeat(8192)),1)"],
    { timeout: 3000, maxBytes: 10000 },
  );
  assert.equal(r.reason, "output_limit");
  assert.notEqual(r.code, 0);
  assert.ok(r.durationMs < 3000);
});

test("release worker rejects generated source that exits successfully before assertions", async (t) => {
  const dir = fixture(t),
    app = path.join(dir, "application"),
    artifacts = path.join(dir, "artifacts"),
    bin = path.join(dir, "bin"),
    role = path.join(dir, "agents/chain-of-command/release-verifier");
  for (const p of [app, artifacts, bin, role])
    fs.mkdirSync(p, { recursive: true });
  fs.writeFileSync(path.join(app, "server.mjs"), "process.exit(0);\n");
  fs.mkdirSync(path.join(app, "public"));
  fs.writeFileSync(path.join(app, "public/app.js"), "export {};\n");
  productDocs(app);
  fs.writeFileSync(
    path.join(artifacts, "browser.json"),
    JSON.stringify({ ok: true, checks: ["offline fixture only"] }),
  );
  fs.writeFileSync(
    path.join(artifacts, "review-binding.json"),
    JSON.stringify({ hash: digest(app), verdict: "pass" }),
  );
  fs.writeFileSync(path.join(role, "AGENT.md"), "Fixture release reviewer");
  fs.writeFileSync(path.join(role, "SKILL.md"), "Return a review.");
  fs.writeFileSync(
    path.join(artifacts, "verification.json"),
    JSON.stringify({
      ok: true,
      hash: digest(app),
      review: "review-binding.json",
      acceptance: { code: 0, browser: { report: "artifacts/browser.json" } },
    }),
  );
  fs.writeFileSync(
    path.join(dir, "run.json"),
    JSON.stringify({
      id:path.basename(dir),accountabilityRequired:true,
      mission: "Controlled gate regression",
      workspace: dir,
      agentsRoot: dependency("kujo-agents"),
      tasks: [
        {
          id: "release",
          agentId: "release-verifier",
          title: "Verify fixture",
          dependencies: [],
        },
      ],
    }),
  );
  const read=name=>JSON.parse(fs.readFileSync(path.join(artifacts,name)));
  const evaluation=await evaluateVerification({dir,sourceHash:digest(app),verification:read('verification.json'),review:read('review-binding.json'),browser:read('browser.json')});
  fs.writeFileSync(path.join(artifacts,'evaluation.json'),JSON.stringify(evaluation));
  await startMissionAccounting(dir,{id:path.basename(dir)},controllerProvenance(),{provider:'offline-fixture',model:'none'});
  // Offline provider fixture explicitly scoped to this test; no live model call.
  const provider = `#!${process.execPath}\nimport fs from 'node:fs'; const args=process.argv.slice(2);fs.writeFileSync(args[args.indexOf('-o')+1],JSON.stringify({summary:'Fixture only',verdict:'pass',issues:[],files:[]}));console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:0,output_tokens:0}}));\n`;
  fs.writeFileSync(path.join(bin, "codex"), provider, { mode: 0o700 });
  const r = await command(
    process.execPath,
    [path.join(import.meta.dirname, "worker.mjs"), dir, "release"],
    {
      timeout: 30000,
      env: {
        PATH: bin + path.delimiter + process.env.PATH,
        DOCKER_HOST: "unix:///tmp/factory-test-missing-engine.sock",
      },
    },
  );
  assert.notEqual(r.code, 0, JSON.stringify(r));
  assert.equal(fs.existsSync(path.join(artifacts, "release.json")), false);
  const journal = events(dir);
  assert.ok(
    !journal.some(
      (e) => e.type === "agent.completed" && e.agentId === "release-verifier",
    ),
    "missing isolated build blocks before reviewer",
  );
  assert.ok(journal.some((e) => e.type === "release.blocked" && /docker info failed/.test(e.summary)), JSON.stringify(journal));
  assert.ok(!journal.some((e) => e.type === "release.approved"));
});

test("missing engine blocks candidate stdout forgery without host execution", async (t) => {
  const dir = fixture(t);
  fs.writeFileSync(
    path.join(dir, "server.mjs"),
    `console.log(JSON.stringify({ok:true,checks:27,persistence:true,validation:true,cascade:true,activity:true}));process.exit(0);\n`,
  );
  const r = await command(
    process.execPath,
    [path.join(import.meta.dirname, "acceptance.mjs"), dir],
    {
      timeout: 10000,
      env: { DOCKER_HOST: "unix:///tmp/factory-test-missing-engine.sock" },
    },
  );
  assert.notEqual(r.code, 0);
  assert.equal(r.out.trim(), "");
  assert.match(r.err, /docker info failed/);
});

test("missing engine blocks candidate assertion mutation without host execution", async (t) => {
  const dir = fixture(t);
  // Intentionally bad fixture: mutate built-in assert in the app process and
  // serve a false-positive health response. Parent must still reject the 500.
  fs.writeFileSync(
    path.join(dir, "server.mjs"),
    `import assert from 'node:assert/strict';import {createServer as server} from 'node:http';assert.equal=()=>{};assert.ok=()=>{};export function createServer(){return server((q,r)=>{r.writeHead(500,{'Content-Type':'application/json'});r.end('{}');});}\n`,
  );
  const r = await command(
    process.execPath,
    [path.join(import.meta.dirname, "acceptance.mjs"), dir],
    {
      timeout: 10000,
      env: { DOCKER_HOST: "unix:///tmp/factory-test-missing-engine.sock" },
    },
  );
  assert.notEqual(r.code, 0);
  assert.equal(r.out.trim(), "");
  assert.match(r.err, /docker info failed/);
});

for (const [signal, exitCode] of [["SIGTERM", 143], ["SIGINT", 130]])
test(`${signal} to worker cleans up its active command process group`, async (t) => {
  const { spawn } = await import("node:child_process");
  const dir = fixture(t),
    pidFile = path.join(dir, "pid"),
    exitObservation = path.join(dir, "exit-observation.json"),
    resumed = path.join(dir, "resumed");
  const moduleUrl = pathToFileURL(
    path.join(import.meta.dirname, "core.mjs"),
  ).href;
  const childCode = `require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setInterval(()=>{},1000);`;
  const source = `import {command} from ${JSON.stringify(moduleUrl)};import fs from "node:fs";process.once("exit",()=>{let alive=false;try{process.kill(Number(fs.readFileSync(${JSON.stringify(pidFile)},"utf8")),0);alive=true}catch{}fs.writeFileSync(${JSON.stringify(exitObservation)},JSON.stringify({alive}));});await command(process.execPath,['-e',${JSON.stringify(childCode)}],{timeout:10000});fs.writeFileSync(${JSON.stringify(resumed)},"unexpected continuation");`;
  const parent = spawn(
    process.execPath,
    ["--input-type=module", "-e", source],
    { stdio: "ignore" },
  );
  t.after(() => {
    try {
      parent.kill("SIGKILL");
    } catch {}
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 100 && !fs.existsSync(pidFile); i++) await sleep(20);
  assert.ok(fs.existsSync(pidFile), "child started");
  const pid = Number(fs.readFileSync(pidFile, "utf8"));
  const exited = new Promise((r) => parent.once("exit", r));
  parent.kill(signal);
  assert.equal(await exited, exitCode);
  assert.equal(fs.existsSync(resumed),false,"signal cleanup cannot resume mission work");
  assert.deepEqual(JSON.parse(fs.readFileSync(exitObservation,"utf8")),{alive:false},"worker reaps its child before exiting");
  let alive = true;
  for (let i = 0; i < 100; i++) {
    try {
      process.kill(pid, 0);
    } catch {
      alive = false;
      break;
    }
    await sleep(20);
  }
  assert.equal(alive, false, "active child terminated after worker signal");
});
