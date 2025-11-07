import type { Prisma, PrismaClient } from "@prisma/client";
import { PlanCode, PlanStatus } from "@prisma/client";
import type { PlanUsageKey, PlanUsageLimit, PlanDefinition } from "./plan.server";
import {
  getPlanDefinition,
  getPlanLimit,
  isPlanManaged,
  isPlanStatusActive,
  resolvePlanCodeFromIdentifier,
} from "./plan.server";
import { prisma as appPrisma } from "./db.server";

type PrismaDbClient = PrismaClient | Prisma.TransactionClient;

const SHOP_PLAN_SELECT = {
  id: true,
  domain: true,
  plan: true,
  planStatus: true,
  planManaged: true,
  planActivatedAt: true,
  planTrialEndsAt: true,
  planGraceEndsAt: true,
  planRenewsAt: true,
  billingSubscriptionId: true,
  billingSubscriptionLineItemId: true,
  billingManagedAt: true,
  billingCancelledAt: true,
  billingLastSyncAt: true,
  billingLastSyncError: true,
  createdAt: true,
} as const;

export type ShopPlanRecord = Prisma.ShopGetPayload<{
  select: typeof SHOP_PLAN_SELECT;
}>;

type UsageLimitMap = Record<PlanUsageKey, PlanUsageLimit>;
export type PlanUsageSummary = Record<
  PlanUsageKey,
  {
    quantity: number;
    limit: number | null;
  }
>;

export interface ShopPlanContext {
  shop: ShopPlanRecord;
  plan: PlanDefinition;
  limits: UsageLimitMap;
  isManaged: boolean;
  isActive: boolean;
  now: Date;
}

export type PlanAccessReason =
  | "SHOP_NOT_FOUND"
  | "PLAN_INACTIVE"
  | "PLAN_RESTRICTED"
  | "QUOTA_EXCEEDED";

export interface PlanAccessErrorPayload {
  code: string;
  reason: PlanAccessReason;
  message: string;
  detail?: Record<string, unknown>;
}

export class PlanAccessError extends Error {
  status = 403;
  code: string;
  reason: PlanAccessReason;
  detail?: Record<string, unknown>;
  planContext?: ShopPlanContext;
  usageSummary?: PlanUsageSummary;

  constructor(
    reason: PlanAccessReason,
    message: string,
    detail?: Record<string, unknown>,
  ) {
    super(message);
    this.reason = reason;
    this.code = reason.toLowerCase();
    this.detail = detail;
  }

  withContext(context: ShopPlanContext): this {
    this.planContext = context;
    return this;
  }

  withUsageSummary(summary: PlanUsageSummary): this {
    this.usageSummary = summary;
    return this;
  }

  toJSON(): PlanAccessErrorPayload {
    return {
      code: this.code,
      reason: this.reason,
      message: this.message,
      detail: this.detail,
    };
  }
}

export interface EnsurePlanUsageCheck {
  key: PlanUsageKey;
  currentQuantity?: number;
  increment?: number;
  message?: string;
}

export interface EnsurePlanOptions {
  shopDomain?: string;
  shopId?: string;
  client?: PrismaDbClient;
  now?: Date;
  requireActive?: boolean;
  usage?: EnsurePlanUsageCheck | EnsurePlanUsageCheck[];
}

export interface EnsurePlanResult extends ShopPlanContext {
  usageSummary?: PlanUsageSummary;
}

const usageCountLoaders: Partial<
  Record<
    PlanUsageKey,
    (client: PrismaDbClient, shopId: string) => Promise<number>
  >
> = {
  notes: (client, shopId) =>
    client.note.count({
      where: { shopId },
    }),
  folders: (client, shopId) =>
    client.folder.count({
      where: { shopId },
    }),
  mentions: (client, shopId) =>
    client.customMention.count({
      where: { shopId },
    }),
};

function resolveClient(client?: PrismaDbClient): PrismaDbClient {
  return client ?? appPrisma;
}

