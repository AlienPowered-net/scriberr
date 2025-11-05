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
    // First, move all contacts to no folder (set folderId to null)
    await prisma.contact.updateMany({
      where: { shopId },
      data: { folderId: null }
    });

    // Then delete all contact folders for this shop
    const foldersResult = await prisma.contactFolder.deleteMany({
      where: { shopId },
    });
    
    return json({ 
      success: true, 
      message: `Successfully deleted ${foldersResult.count} contact folders`,
      deletedCount: foldersResult.count
    });
  } catch (error) {
    console.error("Error deleting all contact folders:", error);
    return json({ error: "Failed to delete all contact folders" });
  }
}
