import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { session } = await shopify.authenticate.admin(request);
    
    console.log('🚀 Creating Session table...');
    
    // Check if Session table already exists
    let sessionTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
      sessionTableExists = true;
      console.log('✅ Session table already exists');
    } catch (error) {
      console.log('📋 Session table does not exist, will create it...');
    }
    
    if (sessionTableExists) {
      return json({ 
        success: true, 
        message: "Session table already exists",
        alreadyExists: true 
      });
    }
    
    // Create the Session table
    try {
      await prisma.$executeRaw`
        CREATE TABLE "public"."Session" (
          "id" TEXT NOT NULL,
          "shop" TEXT NOT NULL,
          "state" TEXT NOT NULL,
          "isOnline" BOOLEAN NOT NULL,
          "scope" TEXT,
          "expires" TIMESTAMP(3),
          "accessToken" TEXT,
          "userId" BIGINT,
          "firstName" TEXT,
          "lastName" TEXT,
          "email" TEXT,
          "accountOwner" BOOLEAN DEFAULT false,
          "locale" TEXT,
          "collaborator" BOOLEAN DEFAULT false,
          "emailVerified" BOOLEAN DEFAULT false,
          "onlineAccessInfo" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
        )
      `;
      console.log('✅ Session table created');
      
      // Create index on shop column
      await prisma.$executeRaw`CREATE INDEX "Session_shop_idx" ON "public"."Session"("shop")`;
      console.log('✅ Session shop index created');
      
    } catch (migrationError) {
      console.error('Session table creation failed:', migrationError);
      return json({ 
        success: false, 
        error: "Session table creation failed: " + migrationError.message 
      });
    }
    
    // Verify the table was created
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
      console.log('✅ Session table verification successful');
    } catch (verifyError) {
      console.log('⚠️ Session table verification failed');
      return json({ 
        success: false, 
        error: "Session table verification failed: " + verifyError.message 
      });
    }
    
    return json({ 
      success: true, 
      message: "Session table created successfully! The app should now work properly.",
      created: true
    });

  } catch (error) {
    console.error("Session table creation error:", error);
    return json({ 
      error: "Session table creation failed: " + error.message,
      details: error.toString()
    }, { status: 500 });
  }
}