function buildShopPlanContext(
  shop: ShopPlanRecord,
  now: Date,
): ShopPlanContext {
  const plan = getPlanDefinition(shop.plan);
  const limits = plan.limits;
  const isActive = isPlanStatusActive(shop.planStatus, {
    graceEndsAt: shop.planGraceEndsAt ?? undefined,
    trialEndsAt: shop.planTrialEndsAt ?? undefined,
    now,
  });

  return {
    shop,
    plan,
    limits,
    isManaged: isPlanManaged(shop.plan),
    isActive,
    now,
  };
}

export async function upsertShopWithPlan(
  shopDomain: string,
  client?: PrismaDbClient,
): Promise<ShopPlanRecord> {
  const db = resolveClient(client);
  const shop = await db.shop.upsert({
    where: { domain: shopDomain },
    update: {},
    create: {
      domain: shopDomain,
      planActivatedAt: new Date(),
    },
    select: SHOP_PLAN_SELECT,
  });
  return shop;
}

export async function getShopWithPlanById(
  shopId: string,
  client?: PrismaDbClient,
): Promise<ShopPlanRecord | null> {
  const db = resolveClient(client);
  return db.shop.findUnique({
    where: { id: shopId },
    select: SHOP_PLAN_SELECT,
  });
}

export async function getShopWithPlanByDomain(
  shopDomain: string,
  client?: PrismaDbClient,
): Promise<ShopPlanRecord | null> {
  const db = resolveClient(client);
  return db.shop.findUnique({
    where: { domain: shopDomain },
    select: SHOP_PLAN_SELECT,
  });
}

async function resolveShopRecord(
  options: EnsurePlanOptions,
): Promise<{ shop: ShopPlanRecord; client: PrismaDbClient }> {
  const db = resolveClient(options.client);
  if (options.shopId) {
    const shop = await getShopWithPlanById(options.shopId, db);
    if (!shop) {
      throw new PlanAccessError(
        "SHOP_NOT_FOUND",
        `Shop ${options.shopId} not found.`,
      );
    }
    return { shop, client: db };
  }

  if (!options.shopDomain) {
    throw new PlanAccessError(
      "SHOP_NOT_FOUND",
      "A shop identifier is required to evaluate plan access.",
    );
  }

  const shop = await upsertShopWithPlan(options.shopDomain, db);
  return { shop, client: db };
}

function normalizeUsageChecks(
  checks?: EnsurePlanUsageCheck | EnsurePlanUsageCheck[],
): EnsurePlanUsageCheck[] {
  if (!checks) return [];
  return Array.isArray(checks) ? checks : [checks];
}

async function loadUsageQuantities(
  client: PrismaDbClient,
  shopId: string,
  checks: EnsurePlanUsageCheck[],
): Promise<Record<PlanUsageKey, number>> {
  const keysToLoad = Array.from(
    new Set(
      checks
        .filter(
          (check) =>
            typeof check.currentQuantity !== "number" &&
            usageCountLoaders[check.key],
        )
        .map((check) => check.key),
    ),
  );

  if (keysToLoad.length === 0) {
    return {};
  }

  const quantities = await Promise.all(
    keysToLoad.map((key) => {
      const loader = usageCountLoaders[key];
      return loader
        ? loader(client, shopId).then((value) => ({ key, value }))
        : Promise.resolve({ key, value: 0 });
    }),
  );

  return quantities.reduce<Record<PlanUsageKey, number>>((acc, entry) => {
    acc[entry.key] = entry.value;
    return acc;
  }, {} as Record<PlanUsageKey, number>);
}

