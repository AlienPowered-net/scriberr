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

  // Get state-specific styles based on folder colors and Polaris color system
  const getStateStyles = () => {
    switch (state) {
      case "default":
        return {
          container: {
            backgroundColor: "#f8f9fa", // Updated background color
            border: "1px solid #D1D3D4", // Same as folder border
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
            color: "#202223", // Same as folder text
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "8px",
            lineHeight: "1.2"
          },
          content: {
            color: "#6D7175", // Same as folder secondary text
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
            backgroundColor: "#f8f9fa",
            color: "#6D7175",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "10px",
            border: "1px solid #D1D3D4",
            boxShadow: "none"
          },
          dates: {
            color: "#8C9196",
            fontSize: "10px",
            display: "flex",
            gap: "4px"
          }
        };
      case "in-context":
        return {
          container: {
            backgroundColor: "#f8f9fa", // Updated background color
            border: "1px solid #008060", // Success green border
            borderRadius: "8px",
            boxShadow: "0 2px 6px rgba(0, 128, 96, 0.2)",
            transition: "all 0.2s ease",
            cursor: "pointer",
            position: "relative",
            height: "160px",
            padding: "16px",
            display: "flex",
            flexDirection: "column"
          },
          title: {
            color: "#008060", // Success green
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
            backgroundColor: "#E8F5E8",
            color: "#008060",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "10px",
            border: "1px solid #B8E6B8",
            boxShadow: "none"
          },
          dates: {
            color: "#008060",
            fontSize: "10px",
            display: "flex",
            gap: "4px"
          }
        };
      case "selected":
        return {
          container: {
            backgroundColor: "#FFFFFF",
            border: "2px solid #008060", // Success green border
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 128, 96, 0.3)",
            transition: "all 0.2s ease",
            cursor: "pointer",
            position: "relative",
            height: "160px",
            padding: "16px",
            display: "flex",
            flexDirection: "column"
          },
          title: {
            color: "#008060", // Success green
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
            backgroundColor: "#E8F5E8",
            color: "#008060",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "10px",
            border: "1px solid #B8E6B8",
            boxShadow: "none"
          },
          dates: {
            color: "#008060",
            fontSize: "10px",
            display: "flex",
            gap: "4px"
          }
        };
      case "selected-in-context":
        return {
          container: {
            backgroundColor: "#E8F5E8", // Light success green background
            border: "2px solid #008060", // Success green border
            borderRadius: "8px",
            boxShadow: "0 6px 16px rgba(0, 128, 96, 0.4)",
            transition: "all 0.2s ease",
            cursor: "pointer",
            position: "relative",
            height: "160px",
            padding: "16px",
            display: "flex",
            flexDirection: "column"
          },
          title: {
            color: "#004C3F", // Dark success green
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
            backgroundColor: "#B8E6B8",
            color: "#004C3F",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "10px",
            border: "1px solid #8DD88D",
            boxShadow: "none"
          },
          dates: {
            color: "#004C3F",
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

      {/* Dates - Top Right Corner */}
      <div style={{
        position: "absolute",
        top: "8px",
        right: "8px",
        ...styles.dates
      }}>
        <span>{createdAt}</span>
        {updatedAt && updatedAt !== createdAt && (
          <>
            <span>•</span>
            <span>{updatedAt}</span>
          </>
        )}
      </div>

      {/* Footer with Tags and Action Buttons */}
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

        {/* Action Buttons - Bottom Right Corner */}
        <div style={{
          display: "flex",
          gap: "4px"
        }}>
          <button
            style={{
              backgroundColor: isSelected ? "#FFC453" : "#F5F5F5", // Warning orange when selected
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
    </div>
  );
};

export default NoteCard;