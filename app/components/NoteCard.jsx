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

  const baseClasses =
    "rounded-lg p-3 shadow-sm transition-all cursor-pointer flex flex-col justify-between h-32";

  const stateClasses = {
    default: "bg-white border border-gray-200 hover:border-gray-300",
    "in-context": "bg-gray-50 border border-blue-200 hover:border-blue-300",
    selected: "bg-white border-2 border-blue-500 shadow-md",
    "selected-in-context": "bg-blue-50 border-2 border-blue-500 shadow-md",
  };

  return (
    <div className={`${baseClasses} ${stateClasses[state]}`} onClick={onClick}>
      {/* Title */}
      <h3 className="font-medium text-xs text-gray-800 truncate">
        {title || "(untitled)"}
      </h3>

      {/* Content Preview */}
      <p className="text-[11px] text-gray-600 mt-1 line-clamp-3 flex-1">
        {content ? content.replace(/<[^>]*>/g, '') : "Type your note here..."}
      </p>

      <div className="mt-2 flex items-end justify-between">
        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Created/Edited fields as badges */}
        <div className="flex gap-1">
          <span className="px-1.5 py-0.5 text-[10px] bg-gray-50 text-gray-400 rounded-md">
            Created {createdAt}
          </span>
          {updatedAt && (
            <span className="px-1.5 py-0.5 text-[10px] bg-gray-50 text-gray-400 rounded-md">
              Edited {updatedAt}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteCard;