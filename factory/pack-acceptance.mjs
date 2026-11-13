import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readPack, hashPack } from "./pack.mjs";
import { startIsolatedApp } from "./workcell.mjs";
export function resolve(value, vars) {
  if (typeof value === "string" && /^\$\{[a-zA-Z0-9_.]+\}$/.test(value)) {
    const parts = value.slice(2, -1).split(".");
    let result = vars;
    for (const p of parts) {
      assert(!["__proto__", "constructor", "prototype"].includes(p));
      assert(Object.hasOwn(result, p), "Missing reference " + value);
      result = result[p];
    }
    return result;
  }
  if (typeof value === "string")
    return value.replace(/\$\{[a-zA-Z0-9_.]+\}/g, (v) =>
      encodeURIComponent(String(resolve(v, vars))),
    );
  if (Array.isArray(value)) return value.map((x) => resolve(x, vars));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, resolve(v, vars)]),
    );
  return value;
}
export function subset(actual, expected) {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    for (const [k, v] of Object.entries(expected)) {
      assert(actual && Object.hasOwn(actual, k), "Missing expected field " + k);
      subset(actual[k], v);
    }
  } else assert.deepEqual(actual, expected);
}
export async function checkPack(app, pack, evidence) {
  const p = readPack(pack),
    report = { ok: false, packHash: hashPack(p), checks: [], browser: null };
  let lease;
  try {
    lease = await startIsolatedApp(app, {
      evidenceDir: path.join(evidence, "workcell"),
    });
    const vars = Object.create(null);
    for (const s of p.api) {
      if (s.restart) await lease.restart();
      else {
        const url = resolve(s.path, vars);
        assert(
          url.startsWith("/") && !url.startsWith("//") && !/[\\\r\n]/.test(url),
        );
        const body =
          s.body === undefined
            ? undefined
            : JSON.stringify(resolve(s.body, vars));
        const response = await lease.request(
          s.method,
          url,
          Buffer.from(body || ""),
          { "content-type": "application/json" },
        );
        assert.equal(response.status, s.status, s.id);
        const raw = Buffer.from(response.body, "base64").toString();
        const value = raw ? JSON.parse(raw) : null;
        if (Object.hasOwn(s, "expect")) subset(value, resolve(s.expect, vars));
        if (s.save) vars[s.save] = value;
      }
      report.checks.push(s.id);
    }
    const browserFile = path.join(evidence, "browser.json");
    const command = await lease.runPackBrowser(browserFile, p);
    const browser = JSON.parse(fs.readFileSync(browserFile, "utf8"));
    assert.equal(command.code, 0, browser.failure);
    assert(browser.ok, browser.failure);
    assert.equal(browser.packHash, hashPack(p));
    assert.deepEqual(
      browser.checks,
      p.browser.map((s) => s.id),
    );
    report.browser = { code: 0, report: browserFile, checks: browser.checks };
    report.ok = true;
  } catch (e) {
    report.failure = String(e.stack || e);
  } finally {
    if (lease) await lease.close();
  }
  fs.mkdirSync(evidence, { recursive: true });
  fs.writeFileSync(
    path.join(evidence, "acceptance.json"),
    JSON.stringify(report, null, 2),
  );
  return report;
}
if (process.argv[1] === import.meta.filename) {
  const r = await checkPack(
    path.resolve(process.argv[2]),
    path.resolve(process.argv[3]),
    path.resolve(process.argv[4]),
  );
  console.log(JSON.stringify(r));
  process.exitCode = r.ok ? 0 : 1;
}
