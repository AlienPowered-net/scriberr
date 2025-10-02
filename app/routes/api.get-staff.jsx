import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";

export async function loader({ request }) {
  try {
    const { admin, session } = await shopify.authenticate.admin(request);
    
    console.log('Fetching staff members for shop:', session.shop);
    
    // Query to get shop owner and current user info as a fallback
    // Note: Full staff list requires collaborator account access
    const response = await admin.graphql(
      `#graphql
      query {
        shop {
          name
          email
          contactEmail
        }
      }`
    );

    const responseJson = await response.json();
    console.log('GraphQL Response:', JSON.stringify(responseJson, null, 2));
    
    if (responseJson.data?.shop) {
      const shop = responseJson.data.shop;
      
      // Create staff members array with available info
      const staffMembers = [];
      
      // Add shop owner/primary contact
      if (shop.email || shop.contactEmail) {
        staffMembers.push({
          id: 'shop-owner',
          label: `Shop Owner (${shop.name})`,
          email: shop.email || shop.contactEmail,
          isOwner: true
        });
      }
      
      // Add current user
      if (session.onlineAccessInfo?.associated_user) {
        const user = session.onlineAccessInfo.associated_user;
        staffMembers.push({
          id: user.id.toString(),
          label: `${user.first_name} ${user.last_name}`.trim() || user.email,
          email: user.email,
          isOwner: false
        });
      }

      console.log('Returning staff members:', staffMembers);
      return json({ success: true, staffMembers });
    }

    console.log('No shop data found in response');
    return json({ success: false, staffMembers: [] });
  } catch (error) {
    console.error('Error fetching staff members:', error);
    console.error('Error stack:', error.stack);
    return json({ success: false, staffMembers: [], error: error.message });
  }
}
