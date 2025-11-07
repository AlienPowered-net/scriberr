import {
  Card,
  Page,
  Text,
  BlockStack,
  Button,
  ButtonGroup,
  Divider,
  Banner,
  List,
  InlineStack,
  Badge,
  Modal,
  TextField,
  Checkbox,
  Icon,
  Box,
} from "@shopify/polaris";
import { DeleteIcon, CheckSmallIcon } from "@shopify/polaris-icons";
import { useState, useEffect } from "react";
import packageJson from "../../package.json" with { type: "json" };

export default function Settings() {
  const [selectedSubscription, setSelectedSubscription] = useState("free");
  const version = packageJson.version;
  
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

      const response = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: {
          'Accept': 'application/json',
          'Accept-Charset': 'utf-8'
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setAlertMessage(`Success: ${result.message}`);
        // Close the modal
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
        // Clear success message after 5 seconds
        setTimeout(() => {
          setAlertMessage("");
        }, 5000);
      } else {
        setAlertMessage(result.error || `Failed to ${actionName}`);
      }
    } catch (error) {
      console.error(`Error ${actionName}:`, error);
      setAlertMessage(`Failed to ${actionName}. Please try again.`);
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

        const usageResponse = await fetch("/api/plan-usage");

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
  }, [selectedSubscription]);

  const subscriptionPlans = [
    {
      id: "free",
      name: "Free Plan",
      price: "Free",
      features: [
        "25 notes max",
        "3 folders max",
        "Basic note editing",
        "Basic folder organization",
        "Standard support"
      ]
    },
    {
      id: "pro",
      name: "Pro Plan",
      price: "$5/mo",
      features: [
        "Everything in Free",
        "Unlimited notes",
        "Unlimited folders",
        "Tags",
        "Contacts",
        "Advanced features"
      ]
    },
    {
      id: "business",
      name: "Business Plan",
      price: "$20/mo",
      comingSoon: true,
      features: [
        "Everything in Pro",
        "Team collaboration",
        "Advanced analytics",
        "Priority support",
        "Custom integrations",
        "API access"
      ]
    }
  ];

  return (
    <>
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

              <InlineStack gap="400" align="stretch">
                {subscriptionPlans.map((plan) => {
                  const isSelected = selectedSubscription === plan.id;
                  const isPro = plan.id === "pro";
                  const isFree = plan.id === "free";
                  const isBusiness = plan.id === "business";
                  const isComingSoon = plan.comingSoon === true;
                  
                  // Determine styling based on plan type and selection state
                  let cardStyle = {
                    flex: 1,
                  };

                  let innerCardStyle = {
                    borderRadius: '8px',
                    padding: '24px',
                    height: '100%',
                    boxShadow: isSelected 
                      ? (isPro ? '0 2px 8px rgba(0, 128, 96, 0.15)' : '0 2px 8px rgba(109, 113, 117, 0.15)')
                      : (isPro ? '0 1px 3px rgba(0, 128, 96, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)'),
                  };
                  
                  if (isFree) {
                    // Free Plan: Gray theme
                    innerCardStyle = {
                      ...innerCardStyle,
                      border: isSelected ? '2px solid #6d7175' : '1px solid #e1e3e5',
                      backgroundColor: isSelected ? '#f6f6f7' : '#ffffff',
                    };
                  } else if (isPro) {
                    // Pro Plan: Green theme
                    innerCardStyle = {
                      ...innerCardStyle,
                      border: '2px solid #008060',
                      backgroundColor: isSelected ? '#f0f9f4' : '#ffffff',
                    };
                  } else if (isBusiness) {
                    // Business Plan: Blue theme for coming soon
                    innerCardStyle = {
                      ...innerCardStyle,
                      border: '2px solid #5c6ac4',
                      backgroundColor: '#f6f7f9',
                      opacity: isComingSoon ? 0.9 : 1,
                    };
                  }

                  return (
                    <Box key={plan.id} style={cardStyle}>
                      <Box style={innerCardStyle}>
                        <BlockStack gap="400">
                          <BlockStack gap="100">
                            <InlineStack gap="200" align="start" wrap={false}>
                              <Text as="h3" variant="headingMd" fontWeight="semibold">
                                {plan.name}
                              </Text>
                              {isSelected && !isComingSoon && (
                                <Badge tone="success" size="small">Current Plan</Badge>
                              )}
                              {isComingSoon && (
                                <Badge tone="info" size="small">COMING SOON</Badge>
                              )}
                            </InlineStack>
                            <Text as="p" variant="headingLg" tone={isPro ? "success" : isBusiness ? "info" : "subdued"} fontWeight="bold">
                              {plan.price}
                            </Text>
                          </BlockStack>
                          
                          <BlockStack gap="200" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                            {plan.features.map((feature, index) => (
                              <InlineStack key={index} gap="200" align="start" blockAlign="start" wrap={false} style={{ width: '100%', justifyContent: 'flex-start' }}>
                                <Icon source={CheckSmallIcon} tone={isComingSoon ? "subdued" : "success"} />
                                <Text as="span" variant="bodyMd" style={{ textAlign: 'left' }}>
                                  {isComingSoon ? "COMING SOON" : feature}
                                </Text>
                              </InlineStack>
                            ))}
                          </BlockStack>

                          <Button
                            variant={isSelected ? "primary" : "secondary"}
                            onClick={() => !isComingSoon && setSelectedSubscription(plan.id)}
                            fullWidth
                            size="large"
                            disabled={isComingSoon}
                          >
                            {isComingSoon ? "COMING SOON" : isSelected ? "Current Plan" : "Select Plan"}
                          </Button>
                        </BlockStack>
                      </Box>
                    </Box>
                  );
                })}
              </InlineStack>

              <Banner tone="info">
                <Text as="p" variant="bodyMd">
                  Note: This is a demo implementation. In a real application, you would integrate with a payment processor and subscription management system.
                </Text>
              </Banner>
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
    </>
  );
}