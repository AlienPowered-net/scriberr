import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import {
  isPlanError,
  requireFeature,
  serializePlanError,
  withPlanContext,
} from "../../src/server/guards/ensurePlan";

export const action = withPlanContext(async ({ request, planContext }) => {
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