import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);

    const { noteId } = await request.json();

    if (!noteId) {
      return json({ error: "Note ID is required" }, { status: 400 });
    }

    // Check if pinnedAt column exists, if not, add it
    try {
      await prisma.$queryRaw`SELECT "pinnedAt" FROM "Note" LIMIT 1`;
    } catch (error) {
      console.log('pinnedAt column does not exist, adding it...');
      await prisma.$executeRaw`ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3)`;
      console.log('✅ pinnedAt column added');
    }

    // First, get the current note to check if it's already pinned
    const currentNote = await prisma.note.findUnique({
      where: {
        id: noteId,
        shopId: shopId
      },
      select: {
        id: true,
        pinnedAt: true
      }
    });

    if (!currentNote) {
      return json({ error: "Note not found" }, { status: 404 });
    }

    // Toggle pin status: if already pinned, unpin it; if not pinned, pin it
    const isCurrentlyPinned = currentNote.pinnedAt !== null;
    const newPinnedAt = isCurrentlyPinned ? null : new Date();

    const updatedNote = await prisma.note.update({
      where: {
        id: noteId,
        shopId: shopId
      },
      data: {
        pinnedAt: newPinnedAt
      }
    });

    return json({ 
      success: true, 
      noteId: noteId,
      isPinned: !isCurrentlyPinned, // Return the new pin status
      pinnedAt: newPinnedAt // Return the new pinnedAt value
    });
  } catch (error) {
    console.error('Error toggling note pin:', error);
    return json({ error: "Failed to toggle note pin" }, { status: 500 });
  }
}