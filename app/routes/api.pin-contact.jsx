import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import {
  isPlanError,
  requireFeature,
  serializePlanError,
  withPlanContext,
} from "../utils/ensurePlan.server";

export const action = withPlanContext(async ({ request, planContext }) => {
  try {
    await requireFeature("contacts")(planContext);

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
      },
      select: {
        id: true,
        shopId: true,
        pinnedAt: true,
      },
    });

    if (!currentContact) {
      return json({ error: "Contact not found" }, { status: 404 });
    }

    if (currentContact.shopId !== planContext.shopId) {
      return json({ error: "Contact not found" }, { status: 404 });
    }

    // Toggle pin status: if already pinned, unpin it; if not pinned, pin it
    const isCurrentlyPinned = currentContact.pinnedAt !== null;
    const newPinnedAt = isCurrentlyPinned ? null : new Date();

    const updatedContact = await prisma.contact.update({
      where: {
        id: contactId,
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
    if (isPlanError(error)) {
      return json(serializePlanError(error), { status: error.status });
    }

    console.error('Error toggling contact pin:', error);
    return json({ error: "Failed to toggle contact pin" }, { status: 500 });
  }
});
