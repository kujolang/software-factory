import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
export const runtimeContract = `Runtime: dependency-free Node 26 ESM and static browser assets. Backend owns server.mjs and optional db.mjs; frontend owns public/index.html, public/app.js, public/style.css and optional flat public assets. Export createServer({dbPath}) from server.mjs without listening on import. Return a Node HTTP server with close(callback) that closes database resources. Serve GET /api/health as 200 JSON {ok:true}. Use the supplied dbPath for SQLite persistence. Listen only on loopback when started directly; PORT defaults to 4381. Use parameterized SQL, validate inputs and IDs, reject request bodies over 64 KiB before mutations, enforce loopback Host and same-origin writes, contain static paths, and render user input as text. No external packages, network services, tools, hooks or deployment. Tests and release authority belong to the controller. Keep project selectors usable during pending requests and discard stale responses.`;
export const hashPack = (pack) =>
  createHash("sha256").update(JSON.stringify(pack)).digest("hex");
const object = (x) => x && typeof x === "object" && !Array.isArray(x);
function keys(x, allowed) {
  assert(object(x), "Expected object");
  for (const k of Object.keys(x))
    assert(allowed.includes(k), "Unknown field: " + k);
}
function text(x, max = 16000) {
  assert(typeof x === "string" && x.trim() && x.length <= max, "Invalid text");
}
export function validatePack(p) {
  keys(p, [
    "schema",
    "id",
    "title",
    "contract",
    "requirements",
    "api",
    "browser",
  ]);
  assert.equal(p.schema, "kujo.factory.pack/v1");
  assert(/^[a-z][a-z0-9-]{1,63}$/.test(p.id));
  text(p.title, 120);
  text(p.contract);
  assert(
    Array.isArray(p.requirements) &&
      p.requirements.length >= 1 &&
      p.requirements.length <= 40,
  );
  const req = new Set();
  for (const r of p.requirements) {
    keys(r, ["id", "description"]);
    text(r.id, 64);
    text(r.description, 1000);
    assert(!req.has(r.id));
    req.add(r.id);
  }
  assert(Array.isArray(p.api) && p.api.length >= 3 && p.api.length <= 60);
  assert(
    Array.isArray(p.browser) && p.browser.length >= 3 && p.browser.length <= 60,
  );
  const ids = new Set(),
    covered = new Set();
  let negative = false,
    restart = false,
    assertions = 0;
  for (const s of [...p.api, ...p.browser]) {
    text(s.id, 64);
    assert(!ids.has(s.id), "Duplicate test ID");
    ids.add(s.id);
    assert(Array.isArray(s.covers));
    for (const r of s.covers) {
      assert(req.has(r), "Unknown requirement");
      covered.add(r);
    }
  }
  for (const s of p.api) {
    keys(s, [
      "id",
      "covers",
      "restart",
      "method",
      "path",
      "body",
      "status",
      "expect",
      "save",
    ]);
    if (s.restart === true) {
      assert(
        Object.keys(s).every((k) => ["id", "covers", "restart"].includes(k)),
      );
      restart = true;
      continue;
    }
    assert(["GET", "POST", "PUT", "PATCH", "DELETE"].includes(s.method));
    text(s.path, 2048);
    assert(
      s.path.startsWith("/") &&
        !s.path.startsWith("//") &&
        !/[\\\r\n#]/.test(s.path),
      "Relative API path required",
    );
    assert(Number.isInteger(s.status) && s.status >= 200 && s.status <= 499);
    negative ||= s.status >= 400;
    if (s.save !== undefined) assert(/^[a-z][a-zA-Z0-9_]{0,40}$/.test(s.save));
  }
  for (const s of p.browser) {
    keys(s, ["id", "covers", "action", "selector", "value", "count"]);
    assert(
      ["goto", "fill", "click", "select", "text", "count", "reload"].includes(
        s.action,
      ),
    );
    if (s.action === "goto") {
      text(s.value, 2048);
      assert(
        s.value.startsWith("/") &&
          !s.value.startsWith("//") &&
          !/[\\\r\n]/.test(s.value),
      );
    } else if (s.action !== "reload") text(s.selector, 500);
    if (["fill", "select", "text"].includes(s.action))
      assert(typeof s.value === "string" && s.value.length <= 4000);
    if (s.action === "count")
      assert(Number.isInteger(s.count) && s.count >= 0 && s.count <= 1000);
    if (["text", "count"].includes(s.action)) assertions++;
  }
  assert(negative && restart, "API tests need a negative case and restart");
  assert(assertions >= 1, "Browser assertions required");
  assert.equal(covered.size, req.size, "Every requirement needs test coverage");
  assert(JSON.stringify(p).length <= 100000, "Pack too large");
  return p;
}
export function readPack(file) {
  const st = fs.lstatSync(file);
  assert(
    st.isFile() && !st.isSymbolicLink() && st.size <= 110000,
    "Invalid pack file",
  );
  return validatePack(JSON.parse(fs.readFileSync(file, "utf8")));
}
export function readSealedPack(file) {
  const p = readPack(file);
  const seal = JSON.parse(fs.readFileSync(file + ".seal.json", "utf8"));
  assert.equal(
    seal.sha256,
    hashPack(p),
    "Pack changed after review; review and seal again",
  );
  assert.equal(seal.reviewed, true);
  return p;
}
export function runPack(dir, config) {
  if (!config.packHash) return null;
  const p = readPack(path.join(dir, "pack.json"));
  assert.equal(hashPack(p), config.packHash, "Run pack hash mismatch");
  return p;
}
