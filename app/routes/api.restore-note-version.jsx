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
} from "../utils/ensurePlan.server";
import { PLAN } from "../../src/lib/plan";

export const action = withPlanContext(async ({ request, planContext }) => {
  try {
    const { shopId, plan } = planContext;
    const { noteId, versionId, preserveCurrentChanges = false } =
      await request.json();

    const note = await prisma.note.findFirst({
      where: { id: noteId, shopId },
    });

    if (!note) {
      return json({ error: "Note not found" }, { status: 404 });
    }

    const version = await prisma.noteVersion.findFirst({
      where: { id: versionId, noteId },
    });

    if (!version) {
      return json({ error: "Version not found" }, { status: 404 });
    }

    const checkpointTitle = `Auto-saved before revert - ${new Date().toLocaleString()}`;

    const result = await prisma.$transaction(async (tx) => {
      if (plan === "FREE") {
        const visibleCount = await getVisibleCount(noteId, tx);
        if (visibleCount >= PLAN.FREE.NOTE_VERSIONS_MAX) {
          throw new PlanError("LIMIT_VERSIONS");
        }
      }

      let inlineAlert = null;

      if (preserveCurrentChanges) {
        let freeVisible = true;
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

        await tx.noteVersion.create({
          data: {
            noteId,
            title: note.title,
            content: note.content,
            versionTitle: checkpointTitle,
            snapshot: null,
            isAuto: true,
            saveType: "AUTO",
            freeVisible,
          },
        });
      }

      const updatedNote = await tx.note.update({
        where: { id: noteId },
        data: {
          title: version.title,
          content: version.content,
          updatedAt: new Date(),
        },
      });

      const [versions, meta] = await Promise.all([
        listVisibleVersions(noteId, plan, tx),
        buildVersionsMeta(noteId, plan, tx, inlineAlert),
      ]);

      return {
        note: updatedNote,
        restoredVersion: version,
        versions,
        meta,
        inlineAlert,
      };
    });

    return json({ success: true, ...result });
  } catch (error) {
    if (isPlanError(error)) {
      return json(serializePlanError(error), { status: error.status });
    }

    console.error("Error restoring note version:", error);
    return json({ error: "Failed to restore version" }, { status: 500 });
  }
});