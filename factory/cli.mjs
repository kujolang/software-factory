import {verifyRunReleaseRecords} from './evidence.mjs';
import {startMissionAccounting,finishMissionAccounting,captureMissionFailure,blockUnaccountedRelease,promoteAccountedRelease} from './lifecycle.mjs';
import {validatePackWithSpec,annotateRunAccounting} from './accountability.mjs';
import {controllerProvenance} from './provenance.mjs';
import {catalog} from './catalog.mjs';
import { readSealedPack, hashPack, runPack } from "./pack.mjs";
import {
  agentsRoot,
  dispatchRoot,
  kujoBinary,
  runsRoot,
  settings, provider, model,
} from "./settings.mjs";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import { root, json, save, event, events, command, digest } from "./core.mjs";
const workspace = path.dirname(root);
const verb = process.argv[2] || "help";
const definitions = [
  ["command", "general-commander", "Interpret product mission", []],
  [
    "architecture",
    "systems-architect",
    "Define architecture and work orders",
    ["command"],
  ],
  [
    "backend",
    "backend-developer",
    "Build application service",
    ["architecture"],
  ],
  [
    "frontend",
    "frontend-developer",
    "Build browser interface",
    ["architecture"],
  ],
  [
    "verify",
    "code-reviewer",
    "Independent review, tests and correction",
    ["backend", "frontend"],
  ],
  ["release", "release-verifier", "Verify local release candidate", ["verify"]],
];
const tasks = definitions.map(([id, agentId, title, dependencies]) => ({
  id,
  agentId,
  title,
  dependencies,
  stage: {
    command: "Command",
    architecture: "Architecture",
    backend: "Construction",
    frontend: "Construction",
    verify: "Verification",
    release: "Release",
  }[id],
}));
const roles = [...new Set(tasks.map((t) => t.agentId))].map((id) => ({
  id,
  name: id
    .split("-")
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" "),
  layer:
    id === "general-commander"
      ? "command"
      : id === "systems-architect"
        ? "planning"
        : id.includes("developer")
          ? "execution"
          : "verification",
  parent:
    id === "general-commander"
      ? null
      : id === "systems-architect"
        ? "general-commander"
        : "systems-architect",
}));
function runPath(id) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw Error("Invalid run ID");
  return path.join(runsRoot, id);
}
function readRun(id) {
  const dir = runPath(id);
  const {
    workspace: privateWorkspace,
    agentsRoot: privateAgentsRoot,
    ...publicRun
  } = json(path.join(dir, "run.json"));
  const journal = events(dir);
  const declared = publicRun.roles || [];
  const observed = roles
    .filter(
      (role) =>
        !declared.some((r) => r.id === role.id) &&
        journal.some((e) => e.agentId === role.id),
    )
    .map((role) => {
      const handoff = journal.find(
        (e) => e.type === "handoff.created" && e.data?.to === role.id,
      );
      return {
        ...role,
        parent: declared.some((r) => r.id === handoff?.data?.from)
          ? handoff.data.from
          : null,
        observedFromEvents: true,
      };
    });
  return { ...publicRun, roles: [...declared, ...observed], events: journal };
}
function requirePlainTree(dir) {
  if (fs.lstatSync(dir).isSymbolicLink() || !fs.statSync(dir).isDirectory())
    throw Error("Candidate directory must be a plain directory");
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink())
      throw Error("Candidate symlinks are not importable");
    if (entry.isDirectory()) requirePlainTree(file);
    else if (!entry.isFile())
      throw Error("Candidate contains a non-file entry");
  }
}
async function executeRun(dir, config) {
  config.accountabilityRequired=true;
  config.executionProvider={provider,model:model||null};
  save(path.join(dir,"run.json"),config);
  const provenance=controllerProvenance();
  save(path.join(dir,"artifacts/controller-provenance.json"),provenance);
  console.log(JSON.stringify({runId:config.id,directory:dir,kind:config.kind||"build"}));
  let dispatchResult=null,passed=false,reason="Mission did not reach independent release";
  try {
    await startMissionAccounting(dir,config,provenance,{provider,model});
    if(config.packHash){
      const binding=await validatePackWithSpec(runPack(dir,config),{parent:path.join(dir,"artifacts/spec")});
      save(path.join(dir,"artifacts/spec-binding.json"),binding);
    }
    dispatchResult=await command(kujoBinary(),["run",path.join(root,"factory/dispatch.kujo")],{
      cwd:dispatchRoot,timeout:7200000,
      env:{FACTORY_RUN_DIR:dir,FACTORY_ROOT:root,NODE_BIN:process.execPath,DISPATCH_ALLOW_ANY_OUTPUT_ROOT:"true"},
    });
    save(path.join(dir,"dispatch-process.json"),dispatchResult);
    passed=dispatchResult.code===0&&!dispatchResult.reason&&events(dir).some(e=>e.type==="release.verified")&&!events(dir).some(e=>e.type==="accountability.failed");
    reason=passed?"Independent local release gates passed; no deployment authorized":"Mission stopped before all independent release gates passed";
    if(!passed)await captureMissionFailure(dir,{kind:"mission-failure",summary:reason+"; Dispatch exit "+dispatchResult.code,evidence:["dispatch-process.json"]});
  } catch(error) {
    passed=false;reason=error.message;
    event(dir,"mission.failed",{summary:"Mission stopped: "+reason});
    try{await captureMissionFailure(dir,{kind:"controller-failure",summary:reason.slice(0,16000)});}catch(captureError){reason+="; failure capture unavailable: "+captureError.message;}
  }
  try {
    await finishMissionAccounting(dir,config,{passed,reason:reason.slice(0,16000)});
    if(passed)promoteAccountedRelease(dir,config);
    if(!passed&&fs.existsSync(path.join(dir,"artifacts/release.json")))blockUnaccountedRelease(dir,new Error(reason));
  } catch(error) {
    passed=false;reason="Required lifecycle accounting failed: "+error.message;
    blockUnaccountedRelease(dir,error);
    try{await annotateRunAccounting(json(path.join(dir,"artifacts/accounting-start.json")),"Controller mission failed after accounting/promotion attempt: "+error.message.slice(0,15000));}catch(noteError){event(dir,"accountability.failed",{summary:"Later failure annotation unavailable; original ledger preserved",data:{error:noteError.message}});}
    try{await captureMissionFailure(dir,{kind:"accounting-failure",summary:reason.slice(0,16000)});}catch{}
  }
  config.status=passed?"completed":"failed";config.finishedAt=new Date().toISOString();
  save(path.join(dir,"run.json"),config);
  event(dir,passed?"mission.completed":"mission.failed",{summary:reason});
  console.log(JSON.stringify({runId:config.id,status:config.status,dispatchCode:dispatchResult?.code??null}));
  process.exitCode=passed?0:1;
}

