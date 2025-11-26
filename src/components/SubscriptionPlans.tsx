import {
  Card,
  Text,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Divider,
  Box,
  InlineGrid,
} from "@shopify/polaris";
import { useCallback } from "react";

interface SubscriptionPlansProps {
  currentPlan?: "FREE" | "PRO";
  onUpgrade?: () => void | Promise<void>;
  isSubmitting?: boolean;
  // Cancel subscription props
  onCancel?: () => void;
  isCanceling?: boolean;
  subscriptionStatus?: "NONE" | "ACTIVE" | "CANCELED" | "PAST_DUE";
  accessUntil?: string | null;
}

const FREE_FEATURES = [
  "Create up to 25 notes",
  "Organize with up to 3 folders",
  "Access the latest 5 versions per note",
  "Pin unlimited notes for quick access",
  "Duplicate notes instantly",
  "Move notes between folders anytime",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited notes",
  "Unlimited folders",
  "Note Tags unlocked (unlimited)",
  "Unlimited version history",
  "Contacts section unlocked",
  "Contact tags (unlimited)",
];

// Slightly larger, less-rounded plan pills for FOREVER / PRO badges
const planPillBaseStyle = {
  padding: "5px 14px",
  borderRadius: "9px", // Less rounded, more rectangular than full pill shape
  fontSize: "13px",
  fontWeight: "600" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

export function SubscriptionPlans({
  currentPlan = "FREE",
  onUpgrade,
  isSubmitting = false,
  onCancel,
  isCanceling = false,
  subscriptionStatus,
  accessUntil,
}: SubscriptionPlansProps) {
  // Format date for display
  const formatAccessUntilDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  const isCanceled = subscriptionStatus === "CANCELED";
  const showCancelButton = currentPlan === "PRO" && subscriptionStatus === "ACTIVE" && onCancel;
  const handleUpgrade = useCallback(async () => {
    if (onUpgrade) {
      await onUpgrade();
    } else {
      // Default upgrade handler
      try {
        const response = await fetch("/api/billing/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to initiate upgrade");
        }

        const payload = await response.json();
        console.log("[SubscriptionPlans] Upgrade response:", payload);
        
        if (payload?.confirmationUrl) {
          // For Shopify embedded apps, redirect the parent window to the confirmation URL
          try {
            // Try to redirect the parent window (for embedded apps)
            if (window.top && window.top !== window) {
              window.top.location.href = payload.confirmationUrl;
            } else {
              // Fallback to current window if not embedded
              window.location.href = payload.confirmationUrl;
            }
          } catch (error) {
            // If cross-origin restriction, open in new window
            console.warn("[SubscriptionPlans] Cross-origin redirect blocked, opening in new window:", error);
            window.open(payload.confirmationUrl, "_blank");
          }
        } else {
          console.error("[SubscriptionPlans] Missing confirmation URL in response:", payload);
          throw new Error("Missing confirmation URL");
        }
      } catch (error) {
        console.error("[SubscriptionPlans] Upgrade initiation failed:", error);
      }
    }
  }, [onUpgrade]);

  const isFree = currentPlan === "FREE";
  const isPro = currentPlan === "PRO";

  return (
    <div style={{ width: "100%" }}>
      <InlineGrid columns={{ xs: 1, sm: 1, md: 2 }} gap="400">
        {/* FREE Plan Card */}
        <Card>
          <div
            style={{
              padding: "24px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <BlockStack gap="400">
              {/* Header with FOREVER pill */}
              <InlineStack align="start" blockAlign="start" gap="200">
                <div
                  style={{
                    ...planPillBaseStyle,
                    backgroundColor: "#6D7175",
                    color: "#FFFFFF",
                  }}
                >
                  FOREVER
                </div>
              </InlineStack>

              {/* Plan Name */}
              <Text as="h2" variant="heading2xl" fontWeight="bold">
                Free
              </Text>

              {/* Summary */}
              <Text as="p" variant="bodyMd" tone="subdued">
                Stay organized with up to 25 notes and 3 folders
              </Text>

              <Divider />

              {/* Features List */}
              <BlockStack gap="300">
                {FREE_FEATURES.map((feature) => (
                  <div
                    key={feature}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "20px",
                        height: "20px",
                        flexShrink: 0,
                        color: "#000000",
                        marginTop: "2px",
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M13.3333 4L6 11.3333L2.66667 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div style={{ lineHeight: "20px", flex: 1 }}>
                      <Text as="span" variant="bodyMd">
                        {feature}
                      </Text>
                    </div>
                  </div>
                ))}
              </BlockStack>

              {/* Current Plan Button */}
              <div style={{ marginTop: "auto", paddingTop: "16px" }}>
                {isFree ? (
                  <Button fullWidth disabled={true} variant="secondary">
                    Your current plan
                  </Button>
                ) : (
                  <div style={{ height: "36px" }} />
                )}
              </div>
            </BlockStack>
          </div>
        </Card>

        {/* PRO Plan Card */}
        <Card>
          <div
            style={{
              padding: "24px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <BlockStack gap="400">
              {/* Header with PRO pill */}
              <InlineStack align="start" blockAlign="start" gap="200">
                <div
                  style={{
                    ...planPillBaseStyle,
                    backgroundColor: "#FFD800",
                    color: "#000000",
                  }}
                >
                  PRO
                </div>
              </InlineStack>

              {/* Plan Price */}
              <Text as="h2" variant="heading2xl" fontWeight="bold">
                $5/mo
              </Text>

              {/* Summary */}
              <Text as="p" variant="bodyMd" tone="subdued">
                Unlimited content and power features
              </Text>

              <Divider />

              {/* Features List */}
              <BlockStack gap="300">
                {PRO_FEATURES.map((feature) => (
                  <div
                    key={feature}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "20px",
                        height: "20px",
                        flexShrink: 0,
                        color: "#000000",
                        marginTop: "2px",
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M13.3333 4L6 11.3333L2.66667 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div style={{ lineHeight: "20px", flex: 1 }}>
                      <Text as="span" variant="bodyMd">
                        {feature}
                      </Text>
                    </div>
                  </div>
                ))}
              </BlockStack>

              {/* Upgrade Button */}
              <div style={{ marginTop: "auto", paddingTop: "16px" }}>
                {isPro ? (
                  <BlockStack gap="300">
                    <Button fullWidth disabled={true} variant="secondary">
                      Your current plan
                    </Button>
                    
                    {/* Show scheduled cancellation notice */}
                    {isCanceled && accessUntil && (
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        Access ends {formatAccessUntilDate(accessUntil)}
                      </Text>
                    )}
                    
                    {/* Cancel subscription button */}
                    {showCancelButton && (
                      <Button
                        fullWidth
                        tone="critical"
                        onClick={onCancel}
                        disabled={isCanceling}
                        loading={isCanceling}
                      >
                        {isCanceling ? "Canceling..." : "Cancel subscription"}
                      </Button>
                    )}
                  </BlockStack>
                ) : (
                  <button
                    onClick={handleUpgrade}
                    disabled={isSubmitting}
                    style={{
                      width: "100%",
                      backgroundColor: "#FFD800",
                      color: "#000000",
                      fontWeight: "600",
                      padding: "12px 16px",
                      borderRadius: "6px",
                      border: "none",
                      fontSize: "14px",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      opacity: isSubmitting ? 0.7 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    {isSubmitting ? "Processing..." : "Upgrade now"}
                  </button>
                )}
              </div>
            </BlockStack>
          </div>
        </Card>
      </InlineGrid>
    </div>
  );
}

