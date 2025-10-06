import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export const action = async ({ request }) => {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);
    
    console.log("Creating version for shop:", session.shop, "shopId:", shopId);
    
    const { noteId, title, content, versionTitle, snapshot, isAuto = false } = await request.json();
    
    console.log("Version request data:", { noteId, title, isAuto });

    // Verify the note belongs to the shop
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        shopId: shopId,
      },
    });

    if (!note) {
      console.error("Note not found for noteId:", noteId, "shopId:", shopId);
      return json({ error: "Note not found" }, { status: 404 });
    }

    // Create the version with enhanced data
    const version = await prisma.noteVersion.create({
      data: {
        noteId,
        title,
        content,
        versionTitle,
        snapshot: snapshot ? JSON.parse(snapshot) : null,
        isAuto,
      },
    });

    console.log("Version created successfully:", version.id);
    return json(version);
  } catch (error) {
    console.error("Error creating note version:", error);
    return json({ error: "Failed to create version", details: error.message }, { status: 500 });
  }
};