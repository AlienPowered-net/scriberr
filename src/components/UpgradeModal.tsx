import { BlockStack, Divider, Modal, Text } from "@shopify/polaris";
import type { ReactNode } from "react";
import { SubscriptionPlans } from "./SubscriptionPlans";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void | Promise<void>;
  isSubmitting?: boolean;
  headline?: ReactNode;
  currentPlan?: "FREE" | "PRO";
}

export function UpgradeModal({
  open,
  onClose,
  onUpgrade,
  isSubmitting = false,
  headline,
  currentPlan = "FREE",
}: UpgradeModalProps) {

  return (
    <Modal
        open={open}
        onClose={onClose}
        title="Choose a plan"
        secondaryActions={[
          {
            content: "Maybe later",
            onAction: onClose,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {headline ? (
              typeof headline === "string" ? (
                <Text as="p" variant="bodyMd">
                  {headline}
                </Text>
              ) : (
                headline
              )
            ) : (
              <Text as="p" variant="bodyMd">
                Go beyond the Free plan limits and unlock the complete Scriberr workspace.
              </Text>
            )}

            <SubscriptionPlans
              currentPlan={currentPlan}
              onUpgrade={onUpgrade}
              isSubmitting={isSubmitting}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
  );
}
