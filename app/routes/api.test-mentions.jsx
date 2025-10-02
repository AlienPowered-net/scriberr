import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";

// Debug endpoint to test what data we're getting
export async function loader({ request }) {
  try {
    const { admin, session } = await shopify.authenticate.admin(request);
    
    const debugInfo = {
      shop: session.shop,
      scope: session.scope,
      hasOnlineAccessInfo: !!session.onlineAccessInfo,
      currentUser: session.onlineAccessInfo?.associated_user || null,
    };

    // Try staffMembers query
    const response = await admin.graphql(
      `#graphql
      query {
        shop {
          name
          email
          contactEmail
          staffMembers(first: 50) {
            edges {
              node {
                id
                name
                email
                isShopOwner
                active
              }
            }
          }
        }
      }`
    );

    const responseJson = await response.json();
    
    return json({
      debugInfo,
      graphqlResponse: responseJson,
      hasErrors: !!responseJson.errors,
      staffCount: responseJson.data?.shop?.staffMembers?.edges?.length || 0
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return json({
      error: error.message,
      stack: error.stack,
      code: error.code
    }, { status: 500 });
  }
}