export async function ensurePlan(
  options: EnsurePlanOptions,
): Promise<EnsurePlanResult> {
  const { shop, client } = await resolveShopRecord(options);
  const now = options.now ?? new Date();
  const context = buildShopPlanContext(shop, now);

  if (options.requireActive !== false && !context.isActive) {
    throw new PlanAccessError("PLAN_INACTIVE", "Shop plan is inactive.", {
      planStatus: shop.planStatus,
      graceEndsAt: shop.planGraceEndsAt,
      trialEndsAt: shop.planTrialEndsAt,
    }).withContext(context);
  }

  const usageChecks = normalizeUsageChecks(options.usage);
  if (usageChecks.length === 0) {
    return context;
  }

  const loadedQuantities = await loadUsageQuantities(
    client,
    shop.id,
    usageChecks,
  );

    const usageSummary = usageChecks.reduce<PlanUsageSummary>(
      (summary, check) => {
    const limit = getPlanLimit(context.plan.code, check.key).limit;
    if (typeof limit === "undefined") {
      return summary;
    }

    const baseQuantity =
      typeof check.currentQuantity === "number"
        ? check.currentQuantity
        : loadedQuantities[check.key] ?? 0;
    const increment = check.increment ?? 0;
    const finalQuantity = baseQuantity + increment;

    summary[check.key] = {
      quantity: finalQuantity,
      limit,
    };

    if (limit !== null && finalQuantity > limit) {
          throw new PlanAccessError(
            "QUOTA_EXCEEDED",
            check.message ??
              `Usage limit exceeded for ${check.key}. Limit is ${limit}.`,
            {
              key: check.key,
              limit,
              quantity: finalQuantity,
              baseQuantity,
              increment,
              plan: context.plan.code,
            },
          )
            .withContext(context)
            .withUsageSummary(summary);
    }

    return summary;
      },
      {},
    );

  return {
    ...context,
    usageSummary: Object.keys(usageSummary).length ? usageSummary : undefined,
  };
}

export async function getPlanUsageCounts(
  shopId: string,
  keys: PlanUsageKey[],
  client?: PrismaDbClient,
): Promise<Record<PlanUsageKey, number>> {
  const db = resolveClient(client);
  const uniqueKeys = Array.from(new Set(keys));

  const counts = await Promise.all(
    uniqueKeys.map((key) => {
      const loader = usageCountLoaders[key];
      if (!loader) {
        return Promise.resolve({ key, value: 0 });
      }
      return loader(db, shopId).then((value) => ({ key, value }));
    }),
  );

  return counts.reduce<Record<PlanUsageKey, number>>((acc, entry) => {
    acc[entry.key] = entry.value;
    return acc;
  }, {} as Record<PlanUsageKey, number>);
}

export function getPlanExpirationDate(
  shop: ShopPlanRecord,
): Date | null | undefined {
  if (shop.planStatus === PlanStatus.GRACE) {
    return shop.planGraceEndsAt;
  }
  if (shop.planStatus === PlanStatus.TRIAL) {
    return shop.planTrialEndsAt;
  }
  return shop.planRenewsAt;
}

function readString(
  source: unknown,
  keys: string[],
): string | undefined {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  for (const key of keys) {
    if (key in source) {
      const value = (source as Record<string, unknown>)[key];
      if (value == null) continue;
      if (typeof value === "string") return value;
      if (typeof value === "number" || typeof value === "bigint") {
        return value.toString();
      }
    }
  }

  return undefined;
}

function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateFrom(
  source: unknown,
  keys: string[],
): Date | null {
  const value = readString(source, keys);
  return parseDateValue(value);
}

function toArray(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Record<string, unknown>).edges)
  ) {
    return ((value as Record<string, unknown>).edges as unknown[]).map(
      (edge) => {
        if (
          edge &&
          typeof edge === "object" &&
          "node" in (edge as Record<string, unknown>)
        ) {
          return (edge as Record<string, unknown>).node;
        }
        return edge;
      },
    );
  }
  return [];
}

