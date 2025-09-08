import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

  const [isDragMode, setIsDragMode] = useState(false);
  const dragTimeoutRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isCurrentlyDragging ? 0.5 : 1,
  };

  const handleMouseDown = (e) => {
    // Don't start drag if clicking on menu button
    if (e.target.closest('.folder-menu-container')) {
      return;
    }
    
    startPosRef.current = { x: e.clientX, y: e.clientY };
    
    // Start drag after 200ms of holding down
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragMode(true);
    }, 200);
  };

  const handleMouseUp = () => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    setIsDragMode(false);
  };

  const handleMouseMove = (e) => {
    if (!dragTimeoutRef.current) return;
    
    const deltaX = Math.abs(e.clientX - startPosRef.current.x);
    const deltaY = Math.abs(e.clientY - startPosRef.current.y);
    
    // If mouse moved more than 5px, cancel drag activation
    if (deltaX > 5 || deltaY > 5) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...props}
    >
      <div 
        {...(isDragMode ? { ...attributes, ...listeners } : {})}
        style={{ 
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
          boxShadow: selectedFolder === folder.id ? "0 2px 8px rgba(10, 0, 0, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.05)",
          cursor: isCurrentlyDragging ? 'grabbing' : (isDragMode ? 'grabbing' : 'pointer')
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
        title="Click to select, hold to drag"
      >
        {/* Drag Handle */}
        <div
          style={{
            padding: '4px',
            marginRight: '8px',
            display: 'flex',
            alignItems: 'center',
            color: '#666',
            pointerEvents: 'none'
          }}
        >
          ⋮⋮
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
          onClick={(e) => {
            // Only handle click if not in drag mode
            if (!isDragMode) {
              e.stopPropagation();
              onFolderClick(folder.id);
            }
          }}
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