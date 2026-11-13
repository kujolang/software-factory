// Trusted image code. Candidate runs under UID65534 and cannot replace this file.
import http from "node:http";
let raw = "";
for await (const c of process.stdin) {
  raw += c;
  if (Buffer.byteLength(raw) > 262144) throw Error("Bridge request cap");
}
const data = JSON.parse(raw);
if (
  !["GET", "HEAD", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"].includes(
    data.method,
  ) ||
  typeof data.path !== "string" ||
  !data.path.startsWith("/") ||
  data.path.startsWith("//") ||
  data.path.length > 4096
)
  throw Error("Invalid HTTP bridge request");
const body = Buffer.from(data.body || "", "base64");
if (body.length > 131072) throw Error("Body cap");
const headers = { ...data.headers, host: "127.0.0.1:4381" };
delete headers.connection;
delete headers["transfer-encoding"];
delete headers["content-length"];
if (body.length) headers["content-length"] = String(body.length);
const result = await new Promise((resolve, reject) => {
  const q = http.request(
    {
      host: "127.0.0.1",
      port: 4381,
      path: data.path,
      method: data.method,
      headers,
      timeout: 5000,
    },
    (r) => {
      const chunks = [];
      let bytes = 0;
      r.on("data", (c) => {
        bytes += c.length;
        if (bytes > 524288) {
          q.destroy(Error("Response cap"));
          return;
        }
        chunks.push(c);
      });
      r.on("end", () =>
        resolve({
          status: r.statusCode,
          headers: r.headers,
          body: Buffer.concat(chunks).toString("base64"),
        }),
      );
      r.on("error", reject);
    },
  );
  q.on("timeout", () => q.destroy(Error("HTTP deadline")));
  q.on("error", reject);
  q.end(body);
});
console.log(JSON.stringify(result));
