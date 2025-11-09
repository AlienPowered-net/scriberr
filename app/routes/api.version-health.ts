// app/routes/api.version-health.ts

import type { LoaderFunctionArgs } from "@remix-run/node";

import { json } from "@remix-run/node";

const maskUrl = (url?: string) => {
  if (!url) return "not set";
  try {
    const u = new URL(url);
    // scrub creds and any obvious secrets in query
    if (u.username) u.username = "***";
    if (u.password) u.password = "***";
    for (const key of ["password", "pwd", "token", "key", "secret", "apikey", "api_key"]) {
      if (u.searchParams.has(key)) u.searchParams.set(key, "***");
    }
    // return a redacted representation (avoid leaking search params)
    return `${u.protocol}//${u.host}${u.pathname}${u.search ? "?***" : ""}`;
  } catch {
    return "***";
  }
};

export const loader = async (_args: LoaderFunctionArgs) => {
  try {
    const pooled = process.env.DATABASE_URL;
    const direct = process.env.DIRECT_URL || process.env.NEON_DIRECT_URL;

    return json({
      status: "ok",
      prismaClientVersion:
        // present when installed; safe fallback otherwise
        (process.env.npm_package_dependencies__prisma_client as string | undefined) ?? "unknown",
      db: {
        host: pooled ? new URL(pooled).host : "unset",
        pooled: maskUrl(pooled),
        direct: maskUrl(direct),
      },
      time: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ status: "error", message: msg }, { status: 500 });
  }
};

