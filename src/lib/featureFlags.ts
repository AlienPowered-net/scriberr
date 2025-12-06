import { PLAN, type PlanKey } from "./plan";

type FlagOverrides = {
  versionLimit?: number;
  noteLimit?: number;
  folderLimit?: number;
};

export function flagsFor(plan: PlanKey, overrides: FlagOverrides = {}) {
  const isFree = plan === "FREE";
  const versionCap = isFree
    ? overrides.versionLimit ?? PLAN.FREE.NOTE_VERSIONS_MAX
    : Infinity;
  const noteLimit = isFree
    ? overrides.noteLimit ?? PLAN.FREE.NOTES_MAX
    : Infinity;
  const folderLimit = isFree
    ? overrides.folderLimit ?? PLAN.FREE.NOTE_FOLDERS_MAX
    : Infinity;

  return {
    contactsEnabled: plan === "PRO",
    noteTagsEnabled: plan === "PRO",
    noteLimit,
    folderLimit,
    versionCap,
  } as const;
}

