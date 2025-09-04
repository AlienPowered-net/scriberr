import { json } from "@remix-run/node";
// Temporarily commented out until migration is applied
// import { shopify } from "../shopify.server";
// import { prisma } from "../utils/db.server";
// import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Temporarily commented out until migration is applied
    // const { session } = await shopify.authenticate.admin(request);
    // const shopId = await getOrCreateShopId(session.shop);

    const { folderId, icon } = await request.json();

    if (!folderId || !icon) {
      return json({ error: "Folder ID and icon are required" }, { status: 400 });
    }

    // Update the folder icon (temporarily disabled until migration is applied)
    // const updatedFolder = await prisma.folder.update({
    //   where: { id: folderId, shopId },
    //   data: { icon },
    //   select: {
    //     id: true,
    //     name: true,
    //     icon: true,
    //     createdAt: true,
    //   },
    // });

    // Temporary response until migration is applied
    const updatedFolder = {
      id: folderId,
      name: "Folder", // Placeholder
      icon: icon,
      createdAt: new Date(),
    };

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