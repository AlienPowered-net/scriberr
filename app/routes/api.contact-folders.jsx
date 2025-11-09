import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import {
  isPlanError,
  requireFeature,
  serializePlanError,
  withPlanContext,
} from "../utils/ensurePlan.server";

export const loader = withPlanContext(async ({ planContext }) => {
  try {
    await requireFeature("contacts")(planContext);

    const folders = await prisma.contactFolder.findMany({
      where: { shopId: planContext.shopId },
      include: {
        _count: {
          select: { contacts: true },
        },
      },
      orderBy: { position: "asc" },
    });

    return json(folders);
  } catch (error) {
    if (isPlanError(error)) {
      return json(serializePlanError(error), { status: error.status });
    }

    console.error("Error loading contact folders:", error);
    return json({ error: "Failed to load folders" }, { status: 500 });
  }
});

export const action = withPlanContext(async ({ request, planContext }) => {
  try {
    await requireFeature("contacts")(planContext);

    const formData = await request.formData();
    const actionType = formData.get("_action");

    switch (actionType) {
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
            shopId: planContext.shopId,
            name: trimmedName,
          },
        });

        if (existingFolder) {
          return json({ error: "A folder with this name already exists" });
        }

        // Get the highest position
        const lastFolder = await prisma.contactFolder.findFirst({
          where: { shopId: planContext.shopId },
          orderBy: { position: "desc" },
        });

        const position = lastFolder ? lastFolder.position + 1 : 0;

        const folder = await prisma.contactFolder.create({
          data: {
            shopId: planContext.shopId,
            name: trimmedName,
            icon,
            iconColor,
            position,
          },
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

        const existingFolder = await prisma.contactFolder.findFirst({
          where: {
            shopId: planContext.shopId,
            name: trimmedName,
            id: { not: id },
          },
        });

        if (existingFolder) {
          return json({ error: "A folder with this name already exists" });
        }

        // Update the folder name
        const folder = await prisma.contactFolder.findUnique({ where: { id } });
        if (!folder || folder.shopId !== planContext.shopId) {
          return json({ error: "Folder not found" }, { status: 404 });
        }

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
        const folder = await prisma.contactFolder.findUnique({ where: { id } });
        if (!folder || folder.shopId !== planContext.shopId) {
          return json({ error: "Folder not found" }, { status: 404 });
        }

        await prisma.contact.updateMany({
          where: { folderId: id, shopId: planContext.shopId },
          data: { folderId: null },
        });

        await prisma.contactFolder.delete({
          where: { id },
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

        const folder = await prisma.contactFolder.findUnique({ where: { id } });
        if (!folder || folder.shopId !== planContext.shopId) {
          return json({ error: "Folder not found" }, { status: 404 });
        }

        const updated = await prisma.contactFolder.update({
          where: { id },
          data: {
            ...(icon && { icon }),
            ...(iconColor && { iconColor }),
          },
        });

        return json({
          success: true,
          folder: updated,
          message: "Folder icon updated successfully",
        });
      }

      case "reorder": {
        const folderIds = JSON.parse(formData.get("folderIds") || "[]");

        const existingFolders = await prisma.contactFolder.findMany({
          where: { shopId: planContext.shopId, id: { in: folderIds } },
          select: { id: true },
        });
        const allowedIds = new Set(existingFolders.map((folder) => folder.id));

        const updates = folderIds
          .filter((folderId) => allowedIds.has(folderId))
          .map((folderId, index) =>
            prisma.contactFolder.update({
              where: { id: folderId, shopId: planContext.shopId },
              data: { position: index },
            }),
          );

        await Promise.all(updates);

        return json({ success: true });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    if (isPlanError(error)) {
      return json(serializePlanError(error), { status: error.status });
    }

    console.error("Error in contact folders action:", error);
    return json({ error: "Failed to process request" }, { status: 500 });
  }
});