import {
  Badge,
  BlockStack,
  Box,
  Button,
  Divider,
  InlineGrid,
  Modal,
  Text,
} from "@shopify/polaris";
import type { ReactNode } from "react";

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
              Free vs Pro
            </Text>
            <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
              <PlanColumn
                tone="critical"
                title="FREE"
                items={[
                  "Up to 25 notes total",
                  "Up to 3 note folders",
                  "No Contacts section",
                  "No Note Tags",
                  "Version history shows latest 5 versions per note",
                ]}
              />
              <PlanColumn
                tone="success"
                title="PRO — $5/mo"
                items={[
                  "Unlimited notes & folders",
                  "Contacts section unlocked (unlimited contacts, folders, tags)",
                  "Note Tags unlocked (unlimited)",
                  "Unlimited version history",
                  "Extra niceties: rearrange contact folders, set icons & colors",
                ]}
              />
            </InlineGrid>
          </BlockStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

interface PlanColumnProps {
  tone: "critical" | "success";
  title: string;
  items: string[];
}

function PlanColumn({ tone, title, items }: PlanColumnProps) {
  return (
    <Box padding="400" background="bg-surface-secondary" borderRadius="300">
      <BlockStack gap="200">
        <Badge tone={tone}>{title}</Badge>
        <BlockStack gap="150">
          {items.map((item) => (
            <Text key={item} as="span" variant="bodySm">
              • {item}
            </Text>
          ))}
        </BlockStack>
      </BlockStack>
    </Box>
  );
}

