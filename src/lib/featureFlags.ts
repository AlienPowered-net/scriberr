import type { PlanKey } from "./plan";

type FlagOverrides = {
  versionLimit?: number;
};

export function flagsFor(plan: PlanKey, overrides: FlagOverrides = {}) {
  const isFree = plan === "FREE";
  const versionCap = isFree
    ? overrides.versionLimit ?? 5
    : Infinity;

  return {
    contactsEnabled: plan === "PRO",
    noteTagsEnabled: plan === "PRO",
    noteLimit: isFree ? 25 : Infinity,
    folderLimit: isFree ? 3 : Infinity,
    versionCap,
  } as const;
}

