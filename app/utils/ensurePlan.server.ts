// app/utils/ensurePlan.server.ts
// Server-only: uses Prisma/Shopify - DO NOT import in client code

import type { Prisma, PrismaClient, Shop, Subscription, SubscriptionStatus } from "@prisma/client";
import type { Session } from "@shopify/shopify-api";
import shopify from "~/shopify.server";
import { prisma } from "~/utils/db.server";
import { PLAN, type PlanKey } from "../../src/lib/plan";
import type { PlanStatus } from "./plan.shared";

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
  const errorCode =
    error.code === "LIMIT_VERSIONS" ? "UPGRADE_REQUIRED" : error.code;
  return {
    error: errorCode,
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
  versionLimit: number;
  accessUntil: Date | null; // When PRO access ends (for canceled subscriptions in grace period)
}

export function getPlan(shopOrContext: Shop | PlanContext): PlanKey {
  if ("shop" in shopOrContext) {
    return (shopOrContext.shop.plan ?? "FREE") as PlanKey;
  }
  return (shopOrContext.plan ?? "FREE") as PlanKey;
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

const BASE_FREE_VERSION_LIMIT = PLAN.FREE.NOTE_VERSIONS_MAX;
export const VERSION_PROMPT_COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours
type ShopVersionMeta = Pick<Shop, "extraFreeVersions" | "versionLimitPromptedAt">;

export function getExtraFreeVersions(shop?: ShopVersionMeta) {
  const extra = shop?.extraFreeVersions ?? 0;
  return extra > 0 ? extra : 0;
}

export function getVersionLimit(plan: PlanKey, shop?: ShopVersionMeta) {
  if (plan === "PRO") {
    return Infinity;
  }
  return BASE_FREE_VERSION_LIMIT + getExtraFreeVersions(shop);
}

export function isWithinVersionPromptCooldown(
  shop?: ShopVersionMeta,
  now = Date.now(),
) {
  if (!shop?.versionLimitPromptedAt) {
    return false;
  }
  const lastShown = new Date(shop.versionLimitPromptedAt).getTime();
  return Number.isFinite(lastShown) && now - lastShown < VERSION_PROMPT_COOLDOWN_MS;
}

export async function markVersionPrompted(
  shopId: string,
  timestamp: Date = new Date(),
  db: PrismaTransaction = prisma,
) {
  await db.shop.update({
    where: { id: shopId },
    data: { versionLimitPromptedAt: timestamp },
  });
}

export async function buildVersionLimitPlanError(
  ctx: PlanContext,
  db: PrismaTransaction = prisma,
  now = new Date(),
) {
  const shouldShowUpgrade = !isWithinVersionPromptCooldown(ctx.shop, now.getTime());

  if (shouldShowUpgrade) {
    await markVersionPrompted(ctx.shopId, now, db);
    ctx.shop.versionLimitPromptedAt = now;
  }

  return new PlanError("LIMIT_VERSIONS", undefined, shouldShowUpgrade);
}

const ORDER_DESC = [
  { createdAt: "desc" as const },
  { id: "desc" as const },
];
const ORDER_ASC = [
  { createdAt: "asc" as const },
  { id: "asc" as const },
];

export type InlineAlertCode = "NO_ROOM_DUE_TO_MANUALS";
export const INLINE_ALERTS: Record<InlineAlertCode, InlineAlertCode> = {
  NO_ROOM_DUE_TO_MANUALS: "NO_ROOM_DUE_TO_MANUALS",
};

export async function getVisibleCount(
  noteId: string,
  db: PrismaTransaction = prisma,
): Promise<number> {
  return db.noteVersion.count({
    where: { noteId, freeVisible: true },
  });
}

export async function hasAllManualAtLimit(
  noteId: string,
  versionLimit: number,
  db: PrismaTransaction = prisma,
): Promise<boolean> {
  if (!Number.isFinite(versionLimit)) {
    return false;
  }

  const [visibleCount, manualVisibleCount] = await Promise.all([
    getVisibleCount(noteId, db),
    db.noteVersion.count({
      where: {
        noteId,
        freeVisible: true,
        saveType: "MANUAL",
      },
    }),
  ]);

  return visibleCount >= versionLimit && visibleCount === manualVisibleCount;
}

export const hasFiveAllManual = (
  noteId: string,
  db: PrismaTransaction = prisma,
) => hasAllManualAtLimit(noteId, BASE_FREE_VERSION_LIMIT, db);

export async function hideOldestVisibleAuto(
  noteId: string,
  db: PrismaTransaction = prisma,
): Promise<string | null> {
  const oldestAuto = await db.noteVersion.findFirst({
    where: { noteId, freeVisible: true, saveType: "AUTO" },
    orderBy: ORDER_ASC,
    select: { id: true },
  });

  if (!oldestAuto) {
    return null;
  }

  await db.noteVersion.update({
    where: { id: oldestAuto.id },
    data: { freeVisible: false },
  });

  return oldestAuto.id;
}

export async function getVersionLimitStatus(
  noteId: string,
  versionLimit: number,
  db: PrismaTransaction = prisma,
): Promise<{ visibleCount: number; atLimit: boolean }> {
  const visibleCount = await getVisibleCount(noteId, db);
  if (!Number.isFinite(versionLimit)) {
    return { visibleCount, atLimit: false };
  }
  return {
    visibleCount,
    atLimit: visibleCount >= versionLimit,
  };
}

/**
 * Atomically hides the oldest visible AUTO version and inserts a new visible AUTO version.
 * Uses a single SQL CTE to avoid PgBouncer transaction issues.
 * Returns the ID of the newly created version, or null if no oldest AUTO was found.
 */
export async function rotateAutoAndInsertVisible(
  noteId: string,
  title: string,
  content: string,
  versionTitle: string | null,
  snapshot: any,
  db: PrismaTransaction = prisma,
): Promise<{ id: string } | null> {
  // First check if there's at least one visible AUTO
  const hasVisibleAuto = await db.noteVersion.findFirst({
    where: { noteId, freeVisible: true, saveType: "AUTO" },
    select: { id: true },
  });

  if (!hasVisibleAuto) {
    return null;
  }

  // Use a single SQL statement with CTE to atomically hide oldest and insert new
  // This works with PgBouncer because it's a single round-trip
  try {
    // Generate ID using cuid format (Prisma's default)
    // cuid format: c + timestamp + counter + fingerprint (typically 25 chars)
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const newId = `c${timestamp}${random}`.substring(0, 25);

    const snapshotJson = snapshot ? JSON.stringify(snapshot) : null;
    const result = await db.$queryRawUnsafe(`
      WITH oldest AS (
        SELECT id
        FROM "NoteVersion"
        WHERE "noteId" = $1 AND "freeVisible" = true AND "saveType" = 'AUTO'
        ORDER BY "createdAt" ASC, "id" ASC
        LIMIT 1
      ),
      hidden AS (
        UPDATE "NoteVersion"
        SET "freeVisible" = false
        WHERE id IN (SELECT id FROM oldest)
        RETURNING id
      )
      INSERT INTO "NoteVersion" (
        "id", "noteId", "title", "content", "versionTitle", "snapshot", 
        "isAuto", "saveType", "freeVisible", "createdAt"
      )
      SELECT 
        $2, $1, $3, $4, $5, $6::jsonb, true, 'AUTO'::"VersionSaveType", true, NOW()
      WHERE EXISTS (SELECT 1 FROM hidden)
      RETURNING id;
    `, noteId, newId, title, content, versionTitle || null, snapshotJson);

    if (Array.isArray(result) && result.length > 0) {
      return { id: result[0].id };
    }
    return null;
  } catch (error) {
    // Fallback to two-step process if CTE fails
    console.warn("CTE rotation failed, falling back to two-step:", error);
    const hiddenId = await hideOldestVisibleAuto(noteId, db);
    if (!hiddenId) {
      return null;
    }
    const created = await db.noteVersion.create({
      data: {
        noteId,
        title,
        content,
        versionTitle,
        snapshot,
        isAuto: true,
        saveType: "AUTO",
        freeVisible: true,
      },
    });
    return { id: created.id };
  }
}

export async function surfaceNewestHiddenAuto(
  noteId: string,
  db: PrismaTransaction = prisma,
): Promise<string | null> {
  const newestHiddenAuto = await db.noteVersion.findFirst({
    where: { noteId, freeVisible: false, saveType: "AUTO" },
    orderBy: ORDER_DESC,
    select: { id: true },
  });

  if (!newestHiddenAuto) {
    return null;
  }

  await db.noteVersion.update({
    where: { id: newestHiddenAuto.id },
    data: { freeVisible: true },
  });

  return newestHiddenAuto.id;
}

export async function listVisibleVersions(
  noteId: string,
  plan: PlanKey,
  db: PrismaTransaction = prisma,
) {
  return db.noteVersion.findMany({
    where:
      plan === "PRO"
        ? { noteId }
        : {
            noteId,
            freeVisible: true,
          },
    orderBy: ORDER_DESC,
  });
}

export async function buildVersionsMeta(
  noteId: string,
  plan: PlanKey,
  db: PrismaTransaction = prisma,
  lastActionInlineAlert: InlineAlertCode | null = null,
  versionLimit?: number,
) {
  const resolvedLimit =
    versionLimit ??
    (plan === "PRO" ? Infinity : BASE_FREE_VERSION_LIMIT);

  if (plan === "PRO") {
    const visibleCount = await db.noteVersion.count({
      where: { noteId },
    });
    return {
      plan,
      visibleCount,
      hasAllManualVisible: false,
      lastActionInlineAlert,
      versionLimit: null,
    };
  }

  const [visibleCount, manualVisibleCount] = await Promise.all([
    getVisibleCount(noteId, db),
    db.noteVersion.count({
      where: {
        noteId,
        freeVisible: true,
        saveType: "MANUAL",
      },
    }),
  ]);

  const hasAllManualVisible =
    Number.isFinite(resolvedLimit) &&
    visibleCount >= resolvedLimit &&
    visibleCount === manualVisibleCount;

  return {
    plan,
    visibleCount,
    hasAllManualVisible,
    lastActionInlineAlert,
    versionLimit: Number.isFinite(resolvedLimit) ? resolvedLimit : null,
  };
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
    const merchant = (await getMerchantByShop(auth.session)) as Shop & {
      subscription?: Subscription | null;
    };

    // Import hasProAccess dynamically to avoid circular dependency
    const { hasProAccess } = await import("~/lib/plan.server");

    // Safety guard: Ensure PRO shops have valid PRO access
    // PRO access = ACTIVE subscription OR CANCELED with accessUntil in the future
    // If not, downgrade to FREE (catches missed webhooks, stale data, expired grace periods)
    const proAccess = hasProAccess(merchant.subscription);
    if (merchant.plan === "PRO" && !proAccess) {
      console.info(
        "[Plan Guard] Downgrading PRO → FREE due to no valid PRO access",
        {
          shopId: merchant.id,
          shopDomain: merchant.domain,
          currentPlan: merchant.plan,
          subscriptionStatus: merchant.subscription?.status ?? null,
          accessUntil: merchant.subscription?.accessUntil ?? null,
        },
      );

      await prisma.shop.update({
        where: { id: merchant.id },
        data: { plan: "FREE" },
      });

      // Update merchant object to reflect the change
      merchant.plan = "FREE";
    }

    const plan = (merchant.plan ?? "FREE") as PlanKey;

    // Get accessUntil from subscription if it exists
    const accessUntil = merchant.subscription?.accessUntil
      ? new Date(merchant.subscription.accessUntil)
      : null;

    const planContext: PlanContext = {
      shop: merchant,
      plan,
      shopId: merchant.id,
      subscriptionStatus: merchant.subscription?.status ?? "NONE",
      session: auth.session,
      versionLimit: getVersionLimit(plan, merchant),
      accessUntil,
    };

    return handler({ ...args, auth, planContext });
  };
}

// Simple helper functions matching user's requirements
export async function getPlanStatus(request: Request): Promise<PlanStatus> {
  const { session } = await shopify.authenticate.admin(request);
  const typedSession = session as Session & { plan?: string; shopId?: string };
  const shop = typedSession.shop;
  const tier = typedSession.plan?.toUpperCase() === "PRO" ? "PRO" : "FREE";

  const noteCount = typedSession.shopId
    ? await prisma.note.count({ where: { shopId: typedSession.shopId } })
    : 0;
  return { shop, tier, noteCount, maxNotes: tier === "FREE" ? 25 : undefined };
}

// Throw if action would exceed free limits
export async function ensurePlan(request: Request, opts?: { requireProFor?: string }) {
  const status = await getPlanStatus(request);
  if (status.tier === "FREE" && opts?.requireProFor) {
    throw new Response(
      JSON.stringify({ error: "upgrade_required", feature: opts.requireProFor }),
      { status: 402 }
    );
  }
  return status;
}
