import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  // Dynamic imports for server-only modules
  const [
    { prisma },
    { withPlanContext },
  ] = await Promise.all([
    import("../utils/db.server"),
    import("../utils/ensurePlan.server"),
  ]);

  // Check if we need extended usage data (for cancel modal)
  const url = new URL(request.url);
  const includeAll = url.searchParams.get("includeAll") === "true";

  // Wrap handler with plan context
  const handler = withPlanContext(async ({ planContext }) => {
    try {
      const { shopId, plan, noteLimit, folderLimit } = planContext;

      // Base counts
      const [notesUsed, foldersUsed] = await Promise.all([
        prisma.note.count({ where: { shopId } }),
        prisma.folder.count({ where: { shopId } }),
      ]);

      const baseResponse = {
        notesUsed,
        notesLimit: Number.isFinite(noteLimit) ? noteLimit : null,
        foldersUsed,
        foldersLimit: Number.isFinite(folderLimit) ? folderLimit : null,
        plan,
      };

      // If extended data requested (for cancel modal), include tags and contacts
      if (includeAll) {
        const [notesWithTags, contactsUsed] = await Promise.all([
          // Count notes that have at least one tag
          prisma.note.count({
            where: {
              shopId,
              tags: { isEmpty: false },
            },
          }),
          // Count contacts
          prisma.contact.count({ where: { shopId } }),
        ]);

        return json({
          ...baseResponse,
          notesWithTags,
          contactsUsed,
        });
      }

      return json(baseResponse);
    } catch (error) {
      console.error("Error loading plan usage:", error);
      return json({ error: "Failed to load plan usage data" }, { status: 500 });
    }
  });

  return handler({ request });
};
