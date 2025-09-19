import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragHandleIcon } from '@shopify/polaris-icons';

const DraggableFolder = ({ 
  folder, 
  children, 
  isDragging = false,
  onFolderClick,
  selectedFolder,
  openFolderMenu,
  setOpenFolderMenu,
  ...props 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isCurrentlyDragging,
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isCurrentlyDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-folder-id={folder.id}
      {...props}
    >
      <div style={{ 
        padding: "12px 16px", 
        marginBottom: "8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: selectedFolder === folder.id ? "#f6fff8" : "#F8F9FA",
        border: selectedFolder === folder.id ? "2px solid #008060" : "2px solid #E1E3E5",
        borderRadius: "8px",
        position: "relative",
        transition: "all 0.2s ease",
        boxShadow: selectedFolder === folder.id ? "0 2px 8px rgba(10, 0, 0, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.05)"
      }}>
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: isCurrentlyDragging ? 'grabbing' : 'grab',
            padding: '4px',
            marginRight: '8px',
            display: 'flex',
            alignItems: 'center',
            color: '#666'
          }}
          title="Drag to reorder"
        >
          <DragHandleIcon style={{ width: '16px', height: '16px' }} />
        </div>
        
        {/* Clickable Folder Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer"
          }}
          onClick={() => onFolderClick(folder.id)}
          onMouseEnter={(e) => {
            if (selectedFolder !== folder.id) {
              e.currentTarget.parentElement.style.backgroundColor = "#f6fff8";
              e.currentTarget.parentElement.style.borderColor = "#008060";
              e.currentTarget.parentElement.style.boxShadow = "0 2px 8px rgba(10, 0, 0, 0.1)";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedFolder !== folder.id) {
              e.currentTarget.parentElement.style.backgroundColor = "#F8F9FA";
              e.currentTarget.parentElement.style.borderColor = "#E1E3E5";
              e.currentTarget.parentElement.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
            }
          }}
        >
          <span style={{ 
            fontWeight: "700", 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            color: selectedFolder === folder.id ? "#008060" : "#374151",
            fontSize: "14px"
          }}>
            <i className={`far fa-${folder.icon || 'folder'}`} style={{ 
              fontSize: "18px", 
              color: selectedFolder === folder.id ? "#008060" : (folder.iconColor || "#f57c00") 
            }}></i>
            {folder.name}
          </span>
          
          <div className="folder-menu-container" style={{ position: "relative", paddingRight: "8px" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenFolderMenu(openFolderMenu === folder.id ? null : folder.id);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                fontSize: "16px"
              }}
            >
              ⋯
            </button>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraggableFolder;