import { json } from "@remix-run/node";

export async function action({ request }) {
  // Dynamic imports for server-only modules
  const [
    { authenticate },
    { prisma },
  ] = await Promise.all([
    import("../shopify.server"),
    import("../utils/db.server"),
  ]);

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

    const form = await request.formData();
    const folderId = form.get("folderId");
    const newName = form.get("newName");

    if (!folderId || !newName) {
      return json({ error: "Missing folderId or newName" });
    }

    const trimmedName = newName.toString().trim();
    if (!trimmedName) {
      return json({ error: "Folder name cannot be empty" });
    }

    if (trimmedName.length > 35) {
      return json({ error: "Folder name cannot exceed 35 characters" });
    }

    // Check if a folder with this name already exists
    const existingFolder = await prisma.folder.findFirst({
      where: { 
        shopId: shop.id,
        name: trimmedName,
        id: { not: folderId } // Exclude the current folder
      },
    });

    if (existingFolder) {
      return json({ error: "A folder with this name already exists" });
    }

    // Update the folder name
    await prisma.folder.update({
      where: { id: folderId },
      data: { name: trimmedName },
    });
    
    return json({ success: true, message: "Folder renamed successfully" });
  } catch (error) {
    console.error("Error renaming folder:", error);
    return json({ error: "Failed to rename folder" });
  }
}
