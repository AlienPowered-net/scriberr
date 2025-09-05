import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const data = await request.json();
  const { name, icon = "folder", iconColor = "#f57c00" } = data;

  if (!name) {
    return json({ error: "Missing folder name" });
  }

  const trimmedName = name.toString().trim();
  if (!trimmedName) {
    return json({ error: "Folder name cannot be empty" });
  }

  if (trimmedName.length > 35) {
    return json({ error: "Folder name cannot exceed 35 characters" });
  }

  try {
    // Check if a folder with this name already exists
    const existingFolder = await prisma.folder.findFirst({
      where: { 
        shopId,
        name: trimmedName
      },
    });

    if (existingFolder) {
      return json({ error: "A folder with this name already exists" });
    }

    // Get the current max position for this shop to place new folder at the end
    let maxPosition = 0;
    try {
      const maxPosResult = await prisma.folder.aggregate({
        where: { shopId },
        _max: { position: true }
      });
      maxPosition = (maxPosResult._max.position || -1) + 1;
    } catch (positionError) {
      // Fallback: use folder count if position field not available
      const folderCount = await prisma.folder.count({ where: { shopId } });
      maxPosition = folderCount;
    }

    // Create the folder with all fields if they exist
    let newFolder;
    try {
      // Try to create with all fields (after migration)
      newFolder = await prisma.folder.create({ 
        data: { 
          name: trimmedName, 
          shopId,
          icon: icon,
          iconColor: iconColor,
          position: maxPosition
        },
        select: {
          id: true,
          name: true,
          icon: true,
          iconColor: true,
          position: true,
          createdAt: true,
        }
      });
    } catch (error) {
      // Fallback: create with minimal fields
      console.log('New fields not available, creating folder with fallback:', error.message);
      newFolder = await prisma.folder.create({ 
        data: { 
          name: trimmedName, 
          shopId
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
        }
      });
      
      // Add missing data to response for local state
      newFolder.icon = icon;
      newFolder.iconColor = iconColor;
      newFolder.position = maxPosition;
    }
    
    return json({ success: true, message: "Folder created successfully", folder: newFolder });
  } catch (error) {
    console.error("Error creating folder:", error);
    return json({ error: "Failed to create folder" });
  }
}