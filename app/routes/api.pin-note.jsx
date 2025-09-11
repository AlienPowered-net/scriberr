import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  try {
    const { noteId } = await request.json();

    if (!noteId) {
      return json({ error: "Note ID is required" }, { status: 400 });
    }

    // Get the shop ID from the request (you may need to adjust this based on your auth setup)
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');
    
    if (!shop) {
      return json({ error: "Shop parameter is required" }, { status: 400 });
    }

    const shopId = await getOrCreateShopId(shop);

    // Update the note to set pinnedAt timestamp
    const updatedNote = await prisma.note.update({
      where: {
        id: noteId,
        shopId: shopId
      },
      data: {
        pinnedAt: new Date()
      }
    });

    return json({ success: true, note: updatedNote });
  } catch (error) {
    console.error('Error pinning note:', error);
    return json({ error: "Failed to pin note" }, { status: 500 });
  }
}