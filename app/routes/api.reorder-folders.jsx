import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const form = await request.formData();
  const folderId = form.get("folderId");
  const direction = form.get("direction"); // "up" or "down"

  if (!folderId || !direction) {
    return json({ error: "Missing folderId or direction" });
  }

  // Get all folders ordered by creation date
  const allFolders = await prisma.folder.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
  });

  const currentIndex = allFolders.findIndex(f => f.id === folderId);
  
  if (currentIndex === -1) {
    return json({ error: "Folder not found" });
  }

  if (direction === "up" && currentIndex > 0) {
    const currentFolder = allFolders[currentIndex];
    const prevFolder = allFolders[currentIndex - 1];
    
    // Set current folder to be newer than the previous folder
    const newTimestamp = new Date(prevFolder.createdAt.getTime() + 1000);
    
    await prisma.folder.update({
      where: { id: folderId },
      data: { createdAt: newTimestamp },
    });
    
    return json({ success: true, message: "Moved up" });
  }
  
  if (direction === "down" && currentIndex < allFolders.length - 1) {
    const currentFolder = allFolders[currentIndex];
    const nextFolder = allFolders[currentIndex + 1];
    
    // Set current folder to be older than the next folder
    const newTimestamp = new Date(nextFolder.createdAt.getTime() - 1000);
    
    await prisma.folder.update({
      where: { id: folderId },
      data: { createdAt: newTimestamp },
    });
    
    return json({ success: true, message: "Moved down" });
  }

  return json({ error: "Cannot move in that direction" });
}