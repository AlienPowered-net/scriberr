import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function action({ request }) {
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

    if (!folderId) {
      return json({ error: "Missing folderId" });
    }

    // Verify the folder belongs to this shop
    const folder = await prisma.folder.findFirst({
      where: { 
        id: folderId,
        shopId: shop.id 
      },
    });

    if (!folder) {
      return json({ error: "Folder not found" });
    }

    // Delete all notes in the folder first
    await prisma.note.deleteMany({
      where: { folderId },
    });

    // Then delete the folder
    await prisma.folder.delete({
      where: { id: folderId },
    });
    
    return json({ success: true, message: "Folder deleted successfully" });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return json({ error: "Failed to delete folder" });
  }
}