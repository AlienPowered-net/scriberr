import React from "react";
import { Card, Text, Badge, Button, Group, Stack } from "@mantine/core";

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

  // Get state-specific styles
  const getCardProps = () => {
    switch (state) {
      case "default":
        return {
          bg: "#f8f9fa",
          style: {
            border: "1px solid #D1D3D4",
            cursor: "pointer",
            height: "160px",
            transition: "all 0.2s ease"
          }
        };
      case "in-context":
        return {
          bg: "#f8f9fa",
          style: {
            border: "1px solid #008060",
            cursor: "pointer",
            height: "160px",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(0, 128, 96, 0.2)"
          }
        };
      case "selected":
        return {
          bg: "#FFFFFF",
          style: {
            border: "2px solid #008060",
            cursor: "pointer",
            height: "160px",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 12px rgba(0, 128, 96, 0.3)"
          }
        };
      case "selected-in-context":
        return {
          bg: "#E8F5E8",
          style: {
            border: "2px solid #008060",
            cursor: "pointer",
            height: "160px",
            transition: "all 0.2s ease",
            boxShadow: "0 6px 16px rgba(0, 128, 96, 0.4)"
          }
        };
      default:
        return {};
    }
  };

  const getTextColor = () => {
    switch (state) {
      case "default":
        return "#202223";
      case "in-context":
      case "selected":
        return "#008060";
      case "selected-in-context":
        return "#004C3F";
      default:
        return "#202223";
    }
  };

  const getContentColor = () => {
    switch (state) {
      case "default":
        return "#6D7175";
      case "in-context":
      case "selected":
        return "#4A4A4A";
      case "selected-in-context":
        return "#2C2C2C";
      default:
        return "#6D7175";
    }
  };

  const getDateColor = () => {
    switch (state) {
      case "default":
        return "#8C9196";
      case "in-context":
      case "selected":
        return "#008060";
      case "selected-in-context":
        return "#004C3F";
      default:
        return "#8C9196";
    }
  };

  const cardProps = getCardProps();

  return (
    <Card
      {...cardProps}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (state === "default") {
          e.target.style.transform = "translateY(-2px)";
          e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
        }
      }}
      onMouseLeave={(e) => {
        if (state === "default") {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
        }
      }}
      padding="md"
      radius="md"
    >
      <Stack h="100%" justify="space-between">
        {/* Header with Title and Dates */}
        <Group justify="space-between" align="flex-start">
          <Text
            size="sm"
            fw={600}
            c={getTextColor()}
            style={{ lineHeight: 1.2, flex: 1 }}
            truncate
          >
            {title || "(untitled)"}
          </Text>
          <Text size="xs" c={getDateColor()}>
            {createdAt}
            {updatedAt && updatedAt !== createdAt && ` • ${updatedAt}`}
          </Text>
        </Group>

        {/* Content Preview */}
        <Text
          size="xs"
          c={getContentColor()}
          style={{
            lineHeight: 1.4,
            flex: 1,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical"
          }}
        >
          {content ? content.replace(/<[^>]*>/g, '').trim() : "Type your note here..."}
        </Text>

        {/* Footer with Tags and Buttons */}
        <Group justify="space-between" align="center">
          {/* Tags */}
          {tags && tags.length > 0 && (
            <Group gap="xs">
              {tags.slice(0, 3).map((tag, idx) => (
                <Badge
                  key={idx}
                  size="xs"
                  variant="light"
                  color={state === "selected-in-context" ? "green" : "gray"}
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Text size="xs" c="dimmed">
                  +{tags.length - 3}
                </Text>
              )}
            </Group>
          )}

          {/* Action Buttons */}
          <Group gap="xs">
            <Button
              size="xs"
              variant={isSelected ? "filled" : "light"}
              color={isSelected ? "orange" : "gray"}
              onClick={(e) => {
                e.stopPropagation();
                onSelect && onSelect();
              }}
            >
              {isSelected ? "Selected" : "Select"}
            </Button>
            <Button
              size="xs"
              variant="light"
              color="gray"
              onClick={(e) => {
                e.stopPropagation();
                onManage && onManage();
              }}
            >
              Manage
            </Button>
            <Button
              size="xs"
              variant="light"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                onDelete && onDelete();
              }}
            >
              Delete
            </Button>
          </Group>
        </Group>
      </Stack>
    </Card>
  );
};

export default NoteCard;