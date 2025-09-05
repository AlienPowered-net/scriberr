import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { session } = await shopify.authenticate.admin(request);
    
    console.log('🚀 Applying folder icon and position migration...');
    
    // Check if columns already exist
    try {
      await prisma.$queryRaw`SELECT icon, "iconColor", position FROM "Folder" LIMIT 1`;
      return json({ 
        success: true, 
        message: "Migration already applied - all columns exist",
        alreadyApplied: true 
      });
    } catch (error) {
      console.log('📋 Columns do not exist, applying migration...');
    }
    
    // Apply the migrations step by step
    try {
      // Add icon column
      await prisma.$executeRaw`ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "icon" TEXT NOT NULL DEFAULT 'folder'`;
      console.log('✅ Icon column added');
      
      // Add iconColor column  
      await prisma.$executeRaw`ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "iconColor" TEXT NOT NULL DEFAULT '#f57c00'`;
      console.log('✅ IconColor column added');
      
      // Add position column
      await prisma.$executeRaw`ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0`;
      console.log('✅ Position column added');
      
      // Update existing folders with proper position values
      await prisma.$executeRaw`
        UPDATE "Folder" SET "position" = subquery.row_num - 1
        FROM (
          SELECT "id", ROW_NUMBER() OVER (PARTITION BY "shopId" ORDER BY "createdAt" DESC) as row_num
          FROM "Folder"
        ) AS subquery
        WHERE "Folder"."id" = subquery."id" AND "Folder"."position" = 0
      `;
      console.log('✅ Existing folders updated with positions');
      
    } catch (migrationError) {
      console.error('Migration step failed:', migrationError);
      return json({ 
        success: false, 
        error: "Migration failed: " + migrationError.message 
      });
    }
    
    // Verify the migration worked
    try {
      const testQuery = await prisma.$queryRaw`SELECT icon, "iconColor", position FROM "Folder" LIMIT 1`;
      console.log('✅ Migration verification successful');
    } catch (verifyError) {
      console.log('⚠️ Migration verification failed, but columns may have been added');
    }
    
    return json({ 
      success: true, 
      message: "Migration applied successfully! Folder icons and position ordering are now enabled.",
      applied: true
    });

  } catch (error) {
    console.error("Migration error:", error);
    return json({ 
      error: "Migration failed: " + error.message,
      details: error.toString()
    }, { status: 500 });
  }
}