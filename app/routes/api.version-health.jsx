import { json } from "@remix-run/node";
import { prisma } from "~/utils/db.server";

/**
 * Temporary health check endpoint to verify migrations and database state.
 * Remove after verification.
 */
export async function loader() {
  try {
    // Mask URLs for security
    const maskUrl = (url: string | undefined) => {
      if (!url) return "not set";
      try {
        const parsed = new URL(url);
        const host = parsed.hostname;
        const masked = host.replace(/^(.{4}).*(.{4})$/, "$1***$2");
        return `${parsed.protocol}//${masked}${parsed.pathname}`;
      } catch {
        return "invalid";
      }
    };

    const dbUrl = maskUrl(process.env.DATABASE_URL);
    const directUrl = maskUrl(process.env.DIRECT_URL || process.env.NEON_DIRECT_URL);

    // Get latest migrations
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      ORDER BY started_at DESC
      LIMIT 5
    `;

    // Get NoteVersion count
    const versionCount = await prisma.noteVersion.count();

    return json({
      status: "ok",
      urls: {
        DATABASE_URL: dbUrl,
        DIRECT_URL: directUrl,
      },
      migrations: migrations.map((m) => ({
        name: m.migration_name,
        finished: m.finished_at !== null,
      })),
      noteVersionCount: versionCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return json(
      {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

