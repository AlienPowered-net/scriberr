import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export const loader = async ({ request }) => {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);
    const url = new URL(request.url);
    const noteId = url.searchParams.get("noteId");

    console.log("Getting versions for noteId:", noteId, "shopId:", shopId);

    if (!noteId) {
      return json({ error: "Note ID is required" }, { status: 400 });
    }

    // Verify the note belongs to the shop
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        shopId: shopId,
      },
    });

    if (!note) {
      console.error("Note not found for noteId:", noteId, "shopId:", shopId);
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

    console.log("Found", versions.length, "versions for noteId:", noteId);
    return json(versions);
  } catch (error) {
    console.error("Error fetching note versions:", error);
    return json({ error: "Failed to fetch versions", details: error.message }, { status: 500 });
  }
};