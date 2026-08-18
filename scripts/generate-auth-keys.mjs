import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { writeFileSync } from "node:fs";

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

const env = [
  "SITE_URL=https://dock.surf",
  "CUSTOM_AUTH_SITE_URL=https://api.dock.surf",
  `JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, " ")}"`,
  `JWKS=${jwks}`,
].join("\n");

writeFileSync(".env.convex.auth", `${env}\n`);
