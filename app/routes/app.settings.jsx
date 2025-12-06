import {
  Card,
  Page,
  Text,
  BlockStack,
  Button,
  ButtonGroup,
  Divider,
  Banner,
  InlineGrid,
  InlineStack,
  Modal,
  TextField,
  Checkbox,
  Box,
  Select,
  Frame,
  Toast,
} from "@shopify/polaris";
import { useState, useEffect, useCallback } from "react";
import { useFetcher } from "@remix-run/react";
import packageJson from "../../package.json" with { type: "json" };
import { SubscriptionPlans } from "../../src/components/SubscriptionPlans";
import ScriberrFullPageLoader from "../components/ScriberrFullPageLoader";
import { usePlanContext } from "../hooks/usePlanContext";

// Free plan limits
const FREE_LIMITS = {
  notes: 25,
  folders: 3,
};

// Cancel reason options
const CANCEL_REASON_OPTIONS = [
  { label: "Select a reason (optional)", value: "" },
  { label: "It's too expensive", value: "too_expensive" },
  { label: "I'm missing features I need", value: "missing_features" },
  { label: "I don't need the app anymore", value: "no_longer_needed" },
  { label: "I was just testing it", value: "just_testing" },
  { label: "I found a better alternative", value: "found_alternative" },
  { label: "Other", value: "other" },
];

// Build downgrade warning messages based on current usage
function buildDowngradeMessages(usage) {
  const messages = [];

  // Notes warning
  if (usage.notes > FREE_LIMITS.notes) {
    messages.push({
      type: "warning",
      text: `You currently have ${usage.notes} notes. On the Free plan, you can keep all your existing notes, but you won't be able to create new ones until you're back under the ${FREE_LIMITS.notes}-note limit.`,
    });
  }

  // Folders warning
  if (usage.folders > FREE_LIMITS.folders) {
    messages.push({
      type: "warning",
      text: `You're using ${usage.folders} folders. The Free plan includes up to ${FREE_LIMITS.folders} folders. You'll need to delete folders if you want to create new ones.`,
    });
  }

  // Tags warning (Pro-only feature)
  if (usage.notesWithTags > 0) {
    messages.push({
      type: "info",
      text: `Tags are a Pro feature. Your existing tags will remain visible, but you won't be able to create new tags or add tags to notes on the Free plan.`,
    });
  }

  // Contacts warning (Pro-only feature)
  if (usage.contacts > 0) {
    messages.push({
      type: "info",
      text: `You have ${usage.contacts} contact${usage.contacts !== 1 ? 's' : ''}. Contacts are a Pro feature. Your existing contacts will be preserved, but adding or editing contacts will be disabled on the Free plan.`,
    });
  }

  return messages;
}

