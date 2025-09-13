import React, { useState, useEffect } from 'react';
import { Card, BlockStack, TextField, Button, InlineStack, Text, Badge } from '@shopify/polaris';
import NotionTiptapEditor from './NotionTiptapEditor';
import { SaveIcon } from '@shopify/polaris-icons';

const NotionNotepad = ({ 
  note, 
  onSave, 
  onCancel, 
  isSaving = false,
  autoSave = true,
  saveDelay = 2000 
}) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !hasChanges) return;

    const timer = setTimeout(() => {
      handleSave();
    }, saveDelay);

    return () => clearTimeout(timer);
  }, [content, title, hasChanges, autoSave, saveDelay]);

  const handleTitleChange = (value) => {
    setTitle(value);
    setHasChanges(true);
  };

  const handleContentChange = (value) => {
    setContent(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (onSave) {
      await onSave({ title, content });
      setHasChanges(false);
      setLastSaved(new Date());
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Card>
      <Card.Section>
        <BlockStack gap="4">
          <InlineStack align="space-between" blockAlign="center">
            <TextField
              label=""
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled"
              autoComplete="off"
              variant="plain"
              size="large"
              inputMode="text"
              style={{ fontSize: '24px', fontWeight: '600' }}
            />
            <InlineStack gap="2" align="end">
              {autoSave && hasChanges && (
                <Badge tone="attention">Unsaved</Badge>
              )}
              {autoSave && !hasChanges && lastSaved && (
                <Text variant="bodySm" color="subdued">
                  Saved {lastSaved.toLocaleTimeString()}
                </Text>
              )}
              {!autoSave && (
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={isSaving}
                  disabled={!hasChanges}
                  icon={SaveIcon}
                >
                  Save
                </Button>
              )}
              {onCancel && (
                <Button onClick={handleCancel}>
                  Cancel
                </Button>
              )}
            </InlineStack>
          </InlineStack>
        </BlockStack>
      </Card.Section>
      
      <Card.Section flush>
        <NotionTiptapEditor
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing your note..."
        />
      </Card.Section>
    </Card>
  );
};

export default NotionNotepad;