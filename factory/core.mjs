import './settings.mjs';
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
const activeChildren = new Set();
export function trackOwnedChild(child) {
  activeChildren.add(child);
  child.once("close", () => activeChildren.delete(child));
  return child;
}
// Native Dispatch starts detached workers. Losing their immediate parent must
// stop the worker itself, without signalling any retained or reused parent PID.
export function watchWorkerParent() {
  const parent = process.ppid;
  if (parent <= 1) throw Error("Native worker has no live parent");
  const timer = setInterval(() => {
    if (parent <= 1 || process.ppid !== parent) process.kill(process.pid, "SIGTERM");
  }, 250);
  timer.unref();
  process.once("exit", () => clearInterval(timer));
}
function killActiveChildren() {
  for (const child of activeChildren) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {}
  }
}
let shutdownSignal = "";
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, () => {
    if (shutdownSignal) return;
    shutdownSignal = signal;
    const code = signal === "SIGTERM" ? 143 : 130;
    const pending = new Set(activeChildren);
    // Reap owned children before exiting; immediate exit can orphan zombies.
    // A stuck pipe or platform failure must not keep the controller alive forever.
    const deadline = setTimeout(() => process.exit(code), 2000);
    for (const child of pending) child.once("close", () => {
      pending.delete(child);
      if (!pending.size) { clearTimeout(deadline); process.exit(code); }
    });
    killActiveChildren();
    if (!pending.size) { clearTimeout(deadline); process.exit(code); }
  });
process.once("exit", killActiveChildren);
export const root = path.resolve(import.meta.dirname, "..");
export const json = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export const save = (p, v) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const t = p + "." + process.pid + ".tmp";
  fs.writeFileSync(t, JSON.stringify(v, null, 2) + "\n");
  fs.renameSync(t, p);
};
export function event(dir, type, fields = {}) {
  const lock = path.join(dir, ".event-lock");
  const deadline = Date.now() + 10000;
  while (true) {
    try {
      fs.mkdirSync(lock);
      break;
    } catch (e) {
      if (e.code !== "EEXIST" || Date.now() > deadline)
        throw Error("Event journal lock unavailable");
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  try {
    const p = path.join(dir, "events.jsonl");
    const prior = fs.existsSync(p)
      ? fs.readFileSync(p, "utf8").trim().split("\n").filter(Boolean)
      : [];
    const e = {
      schema: "kujo.factory.event/v1",
      id: crypto.randomUUID(),
      runId: path.basename(dir),
      seq: prior.length + 1,
      timestamp: new Date().toISOString(),
      type,
      ...fields,
    };
    fs.appendFileSync(p, JSON.stringify(e) + "\n");
    return e;
  } finally {
    fs.rmdirSync(lock);
  }
}
export function events(dir) {
  const p = path.join(dir, "events.jsonl");
  return fs.existsSync(p)
    ? fs
        .readFileSync(p, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(JSON.parse)
    : [];
}
export function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? files(path.join(dir, e.name)).map((p) => e.name + "/" + p)
        : [e.name],
    )
    .sort();
}
export function digest(dir) {
  const hash = crypto.createHash("sha256");
  let separator = "";
  for (const name of files(dir)) {
    hash.update(separator + name + "\0");
    hash.update(fs.readFileSync(path.join(dir, name)).toString("base64"));
    separator = "\n";
  }
  return hash.digest("hex");
}
export function materialize(dir, bundle, allowed) {
  if (!bundle || !Array.isArray(bundle.files) || bundle.files.length > 20)
    throw Error("Invalid bundle");
  for (const f of bundle.files) {
    if (
      typeof f.path !== "string" ||
      typeof f.content !== "string" ||
      f.content.length > 180000 ||
      !allowed(f.path) ||
      f.path.split("/").some((p) => p === ".." || p === "." || p === "") ||
      path.isAbsolute(f.path) ||
      f.path.includes("\\")
    )
      throw Error("Rejected artifact path or size");
  }
  for (const f of bundle.files) {
    const p = path.join(dir, f.path);
    let current = path.resolve(dir);
    if (fs.lstatSync(current).isSymbolicLink())
      throw Error("Symlink root rejected");
    for (const part of f.path.split("/").slice(0, -1)) {
      current = path.join(current, part);
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
        throw Error("Symlink parent rejected");
    }
    fs.mkdirSync(path.dirname(p), { recursive: true });
    if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink())
      throw Error("Symlink artifact rejected");
    fs.writeFileSync(p, f.content);
  }
}
export async function command(
  bin,
  args,
  {
    cwd = root,
    timeout = 900000,
    input = "",
    maxBytes = 2_000_000,
    env = {},
  } = {},
) {
  if (shutdownSignal) throw Error("Controller shutdown in progress");
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw Error("Invalid command output limit");
  const start = Date.now();
  const child = spawn(bin, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["pipe", "pipe", "pipe"],
    detached: true,
  });
  activeChildren.add(child);
  const stdout = {chunks: [], bytes: 0};
  const stderr = {chunks: [], bytes: 0};
  let reason = "";
  const stop = (why) => {
    if (reason) return;
    reason = why;
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {}
  };
  const capture = (target, chunk) => {
    const remaining = maxBytes - target.bytes;
    if (remaining > 0) {
      const retained = chunk.length <= remaining ? chunk : Buffer.from(chunk.subarray(0, remaining));
      target.chunks.push(retained);
      target.bytes += retained.length;
    }
    if (chunk.length > remaining) stop("output_limit");
  };
  const timer = setTimeout(() => stop("timeout"), timeout);
  child.stdout.on("data", (chunk) => capture(stdout, chunk));
  child.stderr.on("data", (chunk) => capture(stderr, chunk));
  child.stdin.on("error", () => {});
  child.stdin.end(input);
  let code;
  try {
    code = await new Promise((resolve, reject) => {
      // Signal shutdown owns final exit; do not resume mission work while reaping.
      child.once("error", (error) => { if (!shutdownSignal) reject(error); });
      child.once("close", (code) => {
        if (shutdownSignal) activeChildren.delete(child);
        else resolve(code);
      });
    });
  } finally {
    clearTimeout(timer);
    activeChildren.delete(child);
  }
  return {
    code,
    out: Buffer.concat(stdout.chunks, stdout.bytes).toString("utf8"),
    err: Buffer.concat(stderr.chunks, stderr.bytes).toString("utf8"),
    reason,
    durationMs: Date.now() - start,
  };
}
export function snapshot(dir) {
  return files(dir)
    .filter((p) => !p.endsWith(".sqlite"))
    .map(
      (p) =>
        "\n--- " + p + " ---\n" + fs.readFileSync(path.join(dir, p), "utf8"),
    )
    .join("");
}
