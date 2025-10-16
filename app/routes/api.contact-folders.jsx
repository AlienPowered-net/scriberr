import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

// GET - Fetch all contact folders for the shop
export async function loader({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
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

    return json({ success: true, folders });
  } catch (error) {
    console.error('Error fetching contact folders:', error);
    return json({ success: false, folders: [], error: error.message }, { status: 500 });
  }
}

// POST - Create, update, or delete contact folders
export async function action({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);
    
    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "create") {
      const name = formData.get("name");
      const icon = formData.get("icon") || "folder";
      const iconColor = formData.get("iconColor") || "#f57c00";

      if (!name) {
        return json({ success: false, error: "Folder name is required" }, { status: 400 });
      }

      // Get the next position
      const lastFolder = await prisma.contactFolder.findFirst({
        where: { shopId },
        orderBy: { position: 'desc' }
      });
      const position = lastFolder ? lastFolder.position + 1 : 0;

      const folder = await prisma.contactFolder.create({
        data: {
          shopId,
          name: name.toString().trim(),
          icon,
          iconColor,
          position
        }
      });

      return json({ success: true, folder });
    }

    if (action === "rename") {
      const id = formData.get("id");
      const name = formData.get("name");

      if (!id || !name) {
        return json({ success: false, error: "Folder ID and name are required" }, { status: 400 });
      }

      const folder = await prisma.contactFolder.update({
        where: { id },
        data: { name: name.toString().trim() }
      });

      return json({ success: true, folder });
    }

    if (action === "delete") {
      const id = formData.get("id");

      if (!id) {
        return json({ success: false, error: "Folder ID is required" }, { status: 400 });
      }

      // Move all contacts in this folder to the default folder (or null)
      await prisma.contact.updateMany({
        where: { folderId: id },
        data: { folderId: null }
      });

      await prisma.contactFolder.delete({
        where: { id }
      });

      return json({ success: true });
    }

    if (action === "update-icon") {
      const id = formData.get("id");
      const icon = formData.get("icon");
      const iconColor = formData.get("iconColor");

      if (!id) {
        return json({ success: false, error: "Folder ID is required" }, { status: 400 });
      }

      const folder = await prisma.contactFolder.update({
        where: { id },
        data: {
          icon: icon || undefined,
          iconColor: iconColor || undefined
        }
      });

      return json({ success: true, folder });
    }

    if (action === "reorder") {
      const folderIds = formData.get("folderIds");

      if (!folderIds) {
        return json({ success: false, error: "Folder IDs are required" }, { status: 400 });
      }

      try {
        const ids = JSON.parse(folderIds);
        
        // Update positions for all folders
        const updatePromises = ids.map((folderId, index) => 
          prisma.contactFolder.update({
            where: { id: folderId },
            data: { position: index }
          })
        );

        await Promise.all(updatePromises);

        return json({ success: true });
      } catch (error) {
        return json({ success: false, error: "Invalid folder IDs format" }, { status: 400 });
      }
    }

    return json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error('Error in contact folders action:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
