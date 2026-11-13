import fs from "node:fs";
import path from "node:path";
import { json, save, files } from "./core.mjs";
import { audit } from "./audit.mjs";
const dir = path.resolve(process.argv[2]),
  dest = path.resolve(process.argv[3]);
if (fs.existsSync(dest))
  throw Error("Export destination already exists; preserve previous evidence");
audit(dir);
fs.mkdirSync(dest, { recursive: true });
for (const name of [
  "run.json",
  "pack.json",
  "workflow.json",
  "events.jsonl",
  "dispatch-events.jsonl",
  "dispatch-result.json",
  "dispatch-process.json",
  "audit.json",
  "artifacts",
  "application",
  "build",
  "dispatch",
])
  if (fs.existsSync(path.join(dir, name)))
    fs.cpSync(path.join(dir, name), path.join(dest, name), { recursive: true });
const hashes = {};
const { createHash } = await import("node:crypto");
for (const p of files(dest))
  hashes[p] = createHash("sha256")
    .update(fs.readFileSync(path.join(dest, p)))
    .digest("hex");
save(path.join(dest, "manifest.json"), {
  schema: "kujo.factory.export/v1",
  runId: json(path.join(dir, "run.json")).id,
  hashes,
  exportedAt: new Date().toISOString(),
  note: "Model usage receipts only; raw provider event/analysis streams not retained",
});
console.log(dest);
