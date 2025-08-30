import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const form = await request.formData();
  const noteId = form.get("noteId");
  const title = form.get("title");
  const body = form.get("body");
  const folderId = form.get("folderId");
  const tags = form.get("tags");

  // Ensure proper UTF-8 encoding for emoji support
  const trimmedTitle = title ? title.toString().trim() : "";
  const trimmedBody = body ? body.toString().trim() : "";
  const trimmedFolderId = folderId ? folderId.toString().trim() : "";
  
  // Ensure proper UTF-8 encoding for emoji characters
  const ensureUtf8 = (str) => {
    if (!str) return str;
    try {
      // Handle potential encoding issues
      return str.normalize('NFC');
    } catch (e) {
      return str;
    }
  };
  


  if (!noteId) {
    return json({ error: "Missing note ID" });
  }

  // Check if title is within character limit
  if (trimmedTitle.length > 35) {
    return json({ error: "Note title cannot exceed 35 characters" });
  }

  // Check if at least title or body is provided
  if (!trimmedTitle && !trimmedBody) {
    return json({ error: "Please provide a title or content for the note" });
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

    // Parse tags from JSON string
    const parsedTags = tags ? JSON.parse(tags.toString()) : [];

    // Update the note with proper UTF-8 encoding
    await prisma.note.update({
      where: { id: noteId },
      data: { 
        title: ensureUtf8(trimmedTitle), 
        content: ensureUtf8(trimmedBody), 
        tags: parsedTags.map(tag => ensureUtf8(tag)),
        folderId: trimmedFolderId 
      },
    });
    
    return json({ success: true, message: "Note updated successfully" }, {
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    });
  } catch (error) {
    console.error("Error updating note:", error);
    return json({ error: "Failed to update note" });
  }
}