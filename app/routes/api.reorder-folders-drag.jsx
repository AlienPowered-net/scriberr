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

    // Update folder order by setting createdAt based on the new order
    // We'll use the current timestamp with incremental milliseconds to maintain order
    const baseTime = new Date();
    
    const updatePromises = folderIds.map((folderId, index) => {
      const newCreatedAt = new Date(baseTime.getTime() - (folderIds.length - index) * 1000);
      return prisma.folder.update({
        where: { 
          id: folderId,
          shopId: shopId 
        },
        data: { createdAt: newCreatedAt }
      });
    });

    const updateResults = await Promise.all(updatePromises);
    console.log('Folder reorder results:', updateResults.length, 'folders updated');

    // Return updated folders
    const updatedFolders = await prisma.folder.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        // icon: true, // Temporarily commented out until migration is applied
        createdAt: true,
      },
    });

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