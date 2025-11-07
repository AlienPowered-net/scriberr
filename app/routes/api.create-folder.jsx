import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import {
  buildPlanAccessErrorBody,
  ensurePlan,
  isPlanAccessError,
} from "../utils/tenant.server";

export async function action({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const data = await request.json();
    const { name, icon = "folder", iconColor = "#f57c00" } = data;

    if (!name) {
      return json({ error: "Missing folder name" }, { status: 400 });
    }

    const trimmedName = name.toString().trim();
    if (!trimmedName) {
      return json({ error: "Folder name cannot be empty" }, { status: 400 });
    }

    if (trimmedName.length > 35) {
      return json({ error: "Folder name cannot exceed 35 characters" }, { status: 400 });
    }

    const planContext = await ensurePlan({
      shopDomain: session.shop,
      usage: [{ key: "folders", increment: 1 }],
    });
    const shopId = planContext.shop.id;

    const existingFolder = await prisma.folder.findFirst({
      where: {
        shopId,
        name: trimmedName,
      },
    });

    if (existingFolder) {
      return json({ error: "A folder with this name already exists" }, { status: 409 });
    }

    let maxPosition = 0;
    try {
      const maxPosResult = await prisma.folder.aggregate({
        where: { shopId },
        _max: { position: true },
      });
      maxPosition = (maxPosResult._max.position || -1) + 1;
    } catch (positionError) {
      const folderCount = await prisma.folder.count({ where: { shopId } });
      maxPosition = folderCount;
    }

    let newFolder;
    try {
      newFolder = await prisma.folder.create({
        data: {
          name: trimmedName,
          shopId,
          icon: icon,
          iconColor: iconColor,
          position: maxPosition,
        },
        select: {
          id: true,
          name: true,
          icon: true,
          iconColor: true,
          position: true,
          createdAt: true,
        },
      });
    } catch (error) {
      console.log(
        "New fields not available, creating folder with fallback:",
        error.message,
      );
      newFolder = await prisma.folder.create({
        data: {
          name: trimmedName,
          shopId,
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      });

      newFolder.icon = icon;
      newFolder.iconColor = iconColor;
      newFolder.position = maxPosition;
    }

    return json({
      success: true,
      message: "Folder created successfully",
      folder: newFolder,
      planUsage: planContext.usageSummary,
    });
  } catch (error) {
    if (isPlanAccessError(error)) {
      return json(buildPlanAccessErrorBody(error), { status: error.status });
    }

    console.error("Error creating folder:", error);
    return json({ error: "Failed to create folder" }, { status: 500 });
  }
}