import { PrismaClient } from '@prisma/client';

// Use the dev database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_rSNp1twCG9IT@ep-proud-haze-afd5l89j-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    }
  }
});

async function checkDevDatabase() {
  try {
    console.log('🔍 Checking dev database tables...');
    
    // Check if ContactFolder table exists
    try {
      const folderCount = await prisma.contactFolder.count();
      console.log(`✅ ContactFolder table exists with ${folderCount} records`);
    } catch (error) {
      console.log('❌ ContactFolder table does not exist:', error.message);
    }
    
    // Check if Contact table exists
    try {
      const contactCount = await prisma.contact.count();
      console.log(`✅ Contact table exists with ${contactCount} records`);
    } catch (error) {
      console.log('❌ Contact table does not exist:', error.message);
    }
    
    // Check if ContactType enum exists
    try {
      await prisma.$executeRaw`SELECT 1 FROM pg_type WHERE typname = 'ContactType'`;
      console.log('✅ ContactType enum exists');
    } catch (error) {
      console.log('❌ ContactType enum does not exist:', error.message);
    }
    
    // Check Shop table
    try {
      const shopCount = await prisma.shop.count();
      console.log(`✅ Shop table exists with ${shopCount} records`);
      
      // List shops
      const shops = await prisma.shop.findMany();
      console.log('📋 Existing shops:');
      shops.forEach(shop => {
        console.log(`  - ${shop.domain} (ID: ${shop.id})`);
      });
    } catch (error) {
      console.log('❌ Shop table error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDevDatabase();
