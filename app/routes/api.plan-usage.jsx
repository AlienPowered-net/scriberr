import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

const FREE_PLAN_LIMITS = {
  notesLimit: 25,
  foldersLimit: 3,
};

export async function loader({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);

    if (!session?.shop) {
      return json({ error: "Invalid session or shop not found" }, { status: 401 });
    }

    const shopId = await getOrCreateShopId(session.shop);

    const [notesUsed, foldersUsed] = await Promise.all([
      prisma.note.count({ where: { shopId } }),
      prisma.folder.count({ where: { shopId } }),
    ]);

    return json({
      notesUsed,
      notesLimit: FREE_PLAN_LIMITS.notesLimit,
      foldersUsed,
      foldersLimit: FREE_PLAN_LIMITS.foldersLimit,
    });
  } catch (error) {
    console.error("Error loading plan usage:", error);
    return json({ error: "Failed to load plan usage data" }, { status: 500 });
  }
}
