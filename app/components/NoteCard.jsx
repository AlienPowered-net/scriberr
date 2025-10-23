import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Card, Text, Badge, Button, Group, Stack } from "@mantine/core";
import { IconCopy, IconFolder } from "@tabler/icons-react";
import { Tooltip, Popover, ActionList, Icon } from "@shopify/polaris";
import { PinFilledIcon } from "@shopify/polaris-icons";

const NoteCard = ({
  title,
  content,
  tags,
  createdAt,
  updatedAt,
  isSelected,
  inContext,
  folder,
  isPinned,
  onClick,
  onSelect,
  onManage,
  onDelete,
  onTagClick,
  onDuplicate,
  onMove,
  onPin,
  isSelectButtonClicked
}) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenu(false);
    };
    
    if (openMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenu]);

  // Portal-based dropdown component
  const PortalDropdown = ({ isOpen, position, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          backgroundColor: 'white',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 10001,
          minWidth: '200px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderBottom: '1px solid #f1f3f4',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={() => {
            onPin && onPin();
            onClose();
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
        >
          <div style={{ color: isPinned ? '#007bff' : '#000000' }}>
            <Icon source={PinFilledIcon} />
          </div>
          {isPinned ? "Unpin" : "Pin"}
        </div>
        <div
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderBottom: '1px solid #f1f3f4',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={() => {
            onDuplicate && onDuplicate();
            onClose();
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
        >
          <IconCopy size={14} />
          Duplicate to current folder
        </div>
        <div
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderBottom: '1px solid #f1f3f4',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={() => {
            onDuplicate && onDuplicate("different");
            onClose();
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
        >
          <IconCopy size={14} />
          Duplicate to different folder
        </div>
        <div
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={() => {
            onMove && onMove();
            onClose();
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
        >
          <IconFolder size={14} />
          Move to different folder
        </div>
      </div>,
      document.body
    );
  };
  // Determine card state
  let state = "default";
  if (isSelectButtonClicked) state = "select-button-clicked";
  else if (isSelected && inContext) state = "selected-in-context";
  else if (!isSelected && inContext) state = "in-context";
  else if (isSelected && !inContext) state = "selected";
  else if (isPinned) state = "pinned";

  // Get state-specific styles using Polaris colors
  const getCardProps = () => {
    switch (state) {
      case "pinned":
        return {
          bg: "#f0f8ff",
          style: {
            border: "1px solid #007bff",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(0, 123, 255, 0.2)"
          }
        };
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
          bg: "#f6fff9",
          style: {
            border: "1px solid #008060",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(0, 128, 96, 0.2)"
          }
        };
      case "selected":
        return {
          bg: "#f6fff9",
          style: {
            border: "1px solid #008060",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 12px rgba(0, 128, 96, 0.3)"
          }
        };
      case "selected-in-context":
        return {
          bg: "#f6fff9",
          style: {
            border: "1px solid #008060",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 6px 16px rgba(0, 128, 96, 0.4)"
          }
        };
      case "select-button-clicked":
        return {
          bg: "#fffbf8",
          style: {
            border: "1px solid #FF8C00",
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
      case "pinned":
        return "#4A4A4A";
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
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
        }
      }}
      onMouseLeave={(e) => {
        if (state === "default") {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = cardProps.style.boxShadow || "0 1px 3px rgba(0, 0, 0, 0.1)";
        }
      }}
      padding="lg"
      radius="md"
      shadow="sm"
    >
      <Stack gap="md">
        {/* Title and Folder with Pin Indicator */}
        <Group gap="xs" align="center" justify="space-between">
          <Group gap="xs" align="center">
            <Tooltip content={title || "(untitled)"} disabled={!title || title.length <= 19}>
              <Text
                size="lg"
                fw={600}
                c={getTextColor()}
                style={{ lineHeight: 1.2, cursor: title && title.length > 19 ? "help" : "default" }}
              >
                {title && title.length > 19 ? `${title.substring(0, 19)}...` : (title || "(untitled)")}
              </Text>
            </Tooltip>
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
        </Group>

        {/* Content Preview */}
        <Text
          size="sm"
          c={getContentColor()}
          style={{
            lineHeight: 1.5,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 5,
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
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Tag clicked:', tag);
                    onTagClick && onTagClick(tag);
                  }}
                  style={{
                    display: "inline-block",
                    cursor: "pointer"
                  }}
                >
                  <Badge
                    size="sm"
                    variant="light"
                    color="green"
                    style={{
                      backgroundColor: "#E8F5E8",
                      color: "#008060",
                      border: "1px solid #B8E6B8",
                      cursor: "pointer"
                    }}
                  >
                    {tag}
                  </Badge>
                </div>
              ))}
              {tags.length > 3 && (
                <Tooltip content={
                  <div style={{ padding: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {tags.map((tag, idx) => (
                      <div
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Tooltip tag clicked:', tag);
                          onTagClick && onTagClick(tag);
                        }}
                        style={{
                          display: "inline-block",
                          cursor: "pointer"
                        }}
                      >
                        <Badge
                          size="sm"
                          variant="light"
                          color="green"
                          style={{
                            backgroundColor: "#E8F5E8",
                            color: "#008060",
                            border: "1px solid #B8E6B8",
                            cursor: "pointer"
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
              color={isSelectButtonClicked ? "orange" : "gray"}
              onClick={(e) => {
                e.stopPropagation();
                onSelect && onSelect();
              }}
            >
              Select
            </Button>
            <Button
              size="xs"
              variant="light"
              color="orange"
              onClick={(e) => {
                e.stopPropagation();
                const buttonRect = e.currentTarget.getBoundingClientRect();
                
                // Position dropdown directly next to the button
                setDropdownPosition({
                  top: buttonRect.bottom + 4,
                  left: buttonRect.left
                });
                setOpenMenu(!openMenu);
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
      
      {/* Portal Dropdown */}
      <PortalDropdown
        isOpen={openMenu}
        position={dropdownPosition}
        onClose={() => setOpenMenu(false)}
      />
    </Card>
  );
};

export default NoteCard;