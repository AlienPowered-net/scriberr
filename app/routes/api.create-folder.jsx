import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const form = await request.formData();
  const name = form.get("name");

  if (!name) {
    return json({ error: "Missing folder name" });
  }

  const trimmedName = name.toString().trim();
  if (!trimmedName) {
    return json({ error: "Folder name cannot be empty" });
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
    await prisma.folder.create({ 
      data: { name: trimmedName, shopId } 
    });
    
    return json({ success: true, message: "Folder created successfully" });
  } catch (error) {
    console.error("Error creating folder:", error);
    return json({ error: "Failed to create folder" });
  }
}