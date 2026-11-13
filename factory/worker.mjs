import {codexBinary, model, providerHome} from './settings.mjs';
import { startIsolatedApp } from "./workcell.mjs";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { productDocs } from "./product-docs.mjs";
import {
  root,
  json,
  save,
  event,
  command,
  materialize,
  snapshot,
  digest,
  files,
} from "./core.mjs";
const [dir, taskId] = process.argv.slice(2);
const config = json(path.join(dir, "run.json"));
const task = config.tasks.find((t) => t.id === taskId);
if (!task) throw Error("Unknown task");
const app = path.join(dir, "application");
const artifact = path.join(dir, "artifacts");
fs.mkdirSync(artifact, { recursive: true });
const contract = fs.readFileSync(
  path.join(root, "factory/contract.md"),
  "utf8",
);
const agentsRoot = config.agentsRoot;
const emit = (type, summary, extra = {}) =>
  event(dir, type, { agentId: task.agentId, taskId, summary, ...extra });
function handoff(from, to, id, scope, evidence = []) {
  const h = {
    schema: "kujo.handoff/v1",
    assignment: id,
    current_owner: from,
    next_owner: to,
    permission_mode: "PROPOSE",
    goal: config.mission,
    scope,
    evidence: evidence.map((p) => ({ path: p })),
    decisions: [],
    unresolved_questions: [],
    allowed_next_actions: ["Produce bounded artifacts; no external actions"],
    stop_condition:
      "Return proposed artifacts and evidence; never approve your own release",
  };
  save(path.join(artifact, id + "-handoff.json"), h);
  emit("handoff.created", `${from} → ${to}`, {
    artifacts: ["artifacts/" + id + "-handoff.json"],
    data: { from, to },
  });
}
async function agent(role, id, prompt) {
  const rolePath = path.join(agentsRoot, "chain-of-command", role);
  const instructions =
    fs.readFileSync(path.join(rolePath, "AGENT.md"), "utf8") +
    "\n" +
    fs.readFileSync(path.join(rolePath, "SKILL.md"), "utf8");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "factory-provider-"));
  const output = path.join(temp, "response.json");
  const start = Date.now();
  event(dir, "agent.started", {
    agentId: role,
    taskId,
    summary: `${role} processing ${id}`,
    artifacts: ["artifacts/" + id + "-work-order.json"],
  });
  save(path.join(artifact, id + "-work-order.json"), {
    role,
    taskId,
    mission: config.mission,
    scope: prompt,
    contractSource: path.relative(config.workspace, rolePath),
    permission: "PROPOSE",
    startedAt: new Date(start).toISOString(),
  });
  const args = [
    "exec",
    "--ignore-user-config",
    "--ephemeral",
    "--sandbox",
    "read-only",
    "--disable",
    "shell_tool",
    "--disable",
    "apps",
    "--disable",
    "in_app_browser",
    "-c",
    'web_search="disabled"',
    "--skip-git-repo-check",
    "-C",
    temp,
    "--json",
    "--output-schema",
    path.join(root, "factory/bundle.schema.json"),
    "-o",
    output,
    "-",
  ];
  if (model) args.splice(1, 0, "--model", model);
  const r = await command(codexBinary, args, {
    cwd: temp,
    env: {CODEX_HOME: providerHome},
    timeout: 480000,
    maxBytes: 1500000,
    input:
      "You are a text-only proposal agent. No tools, file reads, executions, or additional agents. Return JSON matching the supplied schema. No markdown fences inside content. Role contract:\n" +
      instructions +
      "\nHuman mission:\n" +
      config.mission +
      "\nAcceptance contract:\n" +
      contract +
      "\nWork order:\n" +
      prompt,
  });
  const wire = r.out
    .split("\n")
    .filter(Boolean)
    .flatMap((s) => {
      try {
        return [JSON.parse(s)];
      } catch {
        return [];
      }
    });
  const toolCalls = wire.filter(
    (e) =>
      e.type === "item.completed" &&
      [
        "command_execution",
        "file_change",
        "mcp_tool_call",
        "web_search",
      ].includes(e.item?.type),
  ).length;
  const usage = wire
    .filter((e) => e.type === "turn.completed")
    .map((e) => e.usage);
  save(path.join(artifact, id + "-receipt.json"), {
    role,
    taskId,
    provider: "Codex CLI",
    roleContractSha256: createHash("sha256").update(instructions).digest("hex"),
    workerSha256: createHash("sha256")
      .update(fs.readFileSync(import.meta.filename))
      .digest("hex"),
    model: model || "CLI default (not independently reported)",
    code: r.code,
    reason: r.reason,
    startedAt: new Date(start).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: r.durationMs,
    usage,
    cost: null,
    costNote: "Subscription cost not exposed",
    shellTools: false,
    observedToolCalls: toolCalls,
  });
  try {
    if (r.code !== 0 || r.reason || toolCalls > 0 || !fs.existsSync(output))
      throw Error(`Provider failed: ${r.code} ${r.reason}`);
    const result = json(output);
    save(path.join(artifact, id + "-proposal.json"), result);
    event(
      dir,
      result.verdict === "fail" ? "agent.blocked" : "agent.completed",
      {
        agentId: role,
        taskId,
        summary: result.summary,
        artifacts: [
          "artifacts/" + id + "-proposal.json",
          "artifacts/" + id + "-receipt.json",
        ],
      },
    );
    return result;
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
const backendAllowed = (p) => ["server.mjs", "db.mjs"].includes(p);
const frontendAllowed = (p) =>
  /^public\/[a-zA-Z0-9_-]+\.(html|css|js|svg)$/.test(p);
async function check() {
  const before = digest(app);
  const r = await command(
    process.execPath,
    [
      path.join(root, "factory/acceptance.mjs"),
      app,
      path.join(artifact, `workcell-api-${Date.now()}`),
    ],
    { timeout: 180000 },
  );
  let result;
  try {
    result = JSON.parse(r.out.trim());
  } catch {}
  if (
    r.code === 0 &&
    (!result?.ok ||
      result.checks !== 28 ||
      result.totalChecks !== 30 ||
      !result.persistence ||
      !result.validation ||
      !result.cascade ||
      !result.activity ||
      digest(app) !== before)
  ) {
    r.code = 1;
    r.err += "\nAcceptance attestation missing, incomplete, or source changed";
  }
  const acceptancePath = path.join(artifact, `acceptance-${Date.now()}.json`);
  save(acceptancePath, r);
  if (r.code === 0) {
    const reportPath = path.join(artifact, `browser-${Date.now()}.json`);
    const b = await command(
      process.execPath,
      [path.join(root, "factory/browser-acceptance.mjs"), app, reportPath],
      { timeout: 120000, maxBytes: 150000 },
    );
    let report;
    try {
      report = json(reportPath);
    } catch {}
    if (
      b.code !== 0 ||
      !report?.ok ||
      report.checks.length < 8 ||
      digest(app) !== before
    ) {
      r.code = 1;
      r.err +=
        "\nBrowser acceptance failed: " +
        (report?.failure || b.err || "Missing attestation");
    }
    r.browser = {
      code: b.code,
      report: path.relative(dir, reportPath),
      checks: report?.checks,
    };
  }
  save(acceptancePath, r);
  return r;
}
async function review(n) {
  productDocs(app);
  const hash = digest(app);
  const r = await agent(
    "code-reviewer",
    "review-" + n,
    "Independently inspect all proposed source below against acceptance. Include security review: unsafe host effects, SQL injection, static traversal, XSS, origin/Host controls. Return files:[], verdict pass only if no correctness/security blockers; issues must be concrete. Do not call tooling. This is static review, automated tests separately enforced. Test ownership is explicit in the acceptance contract: repository-contained controller harnesses live outside this generated application subtree. The candidate test manifest identifies their source hashes; no candidate-local test runner is required or trusted. API and browser execution remain mandatory controller gates after this review and again before release.\n" +
      snapshot(app),
  );
  save(path.join(artifact, "review-" + n + "-binding.json"), {
    hash,
    verdict: r.verdict,
    issues: r.issues,
  });
  return r;
}
let proposalBlocked = false;
try {
  emit("task.started", task.title, { dependencies: task.dependencies });
  handoff(
    task.handoffFrom ??
      (taskId === "command"
        ? "human"
        : taskId === "architecture"
          ? "general-commander"
          : taskId === "backend" || taskId === "frontend"
            ? "systems-architect"
            : taskId === "verify"
              ? "systems-architect"
              : "code-reviewer"),
    task.agentId,
    taskId,
    task.title,
    task.dependencies.map((id) =>
      id === "verify"
        ? "artifacts/verification.json"
        : "artifacts/" + id + "-proposal.json",
    ),
  );
  emit("handoff.accepted", `${task.agentId} accepted scoped work order`);
  if (taskId === "command") {
    const r = await agent(
      "general-commander",
      "command",
      'Interpret mission; produce mission.md containing objectives, non-goals, constraints, concrete delegation to systems-architect, backend-developer, frontend-developer, code-reviewer, test-runner, release-verifier. Explicitly bound acceptance and no deployment. Use files:[{path:"mission.md",content:...}].',
    );
    if (r.verdict === "fail" || !r.files.some((f) => f.path === "mission.md"))
      throw Error("Commander did not produce an actionable mission");
    materialize(artifact, r, (p) => p === "mission.md");
    emit("mission.planned", "Commander established bounded mission", {
      artifacts: ["artifacts/mission.md"],
    });
  } else if (taskId === "architecture") {
    const r = await agent(
      "systems-architect",
      "architecture",
      "Produce architecture.md with API/data model matching supplied fixed acceptance contract, module ownership (backend server.mjs/db.mjs; frontend public/*), concurrency independence, exact handoff conditions, verification gates. Include scoped backend and frontend work orders. Command context:\n" +
        fs.readFileSync(path.join(artifact, "mission.md"), "utf8"),
    );
    if (
      r.verdict === "fail" ||
      !r.files.some((f) => f.path === "architecture.md")
    )
      throw Error("Architect did not produce an actionable contract");
    materialize(artifact, r, (p) => p === "architecture.md");
  } else if (taskId === "backend" || taskId === "frontend") {
    const scope =
      taskId === "backend"
        ? "Implement complete backend in server.mjs and optional db.mjs. Standard library only. No frontend files."
        : "Implement polished complete responsive frontend in public/index.html, public/style.css, public/app.js. Standard library browser APIs. No backend files. Include all CRUD actions with accessible labels. All required controls usable without drag/drop.";
    const r = await agent(
      task.agentId,
      taskId,
      scope +
        " Return complete source files; no placeholders. Architecture context:\n" +
        fs.readFileSync(path.join(artifact, "architecture.md"), "utf8"),
    );
    if (r.verdict === "fail" || r.files.length === 0) {
      proposalBlocked = true;
      emit("task.blocked", "Proposal requires correction", {
        artifacts: ["artifacts/" + taskId + "-proposal.json"],
      });
    } else
      materialize(
        app,
        r,
        taskId === "backend" ? backendAllowed : frontendAllowed,
      );
  } else if (taskId === "verify") {
    let good = false;
    for (let n = 0; n < 3; n++) {
      emit(
        "verification.started",
        `Independent review and acceptance attempt ${n + 1}`,
      );
      productDocs(app);
      const reviewedHash = digest(app);
      const reviewResult = await review(n);
      const checked =
        reviewResult.verdict === "pass"
          ? await check()
          : {
              code: 1,
              out: "",
              err:
                "Static review blocked execution: " +
                reviewResult.issues.join("; "),
            };
      if (
        reviewResult.verdict === "pass" &&
        checked.code === 0 &&
        digest(app) === reviewedHash
      ) {
        save(path.join(artifact, "verification.json"), {
          ok: true,
          hash: digest(app),
          attempt: n + 1,
          review: "review-" + n + "-binding.json",
          acceptance: checked,
          verifiedAt: new Date().toISOString(),
        });
        emit(
          "verification.passed",
          "Independent review and functional acceptance passed",
          { artifacts: ["artifacts/verification.json"] },
        );
        good = true;
        break;
      }
      emit("verification.failed", `Attempt ${n + 1} rejected`, {
        data: {
          issues: reviewResult.issues,
          checkExit: checked.code,
          checkOutput: (checked.err + checked.out).slice(-12000),
        },
        artifacts: ["artifacts/review-" + n + "-proposal.json"],
      });
      if (n === 2) break;
      emit("correction.requested", "Route findings back to implementation", {
        data: {
          issues: reviewResult.issues,
          checkOutput: (checked.err + checked.out).slice(-12000),
        },
      });
      for (const [role, allowed] of [
        ["backend-developer", backendAllowed],
        ["frontend-developer", frontendAllowed],
      ]) {
        handoff(
          "code-reviewer",
          role,
          "correction-" + n + "-" + role,
          "Fix only reviewer/test findings within owned files",
        );
        const r = await agent(
          role,
          "correction-" + n + "-" + role,
          "Fix concrete issues in your owned source only (" +
            (role === "backend-developer" ? "server.mjs/db.mjs" : "public/*") +
            "). Return only changed complete files, [] if no change necessary. Preserve acceptance criteria. Findings:\n" +
            JSON.stringify(reviewResult.issues) +
            "\n" +
            checked.err +
            "\n" +
            checked.out +
            "\nCurrent application:\n" +
            snapshot(app),
        );
        materialize(app, r, allowed);
        if (
          r.verdict !== "fail" &&
          (role === "backend-developer"
            ? fs.existsSync(path.join(app, "server.mjs"))
            : fs.existsSync(path.join(app, "public/index.html")))
        )
          event(dir, "task.completed", {
            agentId: role,
            taskId: role === "backend-developer" ? "backend" : "frontend",
            summary: "Implementation corrected after independent review",
            artifacts: [
              "artifacts/correction-" + n + "-" + role + "-proposal.json",
            ],
          });
      }
    }
    if (!good) throw Error("Bounded verification exhausted; release blocked");
  } else if (taskId === "release") {
    const v = json(path.join(artifact, "verification.json"));
    if (!v.ok || v.hash !== digest(app))
      throw Error("Missing/stale verification");
    const testContract = json(path.join(app, "tests/contract.json"));
    const trustedHarnesses = ["factory/acceptance.mjs", "factory/workcell-image/browser-check.mjs", "factory/workcell.mjs"];
    if (testContract.sources?.length !== trustedHarnesses.length || trustedHarnesses.some(file => {
      const expected = createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
      return testContract.sources.find(source => source.path === file)?.sha256 !== expected;
    })) throw Error("Trusted test harness changed since review; fresh verification required");
    const buildCommand = ["workcell", "trusted-image-syntax-build"];
    const buildLease = await startIsolatedApp(app, {
      evidenceDir: path.join(artifact, `workcell-build-${Date.now()}`),
    });
    let built;
    try {
      built = await buildLease.syntaxBuild();
    } finally {
      await buildLease.close();
    }
    save(path.join(artifact, "build.json"), {
      ...built,
      command: buildCommand,
      cwd: app,
    });
    if (built.code !== 0) throw Error("Production syntax build failed");
    const packageMetadata = json(path.join(app, "package.json"));
    const browserPath = path.join(dir, v.acceptance.browser.report);
    const browserReport = json(browserPath);
    const packet = {
      scope:
        "LOCAL trusted single-operator release candidate; no production deployment or public service qualification",
      nodeVersion: process.version,
      platform: process.platform,
      sourceHash: digest(app),
      verification: v,
      commands: {
        api: [process.execPath, path.join(root, "factory/acceptance.mjs"), app],
        browser: [
          process.execPath,
          path.join(root, "factory/browser-acceptance.mjs"),
          app,
          browserPath,
        ],
        build: buildCommand,
      },
      build: built,
      browserReport,
      browserReportSha256: createHash("sha256")
        .update(fs.readFileSync(browserPath))
        .digest("hex"),
      independentReview: json(path.join(artifact, v.review)),
      packageMetadata,
      dependencyPolicy: {
        standardLibraryOnly:
          !packageMetadata.dependencies && !packageMetadata.devDependencies,
        installHooks: false,
      },
      files: files(app).map((p) => ({
        path: p,
        sha256: createHash("sha256")
          .update(fs.readFileSync(path.join(app, p)))
          .digest("hex"),
      })),
      documentation: fs.readFileSync(path.join(app, "README.md"), "utf8"),
      changelog: fs.existsSync(path.join(app, "CHANGELOG.md"))
        ? fs.readFileSync(path.join(app, "CHANGELOG.md"), "utf8")
        : "Initial local prototype candidate; retained task and correction history in factory event journal",
      assurance:
        "Controller-owned API/browser/build checks are the concrete equivalent release gates. Native Dispatch owns dependency/failure traces; canonical handoffs and exact candidate hashes bind evidence. Optional ecosystem tools not executed are not claimed.",
      deploymentAuthorized: false,
    };
    save(path.join(artifact, "release-packet.json"), packet);
    const r = await agent(
      "release-verifier",
      "release",
      "Assess this complete evidence packet for the bounded LOCAL release candidate only. No deployment is requested. Return files:[], verdict pass/fail with concrete blockers grounded in evidence. Build and broad equivalent acceptance checks were actually executed; do not require optional branded tools merely for their names. Evidence:\n" +
        JSON.stringify(packet),
    );
    if (r.verdict !== "pass")
      throw Error("Release verifier rejected candidate");
    // Repeat acceptance after the independent verdict and before copying exact bytes.
    const checked = await check();
    if (checked.code !== 0 || v.hash !== digest(app))
      throw Error("Final recheck failed");
    const buildDir = path.join(dir, "build");
    fs.mkdirSync(buildDir, { recursive: true });
    for (const p of files(app)) {
      const target = path.join(buildDir, p);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(app, p), target);
    }
    save(path.join(artifact, "release.json"), {
      status: "approved-local-candidate",
      hash: digest(app),
      buildHash: digest(buildDir),
      checks: checked,
      reviewHash: v.hash,
      deploymentAuthorized: false,
    });
    emit(
      "release.approved",
      "Verified local release candidate; no deployment",
      { artifacts: ["artifacts/release.json"], data: { hash: digest(app) } },
    );
  }
  emit(
    proposalBlocked ? "task.blocked" : "task.completed",
    proposalBlocked
      ? "Proposal returned without implementation; verification must route correction"
      : task.title + " complete",
  );
  console.log(JSON.stringify({ ok: true, data: { taskId } }));
} catch (e) {
  emit("task.failed", String(e.message));
  if (taskId === "verify" || taskId === "release")
    emit("release.blocked", String(e.message));
  console.log(
    JSON.stringify({
      ok: false,
      error: {
        code: "factory_task_failed",
        message: String(e.message),
        retryable: false,
      },
    }),
  );
  process.exitCode = 1;
}
