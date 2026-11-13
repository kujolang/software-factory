// Kill the entire host controller process tree, then observe the image PID 1 deadline.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { command, root, save } from "./core.mjs";
const evidence = path.resolve(
  process.argv[2] || ".runtime/qualification/controller-death",
);
fs.mkdirSync(evidence, { recursive: true });
const app = path.join(evidence, "fixture");
fs.mkdirSync(app, { recursive: true });
fs.writeFileSync(
  path.join(app, "server.mjs"),
  "import http from 'node:http';export function createServer(){return http.createServer((q,r)=>{r.setHeader('Content-Type','application/json');r.end('{\"ok\":true}');});}\n",
);
const marker = path.join(evidence, "ready.json");
fs.rmSync(marker, { force: true });
const source = `import fs from 'node:fs';import {startIsolatedApp} from ${JSON.stringify(new URL("./workcell.mjs", import.meta.url).href)};const lease=await startIsolatedApp(${JSON.stringify(app)},{evidenceDir:${JSON.stringify(path.join(evidence, "lease"))},timeoutMs:12000});fs.writeFileSync(${JSON.stringify(marker)},JSON.stringify({container:lease.container}));setInterval(()=>{},1000);`;
const child = spawn(process.execPath, ["--input-type=module", "-e", source], {
  detached: true,
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
for (const stream of [child.stdout, child.stderr])
  stream.on("data", (c) => (log = (log + c).slice(-10000)));
const ended = new Promise((resolve) =>
  child.once("exit", (code, signal) => resolve({ code, signal })),
);
let container, inspection;
const result = { ok: false };
try {
  const startDeadline = Date.now() + 30000;
  while (!fs.existsSync(marker)) {
    if (Date.now() > startDeadline || child.exitCode !== null)
      throw Error("Controller startup failed: " + log);
    await new Promise((r) => setTimeout(r, 100));
  }
  container = JSON.parse(fs.readFileSync(marker)).container;
  inspection = JSON.parse(
    (await command("docker", ["inspect", container])).out,
  )[0];
  save(path.join(evidence, "before-kill.json"), inspection);
  const ps = await command("ps", ["-axo", "pid=,ppid="]);
  const rows = ps.out
    .trim()
    .split("\n")
    .map((line) => line.trim().split(/\s+/).map(Number));
  const owned = new Set([child.pid]);
  let added = true;
  while (added) {
    added = false;
    for (const [pid, parent] of rows)
      if (owned.has(parent) && !owned.has(pid)) {
        owned.add(pid);
        added = true;
      }
  }
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {}
  for (const pid of owned)
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  result.killedHostPids = [...owned];
  result.controller = await ended;
  assert.equal(result.controller.signal, "SIGKILL");
  result.killedAt = new Date().toISOString();
  const deadline = Date.now() + 16000;
  let final;
  while (Date.now() < deadline) {
    const state = await command("docker", ["inspect", container]);
    if (state.code !== 0)
      throw Error(
        "Container disappeared before independent exit could be observed",
      );
    final = JSON.parse(state.out)[0];
    if (!final.State.Running) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  save(path.join(evidence, "after-watchdog.json"), final);
  assert.equal(final.State.Running, false);
  assert.equal(final.State.ExitCode, 124);
  result.autonomousExitCode = final.State.ExitCode;
  result.finishedAt = final.State.FinishedAt;
  result.stoppedMetadataRequiredRecovery = true;
  result.ok = true;
} finally {
  if (container) {
    await command("docker", ["rm", "-f", container]);
    const remains = await command("docker", [
      "ps",
      "-aq",
      "--filter",
      "id=" + container,
    ]);
    result.recoveryRemovedContainer = !remains.out.trim();
  }
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {}
  const temp = path.join(root, ".runtime/workcell-tmp");
  const name = inspection?.Config.Labels["dev.kujo.workcell.project"];
  const removed = [];
  if (name)
    for (const entry of fs.readdirSync(temp)) {
      const dir = path.join(temp, entry),
        definition = path.join(dir, "source/workcell.json");
      if (
        entry.startsWith("factory-workcell-") &&
        fs.existsSync(definition) &&
        JSON.parse(fs.readFileSync(definition)).name === name
      ) {
        fs.rmSync(dir, { recursive: true, force: true });
        removed.push(dir);
      }
    }
  for (const mount of inspection?.Mounts || [])
    if (
      mount.Type === "bind" &&
      mount.Destination === "/workspace/private/input" &&
      mount.Source.startsWith(temp + "/kujo-workcell-")
    ) {
      fs.rmSync(mount.Source, { recursive: true, force: true });
      removed.push(mount.Source);
    }
  result.recoveryRemovedWorkspaces = removed;
  save(path.join(evidence, "controller-death.json"), result);
}
assert.equal(result.recoveryRemovedContainer, true);
console.log(JSON.stringify(result));
