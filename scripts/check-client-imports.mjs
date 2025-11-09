import { execSync } from "node:child_process";

// Fail if any .jsx/.tsx under app/ imports .server or shopify.server
const patterns = [
  'rg -n --glob "app/**/*.{jsx,tsx}" "\\.server\\b" || true',
  'rg -n --glob "app/**/*.{jsx,tsx}" "shopify\\.server" || true'
];

let bad = [];

for (const cmd of patterns) {
  try {
    const out = execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], shell: true }).toString().trim();
    if (out) {
      // Filter out false positives - routes that export loaders/actions are server-only
      const lines = out.split('\n').filter(line => {
        // Skip if it's a route file (has loader/action export) - these are server-only
        const filePath = line.split(':')[0];
        // Routes are server-only, so they can import .server files
        if (filePath.includes('/routes/') || filePath.includes('/entry.server')) {
          return false;
        }
        return true;
      });
      if (lines.length > 0) {
        bad.push(lines.join('\n'));
      }
    }
  } catch (error) {
    // Command failed, but that's ok - might mean no matches
  }
}

if (bad.length) {
  console.error("Client bundle imports server-only modules:\n" + bad.join("\n\n"));
  process.exit(1);
}

console.log("OK: no client imports of server-only modules.");

