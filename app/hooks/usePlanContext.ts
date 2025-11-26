import { useOutletContext } from "@remix-run/react";

type SubscriptionStatus = "NONE" | "ACTIVE" | "CANCELED" | "PAST_DUE";

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
  subscriptionStatus: SubscriptionStatus;
  accessUntil: string | null; // ISO date string when PRO access ends (for canceled subscriptions)
};

export function usePlanContext() {
  return useOutletContext<PlanOutletContext>();
}