if (verb === "run") {
  const file = process.argv[3];
  if (!file) throw Error("Usage: node factory/cli.mjs run mission.txt");
  const extra = process.argv.slice(4);
  if (extra.length && (extra.length !== 2 || extra[0] !== "--pack"))
    throw Error("Usage: run mission.txt [--pack pack.json]");
  const pack = extra.length ? readSealedPack(path.resolve(extra[1])) : null;
  const mission = fs.readFileSync(path.resolve(file), "utf8");
  if (!mission.trim() || mission.length > 12000)
    throw Error("Mission must be 1–12000 characters");
  const id = "factory-" + new Date().toISOString().replace(/[:.]/g, "-");
  const dir = runPath(id);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(path.join(dir, "application"));
  const config = {
    id,
    ...(pack ? { packHash: hashPack(pack), packId: pack.id } : {}),
    mission,
    status: "running",
    startedAt: new Date().toISOString(),
    workspace,
    agentsRoot: path.resolve(agentsRoot),
    roles,
    tasks,
    stages: [
      "Command",
      "Architecture",
      "Construction",
      "Verification",
      "Release",
    ],
  };
  if (pack) save(path.join(dir, "pack.json"), pack);
  save(path.join(dir, "run.json"), config);
  save(path.join(dir, "workflow.json"), {
    id: "factory-01",
    name: "Factory 01 — App Factory",
    tasks: tasks.map((t) => ({
      id: t.id,
      name: t.title,
      agentId: t.agentId,
      dependsOn: t.dependencies,
      parallelSafe: t.id === "backend" || t.id === "frontend",
      timeoutMs: t.id === "verify" ? 3600000 : 600000,
    })),
  });
  event(dir, "mission.created", { summary: mission });
  for (const t of tasks)
    event(dir, "agent.assigned", {
      agentId: t.agentId,
      taskId: t.id,
      summary: t.title,
      dependencies: t.dependencies,
    });
  await executeRun(dir, config);
} else if (verb === "recheck" || verb === "retry") {
  if (process.argv.length !== 4)
    throw Error(
      "Usage: retry|recheck RUN_ID; the original frozen pack is reused",
    );
  const retry = verb === "retry";
  const kind = retry ? "retry-verification" : "revalidation";
  const sourceId = process.argv[3];
  if (!sourceId || process.argv.length !== 4)
    throw Error(`Usage: node factory/cli.mjs ${verb} <sourceRunId>`);
  const sourceDir = runPath(sourceId);
  if (fs.lstatSync(sourceDir).isSymbolicLink())
    throw Error("Source run symlink rejected");
  if (fs.lstatSync(path.join(sourceDir, "run.json")).isSymbolicLink())
    throw Error("Source metadata symlink rejected");
  const source = json(path.join(sourceDir, "run.json"));
  if (
    source.id !== sourceId ||
    source.status !== (retry ? "failed" : "completed")
  )
    throw Error(
      retry
        ? "Retry requires a failed source run"
        : "Recheck requires a completed source run",
    );
  if (
    typeof source.mission !== "string" ||
    !source.mission.trim() ||
    source.mission.length > 12000
  )
    throw Error("Source mission is missing or invalid");
  const sourceArtifacts = path.join(sourceDir, "artifacts");
  if (fs.lstatSync(sourceArtifacts).isSymbolicLink())
    throw Error("Source artifact symlink rejected");
  const pack = runPack(sourceDir, source);
  const sourceApp = path.join(sourceDir, "application");
  requirePlainTree(sourceApp);
  if (retry) {
    for (const file of ["server.mjs", "public/index.html"])
      if (
        !fs.existsSync(path.join(sourceApp, file)) ||
        !fs.statSync(path.join(sourceApp, file)).isFile()
      )
        throw Error("Retry requires complete candidate entrypoints: " + file);
  }
  const sourceHash = digest(sourceApp);
  let release, verification;
  if (!retry) {
    if(source.accountabilityRequired)verifyRunReleaseRecords(sourceDir);
    for (const name of ["release.json", "verification.json"])
      if (fs.lstatSync(path.join(sourceArtifacts, name)).isSymbolicLink())
        throw Error("Source evidence symlink rejected");
    release = json(path.join(sourceArtifacts, "release.json"));
    verification = json(path.join(sourceArtifacts, "verification.json"));
    if (
      (pack &&
        (release.packHash !== source.packHash ||
          verification.packHash !== source.packHash)) ||
      release.status !== "approved-local-candidate" ||
      release.hash !== sourceHash ||
      release.buildHash !== sourceHash ||
      release.reviewHash !== sourceHash ||
      verification.ok !== true ||
      verification.hash !== sourceHash ||
      !events(sourceDir).some(
        (e) => e.type === "release.approved" && e.data?.hash === sourceHash,
      )
    )
      throw Error(
        "Recheck requires an approved release bound to the unchanged source candidate",
      );
  }
  for (const name of ["mission.md", "architecture.md"]) {
    const file = path.join(sourceArtifacts, name);
    if (
      fs.existsSync(file) &&
      (fs.lstatSync(file).isSymbolicLink() || !fs.statSync(file).isFile())
    )
      throw Error("Source context must be a plain file");
  }
  const id =
    (retry ? "factory-retry-" : "factory-recheck-") +
    new Date().toISOString().replace(/[:.]/g, "-");
  const dir = runPath(id);
  fs.mkdirSync(dir, { recursive: false, mode: 0o700 });
  const app = path.join(dir, "application");
  fs.cpSync(sourceApp, app, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
  requirePlainTree(app);
  if (digest(app) !== sourceHash || digest(sourceApp) !== sourceHash)
    throw Error("Source candidate changed while importing");
  const artifacts = path.join(dir, "artifacts");
  fs.mkdirSync(artifacts);
  if (retry) {
    save(path.join(artifacts, "source-failure.json"), {
      sourceRun: sourceId,
      sourceStatus: source.status,
      sourceHash,
      failures: events(sourceDir).filter((e) =>
        [
          "task.failed",
          "verification.failed",
          "release.blocked",
          "mission.failed",
        ].includes(e.type),
      ),
      note: "Historical failed-run evidence only; import does not establish approval",
    });
  } else {
    save(path.join(artifacts, "source-release.json"), release);
    save(path.join(artifacts, "source-verification.json"), verification);
  }
  const sourceEvidence = retry
    ? "artifacts/source-failure.json"
    : "artifacts/source-release.json";
  const sourceOwner = retry ? "factory-controller" : "release-verifier";
  save(path.join(artifacts, "source-import.json"), {
    schema: "kujo.factory.source-import/v1",
    sourceRun: sourceId,
    sourceHash,
    importedHash: digest(app),
    importedAt: new Date().toISOString(),
    operation: kind,
    sourceApproved: !retry,
    note: retry
      ? "Imported unverified candidate from failed run; independent gates must pass; no approval inherited"
      : "Imported existing approved source; no new implementation claimed",
  });
  for (const name of ["mission.md", "architecture.md"]) {
    const file = path.join(sourceArtifacts, name);
    if (fs.existsSync(file)) {
      if (fs.lstatSync(file).isSymbolicLink() || !fs.statSync(file).isFile())
        throw Error("Source context must be a plain file");
      fs.copyFileSync(file, path.join(artifacts, name));
    }
  }
  const recheckTasks = tasks
    .filter((t) => ["verify", "release"].includes(t.id))
    .map((t) => ({
      ...t,
      title:
        t.id === "verify"
          ? retry
            ? "Independently review and test unverified imported candidate"
            : "Independently revalidate imported candidate"
          : retry
            ? "Verify recovered local candidate"
            : "Verify revalidated local candidate",
      dependencies: t.id === "verify" ? [] : ["verify"],
      handoffFrom: t.id === "verify" ? sourceOwner : "code-reviewer",
    }));
  const recheckRoles = roles
    .filter((r) => recheckTasks.some((t) => t.agentId === r.id))
    .map((r) => ({ ...r, parent: null }));
  const config = {
    id,
    mission: source.mission,
    ...(pack ? { packHash: hashPack(pack), packId: pack.id } : {}),
    status: "running",
    startedAt: new Date().toISOString(),
    workspace,
    agentsRoot: path.resolve(agentsRoot),
    roles: recheckRoles,
    tasks: recheckTasks,
    stages: ["Verification", "Release"],
    kind,
    sourceApproved: !retry,
    sourceRun: sourceId,
    sourceHash,
  };
  if (pack) save(path.join(dir, "pack.json"), pack);
  save(path.join(dir, "run.json"), config);
  save(path.join(dir, "workflow.json"), {
    id: retry ? "factory-verification-retry" : "factory-revalidation",
    name:
      (retry
        ? "Retry verification of unverified candidate — "
        : "Revalidate existing candidate — ") + sourceId,
    tasks: recheckTasks.map((t) => ({
      id: t.id,
      name: t.title,
      agentId: t.agentId,
      dependsOn: t.dependencies,
      parallelSafe: false,
      timeoutMs: t.id === "verify" ? 3600000 : 600000,
    })),
  });
  event(dir, "mission.created", {
    summary: retry
      ? "Verification retry of unverified candidate from " +
        sourceId +
        "; import grants no approval"
      : "Revalidation of existing approved candidate from " +
        sourceId +
        "; no new software construction",
    artifacts: ["artifacts/source-import.json", sourceEvidence],
    data: { kind, sourceApproved: !retry, sourceRun: sourceId, sourceHash },
  });
  if (retry)
    event(dir, "candidate.imported", {
      summary:
        "Unverified source copied unchanged; verification and release gates remain pending",
      artifacts: ["artifacts/source-import.json", sourceEvidence],
      data: { sourceRun: sourceId, sourceHash, sourceApproved: false },
    });
  const handoffName = retry
    ? "retry-source-handoff.json"
    : "recheck-source-handoff.json";
  save(path.join(artifacts, handoffName), {
    schema: "kujo.handoff/v1",
    assignment: retry
      ? "retry-unverified-candidate"
      : "revalidate-imported-candidate",
    current_owner: sourceOwner,
    next_owner: "code-reviewer",
    permission_mode: "PROPOSE",
    goal: source.mission,
    scope:
      "Independently review and retest imported candidate " +
      sourceHash +
      " from " +
      sourceId,
    evidence: [
      { path: "artifacts/source-import.json" },
      { path: sourceEvidence },
    ],
    decisions: [
      retry
        ? "Failed source remains unverified; new independent review and executable checks are mandatory"
        : "Repeatability proof reuses existing approved source; this is not a new build mission",
    ],
    unresolved_questions: [],
    allowed_next_actions: [
      "Independent review, acceptance tests, bounded corrections, local release verification",
    ],
    stop_condition:
      "Block release on stale source, failed review or failed tests",
  });
  event(dir, "handoff.created", {
    agentId: "code-reviewer",
    taskId: "verify",
    summary: retry
      ? "Factory controller → independent reviewer: unverified candidate from failed run"
      : "Prior release verifier → independent reviewer: imported candidate for revalidation",
    artifacts: ["artifacts/" + handoffName],
    data: { from: sourceOwner, to: "code-reviewer" },
  });
  for (const t of recheckTasks)
    event(dir, "agent.assigned", {
      agentId: t.agentId,
      taskId: t.id,
      summary: t.title,
      dependencies: t.dependencies,
    });
  await executeRun(dir, config);
} else if (verb === "serve") {
  const port = Number(process.env.FACTORY_PORT || settings.port || 4380);
  const web = path.join(root, "factory/web");
  const server = createServer((req, res) => {
    const send = (code, data, mime = "application/json") => {
      res.writeHead(code, {
        "Content-Type": mime,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'",
      });
      res.end(mime === "application/json" ? JSON.stringify(data) : data);
    };
    if (req.method !== "GET") return send(405, { error: "Read-only observer" });
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host))
      return send(403, { error: "Loopback Host required" });
    try {
      const pathname = new URL(req.url, "http://127.0.0.1").pathname;
      if (pathname === "/api/runs") {
        const list = fs.existsSync(runsRoot)
          ? fs
              .readdirSync(runsRoot)
              .filter((id) => /^factory-/.test(id))
              .flatMap((id) => {
                try {
                  const r = readRun(id);
                  return [
                    {
                      id: r.id,
                      mission: r.mission,
                      status: r.status,
                      startedAt: r.startedAt,
                    },
                  ];
                } catch {
                  return [];
                }
              })
              .reverse()
          : [];
        return send(200, list);
      }
      if (pathname === '/api/catalog') return send(200, {
        schema: catalog.schema,
        roles: catalog.roles,
        skills: catalog.skills,
        workflows: catalog.workflows,
        authority: 'Read-only catalog; availability is not execution qualification',
      });
      const runMatch = pathname.match(/^\/api\/runs\/([a-zA-Z0-9_-]+)$/);
      if (runMatch) return send(200, readRun(runMatch[1]));
      let file,servingEvidence=false,evidenceBase;
      if (pathname.startsWith("/evidence/")) {
        const [, , id, ...parts] = decodeURIComponent(pathname).split("/");
        if (
          parts.some((p) => !p || p === "." || p === "..") ||
          parts.join("/").includes("\\")
        )
          return send(400, { error: "Invalid path" });
        const relative = parts.join("/");
        if (
          !relative.startsWith("artifacts/") &&
          ![
            "events.jsonl",
            "dispatch-process.json",
            "dispatch-result.json",
          ].includes(relative)
        )
          return send(403, { error: "Not exportable evidence" });
        servingEvidence=true;evidenceBase=runPath(id);
        file = path.join(evidenceBase, relative);
      } else {
        const relative =
          decodeURIComponent(pathname) === "/"
            ? "index.html"
            : decodeURIComponent(pathname).slice(1);
        file = path.resolve(web, relative);
        if (!file.startsWith(web + path.sep))
          return send(403, { error: "Invalid path" });
      }
      if(servingEvidence){
        let cursor=evidenceBase;
        if(fs.lstatSync(cursor).isSymbolicLink())return send(403,{error:"Evidence symlink rejected"});
        for(const part of path.relative(evidenceBase,file).split(path.sep)){cursor=path.join(cursor,part);if(fs.lstatSync(cursor).isSymbolicLink())return send(403,{error:"Evidence symlink rejected"});}
      }
      if (!fs.statSync(file).isFile() || fs.lstatSync(file).isSymbolicLink())
        return send(404, { error: "Not found" });
      const ext = path.extname(file);
      const mime = servingEvidence ? (ext===".json"?"application/json":"text/plain; charset=utf-8") :
        {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".woff2": "font/woff2",
          ".svg": "image/svg+xml",
          ".json": "application/json",
          ".md": "text/plain; charset=utf-8",
          ".jsonl": "text/plain; charset=utf-8",
        }[ext] || "text/plain; charset=utf-8";
      const body = fs.readFileSync(file);
      if (mime === "application/json") {
        res.writeHead(200, {
          "Content-Type": mime,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox; frame-ancestors 'none'",
        });
        return res.end(body);
      }
      return send(200, body, mime);
    } catch {
      return send(404, { error: "Not found" });
    }
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(`Factory Floor http://127.0.0.1:${port}`),
  );
} else
  console.log(
    "Commands: run <mission.txt> [--pack pack.json] | recheck <sourceRunId> | retry <failedRunId> | serve | roles/skills/workflows list|inspect|doctor|verify|sync | skills activate ID | team plan MISSION.json | evidence verify PATH. Configure FACTORY_RUNS, FACTORY_AGENTS_ROOT, FACTORY_DISPATCH_ROOT, KUJO_BIN, FACTORY_PORT.",
  );
