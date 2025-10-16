import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

// GET - Fetch all contacts for the shop
export async function loader({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);

    const contacts = await prisma.contact.findMany({
      where: { shopId },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            icon: true,
            iconColor: true
          }
        }
      },
      orderBy: [
        { folder: { position: 'asc' } },
        { createdAt: 'desc' }
      ]
    });

    return json({ success: true, contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return json({ success: false, contacts: [], error: error.message }, { status: 500 });
  }
}

// POST - Create, update, or delete contacts
export async function action({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);
    
    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "create") {
      const type = formData.get("type");
      const folderId = formData.get("folderId");
      
      // Validate required fields based on type
      if (type === "PERSON") {
        const firstName = formData.get("firstName");
        const lastName = formData.get("lastName");
        
        if (!firstName || !lastName) {
          return json({ success: false, error: "First name and last name are required for person contacts" }, { status: 400 });
        }
      } else if (type === "BUSINESS") {
        const businessName = formData.get("businessName");
        
        if (!businessName) {
          return json({ success: false, error: "Business name is required for business contacts" }, { status: 400 });
        }
      }

      // Parse points of contact for business type
      let pointsOfContact = [];
      if (type === "BUSINESS") {
        const pointsOfContactStr = formData.get("pointsOfContact");
        if (pointsOfContactStr) {
          try {
            pointsOfContact = JSON.parse(pointsOfContactStr);
          } catch (e) {
            console.error('Error parsing points of contact:', e);
          }
        }
      }

      const contact = await prisma.contact.create({
        data: {
          shopId,
          folderId: folderId || null,
          type,
          firstName: formData.get("firstName") || null,
          lastName: formData.get("lastName") || null,
          businessName: formData.get("businessName") || null,
          company: formData.get("company") || null,
          phone: formData.get("phone") || null,
          mobile: formData.get("mobile") || null,
          email: formData.get("email") || null,
          role: formData.get("role") || null,
          memo: formData.get("memo") || null,
          pointsOfContact: pointsOfContact.length > 0 ? pointsOfContact : null
        },
        include: {
          folder: {
            select: {
              id: true,
              name: true,
              icon: true,
              iconColor: true
            }
          }
        }
      });

      return json({ success: true, contact });
    }

    if (action === "update") {
      const id = formData.get("id");
      const type = formData.get("type");
      
      if (!id) {
        return json({ success: false, error: "Contact ID is required" }, { status: 400 });
      }

      // Parse points of contact for business type
      let pointsOfContact = null;
      if (type === "BUSINESS") {
        const pointsOfContactStr = formData.get("pointsOfContact");
        if (pointsOfContactStr) {
          try {
            const parsed = JSON.parse(pointsOfContactStr);
            pointsOfContact = parsed.length > 0 ? parsed : null;
          } catch (e) {
            console.error('Error parsing points of contact:', e);
          }
        }
      }

      const contact = await prisma.contact.update({
        where: { id },
        data: {
          type,
          folderId: formData.get("folderId") || null,
          firstName: formData.get("firstName") || null,
          lastName: formData.get("lastName") || null,
          businessName: formData.get("businessName") || null,
          company: formData.get("company") || null,
          phone: formData.get("phone") || null,
          mobile: formData.get("mobile") || null,
          email: formData.get("email") || null,
          role: formData.get("role") || null,
          memo: formData.get("memo") || null,
          pointsOfContact
        },
        include: {
          folder: {
            select: {
              id: true,
              name: true,
              icon: true,
              iconColor: true
            }
          }
        }
      });

      return json({ success: true, contact });
    }

    if (action === "delete") {
      const id = formData.get("id");

      if (!id) {
        return json({ success: false, error: "Contact ID is required" }, { status: 400 });
      }

      await prisma.contact.delete({
        where: { id }
      });

      return json({ success: true });
    }

    return json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error('Error in contacts action:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
