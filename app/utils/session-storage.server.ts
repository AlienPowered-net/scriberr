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
      return;
    } catch (error: any) {
      if (error.code === 'P2010' || error.message?.includes('relation "session" does not exist')) {
        console.log("Session table does not exist, attempting to create it...");
        
        try {
          // Check if Session table (uppercase) exists
          await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
          console.log("Found Session table (uppercase), renaming to session...");
          
          // Rename Session to session
          await prisma.$executeRaw`ALTER TABLE "public"."Session" RENAME TO "session"`;
          console.log("Successfully renamed Session table to session");
          
        } catch (sessionError: any) {
          if (sessionError.code === 'P2010' || sessionError.message?.includes('relation "Session" does not exist')) {
            console.log("Neither session nor Session table exists, creating session table...");
            
            // Create the session table directly
            await prisma.$executeRaw`
              CREATE TABLE "public"."session" (
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
            await prisma.$executeRaw`CREATE INDEX "session_shop_idx" ON "public"."session"("shop")`;
            
            console.log("Successfully created session table");
          } else {
            console.error("Error checking Session table:", sessionError);
            throw sessionError;
          }
        }
        
        this.isTableReady = true;
      } else {
        console.error("Error checking session table:", error);
        throw error;
      }
    }
  }
}