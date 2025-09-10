import React from "react";

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

  // Get state-specific styles based on the reference design
  const getStateStyles = () => {
    switch (state) {
      case "default":
        return {
          container: {
            backgroundColor: "#FFFEF7",
            border: "1px solid #E5E5E0",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            transition: "all 0.2s ease",
            cursor: "pointer",
            position: "relative",
            height: "160px",
            padding: "16px",
            display: "flex",
            flexDirection: "column"
          },
          title: {
            color: "#333333",
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "8px",
            lineHeight: "1.2"
          },
          content: {
            color: "#666666",
            fontSize: "12px",
            lineHeight: "1.4",
            flex: "1",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical"
          },
          footer: {
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "8px"
          },
          tags: {
            display: "flex",
            gap: "4px",
            flexWrap: "wrap"
          },
          tag: {
            backgroundColor: "#F5F5F5",
            color: "#666666",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "10px",
            border: "1px solid #E0E0E0"
          },
          dates: {
            color: "#999999",
            fontSize: "10px",
            display: "flex",
            gap: "4px"
          }
        };
      case "in-context":
        return {
          container: {
            backgroundColor: "#FFFEF7",
            border: "1px solid #4A90E2",
            borderRadius: "8px",
            boxShadow: "0 2px 6px rgba(74, 144, 226, 0.2)",
            transition: "all 0.2s ease",
            cursor: "pointer",
            position: "relative",
            height: "160px",
            padding: "16px",
            display: "flex",
            flexDirection: "column"
          },
          title: {
            color: "#2C5AA0",
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "8px",
            lineHeight: "1.2"
          },
          content: {
            color: "#4A4A4A",
            fontSize: "12px",
            lineHeight: "1.4",
            flex: "1",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical"
          },
          footer: {
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "8px"
          },
          tags: {
            display: "flex",
            gap: "4px",
            flexWrap: "wrap"
          },
          tag: {
            backgroundColor: "#E3F2FD",
            color: "#1976D2",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "10px",
            border: "1px solid #BBDEFB"
          },
          dates: {
            color: "#4A90E2",
            fontSize: "10px",
            display: "flex",
            gap: "4px"
          }
        };
      case "selected":
        return {
          container: {
            backgroundColor: "#FFFFFF",
            border: "2px solid #4A90E2",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(74, 144, 226, 0.3)",
            transition: "all 0.2s ease",
            cursor: "pointer",
            position: "relative",
            height: "160px",
            padding: "16px",
            display: "flex",
            flexDirection: "column"
          },
          title: {
            color: "#2C5AA0",
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "8px",
            lineHeight: "1.2"
          },
          content: {
            color: "#4A4A4A",
            fontSize: "12px",
            lineHeight: "1.4",
            flex: "1",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical"
          },
          footer: {
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "8px"
          },
          tags: {
            display: "flex",
            gap: "4px",
            flexWrap: "wrap"
          },
          tag: {
            backgroundColor: "#E3F2FD",
            color: "#1976D2",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "10px",
            border: "1px solid #BBDEFB"
          },
          dates: {
            color: "#4A90E2",
            fontSize: "10px",
            display: "flex",
            gap: "4px"
          }
        };
      case "selected-in-context":
        return {
          container: {
            backgroundColor: "#F0F7FF",
            border: "2px solid #4A90E2",
            borderRadius: "8px",
            boxShadow: "0 6px 16px rgba(74, 144, 226, 0.4)",
            transition: "all 0.2s ease",
            cursor: "pointer",
            position: "relative",
            height: "160px",
            padding: "16px",
            display: "flex",
            flexDirection: "column"
          },
          title: {
            color: "#1A4480",
            fontSize: "14px",
            fontWeight: "700",
            marginBottom: "8px",
            lineHeight: "1.2"
          },
          content: {
            color: "#2C2C2C",
            fontSize: "12px",
            lineHeight: "1.4",
            flex: "1",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical"
          },
          footer: {
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "8px"
          },
          tags: {
            display: "flex",
            gap: "4px",
            flexWrap: "wrap"
          },
          tag: {
            backgroundColor: "#BBDEFB",
            color: "#0D47A1",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "10px",
            border: "1px solid #90CAF9"
          },
          dates: {
            color: "#1A4480",
            fontSize: "10px",
            display: "flex",
            gap: "4px",
            fontWeight: "500"
          }
        };
      default:
        return {};
    }
  };

  const styles = getStateStyles();

  return (
    <div 
      style={styles.container}
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
    >
      {/* Title */}
      <div style={styles.title}>
        {title || "(untitled)"}
      </div>

      {/* Content Preview */}
      <div style={styles.content}>
        {content ? content.replace(/<[^>]*>/g, '').trim() : "Type your note here..."}
      </div>

      {/* Footer with Tags and Dates */}
      <div style={styles.footer}>
        {/* Tags */}
        {tags && tags.length > 0 && (
          <div style={styles.tags}>
            {tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} style={styles.tag}>
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span style={{...styles.tag, color: "#999999"}}>
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Dates */}
        <div style={styles.dates}>
          <span>{createdAt}</span>
          {updatedAt && updatedAt !== createdAt && (
            <>
              <span>•</span>
              <span>{updatedAt}</span>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        position: "absolute",
        top: "8px",
        right: "8px",
        display: "flex",
        gap: "4px",
        opacity: 0,
        transition: "opacity 0.2s ease"
      }}
      onMouseEnter={(e) => {
        e.target.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        e.target.style.opacity = "0";
      }}
      >
        <button
          style={{
            backgroundColor: isSelected ? "#4A90E2" : "#F5F5F5",
            color: isSelected ? "#FFFFFF" : "#666666",
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "10px",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect && onSelect();
          }}
        >
          {isSelected ? "Selected" : "Select"}
        </button>
        <button
          style={{
            backgroundColor: "#F5F5F5",
            color: "#666666",
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "10px",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onClick={(e) => {
            e.stopPropagation();
            onManage && onManage();
          }}
        >
          Manage
        </button>
        <button
          style={{
            backgroundColor: "#FFEBEE",
            color: "#D32F2F",
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "10px",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete && onDelete();
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default NoteCard;