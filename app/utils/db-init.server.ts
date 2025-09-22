// app/utils/db-init.server.ts
import { prisma } from "./db.server";

let isInitialized = false;

export async function initializeDatabase() {
  if (isInitialized) {
    return;
  }

  try {
    // Test database connection with retry
    await connectWithRetry();
    
    // Check if session table exists by trying to query it
    try {
      await prisma.$queryRaw`SELECT 1 FROM "session" LIMIT 1`;
      console.log("Database initialized successfully - session table exists");
    } catch (error) {
      console.log("Session table does not exist, attempting to create it...");
      
      // Try to check if the Session table (uppercase) exists instead
      try {
        await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
        console.log("Found Session table (uppercase), renaming to session...");
        
        // Rename Session to session
        await prisma.$executeRaw`ALTER TABLE "public"."Session" RENAME TO "session"`;
        console.log("Successfully renamed Session table to session");
        
      } catch (sessionError) {
        console.log("Neither session nor Session table exists, creating session table...");
        
        try {
          // Create the session table directly
          await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "public"."session" (
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
              "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "session_pkey" PRIMARY KEY ("id")
            )
          `;
          
          // Create index
          await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "session_shop_idx" ON "public"."session"("shop")`;
          
          console.log("Successfully created session table during initialization");
        } catch (createError) {
          console.error("Failed to create session table during initialization:", createError);
          // Don't throw error, let the app continue and handle this gracefully
        }
      }
    }
    
    isInitialized = true;
  } catch (error) {
    console.error("Database initialization failed:", error);
    // Don't throw error, let the app continue and handle this gracefully
  }
}

// Connection retry mechanism
async function connectWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      console.log('Database connected successfully');
      return;
    } catch (error) {
      console.error(`Database connection attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

export async function ensureDatabaseConnection() {
  try {
    await connectWithRetry();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}