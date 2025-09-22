// app/utils/session-storage.server.ts
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { prisma } from "./db.server";

export class RobustPrismaSessionStorage extends PrismaSessionStorage {
  private isTableReady = false;

  constructor(prismaClient: typeof prisma) {
    super(prismaClient);
  }

  async storeSession(session: any): Promise<boolean> {
    await this.ensureTableExists();
    return super.storeSession(session);
  }

  async loadSession(id: string): Promise<any> {
    await this.ensureTableExists();
    return super.loadSession(id);
  }

  async deleteSession(id: string): Promise<boolean> {
    await this.ensureTableExists();
    return super.deleteSession(id);
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    await this.ensureTableExists();
    return super.deleteSessions(ids);
  }

  async findSessionsByShop(shop: string): Promise<any[]> {
    await this.ensureTableExists();
    return super.findSessionsByShop(shop);
  }

  private async ensureTableExists(): Promise<void> {
    if (this.isTableReady) {
      return;
    }

    try {
      // Try to query the session table to see if it exists
      await prisma.$queryRaw`SELECT 1 FROM "session" LIMIT 1`;
      this.isTableReady = true;
      console.log("Session table exists and is ready");
      return;
    } catch (error: any) {
      console.log("Session table check failed, attempting to resolve...");
      
      // Check if Session table (uppercase) exists
      try {
        await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
        console.log("Found Session table (uppercase), renaming to session...");
        
        // Rename Session to session
        await prisma.$executeRaw`ALTER TABLE "public"."Session" RENAME TO "session"`;
        console.log("Successfully renamed Session table to session");
        this.isTableReady = true;
        return;
        
      } catch (sessionError: any) {
        console.log("Session table (uppercase) not found, creating new session table...");
        
        try {
          // Create the session table directly with all required columns
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
          
          // Create index if it doesn't exist
          await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "session_shop_idx" ON "public"."session"("shop")`;
          
          console.log("Successfully created session table with all required columns");
          this.isTableReady = true;
          return;
          
        } catch (createError: any) {
          console.error("Failed to create session table:", createError);
          
          // If table creation fails, try to continue anyway
          // The app might still work if the table gets created later
          console.log("Continuing without session table - will retry on next request");
          this.isTableReady = false;
          throw new Error(`Session table creation failed: ${createError.message}`);
        }
      }
    }
  }
}