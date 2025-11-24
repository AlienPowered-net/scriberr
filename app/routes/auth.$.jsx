import { redirect } from "@remix-run/node";
import shopify from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  console.info("[Auth] Incoming request", {
    url: request.url,
    shop,
    hasShop: !!shop,
  });

  if (!shop) {
    console.info("[Auth] No shop param, redirecting to /auth/login");
    return redirect("/auth/login");
  }

  return shopify.authenticate.admin(request);
};
