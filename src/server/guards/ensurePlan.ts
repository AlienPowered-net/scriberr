import type { Prisma, PrismaClient, Shop, SubscriptionStatus } from "@prisma/client";
import type { Session } from "@shopify/shopify-api";
import shopify from "../../../app/shopify.server.js";
import { prisma } from "../../../app/utils/db.server";
import { PLAN, type PlanKey } from "../../lib/plan";

type PrismaTransaction = PrismaClient | Prisma.TransactionClient;

export type PlanErrorCode =
  | "LIMIT_NOTES"
  | "LIMIT_FOLDERS"
  | "FEATURE_CONTACTS_DISABLED"
  | "FEATURE_NOTE_TAGS_DISABLED";

const PLAN_ERROR_MESSAGES: Record<PlanErrorCode, string> = {
  LIMIT_NOTES:
    "Free plan allows up to 25 notes. Delete a note or upgrade to Pro.",
  LIMIT_FOLDERS:
    "Free plan allows up to 3 folders. Delete a folder or upgrade to Pro.",
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
    // If shopGid column doesn't exist yet (migration not applied), retry without it
    if (error?.code === "P2022" && error?.meta?.column === "Shop.shopGid") {
      try {
        return await prisma.shop.upsert({
          where: { domain: shopDomain },
          update: {},
          create: {
            domain: shopDomain,
          },
          include: {
            subscription: true,
          },
        });
      } catch (fallbackError: any) {
        // If subscription relation also doesn't exist, retry without include
        if (fallbackError?.code === "P2022" || fallbackError?.code === "P2011") {
          return await prisma.shop.upsert({
            where: { domain: shopDomain },
            update: {},
            create: {
              domain: shopDomain,
            },
          });
        }
        throw fallbackError;
      }
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

export async function enforceVersionRetention(
  noteId: string,
  plan: PlanKey,
  db: PrismaTransaction = prisma,
) {
  if (plan === "PRO") return;

  const limit = PLAN.FREE.NOTE_VERSIONS_MAX;
  const versionsToCull = await db.noteVersion.findMany({
    where: { noteId },
    orderBy: { createdAt: "desc" },
    skip: limit,
    select: { id: true },
  });

  if (versionsToCull.length === 0) {
    return;
  }

  await db.noteVersion.deleteMany({
    where: { id: { in: versionsToCull.map((version) => version.id) } },
  });
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
      plan: merchant.plan as PlanKey,
      shopId: merchant.id,
      subscriptionStatus: merchant.subscription?.status ?? "NONE",
      session: auth.session,
    };

    return handler({ ...args, auth, planContext });
  };
}

