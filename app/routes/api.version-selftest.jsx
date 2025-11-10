import { json } from "@remix-run/node";

// NOTE: keep this server-only; avoid alias to prevent SSR resolve issues on Vercel
// We use a dynamic, relative import so it is tree-shaken from the client
let db;
async function getDb() {
  if (!db) {
    const mod = await import("../utils/db.server"); // app/routes -> app/utils/db.server
    db = mod.default ?? mod;
  }
  return db;
}

export async function loader({ request }) {
  const dbModule = await getDb();
  const { prisma } = dbModule;

  const url = new URL(request.url);
  const writeTest = url.searchParams.get("write") === "1";
  const noteId = url.searchParams.get("noteId");
  const internalHeader = request.headers.get("x-internal");

  // Guard write test behind internal header
  if (writeTest && internalHeader !== "1") {
    return json({ error: "Write test requires x-internal: 1 header" }, { status: 403 });
  }

  const dbUrl = process.env.DATABASE_URL || "";
  const urlHash = dbUrl.substring(0, 40) + (dbUrl.length > 40 ? "…" : "");

  try {
    // Get migration history
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      ORDER BY finished_at DESC
      LIMIT 5
    `;

    // Get NoteVersion columns
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'NoteVersion'
      ORDER BY ordinal_position
    `;

    // Get counts
    const totalCount = await prisma.noteVersion.count();
    
    let noteCount = null;
    let visibleCount = null;
    if (noteId) {
      noteCount = await prisma.noteVersion.count({
        where: { noteId },
      });
      visibleCount = await prisma.noteVersion.count({
        where: { noteId, freeVisible: true },
      });
    }

    const result = {
      db: {
        urlHash,
      },
      migrations: migrations || [],
      noteVersionColumns: columns || [],
      counts: {
        total: totalCount,
        ...(noteId && { noteId, noteCount, visibleCount }),
      },
    };

    // Optional write test
    if (writeTest && noteId) {
      try {
        const testVersion = await prisma.noteVersion.create({
          data: {
            noteId,
            title: "Self-test version",
            content: "Test content",
            saveType: "MANUAL",
            freeVisible: true,
          },
        });

        result.writeTest = {
          ok: true,
          newId: testVersion.id,
          saveType: testVersion.saveType,
          freeVisible: testVersion.freeVisible,
        };
      } catch (error) {
        result.writeTest = {
          ok: false,
          error: {
            message: error.message,
            code: error.code,
            meta: error.meta,
          },
        };
      }
    }

    return json(result);
  } catch (error) {
    return json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
