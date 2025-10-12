import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export const action = async ({ request }) => {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);
    
    console.log("Deleting version for shop:", session.shop, "shopId:", shopId);
    
    const { noteId, versionId } = await request.json();
    
    console.log("Delete version request data:", { noteId, versionId });

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

    // Verify the version belongs to the note
    const version = await prisma.noteVersion.findFirst({
      where: {
        id: versionId,
        noteId: noteId,
      },
    });

    if (!version) {
      console.error("Version not found for versionId:", versionId, "noteId:", noteId);
      return json({ error: "Version not found" }, { status: 404 });
    }

    // Delete the version
    await prisma.noteVersion.delete({
      where: {
        id: versionId,
      },
    });

    console.log("Version deleted successfully:", versionId);
    return json({ success: true, deletedVersionId: versionId });
  } catch (error) {
    console.error("Error deleting note version:", error);
    return json({ error: "Failed to delete version", details: error.message }, { status: 500 });
  }
};
