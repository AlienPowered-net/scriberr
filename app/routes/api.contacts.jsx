import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import {
  PlanAccessError,
  buildPlanAccessErrorBody,
  ensurePlan,
  isPlanAccessError,
} from "../utils/tenant.server";

export async function loader({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);

    const planContext = await ensurePlan({
      shopDomain: session.shop,
      usage: [{ key: "mentions" }],
    });

    if (!planContext.isManaged) {
      throw new PlanAccessError(
        "PLAN_RESTRICTED",
        "Contacts are available on paid plans.",
        { plan: planContext.plan.code },
      )
        .withContext(planContext)
        .withUsageSummary(planContext.usageSummary ?? {});
    }

    const contacts = await prisma.customMention.findMany({
      where: { shopId: planContext.shop.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return json({
      success: true,
      contacts,
      planUsage: planContext.usageSummary,
      plan: {
        code: planContext.plan.code,
        status: planContext.shop.planStatus,
        managed: planContext.isManaged,
      },
    });
  } catch (error) {
    if (isPlanAccessError(error)) {
      return json(buildPlanAccessErrorBody(error), { status: error.status });
    }

    console.error("Error loading contacts:", error);
    return json(
      { success: false, error: "Failed to load contacts" },
      { status: 500 },
    );
  }
}
