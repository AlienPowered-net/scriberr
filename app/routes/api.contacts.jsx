import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  // Ensure we have a valid shop
  if (!session?.shop) {
    return json({ error: "Invalid session or shop not found" }, { status: 401 });
  }
  
  try {
    // Ensure the shop exists in the database
    let shop = await prisma.shop.findUnique({
      where: { domain: session.shop }
    });

    if (!shop) {
      // Create the shop if it doesn't exist
      shop = await prisma.shop.create({
        data: {
          domain: session.shop,
          installedAt: new Date()
        }
      });
    }

    const contacts = await prisma.contact.findMany({
      where: { shopId: shop.id },
      include: {
        folder: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return json(contacts);
  } catch (error) {
    console.error('Error loading contacts:', error);
    return json({ error: 'Failed to load contacts' }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  // Ensure we have a valid shop
  if (!session?.shop) {
    return json({ error: "Invalid session or shop not found" }, { status: 401 });
  }

  const formData = await request.formData();
  const action = formData.get("_action");

  try {
    // Ensure the shop exists in the database
    let shop = await prisma.shop.findUnique({
      where: { domain: session.shop }
    });

    if (!shop) {
      // Create the shop if it doesn't exist
      shop = await prisma.shop.create({
        data: {
          domain: session.shop,
          installedAt: new Date()
        }
      });
    }

    switch (action) {
      case "create": {
        const type = formData.get("type");
        const firstName = formData.get("firstName");
        const lastName = formData.get("lastName");
        const businessName = formData.get("businessName");
        const company = formData.get("company");
        const phone = formData.get("phone");
        const mobile = formData.get("mobile");
        const email = formData.get("email");
        const role = formData.get("role");
        const memo = formData.get("memo");
        const folderId = formData.get("folderId");
        const pointsOfContact = formData.get("pointsOfContact");

        if (!type) {
          return json({ error: "Contact type is required" }, { status: 400 });
        }

        if (type === "PERSON" && (!firstName || !lastName)) {
          return json({ error: "First name and last name are required for person contacts" }, { status: 400 });
        }

        if (type === "BUSINESS" && !businessName) {
          return json({ error: "Business name is required for business contacts" }, { status: 400 });
        }

        const contactData = {
          shopId: shop.id, // Use the shop ID from database, not session.shop
          type,
          folderId: folderId || null,
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(businessName && { businessName }),
          ...(company && { company }),
          ...(phone && { phone }),
          ...(mobile && { mobile }),
          ...(email && { email }),
          ...(role && { role }),
          ...(memo && { memo }),
          ...(pointsOfContact && { pointsOfContact: JSON.parse(pointsOfContact) })
        };

        const contact = await prisma.contact.create({
          data: contactData
        });

        return json(contact);
      }

      case "update": {
        const id = formData.get("id");
        const type = formData.get("type");
        const firstName = formData.get("firstName");
        const lastName = formData.get("lastName");
        const businessName = formData.get("businessName");
        const company = formData.get("company");
        const phone = formData.get("phone");
        const mobile = formData.get("mobile");
        const email = formData.get("email");
        const role = formData.get("role");
        const memo = formData.get("memo");
        const folderId = formData.get("folderId");
        const pointsOfContact = formData.get("pointsOfContact");

        if (!id) {
          return json({ error: "Contact ID is required" }, { status: 400 });
        }

        const updateData = {
          ...(type && { type }),
          ...(firstName !== null && { firstName }),
          ...(lastName !== null && { lastName }),
          ...(businessName !== null && { businessName }),
          ...(company !== null && { company }),
          ...(phone !== null && { phone }),
          ...(mobile !== null && { mobile }),
          ...(email !== null && { email }),
          ...(role !== null && { role }),
          ...(memo !== null && { memo }),
          ...(folderId !== null && { folderId: folderId || null }),
          ...(pointsOfContact && { pointsOfContact: JSON.parse(pointsOfContact) })
        };

        const contact = await prisma.contact.update({
          where: { id },
          data: updateData
        });

        return json(contact);
      }

      case "delete": {
        const id = formData.get("id");

        if (!id) {
          return json({ error: "Contact ID is required" }, { status: 400 });
        }

        await prisma.contact.delete({
          where: { id }
        });

        return json({ success: true });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in contacts action:', error);
    return json({ error: "Failed to process request" }, { status: 500 });
  }
};