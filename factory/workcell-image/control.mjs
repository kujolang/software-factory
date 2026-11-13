import fs from "node:fs";
const action = process.argv[2];
if (action === "stop" && process.getuid() === 0) {
  fs.writeFileSync("/tmp/factory-control/stop", "stop");
} else if (action === "restart" && process.getuid() === 65534) {
  for (const id of fs
    .readdirSync("/proc")
    .filter((p) => /^\d+$/.test(p) && Number(p) !== process.pid))
    try {
      const s = fs.readFileSync(`/proc/${id}/status`, "utf8");
      if (/^Uid:\s+65534\s/m.test(s)) process.kill(Number(id), "SIGKILL");
    } catch {}
} else throw Error("Invalid control action/identity");
