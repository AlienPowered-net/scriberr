import { redirect } from "@remix-run/node";
import shopify from "../shopify.server";

export const loader = async ({ request, params }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const paramsStar = params["*"] ?? "";
  const hasSubRoute = paramsStar.length > 0;

  console.info("[Auth] Incoming request", {
    url: request.url,
    shop,
    hasShop: !!shop,
    paramsStar,
  });

  if (hasSubRoute) {
    console.info("[Auth] Handling nested auth route via authenticate.admin", {
      paramsStar,
    });
    return shopify.authenticate.admin(request);
  }

  if (!shop) {
    console.info("[Auth] No shop param, redirecting to /auth/login");
    return redirect("/auth/login");
  }

  console.info("[Auth] Shop param present, starting authenticate.admin flow");
  return shopify.authenticate.admin(request);
};
