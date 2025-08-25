import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const form = await request.formData();
  const folderId = form.get("folderId");
  const newName = form.get("newName");

  if (!folderId || !newName) {
    return json({ error: "Missing folderId or newName" });
  }

  const trimmedName = newName.toString().trim();
  if (!trimmedName) {
    return json({ error: "Folder name cannot be empty" });
  }

  try {
    // Check if a folder with this name already exists
    const existingFolder = await prisma.folder.findFirst({
      where: { 
        shopId,
        name: trimmedName,
        id: { not: folderId } // Exclude the current folder
      },
    });

    if (existingFolder) {
      return json({ error: "A folder with this name already exists" });
    }

    // Update the folder name
    await prisma.folder.update({
      where: { id: folderId },
      data: { name: trimmedName },
    });
    
    return json({ success: true, message: "Folder renamed successfully" });
  } catch (error) {
    console.error("Error renaming folder:", error);
    return json({ error: "Failed to rename folder" });
  }
}