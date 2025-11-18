import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  // Dynamic imports for server-only modules
  const [
    { prisma },
    {
      buildVersionsMeta,
      listVisibleVersions,
      surfaceNewestHiddenAuto,
      withPlanContext,
    },
  ] = await Promise.all([
    import("../utils/db.server"),
    import("../utils/ensurePlan.server"),
  ]);

  // Wrap handler with plan context
  const handler = withPlanContext(async ({ request, planContext }) => {
    try {
      const { shopId, plan, versionLimit } = planContext;
      const { noteId, versionId } = await request.json();

      console.log("Deleting version", { noteId, versionId, shopId });

      const note = await prisma.note.findFirst({
        where: { id: noteId, shopId },
      });

      if (!note) {
        console.error("Note not found for noteId:", noteId, "shopId:", shopId);
        return json({ error: "Note not found" }, { status: 404 });
      }

      const version = await prisma.noteVersion.findFirst({
        where: { id: versionId, noteId },
      });

      if (!version) {
        console.error("Version not found for versionId:", versionId, "noteId:", noteId);
        return json({ error: "Version not found" }, { status: 404 });
      }

      const payload = await prisma.$transaction(async (tx) => {
        await tx.noteVersion.delete({
          where: { id: versionId },
        });

        if (plan === "FREE") {
          await surfaceNewestHiddenAuto(noteId, tx);
        }

        const [versions, meta] = await Promise.all([
          listVisibleVersions(noteId, plan, tx),
          buildVersionsMeta(noteId, plan, tx, null, versionLimit),
        ]);

        return { versions, meta };
      });

      console.log("Version deleted successfully:", versionId);
      return json({
        success: true,
        deletedVersionId: versionId,
        ...payload,
      });
    } catch (error) {
      console.error("Error deleting note version:", error);
      return json(
        { error: "Failed to delete version", details: error.message },
        { status: 500 },
      );
    }
  });

  return handler({ request });
};
