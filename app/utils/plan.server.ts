import { PlanCode, PlanStatus } from "@prisma/client";

export const PLAN_CODES = {
  FREE: PlanCode.FREE,
  BASIC: PlanCode.BASIC,
  PRO: PlanCode.PRO,
  ENTERPRISE: PlanCode.ENTERPRISE,
} as const;

export const MANAGED_PLAN_CODES: PlanCode[] = [
  PlanCode.BASIC,
  PlanCode.PRO,
  PlanCode.ENTERPRISE,
];

export const PLAN_USAGE_KEYS = ["notes", "folders", "mentions", "tags"] as const;

export type PlanUsageKey = (typeof PLAN_USAGE_KEYS)[number];

export type PlanLimitValue = number | null;

export interface PlanUsageLimit {
  key: PlanUsageKey;
  label: string;
  helperText: string;
  limit: PlanLimitValue;
}

export interface PlanDefinition {
  code: PlanCode;
  title: string;
  description: string;
  managed: boolean;
  limits: Record<PlanUsageKey, PlanUsageLimit>;
}

const unlimitedLimit = (key: PlanUsageKey, label: string, helperText: string) => ({
  key,
  label,
  helperText,
  limit: null,
});

const boundedLimit = (
  key: PlanUsageKey,
  label: string,
  helperText: string,
  limit: number,
) => ({
  key,
  label,
  helperText,
  limit,
});

export const PLAN_DEFINITIONS: Record<PlanCode, PlanDefinition> = {
  [PlanCode.FREE]: {
    code: PlanCode.FREE,
    title: "Free",
    description:
      "Default plan with limited usage. Upgrade through Shopify billing to unlock more capacity.",
    managed: false,
    limits: {
      notes: boundedLimit(
        "notes",
        "Notes",
        "Total number of notes that can be created",
        100,
      ),
      folders: boundedLimit(
        "folders",
        "Folders",
        "Total number of folders that can be created",
        20,
      ),
      mentions: boundedLimit(
        "mentions",
        "Custom mentions",
        "Total number of custom mentions that can be created",
        25,
      ),
      tags: boundedLimit(
        "tags",
        "Tags",
        "Maximum number of tags per note",
        10,
      ),
    },
  },
  [PlanCode.BASIC]: {
    code: PlanCode.BASIC,
    title: "Managed Basic",
    description: "Shopify managed basic subscription.",
    managed: true,
    limits: {
      notes: unlimitedLimit(
        "notes",
        "Notes",
        "Total number of notes that can be created",
      ),
      folders: unlimitedLimit(
        "folders",
        "Folders",
        "Total number of folders that can be created",
      ),
      mentions: boundedLimit(
        "mentions",
        "Custom mentions",
        "Total number of custom mentions that can be created",
        100,
      ),
      tags: unlimitedLimit(
        "tags",
        "Tags",
        "Maximum number of tags per note",
      ),
    },
  },
  [PlanCode.PRO]: {
    code: PlanCode.PRO,
    title: "Managed Pro",
    description: "Shopify managed pro subscription.",
    managed: true,
    limits: {
      notes: unlimitedLimit(
        "notes",
        "Notes",
        "Total number of notes that can be created",
      ),
      folders: unlimitedLimit(
        "folders",
        "Folders",
        "Total number of folders that can be created",
      ),
      mentions: unlimitedLimit(
        "mentions",
        "Custom mentions",
        "Total number of custom mentions that can be created",
      ),
      tags: unlimitedLimit(
        "tags",
        "Tags",
        "Maximum number of tags per note",
      ),
    },
  },
  [PlanCode.ENTERPRISE]: {
    code: PlanCode.ENTERPRISE,
    title: "Managed Enterprise",
    description: "Shopify managed enterprise subscription.",
    managed: true,
    limits: {
      notes: unlimitedLimit(
        "notes",
        "Notes",
        "Total number of notes that can be created",
      ),
      folders: unlimitedLimit(
        "folders",
        "Folders",
        "Total number of folders that can be created",
      ),
      mentions: unlimitedLimit(
        "mentions",
        "Custom mentions",
        "Total number of custom mentions that can be created",
      ),
      tags: unlimitedLimit(
        "tags",
        "Tags",
        "Maximum number of tags per note",
      ),
    },
  },
};

export const FREE_PLAN_LIMITS = PLAN_DEFINITIONS[PlanCode.FREE].limits;

export const MANAGED_PLANS = MANAGED_PLAN_CODES.map(
  (code) => PLAN_DEFINITIONS[code],
);

const PLAN_IDENTIFIER_MAP: Array<{ match: RegExp; code: PlanCode }> = [
  { match: /enterprise|ultimate|scale/i, code: PlanCode.ENTERPRISE },
  { match: /pro|professional|growth/i, code: PlanCode.PRO },
  { match: /basic|starter/i, code: PlanCode.BASIC },
  { match: /free/i, code: PlanCode.FREE },
];

export function resolvePlanCodeFromIdentifier(
  identifier?: string | null,
): PlanCode {
  if (!identifier || typeof identifier !== "string") {
    return PlanCode.FREE;
  }

  for (const { match, code } of PLAN_IDENTIFIER_MAP) {
    if (match.test(identifier)) {
      return code;
    }
  }

  return PlanCode.FREE;
}

export function getPlanDefinition(plan: PlanCode): PlanDefinition {
  return PLAN_DEFINITIONS[plan];
}

export function getPlanLimit(
  plan: PlanCode,
  usageKey: PlanUsageKey,
): PlanUsageLimit {
  return PLAN_DEFINITIONS[plan].limits[usageKey];
}

export function isPlanManaged(plan: PlanCode): boolean {
  return PLAN_DEFINITIONS[plan].managed;
}

export function isPaidPlan(plan: PlanCode): boolean {
  return plan !== PlanCode.FREE;
}

export function isPlanStatusActive(
  status: PlanStatus,
  options: {
    graceEndsAt?: Date | null;
    trialEndsAt?: Date | null;
    now?: Date;
  } = {},
): boolean {
  const { graceEndsAt, trialEndsAt, now = new Date() } = options;

  if (status === PlanStatus.ACTIVE) {
    return true;
  }

  if (status === PlanStatus.TRIAL) {
    if (!trialEndsAt) {
      return true;
    }
    return trialEndsAt.getTime() > now.getTime();
  }

  if (status === PlanStatus.GRACE) {
    if (!graceEndsAt) {
      return true;
    }
    return graceEndsAt.getTime() > now.getTime();
  }

  return false;
}

export function hasPlanExpired(
  status: PlanStatus,
  options: {
    graceEndsAt?: Date | null;
    trialEndsAt?: Date | null;
    now?: Date;
  } = {},
): boolean {
  const { now = new Date() } = options;
  return !isPlanStatusActive(status, { ...options, now }) || status === PlanStatus.CANCELLED || status === PlanStatus.PAST_DUE;
}
