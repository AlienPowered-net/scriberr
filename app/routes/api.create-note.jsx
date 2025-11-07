import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import {
  isPlanError,
  requireCapacity,
  serializePlanError,
  withPlanContext,
} from "../../src/server/guards/ensurePlan";

export const action = withPlanContext(async ({ request, planContext }) => {
  const { shopId } = planContext;
  const form = await request.formData();
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
  

  // Allow creating notes with empty content (for new note creation)
  // Content validation will be handled when saving existing notes

  // Check if a folder is selected
  if (!trimmedFolderId) {
    return json({ error: "Please select a folder for the note" });
  }

  try {
    await requireCapacity("note")(planContext);

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

    // Create the note with emojis removed
    const newNote = await prisma.note.create({
      data: { 
        title: trimmedTitle, 
        content: trimmedBody, 
        tags: parsedTags.map(tag => removeEmojis(tag)),
        shopId, 
        folderId: trimmedFolderId 
      },
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        folderId: true,
        pinnedAt: true,
        createdAt: true,
        updatedAt: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    return json({ success: true, message: "Note created successfully", noteId: newNote.id, note: newNote }, {
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    });
  } catch (error) {
    if (isPlanError(error)) {
      return json(serializePlanError(error), { status: error.status });
    }

    console.error("Error creating note:", error);
    return json({ error: "Failed to create note" });
  }
});