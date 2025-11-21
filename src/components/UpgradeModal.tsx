import { BlockStack, Divider, Modal, Text } from "@shopify/polaris";
import type { ReactNode } from "react";
import { useEffect } from "react";
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
  // Ensure UpgradeModal appears above version history modal
  useEffect(() => {
    if (open) {
      // Use setTimeout to ensure the modal portal is rendered
      const timeoutId = setTimeout(() => {
        // Find all Polaris modal portals and set z-index for the last one (most recently opened)
        const portals = document.querySelectorAll('body > .Polaris-Portal');
        if (portals.length > 0) {
          const lastPortal = portals[portals.length - 1];
          const modalDialog = lastPortal.querySelector('.Polaris-Modal-Dialog');
          const modalContent = lastPortal.querySelector('.Polaris-Modal-Dialog__Modal');
          const backdrop = lastPortal.querySelector('.Polaris-Backdrop');
          
          if (modalDialog) {
            (modalDialog as HTMLElement).style.zIndex = '100000010';
          }
          if (modalContent) {
            (modalContent as HTMLElement).style.zIndex = '100000011';
          }
          if (backdrop) {
            (backdrop as HTMLElement).style.zIndex = '100000009';
          }
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [open]);

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
