import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { checkPack } from "../factory/pack-acceptance.mjs";
const root = path.resolve(import.meta.dirname, ".."),
  out = path.join(
    root,
    ".runtime/pack-qualification",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
fs.mkdirSync(out, { recursive: true });
const results = [];
for (const name of ["converter", "notes"]) {
  const result = await checkPack(
    path.join(root, "examples", name),
    path.join(root, "packs", name + ".json"),
    path.join(out, name),
  );
  assert(result.ok, result.failure);
  results.push({
    name,
    ok: true,
    api: result.checks.length,
    browser: result.browser.checks.length,
  });
}
const broken = path.join(out, "broken");
fs.cpSync(path.join(root, "examples/converter"), broken, { recursive: true });
const file = path.join(broken, "server.mjs");
fs.writeFileSync(
  file,
  fs.readFileSync(file, "utf8").replace("n*9/5+32", "n*9/5+99"),
);
const rejected = await checkPack(
  broken,
  path.join(root, "packs/converter.json"),
  path.join(out, "broken-evidence"),
);
assert(!rejected.ok, "Broken conversion must fail");
results.push({ name: "wrong-answer-rejected", ok: true });
const brokenBrowser = path.join(out, "broken-browser");
fs.cpSync(path.join(root, "examples/converter"), brokenBrowser, {
  recursive: true,
});
const js = path.join(brokenBrowser, "public/app.js");
fs.writeFileSync(
  js,
  fs
    .readFileSync(js, "utf8")
    .replace("data.fahrenheit+' °F'", "'Wrong result'"),
);
const browserRejected = await checkPack(
  brokenBrowser,
  path.join(root, "packs/converter.json"),
  path.join(out, "broken-browser-evidence"),
);
assert(
  !browserRejected.ok && browserRejected.failure.includes("Assertion failed"),
  "Wrong browser result must fail",
);
results.push({ name: "wrong-browser-rejected", ok: true });
console.log(
  JSON.stringify(
    { ok: true, modelCalls: 0, releaseApproval: false, results, evidence: out },
    null,
    2,
  ),
);
