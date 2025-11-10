import { json } from "@remix-run/node";

export async function action({ request }) {
  // Dynamic imports for server-only modules
  const [
    { shopify },
    { prisma },
    { getOrCreateShopId },
  ] = await Promise.all([
    import("../shopify.server"),
    import("../utils/db.server"),
    import("../utils/tenant.server"),
  ]);

  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const form = await request.formData();
  const noteId = form.get("noteId");
  const title = form.get("title");
  const body = form.get("body");
  const folderId = form.get("folderId");
  const tags = form.get("tags");

  // Remove emoji characters from input
  const removeEmojis = (str) => {
    if (!str) return str;
    // Remove emoji characters using regex
    return str.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]/gu, '');
  };

  const trimmedTitle = title ? removeEmojis(title.toString().trim()) : "";
  const trimmedBody = body ? removeEmojis(body.toString().trim()) : "";
  const trimmedFolderId = folderId ? folderId.toString().trim() : "";
  


  if (!noteId) {
    return json({ error: "Missing note ID" });
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

    // Update the note with emojis removed
    await prisma.note.update({
      where: { id: noteId },
      data: { 
        title: trimmedTitle, 
        content: trimmedBody, 
        tags: parsedTags.map(tag => removeEmojis(tag)),
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
