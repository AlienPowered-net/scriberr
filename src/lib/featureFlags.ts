import type { PlanKey } from "./plan";

export function flagsFor(plan: PlanKey) {
  return {
    contactsEnabled: plan === "PRO",
    noteTagsEnabled: plan === "PRO",
    noteLimit: plan === "FREE" ? 25 : Infinity,
    folderLimit: plan === "FREE" ? 3 : Infinity,
    versionCap: plan === "FREE" ? 5 : Infinity,
  } as const;
}

