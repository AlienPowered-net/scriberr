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
      console.error("Session table does not exist. Database migrations may need to be run.");
      console.error("Error:", error);
      
      // Try to check if the Session table (uppercase) exists instead
      try {
        await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
        console.log("Found Session table (uppercase), this should be renamed to session");
        // Don't throw error, let the app continue and handle this gracefully
      } catch (sessionError) {
        console.error("Neither session nor Session table exists");
        // Don't throw error, let the app continue and handle this gracefully
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