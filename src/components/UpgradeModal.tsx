import { BlockStack, Divider, InlineGrid, Modal, Text } from "@shopify/polaris";
import type { ReactNode } from "react";
import { PricingTierCard, pricingTiers } from "./PricingTierCard";

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
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Unlock Scriberr Pro"
      primaryAction={{
        content: "Upgrade to PRO – $5/mo",
        onAction: onUpgrade,
        loading: isSubmitting,
      }}
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

            <Divider />

            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Compare plans
              </Text>
              <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                {pricingTiers.map((tier) => (
                  <PricingTierCard key={tier.id} tier={tier} />
                ))}
              </InlineGrid>
            </BlockStack>
          </BlockStack>
        </Modal.Section>
    </Modal>
  );
}
