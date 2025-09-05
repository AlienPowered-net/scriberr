import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);

    const { folderIds } = await request.json();

    if (!Array.isArray(folderIds) || folderIds.length === 0) {
      return json({ error: "Invalid folder IDs array" }, { status: 400 });
    }

    // Update folder order using position numbers (0, 1, 2, etc.)
    const updatePromises = folderIds.map((folderId, index) => {
      return prisma.folder.update({
        where: { 
          id: folderId,
          shopId: shopId 
        },
        data: { position: index }
      });
    });

    const updateResults = await Promise.all(updatePromises);
    console.log('Folder reorder results:', updateResults.length, 'folders updated with new positions');

    // Return updated folders with icon fields if available
    let updatedFolders;
    try {
      updatedFolders = await prisma.folder.findMany({
        where: { shopId },
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          icon: true,
          iconColor: true,
          position: true,
          createdAt: true,
        },
      });
    } catch (iconError) {
      // Fallback: load without icon fields
      console.log('Icon fields not available, loading folders without icons:', iconError.message);
      updatedFolders = await prisma.folder.findMany({
        where: { shopId },
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          position: true,
          createdAt: true,
        },
      });
      
      // Add default icon data
      updatedFolders = updatedFolders.map(folder => ({
        ...folder,
        icon: 'folder',
        iconColor: '#f57c00'
      }));
    }

    return json({ 
      success: true, 
      folders: updatedFolders 
    });

  } catch (error) {
    console.error("Folder reorder error:", error);
    return json({ 
      error: "Failed to reorder folders",
      details: error.message 
    }, { status: 500 });
  }
}