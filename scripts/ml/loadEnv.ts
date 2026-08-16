/**
 * Load ml/.env into process.env, OVERRIDING anything already set.
 *
 * Import this as the very first line of every ML/sim script that touches the
 * database or the model service:
 *
 *   import "../ml/loadEnv";
 *   import { db } from "@/db";
 *
 * Why override: the repo root .env carries the production DATABASE_URL, and
 * Prisma Client will happily pick it up. ML tooling must only ever talk to the
 * dedicated ML database configured in ml/.env.
 */
import fs from "node:fs";
import path from "node:path";

const candidates = [
  path.resolve(process.cwd(), "ml/.env"),
  path.resolve(__dirname, "../../ml/.env"),
];

const envFile = candidates.find((p) => fs.existsSync(p));

if (!envFile) {
  console.warn(
    "[ml-env] ml/.env not found — falling back to process env. Copy ml/env.ml.example to ml/.env."
  );
} else {
  const raw = fs.readFileSync(envFile, "utf8");
  let loaded = 0;
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
    loaded++;
  }
  const host = process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] ?? "(unset)";
  console.log(`[ml-env] loaded ${loaded} vars from ${envFile} (db host: ${host})`);
}

export {};
