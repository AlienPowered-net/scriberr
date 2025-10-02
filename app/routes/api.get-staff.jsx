import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";

export async function loader({ request }) {
  try {
    const { admin, session } = await shopify.authenticate.admin(request);
    
    console.log('Fetching staff members for shop:', session.shop);
    
    // Query to get staff members - requires read_users scope
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
    console.log('GraphQL Response:', JSON.stringify(responseJson, null, 2));
    
    // Check for GraphQL errors (e.g., missing scopes)
    if (responseJson.errors) {
      console.error('GraphQL errors:', responseJson.errors);
      
      // Fallback to basic user info if staffMembers query fails
      const staffMembers = [];
      
      if (session.onlineAccessInfo?.associated_user) {
        const user = session.onlineAccessInfo.associated_user;
        staffMembers.push({
          id: user.id.toString(),
          label: `${user.first_name} ${user.last_name}`.trim() || user.email,
          email: user.email,
          isOwner: false
        });
      }
      
      return json({ 
        success: true, 
        staffMembers,
        note: 'Limited access - requires read_users scope for full staff list'
      });
    }
    
    if (responseJson.data?.shop) {
      const shop = responseJson.data.shop;
      const staffMembers = [];
      
      // Add staff members from GraphQL response
      if (shop.staffMembers?.edges) {
        shop.staffMembers.edges.forEach(edge => {
          if (edge.node && edge.node.active) {
            staffMembers.push({
              id: edge.node.id.split('/').pop(),
              label: edge.node.name || edge.node.email,
              email: edge.node.email,
              isOwner: edge.node.isShopOwner
            });
          }
        });
      }
      
      // If no staff members found via GraphQL, add current user as fallback
      if (staffMembers.length === 0 && session.onlineAccessInfo?.associated_user) {
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
    
    // Fallback: try to return current user at least
    try {
      const { session } = await shopify.authenticate.admin(request);
      if (session.onlineAccessInfo?.associated_user) {
        const user = session.onlineAccessInfo.associated_user;
        return json({ 
          success: true, 
          staffMembers: [{
            id: user.id.toString(),
            label: `${user.first_name} ${user.last_name}`.trim() || user.email,
            email: user.email,
            isOwner: false
          }]
        });
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    
    return json({ success: false, staffMembers: [], error: error.message });
  }
}
