// app/routes/app.home.jsx - Home Page
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";
import packageJson from "../../package.json" with { type: "json" };
import SetupGuide from "../components/SetupGuide";

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
  PinFilledIcon,
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
      select: {
        id: true,
        name: true,
        icon: true,
        iconColor: true,
        updatedAt: true,
      },
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
  const navigate = useNavigate();

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

  // Strip HTML tags from text content
  const stripHtmlTags = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  };

  // Handle note click navigation
  const handleNoteClick = (note) => {
    const isMobile = window.innerWidth <= 1024;
    // Always pass both folderId and noteId in URL for reliable selection
    const url = `/app/dashboard?folderId=${note.folderId}&noteId=${note.id}${isMobile ? '&mobile=true' : ''}`;
    console.log('Navigating to:', url);
    console.log('Note data:', note);
    navigate(url);
  };

  // Handle "View All" click for Recent Notes
  const handleViewAllNotes = () => {
    const isMobile = window.innerWidth <= 1024;
    if (isMobile) {
      // On mobile, navigate to notes section with All Notes selected
      localStorage.setItem('mobileActiveSection', 'notes');
      localStorage.setItem('selectedFolder', 'null'); // String 'null' to indicate All Notes
      navigate('/app/dashboard');
    } else {
      // On desktop, navigate to dashboard with All Notes selected (no folderId param)
      navigate('/app/dashboard');
    }
  };

  return (
    <Page title="Welcome to Scriberr" subtitle={`Version ${version}`}>
      <Layout>
        {/* Setup Guide */}
        <Layout.Section>
          <SetupGuide 
            totalFolders={totalFolders}
            totalNotes={totalNotes}
            pinnedNotes={notes.filter(note => note.pinnedAt).length}
          />
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

        {/* Stats Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Your Scriberr Workspace Insights
              </Text>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack gap="200" align="start">
                      <Box padding="200">
                        <Icon source={FolderIcon} tone="base" />
                      </Box>
                      <BlockStack gap="100" align="start">
                        <Text variant="headingLg" as="h3" fontWeight="semibold">
                          {totalFolders}
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                          Folders
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack gap="200" align="start">
                      <Box padding="200">
                        <Icon source={NoteIcon} tone="base" />
                      </Box>
                      <BlockStack gap="100" align="start">
                        <Text variant="headingLg" as="h3" fontWeight="semibold">
                          {totalNotes}
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                          Notes
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack gap="200" align="start">
                      <Box padding="200">
                        <Icon source={CalendarIcon} tone="base" />
                      </Box>
                      <BlockStack gap="100" align="start">
                        <Text variant="headingLg" as="h3" fontWeight="semibold">
                          {notes.length > 0 ? formatDate(notes[0].updatedAt) : 'N/A'}
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                          Last Updated
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack gap="200" align="start">
                      <Box padding="200">
                        <Icon source={StarIcon} tone="base" />
                      </Box>
                      <BlockStack gap="100" align="start">
                        <Text variant="headingLg" as="h3" fontWeight="semibold">
                          {notes.filter(note => note.pinnedAt).length}
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                          Pinned Notes
                        </Text>
                      </BlockStack>
                    </InlineStack>
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
                        const { id, name, icon, iconColor, updatedAt } = folder;
                        return (
                          <ResourceItem
                            id={id}
                            url={`/app/dashboard?folderId=${id}`}
                            accessibilityLabel={`View folder ${name}`}
                          >
                            <InlineStack gap="300" align="space-between">
                              <InlineStack gap="300">
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '6px',
                                  backgroundColor: '#f8f9fa',
                                  border: '1px solid #e1e3e5'
                                }}>
                                  <i className={`far fa-${icon || 'folder'}`} style={{ 
                                    fontSize: '16px', 
                                    color: iconColor || '#f57c00' 
                                  }}></i>
                                </div>
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
                      onClick={handleViewAllNotes}
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
                        const strippedContent = stripHtmlTags(content);
                        const truncatedContent = strippedContent ? strippedContent.substring(0, 100) + (strippedContent.length > 100 ? '...' : '') : '';
                        return (
                          <ResourceItem
                            id={id}
                            onClick={() => handleNoteClick(note)}
                            accessibilityLabel={`View note ${title}`}
                          >
                            <div style={{ position: 'relative' }}>
                              <InlineStack gap="300" align="space-between">
                                <BlockStack gap="100">
                                  <InlineStack gap="200" align="start">
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
                                {pinnedAt && (
                                  <div style={{ 
                                    position: 'absolute', 
                                    top: '8px', 
                                    right: '8px' 
                                  }}>
                                    <Icon source={PinFilledIcon} tone="warning" />
                                  </div>
                                )}
                              </InlineStack>
                            </div>
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

        {/* News & Updates Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                News & Updates
              </Text>
              
              <BlockStack gap="300">
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <div style={{ textAlign: 'left', width: '100%' }}>
                    <BlockStack gap="200" align="start">
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
                    <div style={{ textAlign: 'left', width: '100%' }}>
                      <BlockStack gap="100" align="start">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' }}>
                          <InlineStack gap="200" align="start">
                            <Icon source={CheckIcon} tone="success" />
                            <Text variant="bodySm">Enhanced folder organization</Text>
                          </InlineStack>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' }}>
                          <InlineStack gap="200" align="start">
                            <Icon source={CheckIcon} tone="success" />
                            <Text variant="bodySm">Improved note editor with rich text support</Text>
                          </InlineStack>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' }}>
                          <InlineStack gap="200" align="start">
                            <Icon source={CheckIcon} tone="success" />
                            <Text variant="bodySm">Better mobile responsiveness</Text>
                          </InlineStack>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' }}>
                          <InlineStack gap="200" align="start">
                            <Icon source={CheckIcon} tone="success" />
                            <Text variant="bodySm">Pin important notes for quick access</Text>
                          </InlineStack>
                        </div>
                      </BlockStack>
                    </div>
                    </BlockStack>
                  </div>
                </Box>

                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <div style={{ textAlign: 'left', width: '100%' }}>
                    <BlockStack gap="200" align="start">
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
                    <div style={{ textAlign: 'left', width: '100%' }}>
                      <BlockStack gap="100" align="start">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' }}>
                          <InlineStack gap="200" align="start">
                            <Icon source={InfoIcon} tone="info" />
                            <Text variant="bodySm">AI-powered note suggestions and summaries</Text>
                          </InlineStack>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' }}>
                          <InlineStack gap="200" align="start">
                            <Icon source={InfoIcon} tone="info" />
                            <Text variant="bodySm">Collaborative note sharing and team workspaces</Text>
                          </InlineStack>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' }}>
                          <InlineStack gap="200" align="start">
                            <Icon source={InfoIcon} tone="info" />
                            <Text variant="bodySm">Advanced search and tagging system</Text>
                          </InlineStack>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' }}>
                          <InlineStack gap="200" align="start">
                            <Icon source={InfoIcon} tone="info" />
                            <Text variant="bodySm">Export to PDF, Word, and other formats</Text>
                          </InlineStack>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' }}>
                          <InlineStack gap="200" align="start">
                            <Icon source={InfoIcon} tone="info" />
                            <Text variant="bodySm">Mobile app for iOS and Android</Text>
                          </InlineStack>
                        </div>
                      </BlockStack>
                    </div>
                    </BlockStack>
                  </div>
                </Box>

                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <div style={{ textAlign: 'left', width: '100%' }}>
                    <BlockStack gap="200" align="start">
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
                    <div style={{ textAlign: 'left', width: '100%' }}>
                      <BlockStack gap="100" align="start">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' }}>
                          <InlineStack gap="200" align="start">
                            <Icon source={InfoIcon} tone="info" />
                            <Text variant="bodySm">Use descriptive folder names to categorize your notes</Text>
                          </InlineStack>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' }}>
                          <InlineStack gap="200" align="start">
                            <Icon source={InfoIcon} tone="info" />
                            <Text variant="bodySm">Pin frequently accessed notes to the top</Text>
                          </InlineStack>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' }}>
                          <InlineStack gap="200" align="start">
                            <Icon source={InfoIcon} tone="info" />
                            <Text variant="bodySm">Use tags to add extra categorization to your notes</Text>
                          </InlineStack>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' }}>
                          <InlineStack gap="200" align="start">
                            <Icon source={InfoIcon} tone="info" />
                            <Text variant="bodySm">Regularly review and organize your folders</Text>
                          </InlineStack>
                        </div>
                      </BlockStack>
                    </div>
                    </BlockStack>
                  </div>
                </Box>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

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
      </Layout>
    </Page>
  );
}