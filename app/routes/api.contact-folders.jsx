import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  // Ensure we have a valid shop
  if (!session?.shop) {
    return json({ error: "Invalid session or shop not found" }, { status: 401 });
  }
  
  try {
    // Ensure the shop exists in the database
    let shop = await prisma.shop.findUnique({
      where: { domain: session.shop }
    });

    if (!shop) {
      // Create the shop if it doesn't exist
      shop = await prisma.shop.create({
        data: {
          domain: session.shop,
          installedAt: new Date()
        }
      });
    }

    const folders = await prisma.contactFolder.findMany({
      where: { shopId: shop.id },
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
  const { session } = await authenticate.admin(request);
  
  // Ensure we have a valid shop
  if (!session?.shop) {
    return json({ error: "Invalid session or shop not found" }, { status: 401 });
  }

  const formData = await request.formData();
  const action = formData.get("_action");

  try {
    // Ensure the shop exists in the database
    let shop = await prisma.shop.findUnique({
      where: { domain: session.shop }
    });

    if (!shop) {
      // Create the shop if it doesn't exist
      shop = await prisma.shop.create({
        data: {
          domain: session.shop,
          installedAt: new Date()
        }
      });
    }

    switch (action) {
      case "create": {
        const name = formData.get("name");
        const icon = formData.get("icon") || "folder";
        const iconColor = formData.get("iconColor") || "#f57c00";

        if (!name) {
          return json({ error: "Folder name is required" }, { status: 400 });
        }

        // Get the highest position
        const lastFolder = await prisma.contactFolder.findFirst({
          where: { shopId: shop.id },
          orderBy: { position: 'desc' }
        });

        const position = lastFolder ? lastFolder.position + 1 : 0;

        const folder = await prisma.contactFolder.create({
          data: {
            shopId: shop.id,
            name,
            icon,
            iconColor,
            position
          }
        });

        return json(folder);
      }

      case "rename": {
        const id = formData.get("id");
        const name = formData.get("name");

        if (!id || !name) {
          return json({ error: "Folder ID and name are required" }, { status: 400 });
        }

        const folder = await prisma.contactFolder.update({
          where: { id },
          data: { name }
        });

        return json(folder);
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

        return json({ success: true });
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

        return json(folder);
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
};