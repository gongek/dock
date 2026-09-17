import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/** @param {string} name @param {string} version */
function npmPackageUrl(name, version) {
  return `https://www.npmjs.com/package/${name}/v/${version}`;
}

/**
 * @param {Record<string, unknown>} packages
 * @param {string} parentPath
 * @param {string} depName
 */
function resolveLockfileDepPath(packages, parentPath, depName) {
  const nested = `${parentPath}/node_modules/${depName}`;
  if (packages[nested]) return nested;
  const hoisted = `node_modules/${depName}`;
  if (packages[hoisted]) return hoisted;
  return null;
}

/** @param {string} lockfilePath @param {string} packageJsonPath */
function collectProductionPackages(lockfilePath, packageJsonPath) {
  const lock = JSON.parse(fs.readFileSync(lockfilePath, "utf8"));
  const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const packages = lock.packages ?? {};

  /** @type {Record<string, string>} */
  const rootDeps = {
    ...(pkgJson.dependencies ?? {}),
    ...(pkgJson.optionalDependencies ?? {}),
  };

  /** @type {Array<{ name: string; version: string; license: string; url: string }>} */
  const collected = [];
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {Set<string>} */
  const visitedPaths = new Set();
  /** @type {Array<{ path: string; name: string }>} */
  const queue = Object.keys(rootDeps).map((name) => ({
    name,
    path: `node_modules/${name}`,
  }));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current?.path || visitedPaths.has(current.path)) continue;
    if (!packages[current.path]) continue;
    visitedPaths.add(current.path);

    const entry = packages[current.path];
    const version = typeof entry.version === "string" ? entry.version : "";
    const name =
      typeof entry.name === "string"
        ? entry.name
        : current.path.replace(/^node_modules\//, "").split("/node_modules/").pop() ?? current.name;

    const dedupeKey = `${name}@${version}`;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      const license =
        typeof entry.license === "string"
          ? entry.license
          : Array.isArray(entry.license)
            ? entry.license.join(" OR ")
            : "UNKNOWN";

      collected.push({
        name,
        version,
        license,
        url: npmPackageUrl(name, version),
      });
    }

    const childDeps = {
      ...(entry.dependencies ?? {}),
      ...(entry.optionalDependencies ?? {}),
    };

    for (const depName of Object.keys(childDeps)) {
      const depPath = resolveLockfileDepPath(packages, current.path, depName);
      if (depPath) {
        queue.push({ name: depName, path: depPath });
      }
    }
  }

  collected.sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    return byName !== 0 ? byName : a.version.localeCompare(b.version);
  });

  return collected;
}

function main() {
  const outputPath = path.join(ROOT, "src/lib/generated/packageLicenses.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const payload = {
    generatedAt: new Date().toISOString().slice(0, 10),
    sections: [
      {
        id: "dock",
        title: "Dock (dock.surf)",
        packages: collectProductionPackages(
          path.join(ROOT, "package-lock.json"),
          path.join(ROOT, "package.json"),
        ),
      },
    ],
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  const total = payload.sections.reduce((sum, section) => sum + section.packages.length, 0);
  console.log(`Wrote ${total} packages to ${path.relative(ROOT, outputPath)}`);
}

main();
