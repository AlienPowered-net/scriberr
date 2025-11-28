import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  // Dynamic imports for server-only modules
  const [
    { prisma },
    {
      isPlanError,
      requireFeature,
      serializePlanError,
      withPlanContext,
    },
  ] = await Promise.all([
    import("../utils/db.server"),
    import("../utils/ensurePlan.server"),
  ]);

  // Wrap handler with plan context
  const handler = withPlanContext(async ({ planContext }) => {
    try {
      await requireFeature("contacts")(planContext);

      const url = new URL(request.url);
      const contactId = url.searchParams.get("id");

      if (contactId) {
        // Fetch a specific contact by ID
        const contact = await prisma.contact.findUnique({
          where: { id: contactId, shopId: planContext.shopId },
          include: { folder: true },
        });
        
        if (!contact) {
          return json({ error: "Contact not found" }, { status: 404 });
        }
        
        return json(contact);
      } else {
        // Return all contacts
        const contacts = await prisma.contact.findMany({
          where: { shopId: planContext.shopId },
          include: {
            folder: true,
          },
          orderBy: { createdAt: "desc" },
        });

        return json(contacts);
      }
    } catch (error) {
      if (isPlanError(error)) {
        return json(serializePlanError(error), { status: error.status });
      }

      console.error("Error loading contacts:", error);
      return json({ error: "Failed to load contacts" }, { status: 500 });
    }
  });

  return handler({ request });
};

export const action = async ({ request }) => {
  // Dynamic imports for server-only modules
  const [
    { prisma },
    {
      isPlanError,
      requireFeature,
      serializePlanError,
      withPlanContext,
    },
  ] = await Promise.all([
    import("../utils/db.server"),
    import("../utils/ensurePlan.server"),
  ]);

  // Wrap handler with plan context
  const handler = withPlanContext(async ({ request, planContext }) => {
    try {
      await requireFeature("contacts")(planContext);

      const formData = await request.formData();
      const actionType = formData.get("_action");

      switch (actionType) {
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
          const address = formData.get("address");
          const folderId = formData.get("folderId");
          const pointsOfContact = formData.get("pointsOfContact");
          const tags = formData.get("tags");
          const avatarColor = formData.get("avatarColor");

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
            shopId: planContext.shopId,
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
            ...(address && { address }),
            ...(pointsOfContact && { pointsOfContact: JSON.parse(pointsOfContact) }),
            ...(tags && { tags: JSON.parse(tags) }),
            ...(avatarColor && { avatarColor })
          };

          const contact = await prisma.contact.create({
            data: contactData
          });

          return json({ success: true, contact });
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
          const address = formData.get("address");
          const folderId = formData.get("folderId");
          const pointsOfContact = formData.get("pointsOfContact");
          const tags = formData.get("tags");
          const avatarColor = formData.get("avatarColor");

          if (!id) {
            return json({ error: "Contact ID is required" }, { status: 400 });
          }

          const existing = await prisma.contact.findUnique({ where: { id } });
          if (!existing || existing.shopId !== planContext.shopId) {
            return json({ error: "Contact not found" }, { status: 404 });
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
            ...(address !== null && { address }),
            ...(folderId !== null && { folderId: folderId || null }),
            ...(pointsOfContact && { pointsOfContact: JSON.parse(pointsOfContact) }),
            ...(tags && { tags: JSON.parse(tags) }),
            ...(avatarColor && { avatarColor })
          };

          const contact = await prisma.contact.update({
            where: { id },
            data: updateData,
          });

          return json({ success: true, contact });
        }

        case "delete": {
          const id = formData.get("id");

          if (!id) {
            return json({ error: "Contact ID is required" }, { status: 400 });
          }

          const contact = await prisma.contact.findUnique({ where: { id } });
          if (!contact || contact.shopId !== planContext.shopId) {
            return json({ error: "Contact not found" }, { status: 404 });
          }

          await prisma.contact.delete({
            where: { id },
          });

          return json({ success: true });
        }

        case "bulk-delete": {
          const contactIds = formData.get("contactIds");

          if (!contactIds) {
            return json({ error: "Contact IDs are required" }, { status: 400 });
          }

          const ids = JSON.parse(contactIds);
          
          await prisma.contact.deleteMany({
            where: {
              id: { in: ids },
              shopId: planContext.shopId,
            },
          });

          return json({ success: true, deletedCount: ids.length });
        }

        case "bulk-move": {
          const contactIds = formData.get("contactIds");
          const folderId = formData.get("folderId");

          if (!contactIds || !folderId) {
            return json({ error: "Contact IDs and folder ID are required" }, { status: 400 });
          }

          const ids = JSON.parse(contactIds);
          
          await prisma.contact.updateMany({
            where: {
              id: { in: ids },
              shopId: planContext.shopId,
            },
            data: {
              folderId: folderId,
            },
          });

          return json({ success: true, movedCount: ids.length });
        }

        case "delete-tag": {
          const tag = formData.get("tag");

          if (!tag) {
            return json({ error: "Tag is required" }, { status: 400 });
          }

          // Get all contacts with this tag
          const contactsWithTag = await prisma.contact.findMany({
            where: {
              shopId: planContext.shopId,
              tags: {
                has: tag
              }
            }
          });

          // Remove the tag from all contacts
          for (const contact of contactsWithTag) {
            const updatedTags = contact.tags.filter(t => t !== tag);
            await prisma.contact.update({
              where: { id: contact.id },
              data: { tags: updatedTags }
            });
          }

          return json({ success: true, affectedCount: contactsWithTag.length });
        }

        default:
          return json({ error: "Invalid action" }, { status: 400 });
      }
    } catch (error) {
      if (isPlanError(error)) {
        return json(serializePlanError(error), { status: error.status });
      }

      console.error("Error in contacts action:", error);
      return json({ error: "Failed to process request" }, { status: 500 });
    }
  });

  return handler({ request });
};
