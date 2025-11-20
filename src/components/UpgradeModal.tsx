import { BlockStack, Divider, Modal, Text } from "@shopify/polaris";
import type { ReactNode } from "react";
import { SubscriptionPlans } from "./SubscriptionPlans";
import { usePlanContext } from "../../app/hooks/usePlanContext";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void | Promise<void>;
  isSubmitting?: boolean;
  headline?: ReactNode;
}

export function UpgradeModal({
  open,
  onClose,
  onUpgrade,
  isSubmitting = false,
  headline,
}: UpgradeModalProps) {
  const { plan } = usePlanContext();

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
              currentPlan={plan}
              onUpgrade={onUpgrade}
              isSubmitting={isSubmitting}
            />
          </BlockStack>
        </Modal.Section>
    </Modal>
  );
}
