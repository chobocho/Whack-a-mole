/**
 * Zero-dependency bundler: takes the tsc output in dist/ and produces a single
 * inlined release/index.html.
 *
 * Strategy:
 *   1. Walk dist/ to collect every .js module.
 *   2. Parse import statements to build a dependency graph.
 *   3. Topologically sort, strip import/export keywords, concatenate inside an IIFE.
 *   4. Read index.html and replace the module <script> tag with an inline <script>.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const DIST = resolve("dist");
const ROOT = resolve(".");
const HTML_IN = resolve("index.html");
const OUT_DIR = resolve("release");
const OUT_HTML = join(OUT_DIR, "index.html");

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

const files = walk(DIST).map((p) => resolve(p));
/** @type {Map<string, { code: string, deps: string[] }>} */
const modules = new Map();

const importRe = /^\s*import\s+(?:[^;"']*from\s+)?["']([^"']+)["'];?\s*$/gm;

for (const f of files) {
  const code = readFileSync(f, "utf8");
  const deps = [];
  let m;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(code))) {
    const spec = m[1];
    if (!spec.startsWith(".")) continue;
    let resolved = resolve(dirname(f), spec);
    if (!resolved.endsWith(".js")) resolved += ".js";
    deps.push(resolved);
  }
  modules.set(f, { code, deps });
}

/** Topological sort — deps emitted before dependents. */
const order = [];
const visited = new Set();
const visiting = new Set();
function visit(p) {
  if (visited.has(p)) return;
  if (visiting.has(p)) return; // cycle — skip to break it
  visiting.add(p);
  const m = modules.get(p);
  if (m) for (const d of m.deps) visit(d);
  visiting.delete(p);
  visited.add(p);
  order.push(p);
}
// Visit non-entry modules first, then entry (main.js) last
const entry = [...modules.keys()].find((p) => p.endsWith("/main.js"));
for (const p of modules.keys()) if (p !== entry) visit(p);
if (entry) visit(entry);

function strip(code) {
  // Drop `import ... from "..."` and bare `import "..."` lines
  code = code.replace(/^\s*import\s+(?:[^;"']*from\s+)?["'][^"']+["'];?\s*$/gm, "");
  code = code.replace(/^\s*import\s+["'][^"']+["'];?\s*$/gm, "");
  // Drop `export { ... };` and `export * from "..."` lines
  code = code.replace(/^\s*export\s*\{[^}]*\}\s*(?:from\s*["'][^"']+["'])?\s*;?\s*$/gm, "");
  code = code.replace(/^\s*export\s+\*\s+from\s+["'][^"']+["'];?\s*$/gm, "");
  // Strip leading `export ` from declarations
  code = code.replace(
    /^(\s*)export\s+(default\s+)?(async\s+|abstract\s+)?(function|class|const|let|var|enum)\b/gm,
    "$1$3$4",
  );
  return code;
}

const parts = order.map((p) => {
  const rel = relative(ROOT, p);
  return `// ===== ${rel} =====\n${strip(modules.get(p).code)}`;
});

const bundle = `(function(){\n"use strict";\n${parts.join("\n")}\n})();`;

let html = readFileSync(HTML_IN, "utf8");
const scriptRe = /<script\s+type=["']module["']\s+src=["'][^"']+["']\s*><\/script>/;
if (!scriptRe.test(html)) {
  throw new Error("Could not find <script type=\"module\" src=...> tag in index.html");
}
html = html.replace(scriptRe, `<script>\n${bundle}\n</script>`);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_HTML, html);

const kb = (html.length / 1024).toFixed(1);
console.log(`✓ ${relative(ROOT, OUT_HTML)}  (${kb} KB, ${order.length} modules)`);
