import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const form = await request.formData();
  const noteId = form.get("noteId");
  const folderId = form.get("folderId");

  const trimmedFolderId = folderId ? folderId.toString().trim() : "";

  if (!noteId) {
    return json({ error: "Missing note ID" });
  }

  // Check if a folder is selected
  if (!trimmedFolderId) {
    return json({ error: "Please select a folder for the note" });
  }

  try {
    // Verify the note exists and belongs to this shop
    const existingNote = await prisma.note.findFirst({
      where: { 
        id: noteId,
        shopId 
      },
    });

    if (!existingNote) {
      return json({ error: "Note not found" });
    }

    // Verify the folder exists and belongs to this shop
    const folder = await prisma.folder.findFirst({
      where: { 
        id: trimmedFolderId,
        shopId 
      },
    });

    if (!folder) {
      return json({ error: "Selected folder not found" });
    }

    // Update only the folderId of the note
    await prisma.note.update({
      where: { id: noteId },
      data: { 
        folderId: trimmedFolderId 
      },
    });
    
    return json({ success: true, message: "Note moved successfully" }, {
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    });
  } catch (error) {
    console.error("Error moving note:", error);
    return json({ error: "Failed to move note" });
  }
}