import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const form = await request.formData();
  const title = form.get("title");
  const body = form.get("body");
  const folderId = form.get("folderId");
  const tags = form.get("tags");

  // Ensure proper UTF-8 encoding for emoji support
  const trimmedTitle = title ? title.toString().trim() : "";
  const trimmedBody = body ? body.toString().trim() : "";
  const trimmedFolderId = folderId ? folderId.toString().trim() : "";
  
  // Log the data to debug encoding issues
  console.log('Creating note with title:', trimmedTitle);
  console.log('Creating note with body length:', trimmedBody.length);

  // Check if title is within character limit
  if (trimmedTitle.length > 35) {
    return json({ error: "Note title cannot exceed 35 characters" });
  }

  // Check if at least title or body is provided (allow empty title for placeholder notes)
  if (!trimmedBody) {
    return json({ error: "Please provide content for the note" });
  }

  // Check if a folder is selected
  if (!trimmedFolderId) {
    return json({ error: "Please select a folder for the note" });
  }

  try {
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

    // Create the note
    console.log('Saving to database - title:', trimmedTitle);
    console.log('Saving to database - content preview:', trimmedBody.substring(0, 100));
    
    const newNote = await prisma.note.create({
      data: { 
        title: trimmedTitle, 
        content: trimmedBody, 
        tags: parsedTags,
        shopId, 
        folderId: trimmedFolderId 
      },
    });
    
    console.log('Note created successfully with ID:', newNote.id);
    
    return json({ success: true, message: "Note created successfully", noteId: newNote.id }, {
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    });
  } catch (error) {
    console.error("Error creating note:", error);
    return json({ error: "Failed to create note" });
  }
}