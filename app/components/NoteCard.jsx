import React from "react";
import { Card, Text, Button, Badge } from "@shopify/polaris";

const NoteCard = ({
  title,
  content,
  tags,
  createdAt,
  updatedAt,
  isSelected,
  inContext,
  folder,
  onClick,
  onSelect,
  onManage,
  onDelete
}) => {
  // Determine card state
  let state = "default";
  if (isSelected && inContext) state = "selected-in-context";
  else if (!isSelected && inContext) state = "in-context";
  else if (isSelected && !inContext) state = "selected";

  return (
    <div style={{ marginBottom: "12px" }}>
      <Card>
        <div style={{ padding: "16px" }}>
          {/* Header Section */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
              <Text as="h3" variant="headingMd" truncate>
                {title || "(untitled)"}
              </Text>
              <div style={{ display: "flex", gap: "4px", marginLeft: "8px" }}>
                <Text as="p" variant="bodySm" tone="subdued">
                  {createdAt}
                </Text>
                {updatedAt && (
                  <Text as="p" variant="bodySm" tone="subdued">
                    {updatedAt}
                  </Text>
                )}
              </div>
            </div>
            {folder && (
              <Text as="p" variant="bodySm" tone="subdued">
                Folder: {folder}
              </Text>
            )}
          </div>

          {/* Content Preview */}
          <div style={{ marginBottom: "12px" }}>
            <Text as="p" variant="bodyMd">
              {content ? content.replace(/<[^>]*>/g, '').substring(0, 120) + "..." : "Type your note here..."}
            </Text>
          </div>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {tags.map((tag, idx) => (
                  <Badge key={idx} status="info">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button
              size="slim"
              variant={isSelected ? "primary" : "secondary"}
              onClick={(e) => {
                e.stopPropagation();
                onSelect && onSelect();
              }}
            >
              {isSelected ? "Selected" : "Select"}
            </Button>
            <Button
              size="slim"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onManage && onManage();
              }}
            >
              Manage
            </Button>
            <Button
              size="slim"
              variant="secondary"
              tone="critical"
              onClick={(e) => {
                e.stopPropagation();
                onDelete && onDelete();
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NoteCard;