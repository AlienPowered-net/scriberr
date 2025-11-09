// app/utils/plan.shared.ts

export type PlanTier = "FREE" | "PRO";

export type PlanStatus = { shop: string; tier: PlanTier; noteCount?: number; maxNotes?: number };

export const FREE_PLAN_MAX_NOTES = 25; // keep in sync with server

