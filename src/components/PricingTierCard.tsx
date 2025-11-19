import {
  Badge,
  BlockStack,
  Box,
  Button,
  Icon,
  InlineStack,
  Text,
} from "@shopify/polaris";
import { CheckSmallIcon } from "@shopify/polaris-icons";

export interface PricingTierFeature {
  label: string;
  supportText?: string;
}

export interface PricingTier {
  id: "free" | "pro";
  name: string;
  tagline: string;
  description: string;
  priceDisplay: string;
  priceCaption?: string;
  highlight?: boolean;
  badge?: {
    content: string;
    tone?: "success" | "info" | "subdued";
  };
  features: PricingTierFeature[];
}

export const pricingTiers: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Stay organized with the essentials",
    description: "Capture up to 25 notes and keep 3 folders tidy as you explore Scriberr.",
    priceDisplay: "Free",
    priceCaption: "Includes 25 notes & 3 folders",
    features: [
      {
        label: "Up to 25 total notes",
        supportText: "Perfect for quick capture and lightweight projects.",
      },
      {
        label: "Create up to 3 folders",
        supportText: "Keep a few categories organized while you get started.",
      },
      {
        label: "Essential writing tools",
        supportText: "Rich text editing with the core formatting controls.",
      },
      {
        label: "Contacts section locked",
        supportText: "Upgrade to manage unlimited contacts, folders, and tags.",
      },
      {
        label: "Latest 5 versions per note",
        supportText: "Review recent edits before committing to Pro.",
      },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Unlock the complete Scriberr workspace",
    description: "Unlimited content, contacts, tags, and version history for power users.",
    priceDisplay: "$5/mo",
    priceCaption: "USD • billed monthly",
    highlight: true,
    badge: {
      content: "Most popular",
      tone: "success",
    },
    features: [
      {
        label: "Unlimited notes & folders",
        supportText: "Scale your workspace without ever running out of room.",
      },
      {
        label: "Full Contacts workspace",
        supportText: "Track relationships with unlimited contacts, folders, and tags.",
      },
      {
        label: "Unlimited note tags",
        supportText: "Organize by project, workflow, or team without limits.",
      },
      {
        label: "Complete version history",
        supportText: "Roll back to any previous save with full revision tracking.",
      },
      {
        label: "Extra niceties",
        supportText: "Reorder contact folders, add icons & colors, and more.",
      },
    ],
  },
];

interface PricingTierCardAction {
  label: string;
  onAction: () => void;
  variant?: "primary" | "secondary" | "tertiary" | "plain";
  loading?: boolean;
  disabled?: boolean;
}

interface PricingTierCardProps {
  tier: PricingTier;
  action?: PricingTierCardAction;
  isActive?: boolean;
}

export function PricingTierCard({ tier, action, isActive }: PricingTierCardProps) {
  const borderColor = tier.highlight
    ? "var(--p-color-border-success, #008060)"
    : isActive
    ? "var(--p-color-border-strong, #6d7175)"
    : "var(--p-color-border-subdued, #c9cccf)";

  const boxShadow = tier.highlight
    ? "0 12px 30px rgba(0, 128, 96, 0.18)"
    : "0 4px 18px rgba(17, 24, 39, 0.08)";

  return (
    <Box
      padding={{ xs: "400", sm: "500" }}
      background={tier.highlight ? "bg-surface-success-subdued" : "bg-surface"}
      borderRadius="400"
      style={{
        border: `${tier.highlight || isActive ? 2 : 1}px solid ${borderColor}`,
        boxShadow,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <BlockStack gap="400">
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="start">
            <BlockStack gap="050">
              <Text as="h3" variant="headingMd">
                {tier.name}
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {tier.tagline}
              </Text>
            </BlockStack>
            {tier.badge ? (
              <Badge tone={tier.badge.tone ?? (tier.highlight ? "success" : "subdued")}>
                {tier.badge.content}
              </Badge>
            ) : null}
          </InlineStack>

          <BlockStack gap="050">
            <Text as="p" variant="heading2xl">
              {tier.priceDisplay}
            </Text>
            {tier.priceCaption ? (
              <Text as="p" variant="bodySm" tone="subdued">
                {tier.priceCaption}
              </Text>
            ) : null}
          </BlockStack>

          <Text as="p" variant="bodyMd">
            {tier.description}
          </Text>
        </BlockStack>

        <FeatureList
          features={tier.features}
          iconTone={tier.highlight ? "success" : "subdued"}
        />
      </BlockStack>

      {action ? (
        <Box paddingBlockStart="400">
          <Button
            fullWidth
            variant={action.variant ?? (tier.highlight ? "primary" : "secondary")}
            onClick={action.onAction}
            loading={action.loading}
            disabled={action.disabled}
          >
            {action.label}
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}

interface FeatureListProps {
  features: PricingTierFeature[];
  iconTone?: "base" | "subdued" | "critical" | "success";
}

export function FeatureList({ features, iconTone = "success" }: FeatureListProps) {
  return (
    <BlockStack gap="250">
      {features.map((feature) => (
        <InlineStack key={feature.label} gap="200" align="start" blockAlign="start">
          <Icon source={CheckSmallIcon} tone={iconTone} />
          <BlockStack gap="050">
            <Text as="span" variant="bodyMd" fontWeight="medium">
              {feature.label}
            </Text>
            {feature.supportText ? (
              <Text as="span" variant="bodySm" tone="subdued">
                {feature.supportText}
              </Text>
            ) : null}
          </BlockStack>
        </InlineStack>
      ))}
    </BlockStack>
  );
}
