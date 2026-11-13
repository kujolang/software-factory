import fs from "node:fs";
// PID 1 owns an independent deadline: host CLI/controller death cannot stop it.
const lifetime =
  process.argv[2] === undefined ? 300000 : Number(process.argv[2]);
if (!Number.isSafeInteger(lifetime) || lifetime < 1000 || lifetime > 300000)
  process.exit(125);
setTimeout(() => process.exit(124), lifetime);

const privateParent = fs.statSync("/workspace/private");
if (privateParent.uid !== 0 || (privateParent.mode & 511) !== 448)
  process.exit(125);
fs.cpSync("/workspace/private/input/candidate", "/tmp/factory-source", {
  recursive: true,
});
const protect = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + "/" + entry.name;
    if (entry.isDirectory()) protect(p);
    else fs.chmodSync(p, 0o444);
  }
  fs.chmodSync(dir, 0o555);
};
protect("/tmp/factory-source");
process.chdir("/opt/factory");
fs.mkdirSync("/tmp/factory-control", { mode: 0o700 });
fs.mkdirSync("/tmp/factory-data", { mode: 0o777 });
fs.chmodSync("/tmp/factory-data", 0o777);
const timer = setInterval(() => {
  if (fs.existsSync("/tmp/factory-control/stop")) {
    clearInterval(timer);
    process.exit(0);
  }
}, 100);
