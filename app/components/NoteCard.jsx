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

  const baseClasses = "rounded-lg p-3 transition-all cursor-pointer flex flex-col justify-between min-h-[90px] mb-1";

  const stateClasses = {
    "default": "bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm",
    "in-context": "bg-blue-50 border border-blue-200 hover:border-blue-300 hover:shadow-sm",
    "selected-in-context": "bg-green-600 border border-green-600 text-white shadow-md",
    "selected": "bg-green-50 border border-green-500 hover:border-green-600 hover:shadow-sm",
  };

  return (
    <div className={`${baseClasses} ${stateClasses[state]}`} onClick={onClick}>
      {/* Title */}
      <h3 className={`font-medium text-sm truncate mb-1 ${
        state === "selected-in-context" ? "text-white" : "text-gray-900"
      }`}>
        {title || "(untitled)"}
      </h3>

      {/* Content Preview */}
      <p className={`text-xs leading-relaxed flex-1 mb-2 ${
        state === "selected-in-context" ? "text-gray-200" : "text-gray-600"
      }`}>
        {content ? content.replace(/<[^>]*>/g, '').substring(0, 80) + "..." : "No content"}
      </p>

      {/* Bottom Row: Tags (left) and Dates (right) */}
      <div className="flex justify-between items-end">
        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className={`px-2 py-0.5 text-[10px] font-normal rounded-full ${
                  state === "selected-in-context"
                    ? "bg-white text-green-600"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span
                className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                  state === "selected-in-context"
                    ? "bg-green-500 text-white"
                    : "bg-gray-400 text-white"
                }`}
              >
                +{tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="flex flex-col items-end text-right">
          <div className={`text-[10px] ${
            state === "selected-in-context" ? "text-gray-200" : "text-gray-500"
          }`}>
            {createdAt}
          </div>
          {updatedAt && (
            <div className={`text-[10px] ${
              state === "selected-in-context" ? "text-gray-200" : "text-gray-500"
            }`}>
              {updatedAt}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteCard;