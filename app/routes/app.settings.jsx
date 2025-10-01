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
} from "@shopify/polaris";
import { useState } from "react";
import packageJson from "../../package.json" with { type: "json" };

export default function Settings() {
  const [selectedSubscription, setSelectedSubscription] = useState("basic");
  const version = packageJson.version;
  
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
    setShowDeleteContentModal(false);
    setConfirmationText("");
    setAlertMessage("");
  };

  const subscriptionPlans = [
    {
      id: "basic",
      name: "Basic Plan",
      price: "$9.99/month",
      features: [
        "Up to 100 notes",
        "Basic folder organization",
        "Standard support",
        "5GB storage"
      ],
      description: "Perfect for individuals who need basic note-taking functionality with simple organization features."
    },
    {
      id: "pro",
      name: "Pro Plan",
      price: "$19.99/month",
      features: [
        "Unlimited notes",
        "Advanced folder organization",
        "Priority support",
        "25GB storage",
        "Advanced search",
        "Export options"
      ],
      description: "Ideal for professionals and teams who need advanced features and more storage capacity."
    },
    {
      id: "enterprise",
      name: "Enterprise Plan",
      price: "$49.99/month",
      features: [
        "Unlimited everything",
        "Team collaboration",
        "24/7 premium support",
        "Unlimited storage",
        "Advanced analytics",
        "Custom integrations",
        "API access"
      ],
      description: "Built for large organizations that need enterprise-grade features, security, and support."
    }
  ];

  return (
    <Page title="Settings">
      <div style={{ paddingBottom: "80px" }}>
        <BlockStack gap="500">
        {/* Content Management Section */}
        <Card>
          <div style={{ padding: "16px" }}>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Content Management
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Manage your notes and folders. These actions cannot be undone.
              </Text>
              
              <Banner tone="warning">
                <Text as="p" variant="bodyMd">
                  Warning: These actions will permanently delete your data and cannot be undone.
                </Text>
              </Banner>

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
                  Delete All Folders
                </Button>
                <Button 
                  tone="critical" 
                  onClick={handleDeleteAllContent}
                >
                  Delete All Content
                </Button>
              </ButtonGroup>
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

        <Divider />

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

              <BlockStack gap="300">
                {subscriptionPlans.map((plan) => (
                  <Card key={plan.id} sectioned>
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <BlockStack gap="100">
                          <InlineStack gap="200" align="center">
                            <Text as="h3" variant="headingSm">
                              {plan.name}
                            </Text>
                            {selectedSubscription === plan.id && (
                              <Badge tone="success">Current Plan</Badge>
                            )}
                          </InlineStack>
                          <Text as="p" variant="headingMd" tone="accent">
                            {plan.price}
                          </Text>
                        </BlockStack>
                        <Button
                          variant={selectedSubscription === plan.id ? "primary" : "secondary"}
                          onClick={() => setSelectedSubscription(plan.id)}
                        >
                          {selectedSubscription === plan.id ? "Current Plan" : "Select Plan"}
                        </Button>
                      </InlineStack>
                      
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {plan.description}
                      </Text>
                      
                      <List type="bullet">
                        {plan.features.map((feature, index) => (
                          <List.Item key={index}>
                            <Text as="span" variant="bodyMd">
                              {feature}
                            </Text>
                          </List.Item>
                        ))}
                      </List>
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>

              <Banner tone="info">
                <Text as="p" variant="bodyMd">
                  Note: This is a demo implementation. In a real application, you would integrate with a payment processor and subscription management system.
                </Text>
              </Banner>
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

      {/* Delete All Folders Confirmation Modal */}
      <Modal
        open={showDeleteFoldersModal}
        onClose={closeModal}
        title="Delete All Folders"
        primaryAction={{
          content: 'Delete All Folders',
          onAction: () => performDelete("delete-all-folders", "delete all folders"),
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
                <strong>Warning:</strong> This action will permanently delete ALL folders and ALL notes in your account. This action cannot be undone.
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
                <strong>Warning:</strong> This action will permanently delete ALL content in your account (all folders and all notes). This action cannot be undone.
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

      {/* Copyright Footer */}
      <div style={{
        position: "fixed",
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
    </Page>
  );
}