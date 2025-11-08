import type { Prisma, PrismaClient, Shop, SubscriptionStatus } from "@prisma/client";
import type { Session } from "@shopify/shopify-api";
import shopify from "../../../app/shopify.server.js";
import { prisma } from "../../../app/utils/db.server";
import { PLAN, type PlanKey } from "../../lib/plan";

type PrismaTransaction = PrismaClient | Prisma.TransactionClient;

export type PlanErrorCode =
  | "LIMIT_NOTES"
  | "LIMIT_FOLDERS"
  | "LIMIT_VERSIONS"
  | "FEATURE_CONTACTS_DISABLED"
  | "FEATURE_NOTE_TAGS_DISABLED";

const PLAN_ERROR_MESSAGES: Record<PlanErrorCode, string> = {
  LIMIT_NOTES:
    "Free plan allows up to 25 notes. Delete a note or upgrade to Pro.",
  LIMIT_FOLDERS:
    "Free plan allows up to 3 folders. Delete a folder or upgrade to Pro.",
  LIMIT_VERSIONS:
    "Free plan allows up to 5 versions per note. Delete a manual save or upgrade to Pro for unlimited versions.",
  FEATURE_CONTACTS_DISABLED:
    "Contacts are unlocked on the Pro plan. Upgrade to manage contacts.",
  FEATURE_NOTE_TAGS_DISABLED:
    "Note tags are a Pro feature. Upgrade to organize notes with tags.",
};

export class PlanError extends Error {
  readonly code: PlanErrorCode;
  readonly status: number;
  readonly upgradeHint: boolean;

  constructor(code: PlanErrorCode, message?: string, upgradeHint = true) {
    super(message ?? PLAN_ERROR_MESSAGES[code]);
    this.name = "PlanError";
    this.code = code;
    this.status = 403;
    this.upgradeHint = upgradeHint;
    Object.setPrototypeOf(this, PlanError.prototype);
  }
}

export const isPlanError = (error: unknown): error is PlanError =>
  error instanceof PlanError;

export function serializePlanError(error: PlanError) {
  return {
    error: error.code,
    message: error.message,
    upgradeHint: error.upgradeHint,
  };
}

export interface PlanContext {
  shop: Shop;
  plan: PlanKey;
  shopId: string;
  subscriptionStatus: SubscriptionStatus;
  session: Session;
}

export function getPlan(shop: Shop | PlanContext): PlanKey {
  const plan = "plan" in shop ? shop.plan : shop.shop.plan;
  return (plan ?? "FREE") as PlanKey;
}

export async function getMerchantByShop(sessionOrShop: Session | string) {
  const shopDomain =
    typeof sessionOrShop === "string" ? sessionOrShop : sessionOrShop?.shop;

  if (!shopDomain) {
    throw new Error("Missing shop domain for plan guard lookup");
  }

  const shopGid =
    typeof sessionOrShop === "string"
      ? null
      : "shopId" in sessionOrShop
        ? (sessionOrShop as Session & { shopId?: string }).shopId ?? null
        : null;

  try {
    // Try with shopGid first (if migration has been applied)
    return await prisma.shop.upsert({
      where: { domain: shopDomain },
      update: shopGid ? { shopGid } : {},
      create: {
        domain: shopDomain,
        ...(shopGid ? { shopGid } : {}),
      },
      include: {
        subscription: true,
      },
    });
  } catch (error: any) {
    // If Subscription table doesn't exist (P2021) or shopGid column doesn't exist (P2022)
    const errorMessage = String(error?.message || "").toLowerCase();
    const isTableMissing = 
      error?.code === "P2021" && 
      (error?.meta?.table?.includes("Subscription") || 
       error?.meta?.modelName === "Subscription" ||
       errorMessage.includes("subscription") ||
       (errorMessage.includes("table") && errorMessage.includes("does not exist")));
    const isColumnMissing = 
      error?.code === "P2022" && 
      (error?.meta?.column === "Shop.shopGid" || 
       errorMessage.includes("shopgid") ||
       (errorMessage.includes("column") && errorMessage.includes("shopgid")));
    
    if (isTableMissing || isColumnMissing) {
      // Retry without shopGid and without subscription include
      return await prisma.shop.upsert({
        where: { domain: shopDomain },
        update: {},
        create: {
          domain: shopDomain,
        },
      });
    }
    throw error;
  }
}

export async function ensureCanCreateNote(
  shopId: string,
  plan: PlanKey,
  db: PrismaTransaction = prisma,
) {
  if (plan === "PRO") return;

  const totalNotes = await db.note.count({ where: { shopId } });
  if (totalNotes >= PLAN.FREE.NOTES_MAX) {
    throw new PlanError("LIMIT_NOTES");
  }
}

export async function ensureCanCreateNoteFolder(
  shopId: string,
  plan: PlanKey,
  db: PrismaTransaction = prisma,
) {
  if (plan === "PRO") return;

  const totalFolders = await db.folder.count({ where: { shopId } });
  if (totalFolders >= PLAN.FREE.NOTE_FOLDERS_MAX) {
    throw new PlanError("LIMIT_FOLDERS");
  }
}

