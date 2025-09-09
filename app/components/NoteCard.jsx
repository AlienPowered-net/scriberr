import React from "react";

const NoteCard = ({
  title,
  content,
  tags,
  isSelected,
  inContext,
  folder,
  createdDate,
  updatedDate,
  onClick
}) => {
  // Compute which state we're in
  let state = "default";
  if (isSelected && inContext) state = "selected-in-context";
  else if (!isSelected && inContext) state = "in-context";
  else if (isSelected && !inContext) state = "selected";
  else state = "default";

  const baseClasses = "rounded-lg p-3 transition-all cursor-pointer flex flex-col justify-between min-h-[120px]";

  const stateClasses = {
    "default": "bg-white border border-gray-200 hover:border-gray-300",
    "in-context": "bg-blue-50 border border-blue-200 hover:border-blue-300",
    "selected-in-context": "bg-green-600 border border-green-600 text-white",
    "selected": "bg-green-50 border border-green-600",
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className={`${baseClasses} ${stateClasses[state]}`} onClick={onClick}>
      {/* Header Section */}
      <div className="flex-1">
        {/* Title and Folder */}
        <div className="mb-2">
          <h3 className={`font-semibold text-sm truncate ${
            state === "selected-in-context" ? "text-white" : "text-gray-800"
          }`}>
            {title || "(untitled)"}
          </h3>
          <p className={`text-xs ${
            state === "selected-in-context" ? "text-gray-200" : "text-gray-500"
          }`}>
            {folder || "No folder"}
          </p>
        </div>

        {/* Content and Dates Row */}
        <div className="flex justify-between items-end">
          {/* Content Preview */}
          <div className="flex-1 mr-3">
            <p className={`text-xs line-clamp-2 ${
              state === "selected-in-context" ? "text-gray-200" : "text-gray-600"
            }`}>
              {content ? content.replace(/<[^>]*>/g, '').substring(0, 80) + "..." : "No content"}
            </p>
          </div>

          {/* Dates */}
          <div className="flex flex-col gap-1">
            {/* Created Date */}
            <div className={`text-center px-2 py-1 rounded text-[8px] font-medium ${
              state === "selected-in-context" 
                ? "bg-white text-green-600" 
                : "bg-gray-100 text-gray-600"
            }`}>
              <div className="uppercase">Created</div>
              <div className="text-[10px] font-semibold">{createdDate?.getDate()}</div>
              <div className="text-[8px] uppercase">{monthNames[createdDate?.getMonth()]}</div>
            </div>

            {/* Updated Date */}
            <div className={`text-center px-2 py-1 rounded text-[8px] font-medium ${
              state === "selected-in-context" 
                ? "bg-white text-green-600" 
                : "bg-gray-100 text-gray-600"
            }`}>
              <div className="uppercase">Edited</div>
              <div className="text-[10px] font-semibold">{updatedDate?.getDate()}</div>
              <div className="text-[8px] uppercase">{monthNames[updatedDate?.getMonth()]}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tags Section */}
      {tags && tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 text-[9px] font-medium rounded-full ${
                state === "selected-in-context"
                  ? "bg-white text-green-600 border border-green-600"
                  : "bg-green-50 text-green-600 border border-green-600"
              }`}
            >
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span
              className={`px-2 py-0.5 text-[9px] font-semibold rounded-full ${
                state === "selected-in-context"
                  ? "bg-green-600 text-white"
                  : "bg-gray-500 text-white"
              }`}
            >
              +{tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default NoteCard;