function mapSubscriptionStatus({
  status,
  trialEndsAt,
  cancellationEffectiveDate,
  now,
}: {
  status: string;
  trialEndsAt: Date | null;
  cancellationEffectiveDate: Date | null;
  now: Date;
}): {
  planStatus: PlanStatus;
  planGraceEndsAt: Date | null;
  planTrialEndsAt: Date | null;
} {
  const normalized = status.trim().toUpperCase();

  switch (normalized) {
    case "ACTIVE":
    case "ACCEPTED":
    case "APPROVED":
      if (trialEndsAt && trialEndsAt > now) {
        return {
          planStatus: PlanStatus.TRIAL,
          planGraceEndsAt: null,
          planTrialEndsAt: trialEndsAt,
        };
      }
      return {
        planStatus: PlanStatus.ACTIVE,
        planGraceEndsAt: null,
        planTrialEndsAt: null,
      };
    case "TRIAL":
    case "PENDING":
    case "PENDING_ACTIVE":
    case "PENDING_TRIAL":
    case "PENDING_APPROVAL":
      return {
        planStatus: PlanStatus.TRIAL,
        planGraceEndsAt: null,
        planTrialEndsAt: trialEndsAt,
      };
    case "CANCELLED":
    case "CANCELED":
    case "CANCELLED_ACTIVE":
    case "CANCELLED_PENDING":
    case "PENDING_CANCELLATION":
      if (cancellationEffectiveDate && cancellationEffectiveDate > now) {
        return {
          planStatus: PlanStatus.GRACE,
          planGraceEndsAt: cancellationEffectiveDate,
          planTrialEndsAt: null,
        };
      }
      return {
        planStatus: PlanStatus.CANCELLED,
        planGraceEndsAt: null,
        planTrialEndsAt: null,
      };
    case "PAUSED":
    case "PAST_DUE":
    case "FROZEN":
    case "DECLINED":
    case "FAILED":
    case "SUSPENDED":
      return {
        planStatus: PlanStatus.PAST_DUE,
        planGraceEndsAt: null,
        planTrialEndsAt: null,
      };
    case "EXPIRED":
      return {
        planStatus: PlanStatus.CANCELLED,
        planGraceEndsAt: null,
        planTrialEndsAt: null,
      };
    default:
      if (trialEndsAt && trialEndsAt > now) {
        return {
          planStatus: PlanStatus.TRIAL,
          planGraceEndsAt: null,
          planTrialEndsAt: trialEndsAt,
        };
      }
      return {
        planStatus: PlanStatus.ACTIVE,
        planGraceEndsAt: null,
        planTrialEndsAt: null,
      };
  }
}

interface SubscriptionUpdateComputation {
  data: Prisma.ShopUpdateInput;
  planCode: PlanCode;
  planStatus: PlanStatus;
}

