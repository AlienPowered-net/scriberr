// scripts/remix-guard.mjs

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ROUTES_DIR = path.join(ROOT, "app", "routes");
const EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

const API_ROUTE_TEST = /^api\./; // files under app/routes starting with api.

const serverImportRe = /^\s*import\s+[^;]*['"][^'"]*\.server(?:\.[jt]sx?)?['"]/m;
const shopifyServerRe = /^\s*import\s+[^;]*['"][^'"]*shopify\.server(?:\.[jt]sx?)?['"]/m;
const dbServerRe = /^\s*import\s+[^;]*['"][^'"]*db\.server(?:\.[jt]sx?)?['"]/m;

// API route disallowed exports at top-level
const apiDefaultExportRe = /^\s*export\s+default\s+/m;
const apiClientExportsRe = new RegExp(
  String.raw`^\s*export\s+(?:const|function)\s+(?:meta|links|handle|shouldRevalidate|Component)\b`,
  "m"
);

// TS annotation in .jsx - look for function params, return types, variable types
// But exclude common false positives like error.message, error.code, etc.
const tsInJsxRe = /:\s*(?:string|number|boolean|object|any|void|never|unknown|Record|Array|Promise|Function|Date|Error|Request|Response|LoaderFunctionArgs|ActionFunctionArgs|Request|Response)\s*[|&<>]?/;

async function readAllFiles(dir) {
  const out = [];
  async function walk(d) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if (EXTENSIONS.includes(path.extname(p))) {
        out.push(p);
      }
    }
  }
  await walk(dir);
  return out;
}

function isApiRoute(fileAbs) {
  // e.g. app/routes/api.create-note.jsx OR app/routes/api.apply-migration.jsx
  const base = path.basename(fileAbs);
  return API_ROUTE_TEST.test(base);
}

async function main() {
  let errors = [];

  // 1) Scan all route files
  const files = await readAllFiles(ROUTES_DIR);

  for (const file of files) {
    const src = await fs.readFile(file, "utf8");
    const isApi = isApiRoute(file);

    // (a) Disallow top-level server imports ONLY in API routes
    if (isApi) {
      if (serverImportRe.test(src)) {
        errors.push(`Top-level ".server" import in API route: ${path.relative(ROOT, file)}`);
      }

      if (shopifyServerRe.test(src)) {
        errors.push(`Top-level shopify.server import in API route: ${path.relative(ROOT, file)}`);
      }

      if (dbServerRe.test(src)) {
        errors.push(`Top-level db.server import in API route: ${path.relative(ROOT, file)}`);
      }
    }

    // (b) API routes must NOT have default component or client exports
    if (isApi) {
      if (apiDefaultExportRe.test(src)) {
        errors.push(`API route has default export (not allowed): ${path.relative(ROOT, file)}`);
      }

      if (apiClientExportsRe.test(src)) {
        errors.push(`API route has client-only exports (not allowed): ${path.relative(ROOT, file)}`);
      }
    }

    // (c) TS annotations inside .jsx -> warn/error (only for API routes)
    if (isApi && path.extname(file) === ".jsx" && tsInJsxRe.test(src)) {
      errors.push(
        `TypeScript annotation found in .jsx API route (rename to .tsx or remove types): ${path.relative(
          ROOT,
          file
        )}`
      );
    }
  }

  if (errors.length) {
    console.error("\nRemix guard failed:\n" + errors.map(e => " - " + e).join("\n") + "\n");
    process.exit(1);
  } else {
    console.log("OK: routes are server-safe.");
  }
}

main().catch((e) => {
  console.error("remix-guard crashed:", e);
  process.exit(1);
});
