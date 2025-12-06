import { useOutletContext } from "@remix-run/react";
import type { UpgradeModalContext } from "../../src/components/UpgradeModal";

type SubscriptionStatus = "NONE" | "ACTIVE" | "CANCELED" | "PAST_DUE";

export type UpgradeModalPayload = {
  code?: string;
  message?: string;
  context?: UpgradeModalContext;
};

type PlanOutletContext = {
  plan: "FREE" | "PRO";
  flags: {
    contactsEnabled: boolean;
    noteTagsEnabled: boolean;
    noteLimit: number;
    folderLimit: number;
    versionCap: number;
  };
  openUpgradeModal: (payload?: UpgradeModalPayload) => void;
  subscriptionStatus: SubscriptionStatus;
  accessUntil: string | null; // ISO date string when PRO access ends (for canceled subscriptions)
};

export function usePlanContext() {
  return useOutletContext<PlanOutletContext>();
}

