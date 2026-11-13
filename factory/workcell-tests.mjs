// Live adversarial probes: executes only inside Workcell, never on the host.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startIsolatedApp } from "./workcell.mjs";
const evidence = path.resolve(
  process.argv[2] || "evidence/factory/workcell-adversarial",
);
fs.mkdirSync(evidence, { recursive: true });
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "factory-host-canary-"));
const canary = path.join(scratch, "canary");
fs.writeFileSync(canary, "unchanged-secret-canary");
const app = path.join(scratch, "candidate");
fs.mkdirSync(app);
fs.mkdirSync(path.join(app, "public"));
fs.writeFileSync(path.join(app, "public/app.js"), "");
const source = `import fs from 'node:fs';import http from 'node:http';import net from 'node:net';
const denied=fn=>{try{fn();return false;}catch{return true;}};
export function createServer(){return http.createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.url==='/api/health')return res.end('{"ok":true}');if(req.url==='/flood'){process.stdout.write('x'.repeat(300000));return res.end('{}');}if(req.url==='/oversize')return res.end('x'.repeat(600000));const result={uid:process.getuid(),hostRead:denied(()=>fs.readFileSync(${JSON.stringify(canary)})),hostWrite:denied(()=>fs.writeFileSync(${JSON.stringify(canary)},'modified')),hostEnvironment:!process.env.FACTORY_ISOLATION_CANARY,controlWrite:denied(()=>fs.writeFileSync('/tmp/factory-control/stop','forged')),browserWrite:denied(()=>fs.writeFileSync('/tmp/factory-browser/browser-acceptance.json','{"ok":true}')),imageWrite:denied(()=>fs.writeFileSync('/opt/factory/http-bridge.mjs','forged')),privateBindWrite:denied(()=>fs.writeFileSync('/workspace/private/input/escape','forged')),procRootWrite:denied(()=>fs.writeFileSync('/proc/1/root/workspace/private/input/escape','forged')),procCwdRead:denied(()=>fs.readdirSync('/proc/1/cwd')),procFdRead:denied(()=>fs.readdirSync('/proc/1/fd')),protectedSourceWrite:denied(()=>fs.writeFileSync('/tmp/factory-source/server.mjs','forged')),signalControl:denied(()=>process.kill(1,'SIGKILL')),dockerSocket:!fs.existsSync('/var/run/docker.sock'),rootReadOnly:denied(()=>fs.writeFileSync('/escape','forged')),egress:await new Promise(resolve=>{const socket=net.connect({host:'1.1.1.1',port:443});socket.setTimeout(800);socket.once('connect',()=>{socket.destroy();resolve(false)});socket.once('error',()=>resolve(true));socket.once('timeout',()=>{socket.destroy();resolve(true)});})}; console.log('{"ok":true,"checks":28}');res.end(JSON.stringify(result));});}`;
fs.writeFileSync(path.join(app, "server.mjs"), source);
process.env.FACTORY_ISOLATION_CANARY = "host-only-test-secret";
let lease;
const results = {
  ok: false,
  checks: [],
  scope:
    "Known hostile payloads under observed rootless Workcell policy; not a universal escape proof",
};
try {
  lease = await startIsolatedApp(app, {
    evidenceDir: path.join(evidence, "hostile"),
    timeoutMs: 60000,
  });
  const probe = await (await fetch(lease.url + "/probe")).json();
  fs.writeFileSync(
    path.join(evidence, "probe.json"),
    JSON.stringify(probe, null, 2),
  );
  assert.equal(probe.uid, 65534);
  results.checks.push("candidate UID65534");
  for (const [name, value] of Object.entries(probe)) {
    if (name === "uid") continue;
    assert.equal(value, true, name);
    results.checks.push(name);
  }
  assert.equal(fs.readFileSync(canary, "utf8"), "unchanged-secret-canary");
  results.checks.push("host canary unchanged");
  assert.equal((await fetch(lease.url + "/oversize")).status, 502);
  results.checks.push("oversized response rejected by trusted bridge");
  await lease.close();
  lease = undefined;
  results.checks.push("receipt verified and owned container removed");
  fs.symlinkSync(canary, path.join(app, "link"));
  await assert.rejects(
    startIsolatedApp(app, { evidenceDir: path.join(evidence, "symlink") }),
    /forbidden entry/,
  );
  results.checks.push("symlink rejected before execution");
  fs.unlinkSync(path.join(app, "link"));
  fs.linkSync(canary, path.join(app, "hardlink"));
  await assert.rejects(
    startIsolatedApp(app, { evidenceDir: path.join(evidence, "hardlink") }),
    /hardlink forbidden/,
  );
  results.checks.push("hardlink rejected before execution");
  fs.unlinkSync(path.join(app, "hardlink"));
  const timed = await startIsolatedApp(app, {
    evidenceDir: path.join(evidence, "deadline"),
    timeoutMs: 6000,
  });
  await new Promise((r) => setTimeout(r, 7000));
  await assert.rejects(timed.close(), /did not finish successfully/);
  results.checks.push("native deadline terminates lease and blocks success");
  const flood = await startIsolatedApp(app, {
    evidenceDir: path.join(evidence, "output-flood"),
  });
  await fetch(flood.url + "/flood").catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));
  await assert.rejects(flood.close(), /did not finish successfully/);
  const floodRecord = JSON.parse(
    fs.readFileSync(
      path.join(evidence, "output-flood", "process.json"),
      "utf8",
    ),
  );
  assert.match(floodRecord.applicationViolation, /exceeded 262144/);
  assert(floodRecord.applicationDiagnostic.length <= 65536);
  results.checks.push(
    "candidate diagnostic flood kills lease and blocks success",
  );
  const endpoint = process.env.DOCKER_HOST;
  process.env.DOCKER_HOST =
    "unix:///tmp/factory-deliberately-missing-docker.sock";
  try {
    await assert.rejects(
      startIsolatedApp(app, {
        evidenceDir: path.join(evidence, "engine-unavailable"),
      }),
    );
  } finally {
    if (endpoint) process.env.DOCKER_HOST = endpoint;
    else delete process.env.DOCKER_HOST;
  }
  results.checks.push("unavailable engine fails closed");
  results.ok = true;
} finally {
  await lease?.close();
  fs.rmSync(scratch, { recursive: true, force: true });
  delete process.env.FACTORY_ISOLATION_CANARY;
  fs.writeFileSync(
    path.join(evidence, "adversarial.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
}
console.log(JSON.stringify(results));
