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

    // Create the folder
    const newFolder = await prisma.folder.create({ 
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
    
    // Add icon data to response for local state (until migration applied)
    newFolder.icon = icon;
    newFolder.iconColor = iconColor;
    
    return json({ success: true, message: "Folder created successfully", folder: newFolder });
  } catch (error) {
    console.error("Error creating folder:", error);
    return json({ error: "Failed to create folder" });
  }
}