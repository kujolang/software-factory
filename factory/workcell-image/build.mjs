// Syntax validation only: never execute candidate-provided build scripts.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
for (const file of [
  "server.mjs",
  ...(fs.existsSync("/tmp/factory-source/db.mjs") ? ["db.mjs"] : []),
  "public/app.js",
]) {
  const r = spawnSync(
    process.execPath,
    ["--check", "/tmp/factory-source/" + file],
    { stdio: "inherit", timeout: 10000 },
  );
  if (r.status !== 0) process.exit(1);
}
console.log(JSON.stringify({ ok: true, kind: "trusted-syntax-build" }));
