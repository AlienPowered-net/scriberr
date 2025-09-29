import React, { useState, useEffect } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  ProgressBar,
  Icon,
  Collapsible,
  Link,
  Box,
} from '@shopify/polaris';
import {
  CheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  FolderIcon,
  NoteIcon,
  StarIcon,
  SettingsIcon,
} from '@shopify/polaris-icons';

export default function SetupGuide({ totalFolders = 0, totalNotes = 0, pinnedNotes = 0 }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stepStates, setStepStates] = useState({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
  });
  
  // Calculate progress based on actual user data
  const hasFolders = totalFolders > 0;
  const hasNotes = totalNotes > 0;
  const hasMultipleFolders = totalFolders > 1;
  const hasPinnedNotes = pinnedNotes > 0;
  
  const completedSteps = [hasFolders, hasNotes, hasMultipleFolders, hasPinnedNotes].filter(Boolean).length;
  const totalSteps = 4;
  const progress = (completedSteps / totalSteps) * 100;

  // Determine which step should be expanded by default
  useEffect(() => {
    const newStepStates = {
      step1: false,
      step2: false,
      step3: false,
      step4: false,
    };

    // Find the next incomplete step and expand it
    if (!hasFolders) {
      newStepStates.step1 = true;
    } else if (!hasNotes) {
      newStepStates.step2 = true;
    } else if (!hasMultipleFolders) {
      newStepStates.step3 = true;
    } else if (!hasPinnedNotes) {
      newStepStates.step4 = true;
    }

    setStepStates(newStepStates);
  }, [hasFolders, hasNotes, hasMultipleFolders, hasPinnedNotes]);

  const toggleStep = (stepId) => {
    setStepStates(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const steps = [
    {
      id: 1,
      title: "Create a Folder to Get Started",
      description: "Before you add notes, set up your first folder. Folders make it simple to organize, manage, and revisit your notes whenever you need them.",
      action: hasFolders ? null : "Create folder",
      actionUrl: "/app/dashboard",
      completed: hasFolders,
      icon: FolderIcon,
    },
    {
      id: 2,
      title: "Start Writing Your First Note",
      description: "Pick a folder and create your very first note. Begin capturing your thoughts and building your collection.",
      action: hasNotes ? null : "Create note",
      actionUrl: "/app/dashboard",
      completed: hasNotes,
      icon: NoteIcon,
    },
    {
      id: 3,
      title: "Keep Things Organized",
      description: "Create extra folders to group your notes by topic or project. Rearrange them anytime with simple drag-and-drop.",
      action: hasMultipleFolders ? null : "Create more folders",
      actionUrl: "/app/dashboard",
      completed: hasMultipleFolders,
      icon: SettingsIcon,
    },
    {
      id: 4,
      title: "Keep Priorities Front and Center",
      description: "Pin your most important notes to the top of your workspace. This makes it easy to quickly revisit ideas, reminders, or tasks you use most often.",
      action: hasPinnedNotes ? null : "Pin a note",
      actionUrl: "/app/dashboard",
      completed: hasPinnedNotes,
      icon: StarIcon,
    },
  ];

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <InlineStack align="space-between">
          <Text variant="headingMd" as="h2">
            Setup guide
          </Text>
          <Button
            variant="plain"
            size="slim"
            icon={ChevronUpIcon}
            onClick={() => setIsCollapsed(!isCollapsed)}
            accessibilityLabel={isCollapsed ? "Expand setup guide" : "Collapse setup guide"}
          />
        </InlineStack>

        <Collapsible
          open={!isCollapsed}
          id="setup-guide-content"
          transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
        >
          <BlockStack gap="400">
            {/* Description */}
            <Text variant="bodyMd">
              Use this guide to get started with your note-taking workspace.
            </Text>

            {/* Progress */}
            <BlockStack gap="200">
              <InlineStack align="space-between">
                <Text variant="bodySm">
                  {completedSteps} of {totalSteps} tasks complete
                </Text>
              </InlineStack>
              <ProgressBar progress={progress} size="small" />
            </BlockStack>

            {/* Steps */}
            <BlockStack gap="200">
              {steps.map((step) => {
                const stepKey = `step${step.id}`;
                const isStepOpen = stepStates[stepKey];
                
                return (
                  <Box key={step.id} padding="0">
                    {/* Clickable Step Header */}
                    <Box
                      padding="400"
                      background={isStepOpen ? "bg-surface-secondary" : "bg-surface"}
                      borderRadius="200"
                      style={{ 
                        cursor: 'pointer',
                        border: '1px solid var(--p-color-border-subdued)',
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onClick={() => toggleStep(stepKey)}
                    >
                      <InlineStack align="space-between">
                        <InlineStack gap="300" align="start">
                          <Box padding="100">
                            {step.completed ? (
                              <Icon source={CheckIcon} tone="success" />
                            ) : (
                              <Box 
                                padding="100"
                                background="bg-surface-secondary"
                                borderRadius="100"
                                style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Text variant="bodySm" tone="subdued" style={{ fontSize: '10px' }}>○</Text>
                              </Box>
                            )}
                          </Box>
                          <Text variant="bodyMd" fontWeight="medium">
                            {step.title}
                          </Text>
                        </InlineStack>
                        <Icon 
                          source={isStepOpen ? ChevronUpIcon : ChevronDownIcon} 
                          tone="subdued"
                        />
                      </InlineStack>
                    </Box>

                    {/* Collapsible Content */}
                    <Collapsible
                      open={isStepOpen}
                      id={`step-${step.id}-collapsible`}
                      transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
                    >
                      <Box padding="400" paddingBlockStart="300">
                        <BlockStack gap="300">
                          <Text variant="bodySm" tone="subdued">
                            {step.description}
                          </Text>
                          {step.action && (
                            <InlineStack align="start">
                              <Button
                                variant="primary"
                                tone="success"
                                size="slim"
                                url={step.actionUrl}
                              >
                                {step.action}
                              </Button>
                            </InlineStack>
                          )}
                        </BlockStack>
                      </Box>
                    </Collapsible>
                  </Box>
                );
              })}
            </BlockStack>

            {/* Footer */}
            <BlockStack gap="200">
              <Text variant="bodySm">
                Be sure to explore all the features in your dashboard. If you run into any issues or have questions, reach out to us anytime through the in-app live chat.
              </Text>
            </BlockStack>
          </BlockStack>
        </Collapsible>
      </BlockStack>
    </Card>
  );
}