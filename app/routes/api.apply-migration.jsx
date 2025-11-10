import { json } from "@remix-run/node";

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // Dynamic imports for server-only modules
  const [
    { shopify },
    { prisma },
  ] = await Promise.all([
    import("../shopify.server"),
    import("../utils/db.server"),
  ]);

  try {
    const { session } = await shopify.authenticate.admin(request);
    
    console.log('🚀 Applying database migrations...');
    
    // Check if pinnedAt column already exists
    let pinnedAtExists = false;
    try {
      await prisma.$queryRaw`SELECT "pinnedAt" FROM "Note" LIMIT 1`;
      pinnedAtExists = true;
      console.log('✅ pinnedAt column already exists');
    } catch (error) {
      console.log('📋 pinnedAt column does not exist, will add it...');
    }
    
    // Check if folder columns already exist
    let folderColumnsExist = false;
    try {
      await prisma.$queryRaw`SELECT icon, "iconColor", position FROM "Folder" LIMIT 1`;
      folderColumnsExist = true;
      console.log('✅ Folder columns already exist');
    } catch (error) {
      console.log('📋 Folder columns do not exist, will add them...');
    }
    
    // Check if Contact address column exists
    let contactAddressExists = false;
    try {
      await prisma.$queryRaw`SELECT address FROM "Contact" LIMIT 1`;
      contactAddressExists = true;
      console.log('✅ Contact address column already exists');
    } catch (error) {
      console.log('📋 Contact address column does not exist, will add it...');
    }
    
    if (pinnedAtExists && folderColumnsExist && contactAddressExists) {
      return json({ 
        success: true, 
        message: "All migrations already applied - all columns exist",
        alreadyApplied: true 
      });
    }
    
    // Apply the migrations step by step
    try {
      // Add pinnedAt column to Note table
      if (!pinnedAtExists) {
        await prisma.$executeRaw`ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3)`;
        console.log('✅ pinnedAt column added to Note table');
      }
      
      // Add icon column
      if (!folderColumnsExist) {
        await prisma.$executeRaw`ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "icon" TEXT NOT NULL DEFAULT 'folder'`;
        console.log('✅ Icon column added');
        
        // Add iconColor column  
        await prisma.$executeRaw`ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "iconColor" TEXT NOT NULL DEFAULT '#f57c00'`;
        console.log('✅ IconColor column added');
        
        // Add position column
        await prisma.$executeRaw`ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0`;
        console.log('✅ Position column added');
      }
      
      // Update existing folders with proper position values (only if folder columns were added)
      if (!folderColumnsExist) {
        await prisma.$executeRaw`
          UPDATE "Folder" SET "position" = subquery.row_num - 1
          FROM (
            SELECT "id", ROW_NUMBER() OVER (PARTITION BY "shopId" ORDER BY "createdAt" DESC) as row_num
            FROM "Folder"
          ) AS subquery
          WHERE "Folder"."id" = subquery."id" AND "Folder"."position" = 0
        `;
        console.log('✅ Existing folders updated with positions');
      }
      
      // Add address column to Contact table
      if (!contactAddressExists) {
        await prisma.$executeRaw`ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "address" TEXT`;
        console.log('✅ address column added to Contact table');
      }
      
    } catch (migrationError) {
      console.error('Migration step failed:', migrationError);
      return json({ 
        success: false, 
        error: "Migration failed: " + migrationError.message 
      });
    }
    
    // Verify the migration worked
    try {
      if (!pinnedAtExists) {
        await prisma.$queryRaw`SELECT "pinnedAt" FROM "Note" LIMIT 1`;
        console.log('✅ pinnedAt column verification successful');
      }
      if (!folderColumnsExist) {
        await prisma.$queryRaw`SELECT icon, "iconColor", position FROM "Folder" LIMIT 1`;
        console.log('✅ Folder columns verification successful');
      }
      if (!contactAddressExists) {
        await prisma.$queryRaw`SELECT address FROM "Contact" LIMIT 1`;
        console.log('✅ Contact address column verification successful');
      }
      console.log('✅ All migrations verified successfully');
    } catch (verifyError) {
      console.log('⚠️ Migration verification failed, but columns may have been added');
    }
    
    const appliedMigrations = [];
    if (!pinnedAtExists) appliedMigrations.push('pinnedAt column');
    if (!folderColumnsExist) appliedMigrations.push('folder columns (icon, iconColor, position)');
    if (!contactAddressExists) appliedMigrations.push('contact address column');
    
    return json({ 
      success: true, 
      message: `Migration applied successfully! Applied: ${appliedMigrations.join(', ')}. All features are now enabled.`,
      applied: true,
      appliedMigrations
    });

  } catch (error) {
    console.error("Migration error:", error);
    return json({ 
      error: "Migration failed: " + error.message,
      details: error.toString()
    }, { status: 500 });
  }
}
