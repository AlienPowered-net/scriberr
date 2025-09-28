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
    const notesResult = await prisma.note.deleteMany({
      where: { shopId },
    });

    // Delete all folders for this shop
    const foldersResult = await prisma.folder.deleteMany({
      where: { shopId },
    });
    
    return json({ 
      success: true, 
      message: `Successfully deleted all content: ${foldersResult.count} folders and ${notesResult.count} notes`,
      deletedFoldersCount: foldersResult.count,
      deletedNotesCount: notesResult.count
    });
  } catch (error) {
    console.error("Error deleting all content:", error);
    return json({ error: "Failed to delete all content" });
  }
}