export default function Settings() {
  const { plan, openUpgradeModal, subscriptionStatus, accessUntil } = usePlanContext();
  const [selectedSubscription, setSelectedSubscription] = useState(plan === "PRO" ? "pro" : "free");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const version = packageJson.version;
  const [shopHostParams, setShopHostParams] = useState("");
  const [toastConfig, setToastConfig] = useState({
    active: false,
    message: "",
    isError: false,
  });
  const showToast = useCallback((message, isError = false) => {
    setToastConfig({
      active: true,
      message,
      isError,
    });
  }, []);
  const dismissToast = useCallback(() => {
    setToastConfig({
      active: false,
      message: "",
      isError: false,
    });
  }, []);
  const withShopParams = useCallback(
    (path) => {
      if (!shopHostParams) {
        return path;
      }
      const separator = path.includes("?") ? "&" : "?";
      return `${path}${separator}${shopHostParams}`;
    },
    [shopHostParams],
  );
  
  // Handle initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // Show loader for 0.8 seconds
    
    return () => clearTimeout(timer);
  }, []);
  
  // Cancel subscription state
  const cancelFetcher = useFetcher();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState("");
  const [localAccessUntil, setLocalAccessUntil] = useState(accessUntil);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelUsage, setCancelUsage] = useState({
    notes: 0,
    folders: 0,
    notesWithTags: 0,
    contacts: 0,
    loading: false,
  });
  
  // Determine if subscription is already scheduled for cancellation
  const isCanceled = subscriptionStatus === "CANCELED";
  const isCanceling = cancelFetcher.state === "submitting" || cancelFetcher.state === "loading";
  
  // Handle cancel fetcher result
  useEffect(() => {
    if (cancelFetcher.data?.ok) {
      setCancelSuccessMessage(cancelFetcher.data.message || "Your subscription has been canceled.");
      setLocalAccessUntil(cancelFetcher.data.accessUntil);
      setShowCancelModal(false);
      setCancelReason(""); // Reset reason after successful cancel
    }
  }, [cancelFetcher.data]);
  
  // Fetch usage data when cancel modal opens
  useEffect(() => {
    if (showCancelModal && plan === "PRO") {
      const fetchCancelUsage = async () => {
        setCancelUsage(prev => ({ ...prev, loading: true }));
        try {
          const response = await fetch(
            withShopParams("/api/plan-usage?includeAll=true"),
            { credentials: "include" },
          );
          if (response.ok) {
            const data = await response.json();
            setCancelUsage({
              notes: data.notesUsed || 0,
              folders: data.foldersUsed || 0,
              notesWithTags: data.notesWithTags || 0,
              contacts: data.contactsUsed || 0,
              loading: false,
            });
          }
        } catch (error) {
          console.error("Failed to fetch cancel usage:", error);
          setCancelUsage(prev => ({ ...prev, loading: false }));
        }
      };
      fetchCancelUsage();
    }
  }, [showCancelModal, plan, withShopParams]);
  
  // Format date for display
  const formatAccessUntilDate = (dateString) => {
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
  
  const handleCancelSubscription = useCallback(() => {
    setShowCancelModal(true);
  }, []);

  // Capture shop & host from the current URL so authenticated API routes always receive them
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const searchParams = new URLSearchParams(window.location.search);
    const shop = searchParams.get("shop");
    const host = searchParams.get("host");
    if (shop) {
      const params = new URLSearchParams();
      params.set("shop", shop);
      if (host) {
        params.set("host", host);
      }
      setShopHostParams(params.toString());
    }
  }, []);
  
  const confirmCancelSubscription = useCallback(() => {
    const formData = new FormData();
    if (cancelReason) {
      formData.append("reason", cancelReason);
    }
    cancelFetcher.submit(formData, {
      method: "POST",
      action: withShopParams("/api/billing/cancel"),
    });
  }, [cancelFetcher, cancelReason, withShopParams]);
  
  // Get downgrade messages based on current usage
  const downgradeMessages = buildDowngradeMessages(cancelUsage);
  
  // Plan usage state (for free plan)
  const [planUsage, setPlanUsage] = useState({
    notesUsed: 0,
    notesLimit: 25,
    foldersUsed: 0,
    foldersLimit: 3,
    loading: true,
    error: null,
  });
  
  // Onboarding guide preference
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('scriberr-setup-guide-dismissed') !== 'true';
    }
    return true;
  });
  
  // Modal states for delete confirmations
  const [showDeleteNotesModal, setShowDeleteNotesModal] = useState(false);
  const [showDeleteFoldersModal, setShowDeleteFoldersModal] = useState(false);
  const [showDeleteContactFoldersModal, setShowDeleteContactFoldersModal] = useState(false);
  const [showDeleteContactsModal, setShowDeleteContactsModal] = useState(false);
  const [showDeleteContentModal, setShowDeleteContentModal] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  


  const handleOnboardingGuideToggle = (checked) => {
    setShowOnboardingGuide(checked);
    if (typeof window !== 'undefined') {
      if (checked) {
        // Re-enable: remove the dismissal flag
        localStorage.removeItem('scriberr-setup-guide-dismissed');
      } else {
        // Disable: set the dismissal flag
        localStorage.setItem('scriberr-setup-guide-dismissed', 'true');
      }
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('scriberr-onboarding-toggle'));
    }
  };

  const handleDeleteAllNotes = () => {
    setShowDeleteNotesModal(true);
    setConfirmationText("");
  };

  const handleDeleteAllFolders = () => {
    setShowDeleteFoldersModal(true);
    setConfirmationText("");
  };

  const handleDeleteAllContactFolders = () => {
    setShowDeleteContactFoldersModal(true);
    setConfirmationText("");
  };

  const handleDeleteAllContacts = () => {
    setShowDeleteContactsModal(true);
    setConfirmationText("");
  };

  const handleDeleteAllContent = () => {
    setShowDeleteContentModal(true);
    setConfirmationText("");
  };

  const performDelete = async (endpoint, actionName) => {
    if (confirmationText !== "DELETE") {
      setAlertMessage("Please type 'DELETE' to confirm this action.");
      return;
    }

    setIsDeleting(true);
    setAlertMessage("");

    try {
      const formData = new FormData();
      formData.append("confirmation", confirmationText);

      const apiPath = withShopParams(`/api/${endpoint}`);
      const response = await fetch(apiPath, {
        method: "POST",
        headers: {
          'Accept': 'application/json',
          'Accept-Charset': 'utf-8'
        },
        body: formData,
        credentials: "include",
      });

      const result = await response.json();

      if (result.success) {
        // Close the appropriate modal immediately
        if (endpoint === "delete-all-notes") {
          setShowDeleteNotesModal(false);
        } else if (endpoint === "delete-all-folders") {
          setShowDeleteFoldersModal(false);
        } else if (endpoint === "delete-all-contact-folders") {
          setShowDeleteContactFoldersModal(false);
        } else if (endpoint === "delete-all-contacts") {
          setShowDeleteContactsModal(false);
        } else if (endpoint === "delete-all-content") {
          setShowDeleteContentModal(false);
        }
        setConfirmationText("");
        showToast(result.message || `Successfully completed ${actionName}`);

        // Optimistically update plan usage counts for Free plan
        if (selectedSubscription === "free") {
          setPlanUsage((prev) => {
            if (endpoint === "delete-all-notes") {
              return { ...prev, notesUsed: 0 };
            }
            if (endpoint === "delete-all-folders" || endpoint === "delete-all-content") {
              return { ...prev, notesUsed: 0, foldersUsed: 0 };
            }
            return prev;
          });
        }
      } else {
        const message = result.error || `Failed to ${actionName}`;
        setAlertMessage(message);
        showToast(message, true);
      }
    } catch (error) {
      console.error(`Error ${actionName}:`, error);
      const message = `Failed to ${actionName}. Please try again.`;
      setAlertMessage(message);
      showToast(message, true);
    } finally {
      setIsDeleting(false);
    }
  };

  const closeModal = () => {
    setShowDeleteNotesModal(false);
    setShowDeleteFoldersModal(false);
    setShowDeleteContactFoldersModal(false);
    setShowDeleteContactsModal(false);
    setShowDeleteContentModal(false);
    setConfirmationText("");
    setAlertMessage("");
  };

  // Fetch plan usage when on free plan
  useEffect(() => {
    if (selectedSubscription !== "free") {
      return;
    }

    const fetchUsage = async () => {
      try {
        setPlanUsage((prev) => ({ ...prev, loading: true, error: null }));

        const usageResponse = await fetch(withShopParams("/api/plan-usage"), {
          credentials: "include",
        });

        if (!usageResponse.ok) {
          throw new Error(`Request failed with status ${usageResponse.status}`);
        }

        const usageData = await usageResponse.json();

        setPlanUsage({
          notesUsed: usageData?.notesUsed ?? 0,
          notesLimit: usageData?.notesLimit ?? 25,
          foldersUsed: usageData?.foldersUsed ?? 0,
          foldersLimit: usageData?.foldersLimit ?? 3,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching plan usage:", error);
        setPlanUsage((prev) => ({
          ...prev,
          loading: false,
          error: "We couldn't load your usage right now. Please refresh to try again.",
        }));
      }
    };

    fetchUsage();
  }, [selectedSubscription, withShopParams]);

  const handleUpgrade = useCallback(async () => {
    try {
      setIsUpgrading(true);
      const response = await fetch(withShopParams("/api/billing/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to initiate upgrade");
      }

      const payload = await response.json();
      console.log("[Settings] Upgrade response:", payload);
      
      if (payload?.confirmationUrl) {
        // For Shopify embedded apps, redirect the parent window to the confirmation URL
        // The confirmation URL is a Shopify admin page, so we need to navigate the top-level window
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
          console.warn("[Settings] Cross-origin redirect blocked, opening in new window:", error);
          window.open(payload.confirmationUrl, "_blank");
        }
      } else {
        console.error("[Settings] Missing confirmation URL in response:", payload);
        throw new Error("Missing confirmation URL");
      }
    } catch (error) {
      console.error("[Settings] Upgrade initiation failed:", error);
      setIsUpgrading(false);
      // Show error to user
      setAlertMessage(error.message || "Failed to initiate upgrade. Please try again.");
    }
  }, [withShopParams]);

  // Show loading page while content loads
  if (isLoading) {
    return <ScriberrFullPageLoader />;
  }

  const toastMarkup = toastConfig.active ? (
    <Toast
      content={toastConfig.message}
      error={toastConfig.isError}
      duration={4000}
      onDismiss={dismissToast}
    />
  ) : null;

  return (
    <Frame>
    <Page title="Settings">
      <div style={{ paddingBottom: "80px" }}>
        <BlockStack gap="500">
        {/* Subscription Management Section */}
        <Card>
          <div style={{ padding: "16px" }}>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Subscription Management
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Choose the subscription plan that best fits your needs.
                </Text>

                <SubscriptionPlans
                  currentPlan={plan}
                  onUpgrade={handleUpgrade}
                  isSubmitting={isUpgrading}
                  onCancel={handleCancelSubscription}
                  isCanceling={isCanceling}
                  subscriptionStatus={subscriptionStatus}
                  accessUntil={localAccessUntil || accessUntil}
                />

                {/* Cancel subscription success message */}
                {cancelSuccessMessage && (
                  <Banner
                    tone="success"
                    onDismiss={() => setCancelSuccessMessage("")}
                  >
                    <Text as="p" variant="bodyMd">
                      {cancelSuccessMessage}
                    </Text>
                  </Banner>
                )}

                {/* Cancel subscription error message */}
                {cancelFetcher.data?.error && (
                  <Banner tone="critical">
                    <Text as="p" variant="bodyMd">
                      {cancelFetcher.data.error}
                    </Text>
                  </Banner>
                )}
              </BlockStack>
          </div>
        </Card>

        {/* Plan Usage Section - Only shown for Free Plan */}
        {selectedSubscription === "free" && (
          <>
            <Divider />
            <Card>
              <div style={{ padding: "16px" }}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Plan Usage
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Track your usage of Free Plan features. Upgrade to Pro Plan for unlimited access.
                  </Text>

                    {planUsage.loading ? (
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Loading usage data...
                      </Text>
                    ) : planUsage.error ? (
                      <Banner tone="critical">
                        <Text as="p" variant="bodyMd">
                          {planUsage.error}
                        </Text>
                      </Banner>
                    ) : (
                      <BlockStack gap="400">
                        {/* Notes Usage */}
                        <BlockStack gap="200">
                          <InlineStack align="space-between">
                            <Text as="p" variant="bodyMd" fontWeight="medium">
                              Notes
                            </Text>
                            <Text as="p" variant="bodyMd" tone={planUsage.notesUsed >= planUsage.notesLimit ? "critical" : "subdued"}>
                              {planUsage.notesUsed} / {planUsage.notesLimit}
                            </Text>
                          </InlineStack>
                          <div
                            style={{
                              width: "100%",
                              height: "8px",
                              backgroundColor: "#e1e3e5",
                              borderRadius: "4px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${planUsage.notesLimit > 0 ? Math.min((planUsage.notesUsed / planUsage.notesLimit) * 100, 100) : 0}%`,
                                height: "100%",
                                backgroundColor:
                                  planUsage.notesUsed >= planUsage.notesLimit
                                    ? "#d72c0d"
                                    : planUsage.notesUsed >= planUsage.notesLimit * 0.8
                                    ? "#ffc453"
                                    : "#008060",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {Math.max(planUsage.notesLimit - planUsage.notesUsed, 0)} notes remaining
                          </Text>
                        </BlockStack>

                        {/* Folders Usage */}
                        <BlockStack gap="200">
                          <InlineStack align="space-between">
                            <Text as="p" variant="bodyMd" fontWeight="medium">
                              Folders
                            </Text>
                            <Text as="p" variant="bodyMd" tone={planUsage.foldersUsed >= planUsage.foldersLimit ? "critical" : "subdued"}>
                              {planUsage.foldersUsed} / {planUsage.foldersLimit}
                            </Text>
                          </InlineStack>
                          <div
                            style={{
                              width: "100%",
                              height: "8px",
                              backgroundColor: "#e1e3e5",
                              borderRadius: "4px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${planUsage.foldersLimit > 0 ? Math.min((planUsage.foldersUsed / planUsage.foldersLimit) * 100, 100) : 0}%`,
                                height: "100%",
                                backgroundColor:
                                  planUsage.foldersUsed >= planUsage.foldersLimit
                                    ? "#d72c0d"
                                    : planUsage.foldersUsed >= planUsage.foldersLimit * 0.8
                                    ? "#ffc453"
                                    : "#008060",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {Math.max(planUsage.foldersLimit - planUsage.foldersUsed, 0)} folders remaining
                          </Text>
                        </BlockStack>
                      </BlockStack>
                    )}
                </BlockStack>
              </div>
            </Card>
          </>
        )}

        <Divider />

        {/* App Preferences Section */}
        <Card>
          <div style={{ padding: "16px" }}>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                App Preferences
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Customize your Scriberr experience with these preference settings.
              </Text>
              
              <BlockStack gap="300">
                <Checkbox
                  label="Show Getting Started Guide"
                  helpText="Display the onboarding guide on the homepage to help you get started with Scriberr"
                  checked={showOnboardingGuide}
                  onChange={handleOnboardingGuideToggle}
                />
              </BlockStack>
            </BlockStack>
          </div>
        </Card>

        <Divider />

        {/* Content Management Section */}
        <Card>
          <div style={{ padding: "16px" }}>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Content Management
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Manage your notes, folders, contacts, and contact folders. These actions cannot be undone.
              </Text>
              
              <Banner tone="warning">
                <Text as="p" variant="bodyMd">
                  Warning: These actions will permanently delete your data and cannot be undone.
                </Text>
              </Banner>

              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  Notes
                </Text>
                <ButtonGroup>
                  <Button 
                    tone="critical" 
                    onClick={handleDeleteAllNotes}
                  >
                    Delete All Notes
                  </Button>
                  <Button 
                    tone="critical" 
                    onClick={handleDeleteAllFolders}
                  >
                    Delete All Notes Folders
                  </Button>
                </ButtonGroup>
              </BlockStack>

              {plan === "PRO" && (
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    Contacts
                  </Text>
                  <ButtonGroup>
                    <Button 
                      tone="critical" 
                      onClick={handleDeleteAllContacts}
                    >
                      Delete All Contacts
                    </Button>
                    <Button 
                      tone="critical" 
                      onClick={handleDeleteAllContactFolders}
                    >
                      Delete All Contact Folders
                    </Button>
                  </ButtonGroup>
                </BlockStack>
              )}

              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  Everything
                </Text>
                <ButtonGroup>
                  <Button 
                    tone="critical" 
                    onClick={handleDeleteAllContent}
                  >
                    Delete All Content
                  </Button>
                </ButtonGroup>
              </BlockStack>
            </BlockStack>
          </div>
        </Card>

        {/* Alert Message */}
        {alertMessage && (
          <Banner tone={alertMessage.startsWith("Success:") ? "success" : "critical"}>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">
                {alertMessage}
              </Text>
              {alertMessage.startsWith("Success:") && (
                <Button 
                  size="slim" 
                  variant="secondary"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              )}
            </BlockStack>
          </Banner>
        )}

      {/* Delete All Notes Confirmation Modal */}
      <Modal
        open={showDeleteNotesModal}
        onClose={closeModal}
        title="Delete All Notes"
        primaryAction={{
          content: 'Delete All Notes',
          onAction: () => performDelete("delete-all-notes", "delete all notes"),
          destructive: true,
          loading: isDeleting,
          disabled: confirmationText !== "DELETE" || isDeleting
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: closeModal,
            disabled: isDeleting
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner tone="critical">
              <Text as="p" variant="bodyMd">
                <strong>Warning:</strong> This action will permanently delete ALL notes in your account. This action cannot be undone.
              </Text>
            </Banner>
            
            <Text as="p" variant="bodyMd">
              To confirm this action, please type <strong>DELETE</strong> in the field below:
            </Text>
            
            <TextField
              label="Confirmation"
              value={confirmationText}
              onChange={setConfirmationText}
              placeholder="Type DELETE to confirm"
              autoComplete="off"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Delete All Notes Folders Confirmation Modal */}
      <Modal
        open={showDeleteFoldersModal}
        onClose={closeModal}
        title="Delete All Notes Folders"
        primaryAction={{
          content: 'Delete All Notes Folders',
          onAction: () => performDelete("delete-all-folders", "delete all notes folders"),
          destructive: true,
          loading: isDeleting,
          disabled: confirmationText !== "DELETE" || isDeleting
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: closeModal,
            disabled: isDeleting
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner tone="critical">
              <Text as="p" variant="bodyMd">
                <strong>Warning:</strong> This action will permanently delete ALL notes folders and ALL notes in your account. This action cannot be undone.
              </Text>
            </Banner>
            
            <Text as="p" variant="bodyMd">
              To confirm this action, please type <strong>DELETE</strong> in the field below:
            </Text>
            
            <TextField
              label="Confirmation"
              value={confirmationText}
              onChange={setConfirmationText}
              placeholder="Type DELETE to confirm"
              autoComplete="off"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Delete All Contact Folders Confirmation Modal */}
      <Modal
        open={showDeleteContactFoldersModal}
        onClose={closeModal}
        title="Delete All Contact Folders"
        primaryAction={{
          content: 'Delete All Contact Folders',
          onAction: () => performDelete("delete-all-contact-folders", "delete all contact folders"),
          destructive: true,
          loading: isDeleting,
          disabled: confirmationText !== "DELETE" || isDeleting
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: closeModal,
            disabled: isDeleting
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner tone="critical">
              <Text as="p" variant="bodyMd">
                <strong>Warning:</strong> This action will permanently delete ALL contact folders in your account. Contacts in these folders will be moved to "All Contacts". This action cannot be undone.
              </Text>
            </Banner>
            
            <Text as="p" variant="bodyMd">
              To confirm this action, please type <strong>DELETE</strong> in the field below:
            </Text>
            
            <TextField
              label="Confirmation"
              value={confirmationText}
              onChange={setConfirmationText}
              placeholder="Type DELETE to confirm"
              autoComplete="off"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Delete All Contacts Confirmation Modal */}
      <Modal
        open={showDeleteContactsModal}
        onClose={closeModal}
        title="Delete All Contacts"
        primaryAction={{
          content: 'Delete All Contacts',
          onAction: () => performDelete("delete-all-contacts", "delete all contacts"),
          destructive: true,
          loading: isDeleting,
          disabled: confirmationText !== "DELETE" || isDeleting
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: closeModal,
            disabled: isDeleting
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner tone="critical">
              <Text as="p" variant="bodyMd">
                <strong>Warning:</strong> This action will permanently delete ALL contacts in your account. This action cannot be undone.
              </Text>
            </Banner>
            
            <Text as="p" variant="bodyMd">
              To confirm this action, please type <strong>DELETE</strong> in the field below:
            </Text>
            
            <TextField
              label="Confirmation"
              value={confirmationText}
              onChange={setConfirmationText}
              placeholder="Type DELETE to confirm"
              autoComplete="off"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Delete All Content Confirmation Modal */}
      <Modal
        open={showDeleteContentModal}
        onClose={closeModal}
        title="Delete All Content"
        primaryAction={{
          content: 'Delete All Content',
          onAction: () => performDelete("delete-all-content", "delete all content"),
          destructive: true,
          loading: isDeleting,
          disabled: confirmationText !== "DELETE" || isDeleting
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: closeModal,
            disabled: isDeleting
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner tone="critical">
              <Text as="p" variant="bodyMd">
                <strong>Warning:</strong> This action will permanently delete ALL content in your account (all notes folders, all notes, all contact folders, and all contacts). This action cannot be undone.
              </Text>
            </Banner>
            
            <Text as="p" variant="bodyMd">
              To confirm this action, please type <strong>DELETE</strong> in the field below:
            </Text>
            
            <TextField
              label="Confirmation"
              value={confirmationText}
              onChange={setConfirmationText}
              placeholder="Type DELETE to confirm"
              autoComplete="off"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Cancel Subscription Confirmation Modal */}
      <Modal
        open={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancelReason("");
        }}
        title="Cancel your Scriberr Pro subscription?"
        primaryAction={{
          content: isCanceling ? 'Canceling...' : 'Confirm cancellation',
          onAction: confirmCancelSubscription,
          destructive: true,
          loading: isCanceling,
          disabled: isCanceling
        }}
        secondaryActions={[
          {
            content: 'Keep Pro',
            onAction: () => {
              setShowCancelModal(false);
              setCancelReason("");
            },
            disabled: isCanceling
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd">
              You&apos;ll keep access to Scriberr Pro until the end of your current billing period. 
              After that, your workspace will move back to the Free plan.
            </Text>
            
            {/* Usage-based warnings */}
            {cancelUsage.loading ? (
              <Text as="p" variant="bodySm" tone="subdued">
                Loading your usage data...
              </Text>
            ) : downgradeMessages.length > 0 ? (
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  What to expect on the Free plan:
                </Text>
                {downgradeMessages.map((msg, index) => (
                  <Banner key={index} tone={msg.type === "warning" ? "warning" : "info"}>
                    <Text as="p" variant="bodyMd">
                      {msg.text}
                    </Text>
                  </Banner>
                ))}
              </BlockStack>
            ) : (
              <Banner tone="info">
                <Text as="p" variant="bodyMd">
                  Your current usage is within Free plan limits. You&apos;ll be able to continue using Scriberr with some feature limitations.
                </Text>
              </Banner>
            )}
            
            {/* Reason dropdown */}
            <div style={{ maxWidth: 400 }}>
              <Select
                label="Why are you canceling?"
                options={CANCEL_REASON_OPTIONS}
                value={cancelReason}
                onChange={setCancelReason}
                helpText="This is optional but helps us improve Scriberr"
              />
            </div>
          </BlockStack>
        </Modal.Section>
      </Modal>

      </BlockStack>
      </div>
    </Page>

    {/* Copyright Footer */}
    <div style={{
      position: "relative",
      bottom: "0",
      left: "0",
      right: "0",
      backgroundColor: "#f8f9fa",
      borderTop: "1px solid #e1e3e5",
      padding: "12px 24px",
      marginTop: "10px",
      fontSize: "14px",
      color: "#6d7175",
      zIndex: 100,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }}>
      <div>
        © 2025, Scriberr Powered by{" "}
        <a
          href="https://www.alienpowered.net"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#008060",
            textDecoration: "none",
            fontWeight: "600",
            transition: "color 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.color = "#008000";
          }}
          onMouseLeave={(e) => {
            e.target.style.color = "#008060";
          }}
        >
          Aliens
        </a>
      </div>
      <div style={{ 
        fontStyle: "italic", 
        fontSize: "12px", 
        color: "#9ca3af",
        marginLeft: "24px"
      }}>
        {version}
      </div>
    </div>
    {toastMarkup}
    </Frame>
  );
}
