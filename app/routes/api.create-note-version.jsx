import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import {
  enforceVersionRetention,
  ensureCanCreateManualVersion,
  canCreateAutoSave,
  isPlanError,
  serializePlanError,
  withPlanContext,
} from "../../src/server/guards/ensurePlan";

export const action = withPlanContext(async ({ request, planContext }) => {
  try {
    const { shopId, plan } = planContext;
    
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

    // For auto-saves, check if they can be created (never throws PlanError)
    if (isAuto) {
      const autoSaveCheck = await canCreateAutoSave(noteId, plan);
      if (!autoSaveCheck.canCreate) {
        // Return a non-error response with the reason (doesn't trigger upgrade modal)
        return json({
          success: false,
          skipped: true,
          reason: autoSaveCheck.reason,
          message: autoSaveCheck.reason,
        }, { status: 200 });
      }
    }

    const version = await prisma.$transaction(async (tx) => {
      // Check if manual version can be created BEFORE creating it
      // This will throw PlanError if limit reached (triggers upgrade modal)
      if (!isAuto) {
        await ensureCanCreateManualVersion(noteId, plan, tx);
      }

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

      // After creation, enforce retention (only affects auto-saves for FREE plan)
      await enforceVersionRetention(noteId, plan, tx);
      return created;
    });

    console.log("Version created successfully:", version.id);
    return json(version);
  } catch (error) {
    if (isPlanError(error)) {
      // Only manual saves trigger PlanError (upgrade modal)
      return json(serializePlanError(error), { status: error.status });
    }

    console.error("Error creating note version:", error);
    return json({ error: "Failed to create version", details: error.message }, { status: 500 });
  }
});