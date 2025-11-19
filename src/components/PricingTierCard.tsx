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
  accentColor?: string;
  headerGradient?: string;
  headerTextColor?: string;
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
    accentColor: "#A0A4A8",
    headerGradient: "linear-gradient(135deg, #FDFDFD, #F4F6F8)",
    headerTextColor: "#111213",
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
    accentColor: "#00A47A",
    headerGradient: "linear-gradient(135deg, #E5FFF5, #F2FFFB)",
    headerTextColor: "#002E1A",
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
  const accentColor =
    tier.accentColor ?? (tier.highlight ? "#008060" : "var(--p-color-border-subdued, #c9cccf)");
  const headerGradient =
    tier.headerGradient ??
    (tier.highlight ? "linear-gradient(135deg, #D2FFF0, #F5FFFA)" : "linear-gradient(135deg, #FFFFFF, #F7F8FA)");
  const headerTextColor = tier.headerTextColor ?? "#111213";
  const glowShadow = tier.highlight
    ? "0 10px 25px rgba(0, 164, 122, 0.25)"
    : "0 6px 20px rgba(18, 23, 36, 0.08)";

  return (
    <Box
      background="bg-surface"
      borderRadius="500"
      shadow="card"
      style={{
        border: `1.5px solid ${
          isActive || tier.highlight ? accentColor : "var(--p-color-border, #d9dbdd)"
        }`,
        boxShadow: glowShadow,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        padding={{ xs: "400", sm: "500" }}
        style={{
          background: headerGradient,
          color: headerTextColor,
        }}
      >
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="050">
              <InlineStack gap="150" blockAlign="center">
                {tier.highlight ? (
                  <Box
                    as="span"
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: accentColor,
                      display: "inline-block",
                    }}
                  />
                ) : null}
                <Text as="h3" variant="headingMd" fontWeight="bold">
                  {tier.name}
                </Text>
              </InlineStack>
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
            <Text as="p" variant="heading2xl" fontWeight="bold">
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
      </Box>

      <Box padding={{ xs: "400", sm: "500" }} background="bg-surface">
        <BlockStack gap="300">
          <InlineStack gap="150" blockAlign="center" align="space-between">
            <Box
              as="span"
              style={{
                flex: 1,
                height: "1px",
                background: "var(--p-color-border-subdued, #d2d5d8)",
                borderRadius: "999px",
              }}
            />
            <Text as="span" variant="bodySm" tone="subdued">
              What’s included
            </Text>
            <Box
              as="span"
              style={{
                flex: 1,
                height: "1px",
                background: "var(--p-color-border-subdued, #d2d5d8)",
                borderRadius: "999px",
              }}
            />
          </InlineStack>
          <FeatureList
            features={tier.features}
            iconTone={tier.highlight ? "success" : "subdued"}
          />
        </BlockStack>
      </Box>

      {action ? (
        <Box padding={{ xs: "400", sm: "500" }} background="bg-surface-tertiary">
          <Button
            fullWidth
            tone={tier.highlight ? "success" : undefined}
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
