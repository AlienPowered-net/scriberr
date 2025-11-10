import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  // Dynamic imports for server-only modules
  const [
    { prisma },
    { PLAN },
    { withPlanContext },
  ] = await Promise.all([
    import("../utils/db.server"),
    import("../../src/lib/plan"),
    import("../utils/ensurePlan.server"),
  ]);

  // Wrap handler with plan context
  const handler = withPlanContext(async ({ planContext }) => {
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

  return handler({ request });
};
