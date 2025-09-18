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
} from "@shopify/polaris";
import { useState } from "react";

export default function Settings() {
  const [selectedSubscription, setSelectedSubscription] = useState("basic");

  const handleDeleteAllNotes = () => {
    // TODO: Implement delete all notes functionality
    console.log("Delete all notes clicked");
  };

  const handleDeleteAllFolders = () => {
    // TODO: Implement delete all folders functionality
    console.log("Delete all folders clicked");
  };

  const handleDeleteAllContent = () => {
    // TODO: Implement delete all content functionality
    console.log("Delete all content clicked");
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
      </BlockStack>
    </Page>
  );
}