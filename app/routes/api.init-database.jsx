import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    console.log('🚀 Initializing database tables...');
    
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
        message: "Database already initialized - Session table exists",
        alreadyExists: true 
      });
    }
    
    // Create the Session table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "public"."Session" (
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
      
      // Create index on shop column if it doesn't exist
      try {
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Session_shop_idx" ON "public"."Session"("shop")`;
        console.log('✅ Session shop index created');
      } catch (indexError) {
        console.log('⚠️ Index may already exist:', indexError.message);
      }
      
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
      message: "Database initialized successfully! Session table created.",
      created: true
    });

  } catch (error) {
    console.error("Database initialization error:", error);
    return json({ 
      error: "Database initialization failed: " + error.message,
      details: error.toString()
    }, { status: 500 });
  }
}

// Also allow GET requests for easy testing
export async function loader({ request }) {
  return action({ request });
}