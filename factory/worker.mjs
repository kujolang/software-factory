import {assertMissionOperationsBudget} from './operations-policy.mjs';
import {recordMissionCheckpoint} from './operations.mjs';
import {evaluateLens,verifyLensBinding} from './lens.mjs';
import {roleContract,admitRoleProposal,skillContext,validateProviderRouting,collectCandidateConsultations} from './role-runtime.mjs';
import {inspectRunAccounting} from './accountability.mjs';
import {evaluateVerification,verifyEvaluationBinding} from './evaluation.mjs';
import {prepareReleasePolicy,finalizeReleasePolicy,assertReleasePolicy} from './release-policy.mjs';
import {captureMissionFailure} from './lifecycle.mjs';
import {executeProposal} from './providers.mjs';
import {loadRole,validateRolePayload,validateHandoff} from './catalog.mjs';
import { runPack, runtimeContract, hashPack } from "./pack.mjs";
import { model, provider, ollamaHost } from "./settings.mjs";
import { startIsolatedApp } from "./workcell.mjs";
import fs from "node:fs";
import path from "node:path";
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
const workerIdentity=createHash("sha256").update(fs.readFileSync(import.meta.filename)).digest("hex");
const [dir, taskId] = process.argv.slice(2);
const config = json(path.join(dir, "run.json"));
const task = config.tasks.find((t) => t.id === taskId);
if (!task) throw Error("Unknown task");
const app = path.join(dir, "application");
const artifact = path.join(dir, "artifacts");
fs.mkdirSync(artifact, { recursive: true });
const pack = runPack(dir, config);
const contract = pack
  ? runtimeContract +
    "\nProduct contract:\n" +
    pack.contract +
    "\nFrozen requirements and tests:\n" +
    JSON.stringify(pack)
  : fs.readFileSync(path.join(root, "factory/contract.md"), "utf8");
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
  validateHandoff(h, {base: agentsRoot});
  save(path.join(artifact, id + "-handoff.json"), h);
  emit("handoff.created", `${from} → ${to}`, {
    artifacts: ["artifacts/" + id + "-handoff.json"],
    data: { from, to },
  });
}
async function agent(role, id, prompt) {
  const rolePath = path.join(agentsRoot, "chain-of-command", role);
  const runtimeContract = roleContract("chain." + role, {base: agentsRoot});
  const canonicalRole = runtimeContract.role;
  const selectedSkills=skillContext(config.teamPlan?.skills.map(skill=>skill.id)||[]);
  const route=validateProviderRouting(config.providerRouting||{})[role]||config.executionProvider||{provider,model};
  const instructions = canonicalRole.instructions;
  validateRolePayload(canonicalRole, "input", Object.fromEntries(canonicalRole.manifest.inputs.map(field => [field.name, prompt])));
  const start = Date.now();
  event(dir, "agent.started", {agentId:role,taskId,summary:`${role} processing ${id}`,artifacts:["artifacts/"+id+"-work-order.json"]});
  save(path.join(artifact,id+"-work-order.json"), {role,taskId,mission:config.mission,scope:prompt,contractSource:path.relative(config.workspace,rolePath),permission:"PROPOSE",startedAt:new Date(start).toISOString()});
  const record = receipt => save(path.join(artifact,id+"-receipt.json"), {
    ...receipt, role, taskId,
    roleContractSha256:createHash("sha256").update(instructions).digest("hex"),
    canonicalContractSha256:runtimeContract.identity,
    skillActivations:selectedSkills.map(({guidance,...receipt})=>receipt),
    workerSha256:workerIdentity,
    usageKnown:receipt.usage!==null,
    usage:receipt.usage===null?[]:Array.isArray(receipt.usage)?receipt.usage:[receipt.usage],
  });
  let response;
  try {
    response = await executeProposal({provider:route.provider,model:route.model??undefined,ollamaHost,
      schema:runtimeContract.schema,
      prompt:"You are a text-only proposal agent. No tools, file reads, executions, or additional agents. Return JSON matching the supplied schema. No markdown fences inside content. Role contract:\n"+instructions+"\nSelected skill guidance (does not authorize effects):\n"+JSON.stringify(selectedSkills)+"\nFill every canonical deliverables field with specific findings; distinguish proposals, unexecuted checks and observed results.\nHuman mission:\n"+config.mission+"\nAcceptance contract:\n"+contract+"\nWork order:\n"+prompt,
    });
  } catch(error) {if(error.receipt)record(error.receipt);throw error;}
  record(response.receipt);
  const allowedFiles=task.kind==="consultation"?()=>false:role==="backend-developer"?backendAllowed:role==="frontend-developer"?frontendAllowed:role==="general-commander"?p=>p==="mission.md":role==="systems-architect"?p=>p==="architecture.md":()=>false;
  let result;
  try{result=admitRoleProposal(runtimeContract,response.output,{allowedFiles});}
  catch(error){
    const rejected=id+"-rejected-proposal.json";
    save(path.join(artifact,rejected),{schema:"kujo.factory.rejected-role-proposal/v1",role,reason:error.message,proposal:response.output,authority:"Untrusted rejected proposal; no effects admitted"});
    await captureMissionFailure(dir,{kind:"role-permission-rejection",taskId,summary:error.message,evidence:["artifacts/"+rejected]});
    throw error;
  }
  save(path.join(artifact,id+"-proposal.json"),result);
  event(dir,result.verdict==="fail"?"agent.blocked":"agent.completed",{agentId:role,taskId,summary:result.summary,artifacts:["artifacts/"+id+"-proposal.json","artifacts/"+id+"-receipt.json"]});
  return result;
}
const backendAllowed = (p) => ["server.mjs", "db.mjs"].includes(p);
const frontendAllowed = (p) =>
  /^public\/[a-zA-Z0-9_-]+\.(html|css|js|svg)$/.test(p);
