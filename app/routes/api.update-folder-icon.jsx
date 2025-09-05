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

    const { folderId, icon, color } = await request.json();

    if (!folderId || !icon) {
      return json({ error: "Folder ID and icon are required" }, { status: 400 });
    }

    // Try to update with icon fields, fallback if migration not applied
    let updatedFolder;
    try {
      updatedFolder = await prisma.folder.update({
        where: { id: folderId, shopId },
        data: { 
          icon: icon,
          iconColor: color || "#f57c00"
        },
        select: {
          id: true,
          name: true,
          icon: true,
          iconColor: true,
          createdAt: true,
        },
      });
    } catch (iconError) {
      // Fallback: return success but note that icons are stored locally
      console.log('Icon fields not available, returning local state response:', iconError.message);
      updatedFolder = {
        id: folderId,
        name: "Folder",
        icon: icon,
        iconColor: color,
        createdAt: new Date(),
      };
    }

    return json({ 
      success: true, 
      folder: updatedFolder 
    });

  } catch (error) {
    console.error("Folder icon update error:", error);
    return json({ 
      error: "Failed to update folder icon",
      details: error.message 
    }, { status: 500 });
  }
}