function deriveSubscriptionUpdate(
  shop: ShopPlanRecord,
  subscriptionPayload: unknown,
  now: Date,
): SubscriptionUpdateComputation {
  const subscription =
    (subscriptionPayload as Record<string, unknown>)?.app_subscription ??
    subscriptionPayload ??
    {};

  const lineItemsSource =
    (subscription as Record<string, unknown>)?.app_subscription_line_items ??
    (subscription as Record<string, unknown>)?.line_items ??
    (subscription as Record<string, unknown>)?.lineItems ??
    (subscription as Record<string, unknown>)?.appSubscriptionLineItems ??
    [];

  const lineItems = toArray(lineItemsSource);
  const lineItemCandidate =
    (lineItems[0] as Record<string, unknown> | undefined) ?? {};
  const lineItemNode =
    (lineItemCandidate as Record<string, unknown>)?.node ??
    lineItemCandidate ??
    {};
  const planSource =
    (lineItemNode as Record<string, unknown>)?.plan ??
    (lineItemNode as Record<string, unknown>)?.subscription_plan ??
    {};

  const planIdentifier =
    readString(planSource, [
      "nickname",
      "name",
      "handle",
      "title",
      "plan_name",
    ]) ??
    readString(subscription as Record<string, unknown>, [
      "name",
      "title",
      "plan_name",
    ]) ??
    readString(subscriptionPayload as Record<string, unknown>, ["name"]);

  let planCode = resolvePlanCodeFromIdentifier(planIdentifier);
  let planManaged = planCode !== PlanCode.FREE;

  const trialEndsAt = parseDateFrom(subscription, [
    "trial_ends_on",
    "trialEndsOn",
    "trial_end_at",
    "trialEndAt",
  ]);
  const cancellationEffectiveDate = parseDateFrom(subscription, [
    "cancellation_effective_date",
    "cancellationEffectiveDate",
    "ends_on",
    "endsOn",
    "cancelled_on",
    "cancelledOn",
  ]);
  const currentPeriodEnd = parseDateFrom(subscription, [
    "current_period_end",
    "currentPeriodEnd",
    "billing_on",
    "billingOn",
    "next_billing_at",
    "nextBillingAt",
  ]);
  const statusRaw =
    readString(subscription, [
      "status",
      "app_subscription_status",
      "appSubscriptionStatus",
    ]) ?? "";

  const statusResult = mapSubscriptionStatus({
    status: statusRaw,
    trialEndsAt,
    cancellationEffectiveDate,
    now,
  });

  let { planStatus } = statusResult;
  let planGraceEndsAt = statusResult.planGraceEndsAt;
  let planTrialEndsAt = statusResult.planTrialEndsAt;
  let billingCancelledAt: Date | null = null;

  if (planStatus === PlanStatus.CANCELLED) {
    planCode = PlanCode.FREE;
    planManaged = false;
    planGraceEndsAt = null;
    planTrialEndsAt = null;
    billingCancelledAt = cancellationEffectiveDate ?? now;
  } else if (planStatus !== PlanStatus.GRACE) {
    planGraceEndsAt = null;
  }

  if (planStatus !== PlanStatus.TRIAL) {
    planTrialEndsAt = null;
  }

  if (planCode === PlanCode.FREE) {
    planManaged = false;
  }

  const planActivatedAtCandidate =
    parseDateFrom(subscription, [
      "activated_on",
      "activatedOn",
      "created_at",
      "createdAt",
    ]) ?? (planManaged ? now : null);

  const nextPlanActivatedAt = planManaged
    ? planActivatedAtCandidate ?? shop.planActivatedAt ?? now
    : shop.planActivatedAt ?? planActivatedAtCandidate ?? shop.createdAt ?? now;

  const billingSubscriptionId =
    readString(subscription, [
      "admin_graphql_api_id",
      "adminGraphqlApiId",
      "gid",
    ]) ??
    readString(subscriptionPayload as Record<string, unknown>, [
      "admin_graphql_api_id",
      "adminGraphqlApiId",
    ]) ??
    readString(subscription, ["id"]) ??
    (subscription &&
    typeof subscription === "object" &&
    "id" in (subscription as Record<string, unknown>)
      ? String(
          (subscription as Record<string, unknown>).id as
            | string
            | number
            | bigint,
        )
      : null);

  const billingSubscriptionLineItemId =
    readString(lineItemNode, [
      "admin_graphql_api_id",
      "adminGraphqlApiId",
      "gid",
      "id",
    ]) ?? null;

  const billingManagedAt =
    parseDateFrom(subscription, ["updated_at", "updatedAt"]) ?? now;
  const planRenewsAt =
    planStatus === PlanStatus.CANCELLED ? null : currentPeriodEnd ?? null;

  const data: Prisma.ShopUpdateInput = {
    plan: planCode,
    planStatus,
    planManaged,
    planActivatedAt: nextPlanActivatedAt,
    planTrialEndsAt: planTrialEndsAt ?? null,
    planGraceEndsAt: planGraceEndsAt ?? null,
    planRenewsAt,
    billingSubscriptionId: billingSubscriptionId ?? null,
    billingSubscriptionLineItemId,
    billingManagedAt,
    billingCancelledAt,
    billingLastSyncAt: now,
    billingLastSyncError: null,
  };

  return {
    data,
    planCode,
    planStatus,
  };
}

