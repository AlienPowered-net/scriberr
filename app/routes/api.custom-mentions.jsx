import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

// GET - Fetch all contacts for mention suggestions
export async function loader({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);

    // Fetch contacts from the new Contact model
    const contacts = await prisma.contact.findMany({
      where: { shopId },
      orderBy: [
        { type: 'asc' },
        { firstName: 'asc' },
        { businessName: 'asc' }
      ]
    });

    // Transform contacts to mention format
    const mentions = contacts.map(contact => {
      if (contact.type === 'PERSON') {
        return {
          id: contact.id,
          name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          email: contact.email || '',
          type: 'person',
          metadata: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            company: contact.company,
            phone: contact.phone,
            mobile: contact.mobile,
            role: contact.role,
            memo: contact.memo
          }
        };
      } else {
        return {
          id: contact.id,
          name: contact.businessName || '',
          email: contact.email || '',
          type: 'business',
          metadata: {
            businessName: contact.businessName,
            company: contact.company,
            phone: contact.phone,
            email: contact.email,
            role: contact.role,
            memo: contact.memo,
            pointsOfContact: contact.pointsOfContact
          }
        };
      }
    });

    return json({ success: true, mentions });
  } catch (error) {
    console.error('Error fetching contacts for mentions:', error);
    return json({ success: false, mentions: [], error: error.message }, { status: 500 });
  }
}

// POST - Migrate existing custom mentions to contacts
export async function action({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);
    
    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "migrate") {
      // Get all existing custom mentions
      const customMentions = await prisma.customMention.findMany({
        where: { shopId }
      });

      if (customMentions.length === 0) {
        return json({ success: true, message: "No custom mentions to migrate" });
      }

      // Create default "Contacts" folder if it doesn't exist
      let defaultFolder = await prisma.contactFolder.findFirst({
        where: { shopId, name: "Contacts" }
      });

      if (!defaultFolder) {
        defaultFolder = await prisma.contactFolder.create({
          data: {
            shopId,
            name: "Contacts",
            icon: "folder",
            iconColor: "#f57c00",
            position: 0
          }
        });
      }

      // Migrate each custom mention to a contact
      const migratedContacts = [];
      for (const mention of customMentions) {
        // Split name into first and last name
        const nameParts = mention.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const contact = await prisma.contact.create({
          data: {
            shopId,
            folderId: defaultFolder.id,
            type: 'PERSON',
            firstName,
            lastName,
            email: mention.email
          }
        });

        migratedContacts.push(contact);
      }

      // Delete the old custom mentions
      await prisma.customMention.deleteMany({
        where: { shopId }
      });

      return json({ 
        success: true, 
        message: `Successfully migrated ${migratedContacts.length} custom mentions to contacts`,
        migratedCount: migratedContacts.length
      });
    }

    return json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error('Error in custom mentions migration:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
