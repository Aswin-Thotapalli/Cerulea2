import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd(), "src", "app", "api");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function toUrl(file) {
  // file: .../src/app/api/foo/bar/route.ts  => /api/foo/bar
  const rel = file.split(`${path.sep}src${path.sep}app${path.sep}`)[1];
  const noExt = rel.replace(/route\.ts$/, "");
  const url = "/" + noExt.replaceAll(path.sep, "/").replace(/\/$/, "");
  return url;
}

const files = walk(ROOT).filter((f) => f.endsWith(`${path.sep}route.ts`));
const routes = files
  .map((f) => ({ url: toUrl(f), file: f }))
  .sort((a, b) => a.url.localeCompare(b.url));

console.log("API ROUTES:");
for (const r of routes) console.log(`${r.url}  ->  ${r.file}`);

const byName = new Map();
for (const r of routes) {
  const base = r.url.replace(/^\/api\//, "").split("/")[0];
  byName.set(base, (byName.get(base) || 0) + 1);
}

console.log("\nTOP-LEVEL API GROUP COUNTS:");
for (const [k, v] of [...byName.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${k}: ${v}`);
}
