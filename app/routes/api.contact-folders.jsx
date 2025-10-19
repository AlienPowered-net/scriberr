import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  // Ensure we have a valid shop
  if (!session?.shop) {
    return json({ error: "Invalid session or shop not found" }, { status: 401 });
  }
  
  try {
    const shopId = await getOrCreateShopId(session.shop);

    const folders = await prisma.contactFolder.findMany({
      where: { shopId },
      include: {
        _count: {
          select: { contacts: true }
        }
      },
      orderBy: { position: 'asc' }
    });

    return json(folders);
  } catch (error) {
    console.error('Error loading contact folders:', error);
    return json({ error: 'Failed to load folders' }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    console.log('🔍 Contact Folders API - Session:', { shop: session?.shop, hasSession: !!session });
    
    // Ensure we have a valid shop
    if (!session?.shop) {
      console.log('❌ Contact Folders API - No valid shop in session');
      return json({ error: "Invalid session or shop not found" }, { status: 401 });
    }

  const formData = await request.formData();
  const action = formData.get("_action");

  try {
    const shopId = await getOrCreateShopId(session.shop);

    switch (action) {
      case "create": {
        const name = formData.get("name");
        const icon = formData.get("icon") || "folder";
        const iconColor = formData.get("iconColor") || "#f57c00";

        if (!name) {
          return json({ error: "Folder name is required" }, { status: 400 });
        }

        const trimmedName = name.toString().trim();
        if (!trimmedName) {
          return json({ error: "Folder name cannot be empty" });
        }

        if (trimmedName.length > 35) {
          return json({ error: "Folder name cannot exceed 35 characters" });
        }

        // Check if a folder with this name already exists
        const existingFolder = await prisma.contactFolder.findFirst({
          where: { 
            shopId: shopId,
            name: trimmedName
          },
        });

        if (existingFolder) {
          return json({ error: "A folder with this name already exists" });
        }

        // Get the highest position
        const lastFolder = await prisma.contactFolder.findFirst({
          where: { shopId: shopId },
          orderBy: { position: 'desc' }
        });

        const position = lastFolder ? lastFolder.position + 1 : 0;

        const folder = await prisma.contactFolder.create({
          data: {
            shopId: shopId,
            name: trimmedName,
            icon,
            iconColor,
            position
          }
        });

        return json({ success: true, folder, message: "Folder created successfully" });
      }

      case "rename": {
        const id = formData.get("id");
        const name = formData.get("name");

        if (!id || !name) {
          return json({ error: "Folder ID and name are required" }, { status: 400 });
        }

        const trimmedName = name.toString().trim();
        if (!trimmedName) {
          return json({ error: "Folder name cannot be empty" });
        }

        if (trimmedName.length > 35) {
          return json({ error: "Folder name cannot exceed 35 characters" });
        }

        // Check if a folder with this name already exists
        const existingFolder = await prisma.contactFolder.findFirst({
          where: { 
            shopId: shopId,
            name: trimmedName,
            id: { not: id } // Exclude the current folder
          },
        });

        if (existingFolder) {
          return json({ error: "A folder with this name already exists" });
        }

        // Update the folder name
        await prisma.contactFolder.update({
          where: { id },
          data: { name: trimmedName },
        });
        
        return json({ success: true, message: "Folder renamed successfully" });
      }

      case "delete": {
        const id = formData.get("id");

        if (!id) {
          return json({ error: "Folder ID is required" }, { status: 400 });
        }

        // Move contacts to no folder (set folderId to null)
        await prisma.contact.updateMany({
          where: { folderId: id },
          data: { folderId: null }
        });

        // Delete the folder
        await prisma.contactFolder.delete({
          where: { id }
        });

        return json({ success: true, message: "Folder deleted successfully" });
      }

      case "update-icon": {
        const id = formData.get("id");
        const icon = formData.get("icon");
        const iconColor = formData.get("iconColor");

        if (!id) {
          return json({ error: "Folder ID is required" }, { status: 400 });
        }

        const folder = await prisma.contactFolder.update({
          where: { id },
          data: {
            ...(icon && { icon }),
            ...(iconColor && { iconColor })
          }
        });

        return json({ success: true, folder, message: "Folder icon updated successfully" });
      }

      case "reorder": {
        const folderIds = JSON.parse(formData.get("folderIds") || "[]");

        // Update positions for all folders
        const updates = folderIds.map((folderId, index) =>
          prisma.contactFolder.update({
            where: { id: folderId },
            data: { position: index }
          })
        );

        await Promise.all(updates);

        return json({ success: true });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in contact folders action:', error);
    return json({ error: "Failed to process request" }, { status: 500 });
  }
  } catch (authError) {
    console.error('❌ Contact Folders API - Authentication error:', authError);
    return json({ error: "Authentication failed" }, { status: 401 });
  }
};