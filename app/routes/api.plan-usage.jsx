import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import {
  buildPlanAccessErrorBody,
  ensurePlan,
  isPlanAccessError,
  serializePlanContext,
} from "../utils/tenant.server";

export const loader = async ({ request }) => {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const planContext = await ensurePlan({
      shopDomain: session.shop,
      requireActive: false,
      usage: [
        { key: "notes" },
        { key: "folders" },
        { key: "mentions" },
      ],
    });

    const serialized = serializePlanContext(
      planContext,
      planContext.usageSummary,
    );

    return json({
      success: true,
      ...serialized,
    });
  } catch (error) {
    if (isPlanAccessError(error)) {
      return json(buildPlanAccessErrorBody(error), { status: error.status });
    }

    console.error("Failed to load plan usage", error);
    return json({ success: false, error: "Failed to load plan usage" }, { status: 500 });
  }
};

export const action = () => new Response(null, { status: 405 });
