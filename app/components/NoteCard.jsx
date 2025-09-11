import React, { useState } from "react";
import { Card, Text, Badge, Button, Group, Stack, ActionIcon, Menu } from "@mantine/core";
import { IconHeart, IconCopy, IconFolder } from "@tabler/icons-react";
import { Tooltip } from "@shopify/polaris";

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
  onDelete,
  onTagClick,
  onDuplicate,
  onMove,
  isSelectButtonClicked
}) => {
  // Determine card state
  let state = "default";
  if (isSelectButtonClicked) state = "select-button-clicked";
  else if (isSelected && inContext) state = "selected-in-context";
  else if (!isSelected && inContext) state = "in-context";
  else if (isSelected && !inContext) state = "selected";

  // Get state-specific styles using Polaris colors
  const getCardProps = () => {
    switch (state) {
      case "default":
        return {
          bg: "transparent",
          style: {
            border: "1px solid #D1D3D4",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
          }
        };
      case "in-context":
        return {
          bg: "transparent",
          style: {
            border: "1px solid #008060",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(0, 128, 96, 0.2)"
          }
        };
      case "selected":
        return {
          bg: "transparent",
          style: {
            border: "2px solid #008060",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 12px rgba(0, 128, 96, 0.3)"
          }
        };
      case "selected-in-context":
        return {
          bg: "transparent",
          style: {
            border: "2px solid #008060",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 6px 16px rgba(0, 128, 96, 0.4)"
          }
        };
      case "select-button-clicked":
        return {
          bg: "transparent",
          style: {
            border: "2px solid #FF8C00",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 12px rgba(255, 140, 0, 0.3)"
          }
        };
      default:
        return {};
    }
  };

  const getTextColor = () => {
    // Keep text labels at default color regardless of card state
    return "#202223";
  };

  const getContentColor = () => {
    switch (state) {
      case "default":
        return "#6D7175";
      case "in-context":
        return "#4A4A4A";
      case "selected":
        return "#4A4A4A";
      case "selected-in-context":
        return "#2C2C2C";
      case "select-button-clicked":
        return "#4A4A4A";
      default:
        return "#6D7175";
    }
  };

  const getDateColor = () => {
    // Keep date labels at default color regardless of card state
    return "#8C9196";
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
      padding="lg"
      radius="md"
      shadow="sm"
    >
      <Stack gap="md">
        {/* Header with Title, Folder Badge, and Heart Icon */}
        <Group justify="space-between" align="flex-start">
          <Group gap="xs" align="center">
            <Text
              size="lg"
              fw={600}
              c={getTextColor()}
              style={{ lineHeight: 1.2 }}
            >
              {title || "(untitled)"}
            </Text>
            {folder && (
              <Badge
                size="sm"
                variant="light"
                color="blue"
                style={{ 
                  backgroundColor: "#E3F2FD",
                  color: "#1976D2",
                  border: "1px solid #BBDEFB"
                }}
              >
                {folder}
              </Badge>
            )}
          </Group>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // Heart functionality can be added here if needed
            }}
          >
            <IconHeart size={16} />
          </ActionIcon>
        </Group>

        {/* Content Preview */}
        <Text
          size="sm"
          c={getContentColor()}
          style={{
            lineHeight: 1.5,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical"
          }}
        >
          {content ? content.replace(/<[^>]*>/g, '').trim() : "Type your note here..."}
        </Text>

        {/* Tags Section */}
        <Stack gap="xs">
          <Text size="sm" fw={500} c={getTextColor()}>
            Tags
          </Text>
          {tags && tags.length > 0 ? (
            <Group gap="xs">
              {tags.slice(0, 3).map((tag, idx) => (
                <Badge
                  key={idx}
                  size="sm"
                  variant="light"
                  color={state === "selected-in-context" ? "green" : "gray"}
                  style={{
                    backgroundColor: state === "selected-in-context" ? "#E8F5E8" : "#F5F5F5",
                    color: state === "selected-in-context" ? "#008060" : "#6D7175",
                    border: state === "selected-in-context" ? "1px solid #B8E6B8" : "1px solid #E0E0E0",
                    cursor: "pointer"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick && onTagClick(tag);
                  }}
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Tooltip content={
                  <div style={{ padding: "8px" }}>
                    {tags.map((tag, idx) => (
                      <div key={idx} style={{ marginBottom: "4px" }}>
                        <Badge
                          size="sm"
                          variant="light"
                          color="gray"
                          style={{
                            backgroundColor: "#F5F5F5",
                            color: "#6D7175",
                            border: "1px solid #E0E0E0",
                            cursor: "pointer",
                            marginRight: "4px"
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTagClick && onTagClick(tag);
                          }}
                        >
                          {tag}
                        </Badge>
                      </div>
                    ))}
                  </div>
                }>
                  <Badge
                    size="sm"
                    variant="light"
                    color="gray"
                    style={{
                      backgroundColor: "#F5F5F5",
                      color: "#6D7175",
                      border: "1px solid #E0E0E0",
                      cursor: "pointer"
                    }}
                  >
                    +{tags.length - 3}
                  </Badge>
                </Tooltip>
              )}
            </Group>
          ) : (
            <Text size="xs" c="dimmed">
              No tags
            </Text>
          )}
        </Stack>

        {/* Footer with Dates and Action Buttons */}
        <Group justify="space-between" align="center">
          <Stack gap="xs">
            <Text size="xs" c={getDateColor()}>
              <strong>Created:</strong> {createdAt}
            </Text>
            {updatedAt && updatedAt !== createdAt && (
              <Text size="xs" c={getDateColor()}>
                <strong>Edited:</strong> {updatedAt}
              </Text>
            )}
          </Stack>
          
          <Group gap="xs">
            <Button
              size="xs"
              variant={isSelectButtonClicked ? "filled" : "light"}
              color={isSelectButtonClicked ? "dark" : "gray"}
              onClick={(e) => {
                e.stopPropagation();
                onSelect && onSelect();
              }}
            >
              Select
            </Button>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button
                  size="xs"
                  variant="light"
                  color="orange"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  Manage
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconCopy size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate && onDuplicate();
                  }}
                >
                  Duplicate to current folder
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconCopy size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate && onDuplicate("different");
                  }}
                >
                  Duplicate to different folder
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFolder size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove && onMove();
                  }}
                >
                  Move to different folder
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
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