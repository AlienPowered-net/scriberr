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
    // First, set folderId to null for all contacts in contact folders (move them to "All Contacts")
    await prisma.contact.updateMany({
      where: { 
        shopId,
        folderId: { not: null }
      },
      data: {
        folderId: null
      }
    });

    // Then delete all contact folders for this shop
    const foldersResult = await prisma.contactFolder.deleteMany({
      where: { shopId },
    });
    
    return json({ 
      success: true, 
      message: `Successfully deleted ${foldersResult.count} contact folders. Contacts have been moved to "All Contacts".`,
      deletedFoldersCount: foldersResult.count
    });
  } catch (error) {
    console.error("Error deleting all contact folders:", error);
    return json({ error: "Failed to delete all contact folders" });
  }
}