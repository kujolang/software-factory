import {workcellBinary, kujoBinary} from './settings.mjs';
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import { spawn } from "node:child_process";
import { command, save, root } from "./core.mjs";
const workspace = path.dirname(root);
const executable = workcellBinary;
const kujo = process.env.FACTORY_WORKCELL_KUJO || kujoBinary();
const image =
  process.env.FACTORY_WORKCELL_IMAGE || "kujolang/factory-node:local";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(promise, ms) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function checked(bin, args, options = {}) {
  const r = await command(bin, args, { timeout: 30000, ...options });
  if (r.code !== 0 || r.reason)
    throw Error(
      `${bin} ${args[0]} failed: ${r.err.slice(-2000)} ${r.out.slice(-2000)}`,
    );
  return r;
}
async function docker(args, options = {}) {
  return checked("docker", args, options);
}
function copyCandidate(source, target) {
  let bytes = 0,
    count = 0;
  const visit = (dir, rel = "") => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name),
        r = path.join(rel, entry.name);
      const st = fs.lstatSync(p);
      if (
        st.isSymbolicLink() ||
        (!st.isFile() && !st.isDirectory()) ||
        entry.name === ".git"
      )
        throw Error("Candidate contains forbidden entry");
      if (st.isDirectory()) {
        fs.mkdirSync(path.join(target, r), { recursive: true });
        visit(p, r);
      } else {
        if (st.nlink !== 1) throw Error("Candidate hardlink forbidden");
        bytes += st.size;
        if (++count > 200 || bytes > 10_000_000)
          throw Error("Candidate input cap");
        fs.copyFileSync(p, path.join(target, r));
        fs.chmodSync(path.join(target, r), 0o444);
      }
    }
  };
  fs.mkdirSync(target);
  visit(source);
  return { files: count, bytes };
}
export async function workcellPreflight() {
  if (process.env.DOCKER_HOST && process.env.DOCKER_CONTEXT)
    throw Error('Set only one Docker endpoint selector');
  let endpoint = process.env.DOCKER_HOST;
  if (!endpoint) {
    const context = process.env.DOCKER_CONTEXT || (await docker(['context', 'show'])).out.trim();
    endpoint = JSON.parse((await docker(['context', 'inspect', context])).out)[0]?.Endpoints?.docker?.Host;
  }
  if (typeof endpoint !== 'string' || !endpoint.startsWith('unix:///'))
    throw Error('Factory requires a local Unix Docker socket; remote engines are unsupported');
  const info = JSON.parse(
    (await docker(["info", "--format", "{{json .SecurityOptions}}"])).out,
  );
  if (
    !info.some((x) => x.includes("rootless")) ||
    !info.some((x) => x.includes("seccomp"))
  )
    throw Error(
      "Factory requires rootless Docker with seccomp; no insecure fallback",
    );
  const doctor = await checked(
    executable,
    ["doctor", "--backend", "docker", "--repo", root, "--json"],
    { env: { KUJO: kujo }, cwd: workspace },
  );
  const inspect = JSON.parse(
    (await docker(["image", "inspect", image])).out,
  )[0];
  if (!/^sha256:[a-f0-9]{64}$/.test(inspect.Id)) throw Error("Unpinned image");
  return {
    image,
    imageId: inspect.Id,
    securityOptions: info,
    doctor: JSON.parse(doctor.out.trim()),
    kujo,
  };
}
export async function startIsolatedApp(
  appDir,
  { evidenceDir, timeoutMs = 300000 } = {},
) {
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1000 ||
    timeoutMs > 300000
  )
    throw Error("Invalid Workcell deadline (1000..300000 ms)");
  if (!evidenceDir) throw Error("Workcell evidence directory required");
  evidenceDir = path.resolve(evidenceDir);
  fs.mkdirSync(evidenceDir, { recursive: true });
  const preflight = await workcellPreflight();
  save(path.join(evidenceDir, "preflight.json"), preflight);
  const tempRoot = path.join(root, ".runtime", "workcell-tmp");
  fs.mkdirSync(tempRoot, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(tempRoot, "factory-workcell-"));
  const source = path.join(scratch, "source");
  fs.mkdirSync(source);
  let copied;
  try {
    copied = copyCandidate(
      path.resolve(appDir),
      path.join(source, "candidate"),
    );
  } catch (e) {
    fs.rmSync(scratch, { recursive: true, force: true });
    throw e;
  }
  const name = "factory-" + crypto.randomUUID();
  const definition = {
    version: 1,
    name,
    runtime: {
      backend: "docker",
      image,
      image_digest: preflight.imageId,
      require_digest: true,
    },
    workspace: {
      strategy: "isolated-clone",
      mount_path: "/workspace/private/input",
      run_as: "rootless",
      scan: { max_files: 500, max_bytes: 20000000, max_depth: 16 },
    },
    command: ["node", "/opt/factory/keepalive.mjs", String(timeoutMs)],
    environment: { allow: [], set: {} },
    secrets: [],
    resources: {
      cpus: 1,
      memory: "1g",
      pids: 256,
      timeout_ms: timeoutMs,
      max_output_bytes: 262144,
    },
    network: { mode: "none" },
    filesystem: { read_only_root: true, tmpfs: ["/tmp"] },
    artifacts: { export: [] },
    cleanup: { keep_failed: false },
    trust_profile: "native-guarded",
    receipt: { path: ".workcell/runs" },
  };
  try {
    save(path.join(source, "workcell.json"), definition);
    await checked("git", ["init", "-q", source]);
    await checked("git", ["-C", source, "add", "."]);
    await checked("git", [
      "-C",
      source,
      "-c",
      "user.name=Factory",
      "-c",
      "user.email=factory@localhost",
      "commit",
      "-qm",
      "Isolated candidate input",
    ]);
  } catch (e) {
    fs.rmSync(scratch, { recursive: true, force: true });
    throw e;
  }
  save(path.join(evidenceDir, "definition.json"), definition);
  save(path.join(evidenceDir, "input.json"), copied);
  const outputRoot = path.join(scratch, "runs");
  let runOut = "",
    runErr = "",
    appOut = "",
    appBytes = 0,
    appViolation = "",
    container,
    proxy,
    closed = false,
    runResult,
    appChild;
  const child = spawn(
    executable,
    [
      "run",
      "--file",
      path.join(source, "workcell.json"),
      "--repo",
      source,
      "--output",
      outputRoot,
      "--no-pull",
      "--summary",
    ],
    {
      cwd: source,
      env: { ...process.env, KUJO: kujo, TMPDIR: tempRoot },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (c) => {
    runOut += c;
    if (runOut.length > 300000) child.kill("SIGTERM");
  });
  child.stderr.on("data", (c) => {
    runErr += c;
    if (runErr.length > 300000) child.kill("SIGTERM");
  });
  const ended = new Promise((resolve) => {
    child.on("error", (e) => {
      runResult = { code: -1, error: e.message };
      resolve(runResult);
    });
    child.on("exit", (code, signal) => {
      runResult = { code, signal };
      resolve(runResult);
    });
  });
  const control = async (action, user = "0:0") =>
    docker(
      [
        "exec",
        "--workdir",
        "/tmp",
        "--user",
        user,
        container,
        "node",
        "/opt/factory/control.mjs",
        action,
      ],
      { timeout: 10000 },
    );
  const launch = () => {
    appChild = spawn(
      "docker",
      [
        "exec",
        "--workdir",
        "/tmp",
        "--user",
        "65534:65534",
        container,
        "node",
        "/opt/factory/app.mjs",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    for (const stream of [appChild.stdout, appChild.stderr])
      stream.on("data", (c) => {
        appBytes += c.length;
        appOut = (appOut + c).slice(-65536);
        if (appBytes > 262144 && !appViolation) {
          appViolation = "Candidate diagnostic output exceeded 262144 bytes";
          const stop = spawn("docker", ["kill", container], {
            stdio: "ignore",
          });
          stop.on("error", () => {});
        }
      });
    appChild.on("error", () => {});
  };
  const request = async (method, url, body, headers = {}) => {
    const r = await docker(
      [
        "exec",
        "--workdir",
        "/tmp",
        "-i",
        "--user",
        "0:0",
        container,
        "node",
        "/opt/factory/http-bridge.mjs",
      ],
      {
        timeout: 10000,
        maxBytes: 800000,
        input: JSON.stringify({
          method,
          path: url,
          headers,
          body: body?.toString("base64") || "",
        }),
      },
    );
    const parsed = JSON.parse(r.out);
    if (
      !Number.isInteger(parsed.status) ||
      parsed.status < 100 ||
      parsed.status > 599 ||
      typeof parsed.body !== "string"
    )
      throw Error("Invalid bridge response");
    return parsed;
  };
  const health = async () => {
    const limit = Date.now() + 15000;
    while (Date.now() < limit) {
      try {
        const r = await request("GET", "/api/health");
        if (r.status === 200) return;
      } catch {}
      if (runResult) throw Error("Workcell stopped during app startup");
      await wait(150);
    }
    throw Error("Isolated application did not become healthy");
  };
  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      proxy?.closeAllConnections();
      await new Promise((r) => (proxy?.listening ? proxy.close(r) : r()));
      if (container) {
        try {
          await control("restart", "65534:65534");
        } catch {}
        try {
          await control("stop");
        } catch {}
      }
      const terminal = await until(ended, 20000);
      if (!terminal) {
        if (container) await docker(["rm", "-f", container]).catch(() => {});
        child.kill("SIGTERM");
        await until(ended, 5000);
      }
      save(path.join(evidenceDir, "process.json"), {
        result: runResult,
        stdout: runOut,
        stderr: runErr,
        applicationDiagnostic: appOut,
        applicationOutputBytes: appBytes,
        applicationViolation: appViolation,
      });
      const dirs = fs.existsSync(outputRoot) ? fs.readdirSync(outputRoot) : [];
      for (const id of dirs) {
        const src = path.join(outputRoot, id);
        if (fs.statSync(src).isDirectory()) {
          fs.cpSync(src, path.join(evidenceDir, id), { recursive: true });
          const verify = await command(
            executable,
            ["verify", "--run", path.join(evidenceDir, id), "--json"],
            { env: { KUJO: kujo }, timeout: 30000 },
          );
          save(path.join(evidenceDir, id + "-verify.json"), verify);
          if (
            verify.code !== 0 ||
            verify.reason ||
            JSON.parse(verify.out).ok !== true
          )
            throw Error("Workcell receipt integrity verification failed");
        }
      }
      if (container) {
        const remain = await docker([
          "ps",
          "-aq",
          "--filter",
          "label=dev.kujo.workcell.project=" + name,
        ]);
        save(path.join(evidenceDir, "cleanup.json"), {
          ok: !remain.out.trim(),
          container,
          name,
        });
        if (remain.out.trim()) throw Error("Owned container remains");
      }
      if (runResult?.code !== 0 || !dirs.length || appViolation)
        throw Error(
          "Workcell did not finish successfully with a verified receipt",
        );
    } finally {
      if (container)
        await command("docker", ["rm", "-f", container], {
          timeout: 10000,
          maxBytes: 2000,
        }).catch(() => {});
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  };
  try {
    const limit = Date.now() + 30000;
    while (Date.now() < limit) {
      const listed = await docker([
        "ps",
        "-q",
        "--filter",
        "label=dev.kujo.workcell.project=" + name,
      ]);
      const ids = listed.out.trim().split("\n").filter(Boolean);
      if (ids.length > 1) throw Error("Ambiguous owned container");
      if (ids.length === 1) {
        container = ids[0];
        break;
      }
      if (runResult) throw Error("Workcell launch failed " + runOut + runErr);
      await wait(200);
    }
    if (!container) throw Error("Workcell startup deadline");
    const inspection = JSON.parse(
      (await docker(["inspect", container])).out,
    )[0];
    save(path.join(evidenceDir, "container.json"), inspection);
    if (
      inspection.HostConfig.NetworkMode !== "none" ||
      !inspection.HostConfig.ReadonlyRootfs ||
      !inspection.HostConfig.CapDrop?.includes("ALL") ||
      inspection.HostConfig.Privileged ||
      inspection.Image !== preflight.imageId ||
      !inspection.HostConfig.SecurityOpt?.some((v) =>
        v.includes("no-new-privileges"),
      ) ||
      inspection.HostConfig.Memory !== 1073741824 ||
      inspection.HostConfig.PidsLimit !== 256 ||
      inspection.HostConfig.NanoCpus !== 1000000000 ||
      inspection.Mounts.filter((m) => m.Type === "bind").length !== 1 ||
      inspection.Mounts.some(
        (m) =>
          m.Type === "bind" && m.Destination !== "/workspace/private/input",
      ) ||
      ![image, preflight.imageId].includes(inspection.Config.Image)
    )
      throw Error("Observed container policy mismatch");
    const readyDeadline = Date.now() + 10000;
    while (true) {
      const ready = await command(
        "docker",
        [
          "exec",
          "--workdir",
          "/tmp",
          "--user",
          "0:0",
          container,
          "node",
          "-e",
          "process.exit(require('fs').existsSync('/tmp/factory-control')?0:1)",
        ],
        { timeout: 3000 },
      );
      if (ready.code === 0) break;
      if (Date.now() > readyDeadline)
        throw Error("Trusted control initialization deadline");
      await wait(100);
    }
    const effective = await docker([
      "exec",
      "--workdir",
      "/tmp",
      "--user",
      "0:0",
      container,
      "node",
      "-e",
      "const fs=require('fs');console.log(JSON.stringify({memory:fs.readFileSync('/sys/fs/cgroup/memory.max','utf8').trim(),pids:fs.readFileSync('/sys/fs/cgroup/pids.max','utf8').trim(),cpu:fs.readFileSync('/sys/fs/cgroup/cpu.max','utf8').trim(),status:fs.readFileSync('/proc/self/status','utf8'),privateParent:{uid:fs.statSync('/workspace/private').uid,mode:fs.statSync('/workspace/private').mode&511},source:{uid:fs.statSync('/tmp/factory-source/server.mjs').uid,mode:fs.statSync('/tmp/factory-source/server.mjs').mode&511}}))",
    ]);
    const effectivePolicy = JSON.parse(effective.out);
    save(path.join(evidenceDir, "effective.json"), effectivePolicy);
    if (
      effectivePolicy.memory !== "1073741824" ||
      effectivePolicy.pids !== "256" ||
      effectivePolicy.cpu !== "100000 100000" ||
      !/^CapEff:\s+0000000000000000$/m.test(effectivePolicy.status) ||
      effectivePolicy.privateParent.uid !== 0 ||
      effectivePolicy.privateParent.mode !== 448 ||
      effectivePolicy.source.uid !== 0 ||
      effectivePolicy.source.mode !== 292 ||
      !/^NoNewPrivs:\s+1$/m.test(effectivePolicy.status) ||
      !/^Seccomp:\s+2$/m.test(effectivePolicy.status)
    )
      throw Error("Effective isolation policy mismatch");
    await docker([
      "exec",
      "--workdir",
      "/tmp",
      "--user",
      "1000:1000",
      container,
      "node",
      "-e",
      "require('fs').mkdirSync('/tmp/factory-browser',{mode:0o700})",
    ]);
    launch();
    await health();
    proxy = http.createServer(async (req, res) => {
      try {
        const expected = `127.0.0.1:${proxy.address().port}`;
        if (req.headers.host !== expected) return res.writeHead(403).end();
        let body = Buffer.alloc(0);
        for await (const c of req) {
          body = Buffer.concat([body, c]);
          if (body.length > 131072) return res.writeHead(413).end();
        }
        const headers = { ...req.headers };
        if (headers.origin === `http://${expected}`)
          headers.origin = "http://127.0.0.1:4381";
        const r = await request(req.method, req.url, body, headers);
        for (const key of [
          "connection",
          "transfer-encoding",
          "content-length",
          "set-cookie",
        ])
          delete r.headers[key];
        res.writeHead(r.status, r.headers);
        res.end(Buffer.from(r.body, "base64"));
      } catch {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end('{"error":"Isolated application unavailable"}');
      }
    });
    await new Promise((r) => proxy.listen(0, "127.0.0.1", r));
    const browserOperation = async (mode, target) => {
      const script =
        mode === "check" ? "browser-check.mjs" : "browser-demo.mjs";
      const run = await command(
        "docker",
        [
          "exec",
          "--workdir",
          "/tmp",
          "--user",
          "1000:1000",
          container,
          "node",
          "/opt/factory/" + script,
        ],
        { timeout: 180000, maxBytes: 200000 },
      );
      save(path.join(evidenceDir, "browser-" + mode + "-command.json"), run);
      const dest =
        mode === "check"
          ? path.dirname(path.resolve(target))
          : path.resolve(target);
      fs.mkdirSync(dest, { recursive: true });
      const names =
        mode === "check"
          ? [
              "browser-acceptance.json",
              "browser-acceptance-desktop.png",
              "browser-acceptance-mobile.png",
              "browser-acceptance-failure.png",
            ]
          : ["demo.json", "demo.png", "demo.webm"];
      for (const name of names) {
        const output =
          mode === "check"
            ? path
                .resolve(target)
                .replace(/\.json$/, name.slice("browser-acceptance".length))
            : path.join(dest, name);
        const stat = await command(
          "docker",
          [
            "exec",
            "--workdir",
            "/tmp",
            "--user",
            "1000:1000",
            container,
            "node",
            "-e",
            "const fs=require('fs'),p=process.argv[1],s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>67108864)process.exit(1)",
            "/tmp/factory-browser/" + name,
          ],
          { timeout: 5000 },
        );
        if (stat.code !== 0) {
          if (name.endsWith(".json"))
            throw Error("Missing or oversized protected report");
          continue;
        }
        const copied = await command(
          "docker",
          [
            "exec",
            "--workdir",
            "/tmp",
            "--user",
            "1000:1000",
            container,
            "node",
            "-e",
            "const fs=require('fs'),p=process.argv[1],s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>67108864)process.exit(1);process.stdout.write(fs.readFileSync(p).toString('base64'))",
            "/tmp/factory-browser/" + name,
          ],
          { timeout: 30000, maxBytes: 90000000 },
        );
        if (copied.code !== 0 || copied.reason)
          throw Error("Protected browser artifact read failed");
        const bytes = Buffer.from(copied.out, "base64");
        if (bytes.length > 67108864) throw Error("Browser artifact cap");
        fs.writeFileSync(output, bytes);
      }
      return run;
    };
    return {
      url: `http://127.0.0.1:${proxy.address().port}`,
      proxyURL: `http://127.0.0.1:${proxy.address().port}`,
      evidenceDir,
      container,
      request,
      runBrowserCheck: (target) => browserOperation("check", target),
      runBrowserDemo: (target) => browserOperation("demo", target),
      async restart() {
        await control("restart", "65534:65534");
        launch();
        await health();
      },
      async syntaxBuild() {
        return docker(
          [
            "exec",
            "--workdir",
            "/tmp",
            "--user",
            "0:0",
            container,
            "node",
            "/opt/factory/build.mjs",
          ],
          { timeout: 30000 },
        );
      },
      close,
    };
  } catch (e) {
    await close().catch(() => {});
    throw e;
  }
}
