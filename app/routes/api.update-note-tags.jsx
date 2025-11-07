import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import {
  buildPlanAccessErrorBody,
  ensurePlan,
  isPlanAccessError,
} from "../utils/tenant.server";

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

    // Parse the tags
    let tags;
    try {
      tags = JSON.parse(tagsJson);
    } catch (error) {
      return json({ error: "Invalid tags format" }, { status: 400 });
    }

    const planContext = await ensurePlan({
      shopDomain: shop,
      usage: [{ key: "tags", currentQuantity: Array.isArray(tags) ? tags.length : 0 }],
    });

    const shopId = planContext.shop.id;

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

    return json({
      success: true,
      note: updatedNote,
      planUsage: planContext.usageSummary,
    });
  } catch (error) {
    if (isPlanAccessError(error)) {
      return json(buildPlanAccessErrorBody(error), { status: error.status });
    }

    console.error('Error updating note tags:', error);
    return json({ error: "Failed to update note tags" }, { status: 500 });
  }
}