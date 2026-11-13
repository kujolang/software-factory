import './settings.mjs';
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
const activeChildren = new Set();
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
  return crypto
    .createHash("sha256")
    .update(
      files(dir)
        .map(
          (p) =>
            p + "\0" + fs.readFileSync(path.join(dir, p)).toString("base64"),
        )
        .join("\n"),
    )
    .digest("hex");
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
  const start = Date.now();
  const child = spawn(bin, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["pipe", "pipe", "pipe"],
    detached: true,
  });
  activeChildren.add(child);
  let out = "",
    err = "",
    reason = "";
  const stop = (why) => {
    reason = why;
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {}
  };
  const timer = setTimeout(() => stop("timeout"), timeout);
  child.stdout.on("data", (c) => {
    out += c;
    if (Buffer.byteLength(out) > maxBytes) stop("output_limit");
  });
  child.stderr.on("data", (c) => {
    err += c;
    if (Buffer.byteLength(err) > maxBytes) stop("output_limit");
  });
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
  return { code, out, err, reason, durationMs: Date.now() - start };
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
