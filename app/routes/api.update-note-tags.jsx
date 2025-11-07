import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import {
  isPlanError,
  requireFeature,
  serializePlanError,
  withPlanContext,
} from "../../src/server/guards/ensurePlan";

export const action = withPlanContext(async ({ request, planContext }) => {
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