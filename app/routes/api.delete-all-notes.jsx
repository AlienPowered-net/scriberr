import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
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