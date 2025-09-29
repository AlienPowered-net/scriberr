// app/routes/app._index.jsx - Home Page
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";
import packageJson from "../../package.json" with { type: "json" };

import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  ResourceList,
  ResourceItem,
  Avatar,
  EmptyState,
  Banner,
  Icon,
  Divider,
  Box,
  Grid,
  Collapsible,
} from "@shopify/polaris";
import { 
  FolderIcon,
  NoteIcon,
  CalendarIcon,
  StarIcon,
  CheckIcon,
  ArrowRightIcon,
  InfoIcon,
  StarFilledIcon,
} from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  // Get stats
  const [folders, notes] = await Promise.all([
    prisma.folder.findMany({
      where: { shopId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.note.findMany({
      where: { shopId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        folder: true,
      },
    }),
  ]);

  const totalFolders = await prisma.folder.count({ where: { shopId } });
  const totalNotes = await prisma.note.count({ where: { shopId } });

  return json({
    folders,
    notes,
    totalFolders,
    totalNotes,
    version: packageJson.version,
  });
};

export default function HomePage() {
  const { folders, notes, totalFolders, totalNotes, version } = useLoaderData();
  const [showOnboarding, setShowOnboarding] = useState(true);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Page title="Welcome to Scriberr" subtitle={`Version ${version}`}>
      <Layout>
        {/* Dismissible Onboarding Banner */}
        <Layout.Section>
          <Collapsible
            open={showOnboarding}
            id="onboarding-banner"
            transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
          >
            <Banner
              title="Welcome to Scriberr! 🎉"
              tone="success"
              onDismiss={() => setShowOnboarding(false)}
              action={{
                content: "Go to Dashboard",
                url: "/app/dashboard",
              }}
            >
              <BlockStack gap="300">
                <Text variant="bodyMd">
                  Your personal note-taking companion. Here's how to get started:
                </Text>
                <BlockStack gap="200">
                  <InlineStack gap="200">
                    <Icon source={FolderIcon} tone="base" />
                    <Text variant="bodySm">1. Create folders to organize your notes</Text>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Icon source={NoteIcon} tone="base" />
                    <Text variant="bodySm">2. Select a folder, then create notes</Text>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Icon source={StarIcon} tone="base" />
                    <Text variant="bodySm">3. Pin important notes for quick access</Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Banner>
          </Collapsible>
        </Layout.Section>

        {/* Stats Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Your Workspace Stats
              </Text>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="200" align="center">
                      <Icon source={FolderIcon} tone="base" />
                      <Text variant="heading2xl" as="h3">
                        {totalFolders}
                      </Text>
                      <Text variant="bodyMd" tone="subdued">
                        Folders
                      </Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="200" align="center">
                      <Icon source={NoteIcon} tone="base" />
                      <Text variant="heading2xl" as="h3">
                        {totalNotes}
                      </Text>
                      <Text variant="bodyMd" tone="subdued">
                        Notes
                      </Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="200" align="center">
                      <Icon source={CalendarIcon} tone="base" />
                      <Text variant="heading2xl" as="h3">
                        {notes.length > 0 ? formatDate(notes[0].updatedAt) : 'N/A'}
                      </Text>
                      <Text variant="bodyMd" tone="subdued">
                        Last Updated
                      </Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="200" align="center">
                      <Icon source={StarIcon} tone="base" />
                      <Text variant="heading2xl" as="h3">
                        {notes.filter(note => note.pinnedAt).length}
                      </Text>
                      <Text variant="bodyMd" tone="subdued">
                        Pinned Notes
                      </Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
              </Grid>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Layout>
            {/* Recent Folders */}
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h2">
                      Recent Folders
                    </Text>
                    <Button
                      variant="plain"
                      size="slim"
                      url="/app/dashboard"
                    >
                      View All
                    </Button>
                  </InlineStack>
                  
                  {folders.length > 0 ? (
                    <ResourceList
                      resourceName={{ singular: 'folder', plural: 'folders' }}
                      items={folders}
                      renderItem={(folder) => {
                        const { id, name, icon, updatedAt } = folder;
                        return (
                          <ResourceItem
                            id={id}
                            url="/app/dashboard"
                            accessibilityLabel={`View folder ${name}`}
                          >
                            <InlineStack gap="300" align="space-between">
                              <InlineStack gap="300">
                                <Avatar
                                  size="small"
                                  name={name}
                                  source={icon ? `data:image/svg+xml;base64,${icon}` : undefined}
                                />
                                <BlockStack gap="100">
                                  <Text variant="bodyMd" fontWeight="medium" as="h3">
                                    {name}
                                  </Text>
                                  <Text variant="bodySm" tone="subdued">
                                    Updated {formatDate(updatedAt)} at {formatTime(updatedAt)}
                                  </Text>
                                </BlockStack>
                              </InlineStack>
                            </InlineStack>
                          </ResourceItem>
                        );
                      }}
                    />
                  ) : (
                    <EmptyState
                      heading="No folders yet"
                      action={{
                        content: "Create your first folder",
                        url: "/app/dashboard",
                      }}
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>Get started by creating your first folder to organize your notes.</p>
                    </EmptyState>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>

            {/* Recent Notes */}
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h2">
                      Recent Notes
                    </Text>
                    <Button
                      variant="plain"
                      size="slim"
                      url="/app/dashboard"
                    >
                      View All
                    </Button>
                  </InlineStack>
                  
                  {notes.length > 0 ? (
                    <ResourceList
                      resourceName={{ singular: 'note', plural: 'notes' }}
                      items={notes}
                      renderItem={(note) => {
                        const { id, title, content, folder, updatedAt, pinnedAt } = note;
                        const truncatedContent = content ? content.substring(0, 100) + (content.length > 100 ? '...' : '') : '';
                        return (
                          <ResourceItem
                            id={id}
                            url="/app/dashboard"
                            accessibilityLabel={`View note ${title}`}
                          >
                            <InlineStack gap="300" align="space-between">
                              <BlockStack gap="100">
                                <InlineStack gap="200" align="start">
                                  {pinnedAt && (
                                    <Icon source={StarIcon} tone="warning" />
                                  )}
                                  <Text variant="bodyMd" fontWeight="medium" as="h3">
                                    {title || 'Untitled Note'}
                                  </Text>
                                </InlineStack>
                                {truncatedContent && (
                                  <Text variant="bodySm" tone="subdued">
                                    {truncatedContent}
                                  </Text>
                                )}
                                <InlineStack gap="200">
                                  {folder && (
                                    <Badge tone="info" size="small">
                                      {folder.name}
                                    </Badge>
                                  )}
                                  <Text variant="bodySm" tone="subdued">
                                    {formatDate(updatedAt)}
                                  </Text>
                                </InlineStack>
                              </BlockStack>
                            </InlineStack>
                          </ResourceItem>
                        );
                      }}
                    />
                  ) : (
                    <EmptyState
                      heading="No notes yet"
                      action={{
                        content: "Create your first note",
                        url: "/app/dashboard",
                      }}
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>Start writing by creating your first note in the dashboard.</p>
                    </EmptyState>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>

        {/* Onboarding Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Getting Started with Scriberr
              </Text>
              
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                      <InlineStack gap="200" align="start">
                        <Box padding="200" background="bg-surface-brand" borderRadius="100">
                          <Icon source={FolderIcon} tone="base" />
                        </Box>
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="medium" as="h3">
                            Create Folders
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            Organize your notes by creating folders. Click the "New Folder" button in the dashboard to get started.
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </BlockStack>
                  </Box>
                </Grid.Cell>

                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                      <InlineStack gap="200" align="start">
                        <Box padding="200" background="bg-surface-brand" borderRadius="100">
                          <Icon source={NoteIcon} tone="base" />
                        </Box>
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="medium" as="h3">
                            Create Notes
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            Select a folder first, then click "New Note" to create your first note. Notes must belong to a folder.
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </BlockStack>
                  </Box>
                </Grid.Cell>

                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                      <InlineStack gap="200" align="start">
                        <Box padding="200" background="bg-surface-brand" borderRadius="100">
                          <Icon source={CheckIcon} tone="base" />
                        </Box>
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="medium" as="h3">
                            Select Before Creating
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            Always select a folder before creating a new note. This helps keep your notes organized and easy to find.
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </BlockStack>
                  </Box>
                </Grid.Cell>

                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                      <InlineStack gap="200" align="start">
                        <Box padding="200" background="bg-surface-brand" borderRadius="100">
                          <Icon source={StarIcon} tone="base" />
                        </Box>
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="medium" as="h3">
                            Pin Important Notes
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            Pin your most important notes to keep them at the top of your list for quick access.
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
              </Grid>

              <Divider />

              <InlineStack align="center">
                <Button
                  variant="primary"
                  size="large"
                  url="/app/dashboard"
                  icon={ArrowRightIcon}
                >
                  Start Using Scriberr
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* News & Updates Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                News & Updates
              </Text>
              
              <BlockStack gap="300">
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <InlineStack gap="200" align="start">
                      <Badge tone="success" size="small">
                        New
                      </Badge>
                      <Text variant="bodyMd" fontWeight="medium" as="h3">
                        Scriberr v{version} Released
                      </Text>
                    </InlineStack>
                    <Text variant="bodySm" tone="subdued">
                      Welcome to the latest version of Scriberr! We've improved the user interface, 
                      added better organization features, and enhanced the note-taking experience.
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      <strong>What's New:</strong>
                    </Text>
                    <BlockStack gap="100">
                      <InlineStack gap="200">
                        <Icon source={CheckIcon} tone="success" />
                        <Text variant="bodySm">Enhanced folder organization</Text>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Icon source={CheckIcon} tone="success" />
                        <Text variant="bodySm">Improved note editor with rich text support</Text>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Icon source={CheckIcon} tone="success" />
                        <Text variant="bodySm">Better mobile responsiveness</Text>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Icon source={CheckIcon} tone="success" />
                        <Text variant="bodySm">Pin important notes for quick access</Text>
                      </InlineStack>
                    </BlockStack>
                  </BlockStack>
                </Box>

                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <InlineStack gap="200" align="start">
                      <Badge tone="info" size="small">
                        Coming Soon
                      </Badge>
                      <Text variant="bodyMd" fontWeight="medium" as="h3">
                        Future App Integrations
                      </Text>
                    </InlineStack>
                    <Text variant="bodySm" tone="subdued">
                      We're working on exciting new features and integrations to make Scriberr even more powerful:
                    </Text>
                    <BlockStack gap="100">
                      <InlineStack gap="200">
                        <Icon source={InfoIcon} tone="info" />
                        <Text variant="bodySm">AI-powered note suggestions and summaries</Text>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Icon source={InfoIcon} tone="info" />
                        <Text variant="bodySm">Collaborative note sharing and team workspaces</Text>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Icon source={InfoIcon} tone="info" />
                        <Text variant="bodySm">Advanced search and tagging system</Text>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Icon source={InfoIcon} tone="info" />
                        <Text variant="bodySm">Export to PDF, Word, and other formats</Text>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Icon source={InfoIcon} tone="info" />
                        <Text variant="bodySm">Mobile app for iOS and Android</Text>
                      </InlineStack>
                    </BlockStack>
                  </BlockStack>
                </Box>

                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <InlineStack gap="200" align="start">
                      <Badge tone="warning" size="small">
                        Tip
                      </Badge>
                      <Text variant="bodyMd" fontWeight="medium" as="h3">
                        Pro Tips for Better Organization
                      </Text>
                    </InlineStack>
                    <Text variant="bodySm" tone="subdued">
                      Make the most of Scriberr with these organization tips:
                    </Text>
                    <BlockStack gap="100">
                      <InlineStack gap="200">
                        <Icon source={InfoIcon} tone="info" />
                        <Text variant="bodySm">Use descriptive folder names to categorize your notes</Text>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Icon source={InfoIcon} tone="info" />
                        <Text variant="bodySm">Pin frequently accessed notes to the top</Text>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Icon source={InfoIcon} tone="info" />
                        <Text variant="bodySm">Use tags to add extra categorization to your notes</Text>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Icon source={InfoIcon} tone="info" />
                        <Text variant="bodySm">Regularly review and organize your folders</Text>
                      </InlineStack>
                    </BlockStack>
                  </BlockStack>
                </Box>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}