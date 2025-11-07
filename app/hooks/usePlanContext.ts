import { useOutletContext } from "@remix-run/react";

type PlanOutletContext = {
  plan: "FREE" | "PRO";
  flags: {
    contactsEnabled: boolean;
    noteTagsEnabled: boolean;
    noteLimit: number;
    folderLimit: number;
    versionCap: number;
  };
  openUpgradeModal: (payload?: { code?: string; message?: string }) => void;
};

export function usePlanContext() {
  return useOutletContext<PlanOutletContext>();
}

