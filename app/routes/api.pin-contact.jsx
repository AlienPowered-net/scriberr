import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);

    const { contactId } = await request.json();

    if (!contactId) {
      return json({ error: "Contact ID is required" }, { status: 400 });
    }

    // Check if pinnedAt column exists, if not, add it
    try {
      await prisma.$queryRaw`SELECT "pinnedAt" FROM "Contact" LIMIT 1`;
    } catch (error) {
      console.log('pinnedAt column does not exist, adding it...');
      await prisma.$executeRaw`ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3)`;
      console.log('✅ pinnedAt column added');
    }

    // First, get the current contact to check if it's already pinned
    const currentContact = await prisma.contact.findUnique({
      where: {
        id: contactId,
        shopId: shopId
      },
      select: {
        id: true,
        pinnedAt: true
      }
    });

    if (!currentContact) {
      return json({ error: "Contact not found" }, { status: 404 });
    }

    // Toggle pin status: if already pinned, unpin it; if not pinned, pin it
    const isCurrentlyPinned = currentContact.pinnedAt !== null;
    const newPinnedAt = isCurrentlyPinned ? null : new Date();

    const updatedContact = await prisma.contact.update({
      where: {
        id: contactId,
        shopId: shopId
      },
      data: {
        pinnedAt: newPinnedAt
      }
    });

    return json({ 
      success: true, 
      contactId: contactId,
      isPinned: !isCurrentlyPinned, // Return the new pin status
      pinnedAt: newPinnedAt // Return the new pinnedAt value
    });
  } catch (error) {
    console.error('Error toggling contact pin:', error);
    return json({ error: "Failed to toggle contact pin" }, { status: 500 });
  }
}
