import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const action = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    
    // Debug logging
    console.log("Admin object:", admin);
    console.log("Admin session:", admin?.session);
    
    if (!admin || !admin.session || !admin.session.shop) {
      console.error("Authentication failed - missing admin or session data");
      return json({ error: "Authentication failed" }, { status: 401 });
    }
    
    const { noteId, title, content, versionTitle, snapshot, isAuto = false } = await request.json();
    
    console.log("Creating version for noteId:", noteId, "shop:", admin.session.shop);

    // Verify the note belongs to the shop
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        shopId: admin.session.shop,
      },
    });

    if (!note) {
      console.error("Note not found for noteId:", noteId, "shop:", admin.session.shop);
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