import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  
  console.log("[Auth] Incoming request", {
    url: request.url,
    shop,
    hasShop: Boolean(shop),
  });

  await authenticate.admin(request);

  console.log("[Auth] Authentication successful, continuing");

  return null;
};
