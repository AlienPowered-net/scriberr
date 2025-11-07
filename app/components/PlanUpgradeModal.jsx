import { Modal, BlockStack, Text, InlineStack, Badge } from "@shopify/polaris";

function formatDate(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PlanUpgradeModal({
  open,
  onClose,
  message,
  plan,
  primaryAction,
  secondaryAction,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upgrade required"
      primaryAction={primaryAction}
      secondaryActions={
        secondaryAction ? [secondaryAction] : undefined
      }
    >
      <Modal.Section>
        <BlockStack gap="300">
          <Text as="p" variant="bodyMd">
            {message}
          </Text>
          {plan && (
            <BlockStack gap="200">
              <InlineStack gap="200" align="start">
                <Badge tone={plan.managed ? "success" : "attention"}>
                  {plan.title ?? plan.code}
                </Badge>
                <Text as="span" tone="subdued" variant="bodySm">
                  Status:&nbsp;
                  {plan.status ? plan.status.toLowerCase() : "unknown"}
                </Text>
              </InlineStack>
              {plan.trialEndsAt && (
                <Text as="span" tone="subdued" variant="bodySm">
                  Trial ends {formatDate(plan.trialEndsAt)}
                </Text>
              )}
              {plan.graceEndsAt && (
                <Text as="span" tone="subdued" variant="bodySm">
                  Grace period ends {formatDate(plan.graceEndsAt)}
                </Text>
              )}
              {plan.renewsAt && (
                <Text as="span" tone="subdued" variant="bodySm">
                  Next renewal {formatDate(plan.renewsAt)}
                </Text>
              )}
            </BlockStack>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
