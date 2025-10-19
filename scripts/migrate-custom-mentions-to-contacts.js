#!/usr/bin/env node

/**
 * Migration script to convert existing CustomMention records to Contact records
 * This script will:
 * 1. Create a default "Contacts" folder for each shop
 * 2. Convert all CustomMention records to Contact records (PERSON type)
 * 3. Map the existing fields appropriately
 * 4. Clean up old CustomMention records (optional)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateCustomMentionsToContacts() {
  try {
    console.log('🔄 Starting Custom Mentions to Contacts migration...\n');

    // Step 1: Get all shops that have custom mentions
    console.log('1. Finding shops with custom mentions...');
    
    const shopsWithMentions = await prisma.shop.findMany({
      where: {
        customMentions: {
          some: {}
        }
      },
      include: {
        customMentions: true
      }
    });

    console.log(`✅ Found ${shopsWithMentions.length} shops with custom mentions`);

    if (shopsWithMentions.length === 0) {
      console.log('ℹ️  No custom mentions found to migrate. Migration complete.');
      return;
    }

    // Step 2: Process each shop
    for (const shop of shopsWithMentions) {
      console.log(`\n2. Processing shop: ${shop.domain}`);
      console.log(`   Found ${shop.customMentions.length} custom mentions`);

      // Create or get default "Contacts" folder for this shop
      let defaultFolder = await prisma.contactFolder.findFirst({
        where: {
          shopId: shop.id,
          name: 'Contacts'
        }
      });

      if (!defaultFolder) {
        defaultFolder = await prisma.contactFolder.create({
          data: {
            shopId: shop.id,
            name: 'Contacts',
            icon: 'folder',
            iconColor: '#f57c00',
            position: 0
          }
        });
        console.log('   ✅ Created default "Contacts" folder');
      } else {
        console.log('   ✅ Using existing "Contacts" folder');
      }

      // Step 3: Convert custom mentions to contacts
      console.log('3. Converting custom mentions to contacts...');
      
      let migratedCount = 0;
      let skippedCount = 0;

      for (const mention of shop.customMentions) {
        try {
          // Parse the name to extract first and last name
          const nameParts = (mention.name || '').trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Create contact record
          await prisma.contact.create({
            data: {
              shopId: shop.id,
              folderId: defaultFolder.id,
              type: 'PERSON',
              firstName: firstName,
              lastName: lastName,
              email: mention.email || null,
              company: mention.company || null,
              phone: mention.phone || null,
              mobile: mention.mobile || null,
              role: mention.role || null,
              memo: mention.memo || null
            }
          });

          migratedCount++;
          console.log(`   ✅ Migrated: ${mention.name} -> ${firstName} ${lastName}`);

        } catch (error) {
          console.log(`   ⚠️  Skipped: ${mention.name} (${error.message})`);
          skippedCount++;
        }
      }

      console.log(`   📊 Migration summary for ${shop.domain}:`);
      console.log(`      - Migrated: ${migratedCount} contacts`);
      console.log(`      - Skipped: ${skippedCount} contacts`);
    }

    // Step 4: Optional cleanup - remove old custom mentions
    console.log('\n4. Cleanup options:');
    console.log('   The old CustomMention records are still in the database.');
    console.log('   You can manually delete them after verifying the migration was successful.');
    console.log('   To delete them, run: DELETE FROM "CustomMention";');

    console.log('\n🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the Contacts page to ensure all contacts are visible');
    console.log('2. Test @mention functionality in notes');
    console.log('3. Verify contact cards display correctly');
    console.log('4. Once verified, you can delete the old CustomMention records');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateCustomMentionsToContacts();