async function check() {
  const before = digest(app);
  if (pack) {
    runPack(dir, config);
    const evidence = path.join(artifact, `pack-check-${Date.now()}`);
    const r = await command(
      process.execPath,
      [
        path.join(root, "factory/pack-acceptance.mjs"),
        app,
        path.join(dir, "pack.json"),
        evidence,
      ],
      { timeout: 300000, maxBytes: 200000 },
    );
    let result;
    try {
      result = JSON.parse(r.out.trim());
    } catch {}
    if (
      r.code !== 0 ||
      !result?.ok ||
      result.packHash !== config.packHash ||
      result.checks.length !== pack.api.length ||
      digest(app) !== before
    ) {
      r.code = 1;
      r.err +=
        "\nPack acceptance failed: " +
        (result?.failure || "Missing or stale report");
    }
    if (result?.browser)
      r.browser = {
        ...result.browser,
        report: path.relative(dir, result.browser.report),
      };
    r.packHash = config.packHash;
    r.evidenceFile="artifacts/acceptance-"+Date.now()+".json";
    save(path.join(dir,r.evidenceFile),r);
    return r;
  }
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
  r.evidenceFile=path.relative(dir,acceptancePath);
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
  productDocs(app, pack);
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
  if(config.accountabilityRequired!==true)throw Error("Worker requires controller-started mission accounting");
  const accounting=await inspectRunAccounting(json(path.join(artifact,"accounting-start.json")));
  if(accounting.record.status!=="in_progress"||accounting.record.task_name!==config.id)throw Error("Worker accounting identity is not active for this mission");
  assertMissionOperationsBudget(dir);
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
  if(task.kind === "consultation") {
    const consultationSource=task.consultationPhase==="verified-candidate"?digest(app):null;
    const verificationBytes=consultationSource?fs.readFileSync(path.join(artifact,"verification.json")):null;
    if(consultationSource){const verified=JSON.parse(verificationBytes);if(verified.ok!==true||verified.hash!==consultationSource)throw Error("Consultation requires unchanged verified candidate");}
    const r=await agent(task.agentId,taskId,"Provide bounded advisory role deliverables for the supplied mission and frozen contract. Return files:[]; never claim tests ran or grant approval. Identify prerequisites and unresolved questions. Prior consultation evidence:\n"+task.dependencies.map(id=>fs.readFileSync(path.join(artifact,id==="verify"?"verification.json":id+"-proposal.json"),"utf8")).join("\n")+(task.consultationPhase==="verified-candidate"?"\nCurrent verified source (read only):\n"+snapshot(app):""));
    if(consultationSource){
      if(digest(app)!==consultationSource||!fs.readFileSync(path.join(artifact,"verification.json")).equals(verificationBytes))throw Error("Verified candidate changed during consultation");
      save(path.join(artifact,taskId+"-candidate-binding.json"),{schema:"kujo.factory.candidate-consultation/v1",taskId,role:task.agentId,sourceHash:consultationSource,verificationSha256:createHash("sha256").update(verificationBytes).digest("hex"),proposalSha256:createHash("sha256").update(fs.readFileSync(path.join(artifact,taskId+"-proposal.json"))).digest("hex"),receiptSha256:createHash("sha256").update(fs.readFileSync(path.join(artifact,taskId+"-receipt.json"))).digest("hex"),approvalGranted:false,deploymentAuthorized:false});
    }
    if(r.verdict==="fail")throw Error("Canonical consultation escalated: "+r.summary);
  } else if (taskId === "command") {
    const r = await agent(
      "general-commander",
      "command",
      'Interpret mission; produce mission.md containing objectives, non-goals, constraints, concrete delegation to systems-architect, backend-developer, frontend-developer, code-reviewer, test-runner, release-verifier. Explicitly bound acceptance and no deployment. Use files:[{path:"mission.md",content:...}].' + (config.teamPlan ? '\nPrior canonical consultations:\n'+config.tasks.filter(t=>t.kind==='consultation'&&t.consultationPhase!=='verified-candidate').map(t=>fs.readFileSync(path.join(artifact,t.id+'-proposal.json'),'utf8')).join('\n') : ''),
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
        : "Implement polished complete responsive frontend in public/index.html, public/style.css, public/app.js. Standard library browser APIs. No backend files. Include the interactions required by the product contract, with accessible labels. All required controls usable without drag/drop.";
    const r = await agent(
      task.agentId,
      taskId,
      scope +
        " Return complete source files; no placeholders. Architecture context:\n" +
        fs.readFileSync(path.join(artifact, "architecture.md"), "utf8"),
    );
    if (r.verdict === "fail" || r.files.length === 0) {
      proposalBlocked = true;
      await captureMissionFailure(dir,{kind:"proposal-rejection",taskId,summary:r.summary.slice(0,16000),evidence:["artifacts/"+taskId+"-proposal.json"]});
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
      productDocs(app, pack);
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
        const verification={
          ok: true,
          ...(pack ? { packHash: config.packHash } : {}),
          hash: digest(app),
          attempt: n + 1,
          review: "review-" + n + "-binding.json",
          acceptance: checked,
          verifiedAt: new Date().toISOString(),
        };
        const evaluation=await evaluateVerification({dir,sourceHash:verification.hash,verification,review:json(path.join(artifact,verification.review)),browser:json(path.join(dir,checked.browser.report)),packHash:config.packHash||null});
        save(path.join(artifact,"evaluation.json"),evaluation);
        if(!evaluation.ok)throw Error("Native Eval rejected verification evidence; release blocked");
        save(path.join(artifact,"verification.json"),verification);
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
      await captureMissionFailure(dir,{kind:"verification-failure",taskId,summary:`Attempt ${n+1} rejected: `+(reviewResult.issues.join('; ')+" "+checked.err).slice(0,15000),evidence:["artifacts/review-"+n+"-proposal.json","artifacts/review-"+n+"-binding.json",...(checked.evidenceFile?[checked.evidenceFile]:[])]});
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
    verifyEvaluationBinding(json(path.join(artifact,"evaluation.json")),{sourceHash:v.hash,packHash:config.packHash||null,dir});
    const testContract = json(path.join(app, "tests/contract.json"));
    const trustedHarnesses = pack
      ? [
          "factory/pack.mjs",
          "factory/pack-acceptance.mjs",
          "factory/workcell-image/pack-browser.mjs",
          "factory/workcell.mjs",
        ]
      : [
          "factory/acceptance.mjs",
          "factory/workcell-image/browser-check.mjs",
          "factory/workcell.mjs",
        ];
    if (
      testContract.sources?.length !== trustedHarnesses.length ||
      trustedHarnesses.some((file) => {
        const expected = createHash("sha256")
          .update(fs.readFileSync(path.join(root, file)))
          .digest("hex");
        return (
          testContract.sources.find((source) => source.path === file)
            ?.sha256 !== expected
        );
      })
    )
      throw Error(
        "Trusted test harness changed since review; fresh verification required",
      );
    const buildCommand = ["workcell", "trusted-image-syntax-build"];
    const buildLease = await startIsolatedApp(app, {
      evidenceDir: path.join(artifact, `workcell-build-${Date.now()}`),
    });
    let built,lens;
    try {
      built = await buildLease.syntaxBuild();
      if(built.code===0){
        lens=await evaluateLens({lease:buildLease,dir,sourceHash:v.hash});
        save(path.join(artifact,"lens.json"),lens);
        if(!lens.ok||digest(app)!==v.hash)throw Error("Native Lens blocked local release; retained findings require review");
      }
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
      ...(pack ? { packHash: config.packHash, packId: pack.id } : {}),
      verification: v,
      lens,
      commands: {
        api: pack
          ? [
              process.execPath,
              path.join(root, "factory/pack-acceptance.mjs"),
              app,
              path.join(dir, "pack.json"),
              "EVIDENCE_DIR",
            ]
          : [process.execPath, path.join(root, "factory/acceptance.mjs"), app],
        browser: pack
          ? ["workcell", "pack-browser.mjs", config.packHash]
          : [
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
      advisoryConsultations: collectCandidateConsultations({dir,config,sourceHash:v.hash}),
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
    const releasePolicy=await prepareReleasePolicy({dir,app,packet});
    assertReleasePolicy(releasePolicy);
    const r = await agent(
      "release-verifier",
      "release",
      "Assess this complete evidence packet for the bounded LOCAL release candidate only. No deployment is requested. Return files:[], verdict pass/fail with concrete blockers grounded in evidence. Build and broad equivalent acceptance checks were actually executed; do not require optional branded tools merely for their names. Assess requiredCheckResults and advisoryCheckResults under the pinned local release policy; the full upstream ShipCheck aggregate covers metadata-only staging, while actual acceptance and build evidence are separate. Retain independent judgment and reject concrete blockers. Evidence:\n" +
        JSON.stringify({...packet,releasePolicy}),
    );
    if (r.verdict !== "pass")
      throw Error("Release verifier rejected candidate");
    // Repeat acceptance after the independent verdict and before copying exact bytes.
    const checked = await check();
    if (pack && runPack(dir, config) && v.packHash !== config.packHash)
      throw Error("Verification pack binding mismatch");
    if (checked.code !== 0 || v.hash !== digest(app))
      throw Error("Final recheck failed");
    assertReleasePolicy(finalizeReleasePolicy({dir,app,packet,checked}));
    verifyEvaluationBinding(json(path.join(artifact,"evaluation.json")),{sourceHash:v.hash,packHash:config.packHash||null,dir});
    const buildDir = path.join(artifact, "verified-build");
    fs.mkdirSync(buildDir, { recursive: true });
    for (const p of files(app)) {
      const target = path.join(buildDir, p);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(app, p), target);
    }
    verifyLensBinding(lens,{dir,sourceHash:v.hash});
    save(path.join(artifact, "release-verified.json"), {
      lens,
      status: "verified-pending-accountability",
      ...(pack ? { packHash: config.packHash } : {}),
      hash: digest(app),
      buildHash: digest(buildDir),
      checks: checked,
      reviewHash: v.hash,
      deploymentAuthorized: false,
    });
    emit(
      "release.verified",
      "Independent gates passed; awaiting mandatory accounting before local approval",
      { artifacts: ["artifacts/release-verified.json"], data: { hash: digest(app) } },
    );
  }
  emit(
    proposalBlocked ? "task.blocked" : "task.completed",
    proposalBlocked
      ? "Proposal returned without implementation; verification must route correction"
      : task.title + " complete",
  );
  if(!proposalBlocked&&fs.existsSync(path.join(artifact,"recovery-binding.json")))recordMissionCheckpoint(dir,taskId);
  console.log(JSON.stringify({ ok: true, data: { taskId } }));
} catch (e) {
  emit("task.failed", String(e.message));
  try{await captureMissionFailure(dir,{kind:"task-failure",taskId,summary:String(e.message).slice(0,16000)});}catch(captureError){emit("accountability.failed","Failure evidence retained but CaseFile unavailable: "+captureError.message);}
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
