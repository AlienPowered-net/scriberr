import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import { PLAN } from "../../src/lib/plan";
import { withPlanContext } from "../utils/ensurePlan.server";

export const loader = withPlanContext(async ({ planContext }) => {
  try {
    const { shopId, plan } = planContext;

    const [notesUsed, foldersUsed] = await Promise.all([
      prisma.note.count({ where: { shopId } }),
      prisma.folder.count({ where: { shopId } }),
    ]);

    return json({
      notesUsed,
      notesLimit: PLAN[plan].NOTES_MAX,
      foldersUsed,
      foldersLimit: PLAN[plan].NOTE_FOLDERS_MAX,
      plan,
    });
  } catch (error) {
    console.error("Error loading plan usage:", error);
    return json({ error: "Failed to load plan usage data" }, { status: 500 });
  }
});
