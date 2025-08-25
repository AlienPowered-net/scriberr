import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const form = await request.formData();
  const folderId = form.get("folderId");

  if (!folderId) {
    return json({ error: "Missing folderId" });
  }

  try {
    // Verify the folder belongs to this shop
    const folder = await prisma.folder.findFirst({
      where: { 
        id: folderId,
        shopId 
      },
    });

    if (!folder) {
      return json({ error: "Folder not found" });
    }

    // Delete all notes in the folder first
    await prisma.note.deleteMany({
      where: { folderId },
    });

    // Then delete the folder
    await prisma.folder.delete({
      where: { id: folderId },
    });
    
    return json({ success: true, message: "Folder deleted successfully" });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return json({ error: "Failed to delete folder" });
  }
}