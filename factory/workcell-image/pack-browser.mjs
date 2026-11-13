import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { chromium } from "playwright";
let input = "";
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 110000) throw Error("Pack input cap");
}
const pack = JSON.parse(input),
  report = {
    ok: false,
    packHash: createHash("sha256").update(JSON.stringify(pack)).digest("hex"),
    checks: [],
    screenshots: [],
  };
let browser;
const errors = [];
try {
  browser = await chromium.launch({ headless: true, chromiumSandbox: false });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("dialog", (dialog) => dialog.dismiss());
  for (const s of pack.browser) {
    const locator = s.selector ? page.locator(s.selector) : null;
    if (s.action === "goto") {
      const url = new URL(s.value, "http://127.0.0.1:4381");
      assert.equal(url.origin, "http://127.0.0.1:4381");
      await page.goto(url.href);
    } else if (s.action === "fill") await locator.fill(s.value);
    else if (s.action === "click") await locator.click();
    else if (s.action === "select") await locator.selectOption(s.value);
    else if (s.action === "reload") await page.reload();
    else if (["text", "count"].includes(s.action)) {
      let matched = false;
      const stop = Date.now() + 5000;
      while (Date.now() < stop) {
        matched =
          s.action === "count"
            ? (await locator.count()) === s.count
            : (await locator.innerText()).includes(s.value);
        if (matched) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      assert(matched, "Assertion failed: " + s.id);
    } else throw Error("Unknown browser action");
    report.checks.push(s.id);
  }
  assert.deepEqual(errors, [], "Uncaught browser errors");
  await page.screenshot({
    path: "/tmp/factory-browser/browser-acceptance-desktop.png",
    fullPage: true,
  });
  report.ok = true;
} catch (error) {
  report.failure = String(error.stack || error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await fs.writeFile(
    "/tmp/factory-browser/browser-acceptance.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
}
