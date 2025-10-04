import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const action = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const { noteId, title, content, versionTitle } = await request.json();

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

    // Create the version
    const version = await prisma.noteVersion.create({
      data: {
        noteId,
        title,
        content,
        versionTitle,
      },
    });

    return json(version);
  } catch (error) {
    console.error("Error creating note version:", error);
    return json({ error: "Failed to create version" }, { status: 500 });
  }
};