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

      // Delete all contacts for this shop
      const result = await prisma.contact.deleteMany({
        where: { shopId: planContext.shopId },
      });
      
      return json({ 
        success: true, 
        message: `Successfully deleted ${result.count} contacts`,
        deletedCount: result.count
      });
    } catch (error) {
      if (isPlanError(error)) {
        return json(serializePlanError(error), { status: error.status });
      }

      console.error("Error deleting all contacts:", error);
      return json({ error: "Failed to delete all contacts" });
    }
  });

  return handler({ request });
};
