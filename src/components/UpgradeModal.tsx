import { BlockStack, Divider, Modal, Text } from "@shopify/polaris";
import type { ReactNode } from "react";
import { SubscriptionPlans } from "./SubscriptionPlans";

export type UpgradeModalContext = "default" | "over_limit_edit";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void | Promise<void>;
  isSubmitting?: boolean;
  headline?: ReactNode;
  currentPlan?: "FREE" | "PRO";
  context?: UpgradeModalContext;
}

export function UpgradeModal({
  open,
  onClose,
  onUpgrade,
  isSubmitting = false,
  headline,
  currentPlan = "FREE",
  context = "default",
}: UpgradeModalProps) {
  const isOverLimitEdit = context === "over_limit_edit";

  // Determine modal title based on context
  const modalTitle = isOverLimitEdit
    ? "You're over the FREE plan limit"
    : "Choose a plan";

  // Determine secondary action text based on context
  const secondaryActionText = isOverLimitEdit
    ? "Continue editing"
    : "Maybe later";

  // Determine default headline based on context
  const defaultHeadline = isOverLimitEdit
    ? "You can keep and edit all your existing notes and folders. However, you won't be able to create new ones until you either delete some to get back under the limit, or upgrade to PRO for unlimited access."
    : "Go beyond the Free plan limits and unlock the complete Scriberr workspace.";

  return (
    <Modal
        open={open}
        onClose={onClose}
        title={modalTitle}
        secondaryActions={[
          {
            content: secondaryActionText,
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
                {defaultHeadline}
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
