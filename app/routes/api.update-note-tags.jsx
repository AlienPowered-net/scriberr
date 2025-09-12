import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  try {
    const formData = await request.formData();
    const noteId = formData.get("noteId");
    const tagsJson = formData.get("tags");

    if (!noteId || !tagsJson) {
      return json({ error: "Note ID and tags are required" }, { status: 400 });
    }

    // Get the shop ID from the request
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');
    
    if (!shop) {
      return json({ error: "Shop parameter is required" }, { status: 400 });
    }

    const shopId = await getOrCreateShopId(shop);

    // Parse the tags
    let tags;
    try {
      tags = JSON.parse(tagsJson);
    } catch (error) {
      return json({ error: "Invalid tags format" }, { status: 400 });
    }

    // Update only the tags for the note
    const updatedNote = await prisma.note.update({
      where: {
        id: noteId,
        shopId: shopId
      },
      data: {
        tags: tags
      }
    });

    return json({ success: true, note: updatedNote });
  } catch (error) {
    console.error('Error updating note tags:', error);
    return json({ error: "Failed to update note tags" }, { status: 500 });
  }
}