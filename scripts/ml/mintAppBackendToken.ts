/**
 * Mint an app-backend access token for E2E scripts, using app-backend's own
 * `signAccessToken` so secret / issuer / audience match the server under test.
 *
 * Run with cwd = the app-backend checkout (its .env supplies JWT_SECRET):
 *   MINT_CLAIMS='{"donorId":"…","email":"…","phone":null,"role":"DONOR"}' npx tsx <this file>
 *
 * The import is dynamic and path-based on purpose: this repo's tsc must not try
 * to type-check the sibling project.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";

const claims = JSON.parse(process.env.MINT_CLAIMS ?? "{}");
const jwtModule = pathToFileURL(path.resolve(process.cwd(), "src/lib/jwt.ts")).href;

import(jwtModule)
  .then((m: { signAccessToken: (c: unknown) => Promise<string> }) => m.signAccessToken(claims))
  .then((t) => process.stdout.write(t))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