async function markSubscriptionSyncFailure(
  shopDomain: string,
  now: Date,
  error: unknown,
  client: PrismaDbClient,
) {
  try {
    const shop = await upsertShopWithPlan(shopDomain, client);
    await client.shop.update({
      where: { id: shop.id },
      data: {
        billingLastSyncAt: now,
        billingLastSyncError:
          error instanceof Error
            ? error.message.slice(0, 512)
            : "Unknown subscription sync error",
      },
    });
  } catch (logError) {
    console.error("Failed to record subscription sync error", logError);
  }
}

export interface SubscriptionSyncOptions {
  client?: PrismaDbClient;
  now?: Date;
  retryAttempts?: number;
}

export async function syncManagedSubscription(
  shopDomain: string,
  payload: unknown,
  options: SubscriptionSyncOptions = {},
): Promise<{ planCode: PlanCode; planStatus: PlanStatus }> {
  const db = resolveClient(options.client);
  const now = options.now ?? new Date();
  const attempts = Math.max(options.retryAttempts ?? 3, 1);
  let attempt = 0;
  let lastError: unknown;

  while (attempt < attempts) {
    try {
      const shop = await upsertShopWithPlan(shopDomain, db);
      const update = deriveSubscriptionUpdate(shop, payload, now);
      await db.shop.update({
        where: { id: shop.id },
        data: update.data,
      });
      return {
        planCode: update.planCode,
        planStatus: update.planStatus,
      };
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt >= attempts) {
        break;
      }
      const delay = Math.min(1000, 100 * Math.pow(2, attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  await markSubscriptionSyncFailure(shopDomain, now, lastError, db);
  throw lastError;
}

export function isPlanAccessError(
  error: unknown,
): error is PlanAccessError {
  return error instanceof PlanAccessError;
}

export interface PlanAccessErrorResponseBody extends PlanAccessErrorPayload {
  plan?: {
    code: ShopPlanRecord["plan"];
    status: ShopPlanRecord["planStatus"];
    managed: boolean;
    limits: UsageLimitMap;
    usageSummary?: PlanUsageSummary;
  };
}

export function buildPlanAccessErrorBody(
  error: PlanAccessError,
): PlanAccessErrorResponseBody {
  const base = error.toJSON();
  const context = error.planContext;

  return {
    ...base,
    plan: context
      ? {
          code: context.plan.code,
          status: context.shop.planStatus,
          managed: context.isManaged,
          limits: context.limits,
          usageSummary: error.usageSummary,
        }
      : undefined,
  };
}

export interface PlanSnapshotPayload {
  code: PlanCode;
  status: PlanStatus;
  managed: boolean;
  isActive: boolean;
  title: string;
  description: string;
  limits: UsageLimitMap;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  renewsAt: string | null;
  activatedAt: string | null;
  subscriptionId: string | null;
}

export interface SerializedPlanContext {
  plan: PlanSnapshotPayload;
  usage?: PlanUsageSummary;
}

export function serializePlanContext(
  context: ShopPlanContext,
  usageOverride?: PlanUsageSummary,
): SerializedPlanContext {
  const usage = usageOverride ?? context.usageSummary;

  return {
    plan: {
      code: context.plan.code,
      status: context.shop.planStatus,
      managed: context.isManaged,
      isActive: context.isActive,
      title: context.plan.title,
      description: context.plan.description,
      limits: context.limits,
      trialEndsAt: context.shop.planTrialEndsAt
        ? context.shop.planTrialEndsAt.toISOString()
        : null,
      graceEndsAt: context.shop.planGraceEndsAt
        ? context.shop.planGraceEndsAt.toISOString()
        : null,
      renewsAt: context.shop.planRenewsAt
        ? context.shop.planRenewsAt.toISOString()
        : null,
      activatedAt: context.shop.planActivatedAt
        ? context.shop.planActivatedAt.toISOString()
        : null,
      subscriptionId: context.shop.billingSubscriptionId ?? null,
    },
    usage,
  };
}
