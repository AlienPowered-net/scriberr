import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  // Dynamic imports for server-only modules
  const [
    { prisma },
    {
      isPlanError,
      requireFeature,
      serializePlanError,
      withPlanContext,
    },
  ] = await Promise.all([
    import("../utils/db.server"),
    import("../utils/ensurePlan.server"),
  ]);

  // Wrap handler with plan context
  const handler = withPlanContext(async ({ request, planContext }) => {
    try {
      const formData = await request.formData();
      const noteId = formData.get("noteId");
      const tagsJson = formData.get("tags");

      if (!noteId || !tagsJson) {
        return json({ error: "Note ID and tags are required" }, { status: 400 });
      }

      await requireFeature("noteTags")(planContext);
      const { shopId } = planContext;

      // Parse the tags
      let tags;
      try {
        tags = JSON.parse(tagsJson);
      } catch (error) {
        return json({ error: "Invalid tags format" }, { status: 400 });
      }

      // Update only the tags for the note
      const updatedNote = await prisma.note.update({
        where: {
          id: noteId,
          shopId: shopId
        },
        data: {
          tags: tags
        }
      });

      return json({ success: true, note: updatedNote });
    } catch (error) {
      if (isPlanError(error)) {
        return json(serializePlanError(error), { status: error.status });
      }

      console.error('Error updating note tags:', error);
      return json({ error: "Failed to update note tags" }, { status: 500 });
    }
  });

  return handler({ request });
};
