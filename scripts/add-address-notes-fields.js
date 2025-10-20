import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Adding address and notes fields to Contact table...');
  
  try {
    // Execute raw SQL to add the columns
    await prisma.$executeRaw`
      ALTER TABLE "Contact" 
      ADD COLUMN IF NOT EXISTS "address" TEXT,
      ADD COLUMN IF NOT EXISTS "notes" TEXT;
    `;
    
    console.log('✅ Successfully added address and notes fields to Contact table');
  } catch (error) {
    console.error('❌ Error adding fields:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

