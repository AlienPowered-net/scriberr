// app/utils/db-init.server.ts
import { prisma } from "./db.server";

let isInitialized = false;

export async function initializeDatabase() {
  if (isInitialized) {
    return;
  }

  try {
    // Test database connection
    await prisma.$connect();
    
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

export async function ensureDatabaseConnection() {
  try {
    await prisma.$connect();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}