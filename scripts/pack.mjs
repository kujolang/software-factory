import fs from "node:fs";
import path from "node:path";
import { readPack, hashPack } from "../factory/pack.mjs";
const [verb, file, ...args] = process.argv.slice(2);
if (!file)
  throw Error(
    "Usage: npm run pack -- init|validate|seal pack.json [idea.txt|--reviewed]",
  );
if (verb === "init") {
  if (fs.existsSync(file)) throw Error("Destination exists");
  const idea = fs.readFileSync(args[0], "utf8");
  if (!idea.trim() || idea.length > 12000)
    throw Error("Idea must be 1–12000 characters");
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        schema: "kujo.factory.pack/v1",
        id: "my-software",
        title: "Software idea",
        contract: idea,
        requirements: [],
        api: [],
        browser: [],
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(
    "Draft only. Follow docs/PACKS.md to define requirements and tests, review them, then validate and seal.",
  );
} else if (["validate", "seal"].includes(verb)) {
  const p = readPack(file);
  if (verb === "seal") {
    if (!args.includes("--reviewed"))
      throw Error(
        "Review requirements and expected results before sealing; pass --reviewed to attest that review.",
      );
    fs.writeFileSync(
      file + ".seal.json",
      JSON.stringify(
        {
          schema: "kujo.factory.pack-seal/v1",
          sha256: hashPack(p),
          reviewed: true,
          sealedAt: new Date().toISOString(),
        },
        null,
        2,
      ) + "\n",
    );
  }
  console.log(
    JSON.stringify({
      ok: true,
      id: p.id,
      sha256: hashPack(p),
      requirements: p.requirements.length,
      api: p.api.length,
      browser: p.browser.length,
    }),
  );
} else throw Error("Unknown pack command");
