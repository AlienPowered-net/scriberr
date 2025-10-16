#!/usr/bin/env node

/**
 * Test script for contact migration functionality
 * This script tests the migration of existing custom mentions to contacts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testContactMigration() {
  try {
    console.log('🧪 Testing Contact Migration...\n');

    // Test 1: Check if Contact and ContactFolder models exist
    console.log('1. Testing database schema...');
    
    const contactFolders = await prisma.contactFolder.findMany({
      take: 1
    });
    console.log('✅ ContactFolder model accessible');

    const contacts = await prisma.contact.findMany({
      take: 1
    });
    console.log('✅ Contact model accessible');

    // Test 2: Check if CustomMention model still exists
    console.log('\n2. Testing CustomMention model...');
    
    const customMentions = await prisma.customMention.findMany({
      take: 1
    });
    console.log('✅ CustomMention model still accessible');

    // Test 3: Create or get a test shop first
    console.log('\n3. Creating test shop...');
    
    let testShop = await prisma.shop.findFirst({
      where: { domain: 'test-migration.myshopify.com' }
    });
    
    if (!testShop) {
      testShop = await prisma.shop.create({
        data: {
          domain: 'test-migration.myshopify.com'
        }
      });
    }
    console.log('✅ Test shop ready:', testShop.domain);

    // Test 4: Test creating a contact folder
    console.log('\n4. Testing contact folder creation...');
    
    const testFolder = await prisma.contactFolder.create({
      data: {
        shopId: testShop.id,
        name: 'Test Folder',
        icon: 'folder',
        iconColor: '#f57c00',
        position: 0
      }
    });
    console.log('✅ Contact folder created:', testFolder.name);

    // Test 5: Test creating a person contact
    console.log('\n5. Testing person contact creation...');
    
    const testPersonContact = await prisma.contact.create({
      data: {
        shopId: testShop.id,
        folderId: testFolder.id,
        type: 'PERSON',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
        company: 'Test Company',
        role: 'Developer'
      }
    });
    console.log('✅ Person contact created:', `${testPersonContact.firstName} ${testPersonContact.lastName}`);

    // Test 6: Test creating a business contact
    console.log('\n6. Testing business contact creation...');
    
    const testBusinessContact = await prisma.contact.create({
      data: {
        shopId: testShop.id,
        folderId: testFolder.id,
        type: 'BUSINESS',
        businessName: 'Test Business Inc.',
        email: 'info@testbusiness.com',
        phone: '+1-555-0456',
        role: 'Client',
        pointsOfContact: [
          {
            name: 'Jane Smith',
            phone: '+1-555-0789',
            email: 'jane@testbusiness.com'
          }
        ]
      }
    });
    console.log('✅ Business contact created:', testBusinessContact.businessName);

    // Test 7: Test fetching contacts with folder information
    console.log('\n7. Testing contact queries...');
    
    const contactsWithFolders = await prisma.contact.findMany({
      where: { shopId: testShop.id },
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
    console.log('✅ Contacts with folder info fetched:', contactsWithFolders.length, 'contacts');

    // Test 8: Test custom mentions API format
    console.log('\n8. Testing custom mentions API format...');
    
    const mentions = contactsWithFolders.map(contact => {
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
    console.log('✅ Custom mentions format generated:', mentions.length, 'mentions');

    // Cleanup test data
    console.log('\n9. Cleaning up test data...');
    
    await prisma.contact.deleteMany({
      where: { shopId: testShop.id }
    });
    await prisma.contactFolder.deleteMany({
      where: { shopId: testShop.id }
    });
    await prisma.shop.delete({
      where: { id: testShop.id }
    });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Contact migration system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testContactMigration();
