import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";
import { shopify } from "../shopify.server";

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const form = await request.formData();
  const noteId = form.get("noteId");
  const targetFolderId = form.get("targetFolderId");

  if (!noteId) {
    return json({ error: "Missing note ID" });
  }

  try {
    // Get the original note
    const originalNote = await prisma.note.findFirst({
      where: { 
        id: noteId,
        shopId 
      },
      include: {
        folder: true
      }
    });

    if (!originalNote) {
      return json({ error: "Note not found" });
    }

    // Verify target folder exists if specified
    if (targetFolderId) {
      const targetFolder = await prisma.folder.findFirst({
        where: { 
          id: targetFolderId,
          shopId 
        }
      });
      
      if (!targetFolder) {
        return json({ error: "Target folder not found" });
      }
    }

    // Create the duplicate note
    const duplicatedNote = await prisma.note.create({
      data: {
        title: originalNote.title ? `${originalNote.title} (Copy)` : "Untitled (Copy)",
        content: originalNote.content,
        tags: originalNote.tags,
        shopId,
        folderId: targetFolderId || originalNote.folderId
      }
    });

    return json({ 
      success: true, 
      note: duplicatedNote 
    });

  } catch (error) {
    console.error('Error duplicating note:', error);
    return json({ error: "Failed to duplicate note" });
  }
}