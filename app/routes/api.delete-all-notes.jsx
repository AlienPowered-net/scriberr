import { json } from "@remix-run/node";

export async function action({ request }) {
  // Dynamic imports for server-only modules
  const [
    { shopify },
    { prisma },
    { getOrCreateShopId },
  ] = await Promise.all([
    import("../shopify.server"),
    import("../utils/db.server"),
    import("../utils/tenant.server"),
  ]);

  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const form = await request.formData();
  const confirmation = form.get("confirmation");

  if (!confirmation || confirmation !== "DELETE") {
    return json({ error: "Invalid confirmation. Please type 'DELETE' to confirm." });
  }

  try {
    // Delete all notes for this shop
    const result = await prisma.note.deleteMany({
      where: { shopId },
    });
    
    return json({ 
      success: true, 
      message: `Successfully deleted ${result.count} notes`,
      deletedCount: result.count
    });
  } catch (error) {
    console.error("Error deleting all notes:", error);
    return json({ error: "Failed to delete all notes" });
  }
}
