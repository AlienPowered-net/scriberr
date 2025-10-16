import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createContactsTables() {
  try {
    console.log('Creating ContactFolder table...');
    
    // Create ContactFolder table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ContactFolder" (
        "id" TEXT NOT NULL,
        "shopId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "icon" TEXT NOT NULL DEFAULT 'folder',
        "iconColor" TEXT NOT NULL DEFAULT '#f57c00',
        "position" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ContactFolder_pkey" PRIMARY KEY ("id")
      )
    `;

    console.log('Creating Contact table...');
    
    // Create Contact table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Contact" (
        "id" TEXT NOT NULL,
        "shopId" TEXT NOT NULL,
        "folderId" TEXT,
        "type" "ContactType" NOT NULL DEFAULT 'PERSON',
        "firstName" TEXT,
        "lastName" TEXT,
        "businessName" TEXT,
        "company" TEXT,
        "phone" TEXT,
        "mobile" TEXT,
        "email" TEXT,
        "role" TEXT,
        "memo" TEXT,
        "pointsOfContact" JSONB DEFAULT '[]',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
      )
    `;

    console.log('Creating ContactType enum...');
    
    // Create ContactType enum
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "ContactType" AS ENUM ('PERSON', 'BUSINESS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    console.log('Creating indexes...');
    
    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ContactFolder_shopId_idx" ON "ContactFolder"("shopId")
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Contact_shopId_folderId_idx" ON "Contact"("shopId", "folderId")
    `;

    console.log('Adding foreign key constraints...');
    
    // Add foreign key constraints (with error handling for existing constraints)
    try {
      await prisma.$executeRaw`
        ALTER TABLE "ContactFolder" 
        ADD CONSTRAINT "ContactFolder_shopId_fkey" 
        FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('ContactFolder_shopId_fkey constraint already exists');
    }
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Contact" 
        ADD CONSTRAINT "Contact_shopId_fkey" 
        FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('Contact_shopId_fkey constraint already exists');
    }
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Contact" 
        ADD CONSTRAINT "Contact_folderId_fkey" 
        FOREIGN KEY ("folderId") REFERENCES "ContactFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE
      `;
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('Contact_folderId_fkey constraint already exists');
    }

    console.log('Creating unique constraints...');
    
    // Add unique constraints (with error handling for existing constraints)
    try {
      await prisma.$executeRaw`
        ALTER TABLE "ContactFolder" 
        ADD CONSTRAINT "ContactFolder_shopId_name_key" 
        UNIQUE ("shopId", "name")
      `;
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('ContactFolder_shopId_name_key constraint already exists');
    }

    console.log('✅ ContactFolder and Contact tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
createContactsTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
