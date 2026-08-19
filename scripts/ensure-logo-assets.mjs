import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raster = path.join(root, "public", "dock-logo-raster.png");
const processed = path.join(root, "public", "dock-logo-gem-smoke.png");

if (existsSync(raster) && existsSync(processed)) {
  process.exit(0);
}

console.log("Logo shader assets missing — generating…");

if (!existsSync(raster)) {
  execSync("npm run generate:logo-raster", { cwd: root, stdio: "inherit" });
}

if (!existsSync(processed)) {
  execSync("npm run generate:logo-gem-smoke", { cwd: root, stdio: "inherit" });
}
