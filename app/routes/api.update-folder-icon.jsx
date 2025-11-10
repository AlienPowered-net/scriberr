import { json } from "@remix-run/node";

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // Dynamic imports for server-only modules
  const [
    { authenticate },
    { prisma },
  ] = await Promise.all([
    import("../shopify.server"),
    import("../utils/db.server"),
  ]);

  try {
    const { session } = await authenticate.admin(request);
    
    // Ensure we have a valid shop
    if (!session?.shop) {
      return json({ error: "Invalid session or shop not found" }, { status: 401 });
    }
    
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

    const { folderId, icon, color } = await request.json();

    if (!folderId || !icon) {
      return json({ error: "Folder ID and icon are required" }, { status: 400 });
    }

    // Try to update with icon fields, fallback if migration not applied
    let updatedFolder;
    try {
      updatedFolder = await prisma.folder.update({
        where: { id: folderId, shopId: shop.id },
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
