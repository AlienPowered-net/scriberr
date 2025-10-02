import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

// GET - Fetch all custom mentions for the shop
export async function loader({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);

    const mentions = await prisma.customMention.findMany({
      where: { shopId },
      orderBy: { name: 'asc' }
    });

    return json({ success: true, mentions });
  } catch (error) {
    console.error('Error fetching custom mentions:', error);
    // If table doesn't exist yet (P2021), return empty array gracefully
    if (error.code === 'P2021') {
      return json({ success: true, mentions: [] });
    }
    return json({ success: false, mentions: [], error: error.message }, { status: 500 });
  }
}

// POST/DELETE - Create or delete custom mentions
export async function action({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);
    
    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "create") {
      const name = formData.get("name");
      const email = formData.get("email");

      if (!name || !email) {
        return json({ success: false, error: "Name and email are required" }, { status: 400 });
      }

      const mention = await prisma.customMention.create({
        data: {
          shopId,
          name: name.toString().trim(),
          email: email.toString().trim()
        }
      });

      return json({ success: true, mention });
    }

    if (action === "delete") {
      const id = formData.get("id");

      if (!id) {
        return json({ success: false, error: "ID is required" }, { status: 400 });
      }

      await prisma.customMention.delete({
        where: { id: id.toString() }
      });

      return json({ success: true });
    }

    return json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error('Error in custom mentions action:', error);
    // If table doesn't exist yet (P2021), return helpful message
    if (error.code === 'P2021') {
      return json({ 
        success: false, 
        error: "Database migration pending. Please wait a moment and try again after the deployment completes." 
      }, { status: 503 });
    }
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
