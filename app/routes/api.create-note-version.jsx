import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import {
  INLINE_ALERTS,
  PlanError,
  buildVersionsMeta,
  getVisibleCount,
  hasFiveAllManual,
  hideOldestVisibleAuto,
  isPlanError,
  listVisibleVersions,
  serializePlanError,
  withPlanContext,
} from "../../src/server/guards/ensurePlan";
import { PLAN } from "../../src/lib/plan";

export const action = withPlanContext(async ({ request, planContext }) => {
  try {
    const { shopId, plan } = planContext;
    
    const { noteId, title, content, versionTitle, snapshot, isAuto = false } =
      await request.json();
    
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

    const result = await prisma.$transaction(async (tx) => {
      let inlineAlert = null;
      let freeVisible = true;

      if (!isAuto && plan === "FREE") {
        const visibleCount = await getVisibleCount(noteId, tx);
        if (visibleCount >= PLAN.FREE.NOTE_VERSIONS_MAX) {
          throw new PlanError("LIMIT_VERSIONS");
        }
      }

      if (isAuto) {
        if (plan === "FREE") {
          const visibleCount = await getVisibleCount(noteId, tx);

          if (visibleCount >= PLAN.FREE.NOTE_VERSIONS_MAX) {
            const allManual = await hasFiveAllManual(noteId, tx);
            if (allManual) {
              freeVisible = false;
              inlineAlert = INLINE_ALERTS.NO_ROOM_DUE_TO_MANUALS;
            } else {
              await hideOldestVisibleAuto(noteId, tx);
            }
          }
        }
      }

      const created = await tx.noteVersion.create({
        data: {
          noteId,
          title,
          content,
          versionTitle,
          snapshot: snapshot ? JSON.parse(snapshot) : null,
          isAuto,
          saveType: isAuto ? "AUTO" : "MANUAL",
          freeVisible,
        },
      });

      const [versions, meta] = await Promise.all([
        listVisibleVersions(noteId, plan, tx),
        buildVersionsMeta(noteId, plan, tx, inlineAlert),
      ]);

      return {
        version: created,
        versions,
        meta,
        inlineAlert,
      };
    });

    console.log("Version created successfully:", result.version.id);
    return json(result);
  } catch (error) {
    if (isPlanError(error)) {
      // Only manual saves trigger PlanError (upgrade modal)
      return json(serializePlanError(error), { status: error.status });
    }

    console.error("Error creating note version:", error);
    return json({ error: "Failed to create version", details: error.message }, { status: 500 });
  }
});