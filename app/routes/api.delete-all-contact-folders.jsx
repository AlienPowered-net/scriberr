import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  // Dynamic imports for server-only modules
  const [
    { prisma },
    {
      isPlanError,
      requireFeature,
      serializePlanError,
      withPlanContext,
    },
  ] = await Promise.all([
    import("../utils/db.server"),
    import("../utils/ensurePlan.server"),
  ]);

  // Wrap handler with plan context
  const handler = withPlanContext(async ({ request, planContext }) => {
    const form = await request.formData();
    const confirmation = form.get("confirmation");

    if (!confirmation || confirmation !== "DELETE") {
      return json({ error: "Invalid confirmation. Please type 'DELETE' to confirm." });
    }

    try {
      await requireFeature("contacts")(planContext);

      // First, set folderId to null for all contacts in contact folders (move them to "All Contacts")
      await prisma.contact.updateMany({
        where: { 
          shopId: planContext.shopId,
          folderId: { not: null }
        },
        data: {
          folderId: null
        }
      });

      // Then delete all contact folders for this shop
      const foldersResult = await prisma.contactFolder.deleteMany({
        where: { shopId: planContext.shopId },
      });
      
      return json({ 
        success: true, 
        message: `Successfully deleted ${foldersResult.count} contact folders. Contacts have been moved to "All Contacts".`,
        deletedFoldersCount: foldersResult.count
      });
    } catch (error) {
      if (isPlanError(error)) {
        return json(serializePlanError(error), { status: error.status });
      }

      console.error("Error deleting all contact folders:", error);
      return json({ error: "Failed to delete all contact folders" });
    }
  });

  return handler({ request });
};
