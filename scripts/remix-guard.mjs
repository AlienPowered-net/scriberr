// scripts/remix-guard.mjs
import { execSync } from "node:child_process";

function run(cmd) {
  try { return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], shell: true }); }
  catch (e) { return e.stdout?.toString?.() || e.message || ""; }
}

const routeGlobs = '"app/routes/**/*.{js,jsx,ts,tsx}"';

// 1) No top-level `.server` imports in any route file
const badServerImports = run(`rg -n --glob ${routeGlobs} '^\\s*import .*\\.server[\'"]' || true`);
// 2) No top-level imports of shopify.server/db.server in any route file
const badShopifyImports = run(`rg -n --glob ${routeGlobs} '^\\s*import .*shopify\\.server[\'"]' || true`);
const badDbImports = run(`rg -n --glob ${routeGlobs} '^\\s*import .*db\\.server[\'"]' || true`);

// 3) API routes must NOT have default export or other client exports
const badApiDefault = run(`rg -n --glob "app/routes/api.*.{js,jsx,ts,tsx}" '^\\s*export\\s+default\\s+' || true`);
const badApiClientExports = run(
  `rg -n --glob "app/routes/api.*.{js,jsx,ts,tsx}" '^\\s*export\\s+(const|function)\\s+(meta|links|handle|shouldRevalidate|Component|default)' || true`
);

let errors = [];
if (badServerImports.trim()) errors.push("Top-level .server import in a route:\n" + badServerImports);
if (badShopifyImports.trim()) errors.push("Top-level shopify.server import in a route:\n" + badShopifyImports);
if (badDbImports.trim()) errors.push("Top-level db.server import in a route:\n" + badDbImports);
if (badApiDefault.trim()) errors.push("API route exports default component (not allowed):\n" + badApiDefault);
if (badApiClientExports.trim()) errors.push("API route has client-only exports (not allowed):\n" + badApiClientExports);

if (errors.length) {
  console.error("\nRemix guard failed:\n" + errors.join("\n\n") + "\n");
  process.exit(1);
} else {
  console.log("OK: routes are server-safe.");
}

