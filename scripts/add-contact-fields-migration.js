const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addContactFields() {
  try {
    console.log('Starting migration to add missing Contact fields...');
    
    // Check if tags column exists
    try {
      await prisma.$queryRaw`SELECT "tags" FROM "Contact" LIMIT 1`;
      console.log('✅ tags column already exists');
    } catch (error) {
      console.log('➕ Adding tags column...');
      await prisma.$executeRaw`ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}'`;
      console.log('✅ tags column added');
    }

    // Check if pinnedAt column exists
    try {
      await prisma.$queryRaw`SELECT "pinnedAt" FROM "Contact" LIMIT 1`;
      console.log('✅ pinnedAt column already exists');
    } catch (error) {
      console.log('➕ Adding pinnedAt column...');
      await prisma.$executeRaw`ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3)`;
      console.log('✅ pinnedAt column added');
    }

    // Check if avatarColor column exists
    try {
      await prisma.$queryRaw`SELECT "avatarColor" FROM "Contact" LIMIT 1`;
      console.log('✅ avatarColor column already exists');
    } catch (error) {
      console.log('➕ Adding avatarColor column...');
      await prisma.$executeRaw`ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "avatarColor" TEXT DEFAULT '#10b981'`;
      console.log('✅ avatarColor column added');
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
addContactFields()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
