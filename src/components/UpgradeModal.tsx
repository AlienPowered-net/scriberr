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
    if (!open) return;

    const setZIndex = () => {
      // Find the portal containing "Choose a plan" modal
      const portals = Array.from(document.querySelectorAll('body > .Polaris-Portal'));
      
      // Find the portal that contains the "Choose a plan" title
      const upgradeModalPortal = portals.find(portal => {
        const modalTitle = portal.querySelector('.Polaris-Modal-Header__Title');
        return modalTitle?.textContent?.includes('Choose a plan');
      });

      if (upgradeModalPortal) {
        const portalElement = upgradeModalPortal as HTMLElement;
        const modalDialog = portalElement.querySelector('.Polaris-Modal-Dialog') as HTMLElement;
        const modalContent = portalElement.querySelector('.Polaris-Modal-Dialog__Modal') as HTMLElement;
        const backdrop = portalElement.querySelector('.Polaris-Backdrop') as HTMLElement;
        
        // Set very high z-index values to ensure it's above everything
        portalElement.style.zIndex = '100000020';
        if (modalDialog) {
          modalDialog.style.zIndex = '100000021';
        }
        if (modalContent) {
          modalContent.style.zIndex = '100000022';
        }
        if (backdrop) {
          backdrop.style.zIndex = '100000019';
        }

        // Also lower the z-index of other portals (version history modal)
        portals.forEach((portal, index) => {
          if (portal !== upgradeModalPortal) {
            const otherPortal = portal as HTMLElement;
            const otherModalDialog = otherPortal.querySelector('.Polaris-Modal-Dialog') as HTMLElement;
            const otherModalContent = otherPortal.querySelector('.Polaris-Modal-Dialog__Modal') as HTMLElement;
            const otherBackdrop = otherPortal.querySelector('.Polaris-Backdrop') as HTMLElement;
            
            otherPortal.style.zIndex = '100000002';
            if (otherModalDialog) {
              otherModalDialog.style.zIndex = '100000003';
            }
            if (otherModalContent) {
              otherModalContent.style.zIndex = '100000003';
            }
            if (otherBackdrop) {
              otherBackdrop.style.zIndex = '100000001';
            }
          }
        });
      }
    };

    // Try immediately, then with delays to catch the portal when it's rendered
    setZIndex();
    const timeout1 = setTimeout(setZIndex, 100);
    const timeout2 = setTimeout(setZIndex, 300);
    const timeout3 = setTimeout(setZIndex, 500);

    // Also use MutationObserver to watch for portal additions
    const observer = new MutationObserver(() => {
      setZIndex();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      observer.disconnect();
    };
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
