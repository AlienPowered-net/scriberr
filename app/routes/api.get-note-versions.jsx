import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  // Dynamic imports for server-only modules
  const [
    { prisma },
    {
      buildVersionsMeta,
      listVisibleVersions,
      withPlanContext,
    },
  ] = await Promise.all([
    import("../utils/db.server"),
    import("../utils/ensurePlan.server"),
  ]);

  // Wrap handler with plan context
  const handler = withPlanContext(async ({ request, planContext }) => {
    try {
      const { shopId, plan } = planContext;
      const url = new URL(request.url);
      const noteId = url.searchParams.get("noteId");

      console.log("Getting versions for noteId:", noteId, "shopId:", shopId);

      if (!noteId) {
        return json({ error: "Note ID is required" }, { status: 400 });
      }

      // Verify the note belongs to the shop
      const note = await prisma.note.findFirst({
        where: {
          id: noteId,
          shopId: shopId,
        },
      });

      if (!note) {
        console.error("Note not found for noteId:", noteId, "shopId:", shopId);
        return json({ error: "Note not found" }, { status: 404 });
      }

      const [versions, meta] = await Promise.all([
        listVisibleVersions(noteId, plan, prisma),
        buildVersionsMeta(noteId, plan, prisma),
      ]);

      console.log(
        "Found",
        versions.length,
        "versions for noteId:",
        noteId,
        "plan:",
        plan,
      );
      return json({ versions, meta });
    } catch (error) {
      console.error("Error fetching note versions:", error);
      return json({ error: "Failed to fetch versions", details: error.message }, { status: 500 });
    }
  });

  return handler({ request });
};