export function ensureContactsEnabled(plan: PlanKey) {
  if (!PLAN[plan].CONTACTS_ENABLED) {
    throw new PlanError("FEATURE_CONTACTS_DISABLED");
  }
}

export function ensureNoteTagsEnabled(plan: PlanKey) {
  if (!PLAN[plan].NOTE_TAGS_ENABLED) {
    throw new PlanError("FEATURE_NOTE_TAGS_DISABLED");
  }
}

export async function ensureCanCreateManualVersion(
  noteId: string,
  plan: PlanKey,
  db: PrismaTransaction = prisma,
) {
  if (plan === "PRO") return;

  const limit = PLAN.FREE.NOTE_VERSIONS_MAX;
  
  // Count total versions (manual + auto)
  const totalVersions = await db.noteVersion.count({
    where: { noteId },
  });

  // If we're at the limit, check if all are manual saves
  if (totalVersions >= limit) {
    const manualVersions = await db.noteVersion.count({
      where: { noteId, isAuto: false },
    });

    // If all versions are manual saves, block creating another manual save
    if (manualVersions >= limit) {
      throw new PlanError("LIMIT_VERSIONS");
    }
  }
}

export async function canCreateAutoSave(
  noteId: string,
  plan: PlanKey,
  db: PrismaTransaction = prisma,
): Promise<{ canCreate: boolean; reason?: string }> {
  if (plan === "PRO") {
    return { canCreate: true };
  }

  const limit = PLAN.FREE.NOTE_VERSIONS_MAX;
  
  // Count total versions and manual versions
  const [totalVersions, manualVersions] = await Promise.all([
    db.noteVersion.count({ where: { noteId } }),
    db.noteVersion.count({ where: { noteId, isAuto: false } }),
  ]);

  // If under limit, can always create
  if (totalVersions < limit) {
    return { canCreate: true };
  }

  // If at limit and all are manual saves, cannot create auto-save
  if (manualVersions >= limit) {
    return {
      canCreate: false,
      reason: "You've reached your version limit. Remove a manual save to make room for new auto-saves.",
    };
  }

  // If at limit but there are auto-saves, can create (oldest auto-save will be deleted)
  return { canCreate: true };
}

export async function enforceVersionRetention(
  noteId: string,
  plan: PlanKey,
  db: PrismaTransaction = prisma,
) {
  if (plan === "PRO") return;

  const limit = PLAN.FREE.NOTE_VERSIONS_MAX;
  
  // Get all versions ordered by creation date (newest first)
  const allVersions = await db.noteVersion.findMany({
    where: { noteId },
    orderBy: { createdAt: "desc" },
    select: { id: true, isAuto: true },
  });

  // If we're within the limit, no action needed
  if (allVersions.length <= limit) {
    return;
  }

  // Separate manual and auto saves
  const manualSaves = allVersions.filter((v) => !v.isAuto);
  const autoSaves = allVersions.filter((v) => v.isAuto);

  // Manual saves always take priority - never delete them
  // We can only delete auto-saves if we exceed the limit
  const manualCount = manualSaves.length;
  const maxAutoSaves = Math.max(0, limit - manualCount);

  // If we have more auto-saves than allowed, delete the oldest ones
  if (autoSaves.length > maxAutoSaves) {
    const autoSavesToDelete = autoSaves.slice(maxAutoSaves);
    const idsToDelete = autoSavesToDelete.map((v) => v.id);

    if (idsToDelete.length > 0) {
      await db.noteVersion.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  }
}

export const requireFeature =
  (feature: "contacts" | "noteTags") =>
  async (ctx: PlanContext): Promise<void> => {
    switch (feature) {
      case "contacts":
        ensureContactsEnabled(ctx.plan);
        break;
      case "noteTags":
        ensureNoteTagsEnabled(ctx.plan);
        break;
      default:
        throw new Error(`Unknown feature guard: ${feature satisfies never}`);
    }
  };

export const requireCapacity =
  (cap: "note" | "noteFolder") =>
  async (ctx: PlanContext, db: PrismaTransaction = prisma): Promise<void> => {
    switch (cap) {
      case "note":
        await ensureCanCreateNote(ctx.shopId, ctx.plan, db);
        break;
      case "noteFolder":
        await ensureCanCreateNoteFolder(ctx.shopId, ctx.plan, db);
        break;
      default:
        throw new Error(`Unknown capacity guard: ${cap satisfies never}`);
    }
  };

type RemixHandlerArgs<T> = T & {
  planContext: PlanContext;
  auth: Awaited<ReturnType<typeof shopify.authenticate.admin>>;
};

export function withPlanContext<T extends { request: Request }>(
  handler: (args: RemixHandlerArgs<T>) => Promise<Response | any>,
) {
  return async (args: T) => {
    const auth = await shopify.authenticate.admin(args.request);
    const merchant = await getMerchantByShop(auth.session);

    const planContext: PlanContext = {
      shop: merchant,
      plan: (merchant.plan ?? "FREE") as PlanKey,
      shopId: merchant.id,
      subscriptionStatus: merchant.subscription?.status ?? "NONE",
      session: auth.session,
    };

    return handler({ ...args, auth, planContext });
  };
}

