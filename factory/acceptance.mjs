// Trusted host oracle; candidate code executes only inside a Workcell lease.
import assert from "node:assert/strict";
import path from "node:path";
import { startIsolatedApp } from "./workcell.mjs";
let lease,
  passed = 0,
  result;
try {
  lease = await startIsolatedApp(path.resolve(process.argv[2]), {
    evidenceDir: path.resolve(
      process.argv[3] ||
        path.join(
          process.argv[2],
          "..",
          "artifacts",
          "workcell-api-" + Date.now(),
        ),
    ),
  });
  const base = lease.url;
  const req = async (method, url, body, status = 200, headers = {}) => {
    const r = await fetch(base + url, {
      signal: AbortSignal.timeout(5000),
      method,
      headers: { "Content-Type": "application/json", ...headers },
      ...(body === undefined
        ? {}
        : { body: typeof body === "string" ? body : JSON.stringify(body) }),
    });
    assert.equal(
      r.status,
      status,
      `${method} ${url}: ${await (r.status === status ? Promise.resolve("") : r.text())}`,
    );
    passed++;
    return status === 204 ? null : r.json();
  };
  await req("GET", "/api/health");
  const p = await req(
    "POST",
    "/api/projects",
    { name: "Factory QA", description: "Persistence proof" },
    201,
  );
  assert.equal(p.name, "Factory QA");
  await req("POST", "/api/projects", { name: " " }, 400);
  await req("POST", "/api/projects", { name: 42 }, 400);
  await req("POST", "/api/projects", { name: "x", unknown: true }, 400);
  await req("POST", "/api/projects", "{bad", 400);
  await req("POST", "/api/projects", { name: "x".repeat(66000) }, 413);
  await req("DELETE", "/api/projects/" + p.id, "x".repeat(66000), 413);
  await req("POST", "/api/projects", { name: "evil" }, 403, {
    Origin: "https://example.com",
  });
  await req("PATCH", "/api/projects/" + p.id, { name: "Updated project" });
  let t = await req(
    "POST",
    "/api/tasks",
    {
      projectId: p.id,
      title: "Ship candidate",
      priority: "high",
      assignee: "Alex",
    },
    201,
  );
  assert.equal(t.status, "todo");
  assert.equal(t.assignee, "Alex");
  await req("POST", "/api/tasks", { projectId: 999999, title: "Orphan" }, 404);
  await req("GET", "/api/tasks?projectId=999999", undefined, 404);
  await req("GET", "/api/activity?projectId=999999", undefined, 404);
  await req("POST", "/api/tasks", { projectId: p.id, title: " " }, 400);
  await req("PATCH", "/api/tasks/" + t.id, { status: "invalid" }, 400);
  await req("PATCH", "/api/tasks/" + t.id, { priority: "urgent" }, 400);
  await req("PATCH", "/api/tasks/" + t.id, { projectId: 999 }, 400);
  t = await req("PATCH", "/api/tasks/" + t.id, {
    status: "doing",
    title: "Verified edit",
    assignee: "Sam",
  });
  assert.equal(t.status, "doing");
  assert.equal((await req("GET", "/api/tasks?projectId=" + p.id)).length, 1);
  assert.ok((await req("GET", "/api/activity?projectId=" + p.id)).length >= 4);
  await req("GET", "/api/tasks/nope", undefined, 400);
  await req("PATCH", "/api/tasks/99999", { status: "done" }, 404);
  await lease.restart();
  const persisted = await req("GET", "/api/tasks?projectId=" + p.id);
  assert.equal(persisted[0].title, "Verified edit");
  assert.equal(persisted[0].assignee, "Sam");
  const html = await fetch(base + "/", { signal: AbortSignal.timeout(5000) });
  assert.equal(html.status, 200);
  assert.match(html.headers.get("content-type"), /text\/html/);
  assert.match(await html.text(), /<html/i);
  passed++;
  const traversal = await fetch(base + "/%2e%2e%2fserver.mjs", {
    signal: AbortSignal.timeout(5000),
  });
  assert.ok([400, 403, 404].includes(traversal.status));
  passed++;
  await req("DELETE", "/api/tasks/" + t.id, undefined, 204);
  await req("POST", "/api/tasks", { projectId: p.id, title: "Cascade" }, 201);
  await req("DELETE", "/api/projects/" + p.id, undefined, 204);
  assert.equal((await req("GET", "/api/tasks")).length, 0);
  result = {
    ok: true,
    schema: "kujo.factory.api-acceptance/v2",
    checks: passed - 2, // Preserve the v1 baseline count for existing controller processes.
    additionalChecks: 2,
    totalChecks: passed,
    persistence: true,
    validation: true,
    cascade: true,
    activity: true,
    isolation: "workcell-rootless",
    evidenceDir: lease.evidenceDir,
  };
} catch (e) {
  console.error(e.stack);
  process.exitCode = 1;
} finally {
  try {
    await lease?.close();
  } catch (e) {
    console.error(e.stack);
    process.exitCode = 1;
  }
}
if (!process.exitCode && result) console.log(JSON.stringify(result));
