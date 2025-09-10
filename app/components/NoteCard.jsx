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
  // Determine card state
  let state = "default";
  if (isSelected && inContext) state = "selected-in-context";
  else if (!isSelected && inContext) state = "in-context";
  else if (isSelected && !inContext) state = "selected";

  // Base classes for the notepad paper design
  const baseClasses =
    "relative cursor-pointer transition-all duration-200 h-40";

  // Get state-specific styles
  const getStateStyles = () => {
    switch (state) {
      case "default":
        // Not selected and not in context
        return {
          wrapper: "transform hover:scale-[1.02]",
          paper: "bg-[#FFFEF7] border border-[#E5E5E0] shadow-sm hover:shadow-md",
          content: "opacity-70",
          accent: ""
        };
      case "in-context":
        // In context but not selected
        return {
          wrapper: "transform scale-[1.01]",
          paper: "bg-[#FFFEF7] border border-[#4A90E2] border-opacity-50 shadow-md",
          content: "opacity-90",
          accent: "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#4A90E2] before:rounded-l"
        };
      case "selected":
        // Selected but not in context
        return {
          wrapper: "transform scale-[1.03]",
          paper: "bg-white border-2 border-[#4A90E2] shadow-lg",
          content: "opacity-100",
          accent: "ring-2 ring-[#4A90E2] ring-opacity-20"
        };
      case "selected-in-context":
        // Selected and in context
        return {
          wrapper: "transform scale-[1.05]",
          paper: "bg-[#F0F7FF] border-2 border-[#4A90E2] shadow-xl",
          content: "opacity-100",
          accent: "ring-4 ring-[#4A90E2] ring-opacity-30 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#4A90E2] before:rounded-l"
        };
      default:
        return { wrapper: "", paper: "", content: "", accent: "" };
    }
  };

  const styles = getStateStyles();

  return (
    <div className={`${baseClasses} ${styles.wrapper}`} onClick={onClick}>
      <div className={`
        w-full h-full rounded-lg p-4 relative
        ${styles.paper}
        ${styles.accent}
        ${state === 'selected-in-context' ? 'before:z-10' : ''}
      `}>
        {/* Notepad lines effect */}
        <div className="absolute inset-x-4 top-12 bottom-4 pointer-events-none">
          <div className="h-full flex flex-col">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`flex-1 border-b ${
                  state === 'selected-in-context' 
                    ? 'border-blue-100' 
                    : 'border-[#E5E5E0]'
                } ${i === 4 ? 'border-b-0' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className={`relative z-10 h-full flex flex-col ${styles.content}`}>
          {/* Title */}
          <h3 className={`
            font-semibold text-sm mb-2 truncate
            ${state === 'selected-in-context' ? 'text-[#2C5AA0]' : 'text-gray-800'}
          `}>
            {title || "Untitled Note"}
          </h3>

          {/* Content Preview */}
          <p className={`
            text-xs leading-relaxed flex-1 overflow-hidden
            ${state === 'selected-in-context' ? 'text-gray-700' : 'text-gray-600'}
          `}>
            <span className="line-clamp-3">
              {content ? content.replace(/<[^>]*>/g, '').trim() : "No content yet..."}
            </span>
          </p>

          {/* Footer */}
          <div className="mt-auto pt-2 flex items-center justify-between">
            {/* Date */}
            <div className="flex items-center gap-2">
              <span className={`
                text-[10px] font-medium
                ${state === 'selected' || state === 'selected-in-context' 
                  ? 'text-[#4A90E2]' 
                  : 'text-gray-500'}
              `}>
                {createdAt}
              </span>
              {updatedAt && updatedAt !== createdAt && (
                <>
                  <span className="text-gray-400 text-[10px]">•</span>
                  <span className="text-[10px] text-gray-500">
                    edited
                  </span>
                </>
              )}
            </div>

            {/* Selection indicator */}
            {(state === 'selected' || state === 'selected-in-context') && (
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-[#4A90E2] animate-pulse" />
              </div>
            )}
          </div>

          {/* Tags - positioned absolutely at bottom if present */}
          {tags && tags.length > 0 && (
            <div className="absolute bottom-2 left-4 right-4 flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className={`
                    px-2 py-0.5 text-[9px] rounded-full font-medium
                    ${state === 'selected-in-context' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600'}
                  `}
                >
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="px-2 py-0.5 text-[9px] text-gray-500">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Paper corner effect for selected states */}
        {(state === 'selected' || state === 'selected-in-context') && (
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-l-[20px] border-t-[#4A90E2] border-l-transparent opacity-20" />
        )}
      </div>
    </div>
  );
};

export default NoteCard;