import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import { PLAN } from "../../src/lib/plan";
import { withPlanContext } from "../../src/server/guards/ensurePlan";

export const loader = withPlanContext(async ({ request, planContext }) => {
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

    // Get all versions for the note, ordered by creation date (newest first)
    const allVersions = await prisma.noteVersion.findMany({
      where: {
        noteId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        content: true,
        versionTitle: true,
        snapshot: true,
        isAuto: true,
        createdAt: true,
      },
    });

    // For FREE plan, limit to 5 versions with manual saves taking priority
    let versions = allVersions;
    if (plan === "FREE") {
      const limit = PLAN.FREE.NOTE_VERSIONS_MAX;
      
      // Separate manual and auto saves
      const manualSaves = allVersions.filter((v) => !v.isAuto);
      const autoSaves = allVersions.filter((v) => v.isAuto);
      
      // Manual saves always included (up to limit)
      const manualToShow = manualSaves.slice(0, limit);
      const remainingSlots = Math.max(0, limit - manualToShow.length);
      
      // Fill remaining slots with newest auto-saves
      const autoToShow = autoSaves.slice(0, remainingSlots);
      
      // Combine and sort by creation date (newest first)
      versions = [...manualToShow, ...autoToShow].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    console.log("Found", versions.length, "versions for noteId:", noteId, "plan:", plan);
    return json(versions);
  } catch (error) {
    console.error("Error fetching note versions:", error);
    return json({ error: "Failed to fetch versions", details: error.message }, { status: 500 });
  }
});