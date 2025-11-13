// scripts/fix-polaris-json-imports.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const TARGET = /@shopify\/polaris\/locales\/en\.json/g;

const exts = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];
const files = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (exts.includes(path.extname(p))) files.push(p);
  }
}

walk(ROOT);

let changed = 0;
for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  // Remove any `with { type: "json" }` or `assert { type: "json" }` attached to the Polaris locale import
  const next = src.replace(
    /import\s+([^;]+?)\s+from\s+["']@shopify\/polaris\/locales\/en\.json["']\s+(?:with|assert)\s*\{\s*type\s*:\s*["']json["']\s*\}\s*;?/g,
    'import $1 from "@shopify/polaris/locales/en.json";'
  );
  if (next !== src) {
    fs.writeFileSync(file, next);
    changed++;
  }
}

console.log(`Normalized Polaris en.json imports in ${changed} file(s).`);

