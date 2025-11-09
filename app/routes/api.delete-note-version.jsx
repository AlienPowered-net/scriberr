import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import {
  buildVersionsMeta,
  listVisibleVersions,
  surfaceNewestHiddenAuto,
  withPlanContext,
} from "../utils/ensurePlan.server";

export const action = withPlanContext(async ({ request, planContext }) => {
  try {
    const { shopId, plan } = planContext;
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
        buildVersionsMeta(noteId, plan, tx),
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
