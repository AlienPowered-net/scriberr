import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const action = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const { noteId, versionId, preserveCurrentChanges = false } = await request.json();

    // Verify the note belongs to the shop
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        shopId: admin.session.shop,
      },
    });

    if (!note) {
      return json({ error: "Note not found" }, { status: 404 });
    }

    // Get the version to restore
    const version = await prisma.noteVersion.findFirst({
      where: {
        id: versionId,
        noteId,
      },
    });

    if (!version) {
      return json({ error: "Version not found" }, { status: 404 });
    }

    // If preserving current changes, create a new version with current content
    if (preserveCurrentChanges) {
      const currentVersion = await prisma.noteVersion.create({
        data: {
          noteId,
          title: note.title,
          content: note.content,
          versionTitle: `Auto-saved before revert - ${new Date().toLocaleString()}`,
          isAuto: true,
        },
      });
    }

    // Update the note with the restored content
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        title: version.title,
        content: version.content,
        updatedAt: new Date(),
      },
    });

    return json({ 
      success: true, 
      note: updatedNote, 
      restoredVersion: version 
    });
  } catch (error) {
    console.error("Error restoring note version:", error);
    return json({ error: "Failed to restore version" }, { status: 500 });
  }
};