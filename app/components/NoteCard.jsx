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
    borderRadius: "6px",
    padding: "10px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginBottom: "6px",
    minHeight: "85px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    border: "1px solid",
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
  };

  // State-specific styles
  const stateStyles = {
    "default": {
      backgroundColor: "#FFFFFF",
      borderColor: "#D1D5DB",
      color: "#111827"
    },
    "in-context": {
      backgroundColor: "#EFF6FF",
      borderColor: "#93C5FD",
      color: "#111827"
    },
    "selected-in-context": {
      backgroundColor: "#059669",
      borderColor: "#059669",
      color: "#FFFFFF",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
    },
    "selected": {
      backgroundColor: "#ECFDF5",
      borderColor: "#059669",
      color: "#111827"
    }
  };

  const cardStyle = { ...baseStyles, ...stateStyles[state] };

  return (
    <div style={cardStyle} onClick={onClick}>
      {/* Title */}
      <div style={{
        fontSize: "13px",
        fontWeight: "600",
        color: state === "selected-in-context" ? "#FFFFFF" : "#1F2937",
        marginBottom: "3px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        lineHeight: "1.2"
      }}>
        {title || "(untitled)"}
      </div>

      {/* Content Preview */}
      <div style={{
        fontSize: "11px",
        lineHeight: "1.3",
        color: state === "selected-in-context" ? "#D1D5DB" : "#6B7280",
        marginBottom: "6px",
        flex: "1",
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical"
      }}>
        {content ? content.replace(/<[^>]*>/g, '').substring(0, 70) + "..." : "No content"}
      </div>

      {/* Bottom Row: Tags (left) and Dates (right) */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end"
      }}>
        {/* Tags */}
        {tags && tags.length > 0 && (
          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
            {tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                style={{
                  padding: "1px 5px",
                  fontSize: "9px",
                  fontWeight: "500",
                  borderRadius: "10px",
                  backgroundColor: state === "selected-in-context" ? "#FFFFFF" : "#F3F4F6",
                  color: state === "selected-in-context" ? "#059669" : "#6B7280",
                  border: state === "selected-in-context" ? "1px solid #059669" : "none"
                }}
              >
                {tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span
                style={{
                  padding: "1px 5px",
                  fontSize: "9px",
                  fontWeight: "600",
                  borderRadius: "10px",
                  backgroundColor: state === "selected-in-context" ? "#047857" : "#9CA3AF",
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
          textAlign: "right",
          gap: "1px"
        }}>
          <div style={{
            fontSize: "9px",
            color: state === "selected-in-context" ? "#D1D5DB" : "#9CA3AF",
            lineHeight: "1.1",
            fontWeight: "400"
          }}>
            {createdAt}
          </div>
          {updatedAt && (
            <div style={{
              fontSize: "9px",
              color: state === "selected-in-context" ? "#D1D5DB" : "#9CA3AF",
              lineHeight: "1.1",
              fontWeight: "400"
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