import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const noteId = url.searchParams.get("noteId");

    if (!noteId) {
      return json({ error: "Note ID is required" }, { status: 400 });
    }

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

    // Get versions for the note, ordered by creation date (newest first)
    const versions = await prisma.noteVersion.findMany({
      where: {
        noteId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20, // Increased limit for better version history
      select: {
        id: true,
        title: true,
        content: true,
        versionTitle: true,
        snapshot: true,
        isAuto: true,
        createdAt: true,
      },
    });

    return json(versions);
  } catch (error) {
    console.error("Error fetching note versions:", error);
    return json({ error: "Failed to fetch versions" }, { status: 500 });
  }
};