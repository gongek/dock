import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const rasterPath = path.join(root, "public", "dock-logo-raster.png");
const outputPath = path.join(root, "public", "dock-logo-gem-smoke.png");

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost:0");
  if (url.pathname === "/dock-logo-raster.png") {
    response.writeHead(200, { "Content-Type": "image/png" });
    response.end(readFileSync(rasterPath));
    return;
  }

  if (url.pathname === "/") {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(`<!doctype html><script type="module">
      import { toProcessedGemSmoke } from "https://esm.sh/@paper-design/shaders@0.0.80";
      window.__run = () => toProcessedGemSmoke("/dock-logo-raster.png");
    </script>`);
    return;
  }

  response.writeHead(404);
  response.end();
});

await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
await page.waitForFunction(() => typeof window.__run === "function");

const bytes = await page.evaluate(async () => {
  const result = await window.__run();
  const buffer = await result.pngBlob.arrayBuffer();
  return Array.from(new Uint8Array(buffer));
});

writeFileSync(outputPath, Buffer.from(bytes));
console.log(`Wrote ${outputPath} (${bytes.length} bytes)`);

await browser.close();
server.close();
