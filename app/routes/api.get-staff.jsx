import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";

export async function loader({ request }) {
  try {
    const { admin, session } = await shopify.authenticate.admin(request);
    
    // Query to get staff members
    const response = await admin.graphql(
      `#graphql
      query {
        shop {
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
    
    if (responseJson.data?.shop?.staffMembers) {
      const staffMembers = responseJson.data.shop.staffMembers.edges
        .map(edge => edge.node)
        .filter(member => member.active)
        .map(member => ({
          id: member.id.split('/').pop(), // Extract numeric ID
          label: member.name || member.email,
          email: member.email,
          isOwner: member.isShopOwner
        }));

      return json({ success: true, staffMembers });
    }

    return json({ success: false, staffMembers: [] });
  } catch (error) {
    console.error('Error fetching staff members:', error);
    return json({ success: false, staffMembers: [], error: error.message });
  }
}
