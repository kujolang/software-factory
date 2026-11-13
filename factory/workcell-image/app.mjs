import { pathToFileURL } from "node:url";
process.chdir("/tmp/factory-source");
const { createServer } = await import(
  pathToFileURL("/tmp/factory-source/server.mjs")
);
const server = createServer({ dbPath: "/tmp/factory-data/issues.sqlite" });
server.listen(4381, "127.0.0.1");
