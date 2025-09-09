import React from "react";

const NoteCard = ({
  title,
  content,
  tags,
  createdAt,
  updatedAt,
  isSelected,
  inContext,
  onClick
}) => {
  // Compute which state we're in
  let state = "default";
  if (isSelected && inContext) state = "selected-in-context";
  else if (!isSelected && inContext) state = "in-context";
  else if (isSelected && !inContext) state = "selected";
  else state = "default";

  // Base styles for all cards
  const baseStyles = {
    borderRadius: "8px",
    padding: "12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginBottom: "8px",
    minHeight: "100px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    border: "1px solid",
    fontFamily: "system-ui, -apple-system, sans-serif"
  };

  // State-specific styles
  const stateStyles = {
    "default": {
      backgroundColor: "#FFFFFF",
      borderColor: "#E5E7EB",
      color: "#111827"
    },
    "in-context": {
      backgroundColor: "#F0F9FF",
      borderColor: "#BAE6FD",
      color: "#111827"
    },
    "selected-in-context": {
      backgroundColor: "#008060",
      borderColor: "#008060",
      color: "#FFFFFF"
    },
    "selected": {
      backgroundColor: "#F0FDF4",
      borderColor: "#008060",
      color: "#111827"
    }
  };

  const cardStyle = { ...baseStyles, ...stateStyles[state] };

  return (
    <div style={cardStyle} onClick={onClick}>
      {/* Title */}
      <div style={{
        fontSize: "14px",
        fontWeight: "500",
        color: state === "selected-in-context" ? "#FFFFFF" : "#111827",
        marginBottom: "4px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }}>
        {title || "(untitled)"}
      </div>

      {/* Content Preview */}
      <div style={{
        fontSize: "12px",
        lineHeight: "1.4",
        color: state === "selected-in-context" ? "#E5E7EB" : "#6B7280",
        marginBottom: "8px",
        flex: "1",
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical"
      }}>
        {content ? content.replace(/<[^>]*>/g, '').substring(0, 80) + "..." : "No content"}
      </div>

      {/* Bottom Row: Tags (left) and Dates (right) */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end"
      }}>
        {/* Tags */}
        {tags && tags.length > 0 && (
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                style={{
                  padding: "2px 6px",
                  fontSize: "10px",
                  fontWeight: "400",
                  borderRadius: "12px",
                  backgroundColor: state === "selected-in-context" ? "#FFFFFF" : "#F3F4F6",
                  color: state === "selected-in-context" ? "#008060" : "#6B7280"
                }}
              >
                {tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span
                style={{
                  padding: "2px 6px",
                  fontSize: "10px",
                  fontWeight: "500",
                  borderRadius: "12px",
                  backgroundColor: state === "selected-in-context" ? "#006B47" : "#9CA3AF",
                  color: "#FFFFFF"
                }}
              >
                +{tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Dates */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          textAlign: "right"
        }}>
          <div style={{
            fontSize: "10px",
            color: state === "selected-in-context" ? "#E5E7EB" : "#9CA3AF",
            lineHeight: "1.2"
          }}>
            {createdAt}
          </div>
          {updatedAt && (
            <div style={{
              fontSize: "10px",
              color: state === "selected-in-context" ? "#E5E7EB" : "#9CA3AF",
              lineHeight: "1.2"
            }}>
              {updatedAt}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteCard;