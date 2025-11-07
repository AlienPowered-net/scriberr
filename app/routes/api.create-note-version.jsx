import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import {
  enforceVersionRetention,
  isPlanError,
  serializePlanError,
  withPlanContext,
} from "../../src/server/guards/ensurePlan";

export const action = withPlanContext(async ({ request, planContext }) => {
  try {
    const { shopId } = planContext;
    
    const { noteId, title, content, versionTitle, snapshot, isAuto = false } = await request.json();
    
    console.log("Version request data:", { noteId, title, isAuto });

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

    const version = await prisma.$transaction(async (tx) => {
      const created = await tx.noteVersion.create({
        data: {
          noteId,
          title,
          content,
          versionTitle,
          snapshot: snapshot ? JSON.parse(snapshot) : null,
          isAuto,
        },
      });

      await enforceVersionRetention(noteId, planContext.plan, tx);
      return created;
    });

    console.log("Version created successfully:", version.id);
    return json(version);
  } catch (error) {
    if (isPlanError(error)) {
      return json(serializePlanError(error), { status: error.status });
    }

    console.error("Error creating note version:", error);
    return json({ error: "Failed to create version", details: error.message }, { status: 500 });
  }
});