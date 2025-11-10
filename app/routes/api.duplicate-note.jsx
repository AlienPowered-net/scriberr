import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  // Dynamic imports for server-only modules
  const [
    { prisma },
    {
      isPlanError,
      requireCapacity,
      serializePlanError,
      withPlanContext,
    },
  ] = await Promise.all([
    import("../utils/db.server"),
    import("../utils/ensurePlan.server"),
  ]);

  // Wrap handler with plan context
  const handler = withPlanContext(async ({ request, planContext }) => {
    const { shopId } = planContext;
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, { status: 405 });
    }

    const form = await request.formData();
    const noteId = form.get("noteId");
    const targetFolderId = form.get("targetFolderId");

    if (!noteId) {
      return json({ error: "Missing note ID" });
    }

    try {
      // Get the original note
      const originalNote = await prisma.note.findFirst({
        where: { 
          id: noteId,
          shopId 
        },
        include: {
          folder: true
        }
      });

      if (!originalNote) {
        return json({ error: "Note not found" });
      }

      // Verify target folder exists if specified
      if (targetFolderId) {
        const targetFolder = await prisma.folder.findFirst({
          where: { 
            id: targetFolderId,
            shopId 
          }
        });
        
        if (!targetFolder) {
          return json({ error: "Target folder not found" });
        }
      }

      // Create the duplicate note
      await requireCapacity("note")(planContext);

      const duplicatedNote = await prisma.note.create({
        data: {
          title: originalNote.title ? `${originalNote.title} (Copy)` : "Untitled (Copy)",
          content: originalNote.content,
          tags: originalNote.tags,
          shopId,
          folderId: targetFolderId || originalNote.folderId
        }
      });

      return json({ 
        success: true, 
        note: duplicatedNote 
      }, {
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        }
      });

    } catch (error) {
      if (isPlanError(error)) {
        return json(serializePlanError(error), { status: error.status });
      }

      console.error('Error duplicating note:', error);
      return json({ error: "Failed to duplicate note" });
    }
  });

  return handler({ request });
};
