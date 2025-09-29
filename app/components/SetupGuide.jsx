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
      title: "Start here",
      description: "Create your first folder to organize your notes",
      action: hasFolders ? null : "Create folder",
      actionUrl: "/app/dashboard",
      completed: hasFolders,
      icon: FolderIcon,
    },
    {
      id: 2,
      title: "Create your first note",
      description: "Select a folder and create your first note to start writing",
      action: hasNotes ? null : "Create note",
      actionUrl: "/app/dashboard",
      completed: hasNotes,
      icon: NoteIcon,
    },
    {
      id: 3,
      title: "Organize your workspace",
      description: "Create additional folders and organize your notes by category",
      action: hasMultipleFolders ? null : "Create more folders",
      actionUrl: "/app/dashboard",
      completed: hasMultipleFolders,
      icon: SettingsIcon,
    },
    {
      id: 4,
      title: "Pin important notes",
      description: "Pin your most important notes for quick access",
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
            <BlockStack gap="300">
              {steps.map((step) => {
                const stepKey = `step${step.id}`;
                const isStepOpen = stepStates[stepKey];
                
                return (
                  <Card key={step.id} sectioned>
                    <BlockStack gap="300">
                      {/* Step Header */}
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
                        <InlineStack gap="200">
                          {step.action && (
                            <Button
                              variant="primary"
                              size="slim"
                              url={step.actionUrl}
                            >
                              {step.action}
                            </Button>
                          )}
                          <Button
                            variant="plain"
                            size="slim"
                            icon={isStepOpen ? ChevronUpIcon : ChevronDownIcon}
                            onClick={() => toggleStep(stepKey)}
                            accessibilityLabel={isStepOpen ? `Collapse step ${step.id}` : `Expand step ${step.id}`}
                          />
                        </InlineStack>
                      </InlineStack>

                      {/* Step Content */}
                      <Collapsible
                        open={isStepOpen}
                        id={`step-${step.id}-collapsible`}
                        transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
                      >
                        <Text variant="bodySm" tone="subdued">
                          {step.description}
                        </Text>
                      </Collapsible>
                    </BlockStack>
                  </Card>
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