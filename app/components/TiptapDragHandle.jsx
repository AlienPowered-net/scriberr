import React, { useEffect, useRef, useState } from 'react';
import { NodeSelection } from '@tiptap/pm/state';

const TiptapDragHandle = ({ editor }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const dragHandleRef = useRef(null);
  const draggedNodeInfo = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;
    editorRef.current = editorElement;

    // Show drag handle when editor is focused
    const handleFocus = () => {
      const pos = editor.state.selection.from;
      if (pos !== null) {
        updateDragHandle(pos);
      }
    };

    const handleSelectionUpdate = () => {
      const pos = editor.state.selection.from;
      if (pos !== null) {
        updateDragHandle(pos);
      }
    };

    const updateDragHandle = (pos) => {
      if (!pos) {
        setVisible(false);
        return;
      }

      const $pos = editor.state.doc.resolve(pos);
      
      // Find the nearest block node
      let depth = $pos.depth;
      while (depth > 0 && $pos.node(depth).isInline) {
        depth -= 1;
      }

      const node = $pos.node(depth);
      if (!node || node.isInline) {
        setVisible(false);
        return;
      }

      // Get the position of the block
      const blockPos = depth > 0 ? $pos.before(depth) : 0;
      const coords = editor.view.coordsAtPos(blockPos);
      const editorRect = editorElement.getBoundingClientRect();

      // Calculate proper alignment with text baseline
      const lineHeight = coords.bottom - coords.top;
      const textBaselineOffset = lineHeight * 0.2; // Better alignment with text baseline
      
      setPosition({
        top: coords.top - editorRect.top + textBaselineOffset,
        left: -60 // Position outside the editor content area, accounting for editor padding
      });
      setVisible(true);

      // Store node info for dragging
      draggedNodeInfo.current = {
        node,
        pos: blockPos,
        depth,
        size: node.nodeSize
      };
    };

    const handleMouseMove = (event) => {
      const pos = editor.view.posAtCoords({
        left: event.clientX,
        top: event.clientY
      });

      if (pos) {
        updateDragHandle(pos.pos);
        setHoveredNode(pos.pos);
      } else {
        setVisible(false);
        setHoveredNode(null);
      }
    };

    const handleMouseEnter = () => {
      // Show drag handle when entering editor area
      const pos = editor.state.selection.from;
      if (pos !== null) {
        updateDragHandle(pos);
      }
    };

    const handleMouseLeave = () => {
      setVisible(false);
      setHoveredNode(null);
    };

    // Add event listeners
    editorElement.addEventListener('mousemove', handleMouseMove);
    editorElement.addEventListener('mouseleave', handleMouseLeave);
    editorElement.addEventListener('mouseenter', handleMouseEnter);
    editorElement.addEventListener('focus', handleFocus);
    
    // Listen for selection changes
    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editorElement.removeEventListener('mousemove', handleMouseMove);
      editorElement.removeEventListener('mouseleave', handleMouseLeave);
      editorElement.removeEventListener('mouseenter', handleMouseEnter);
      editorElement.removeEventListener('focus', handleFocus);
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor]);

  const handleDragStart = (e) => {
    if (!draggedNodeInfo.current || !editor) return;
    
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
    
    // Create a drag image
    const dragImage = document.createElement('div');
    dragImage.textContent = draggedNodeInfo.current.node.textContent || 'Block';
    dragImage.style.position = 'absolute';
    dragImage.style.left = '-1000px';
    dragImage.style.padding = '8px';
    dragImage.style.background = '#f0f0f0';
    dragImage.style.borderRadius = '4px';
    dragImage.style.maxWidth = '200px';
    dragImage.style.overflow = 'hidden';
    dragImage.style.textOverflow = 'ellipsis';
    dragImage.style.whiteSpace = 'nowrap';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedNodeInfo.current || !editor) return;

    const { clientY } = e;
    const pos = editor.view.posAtCoords({ left: e.clientX, top: clientY });
    
    if (!pos) return;

    const $pos = editor.state.doc.resolve(pos.pos);
    let dropPos = pos.pos;

    // Find the position before the block at drop location
    if ($pos.parent.isTextblock) {
      dropPos = $pos.before($pos.depth);
    }

    const { pos: dragPos, size } = draggedNodeInfo.current;

    // Don't drop on itself
    if (dropPos > dragPos && dropPos < dragPos + size) return;

    // Perform the move
    editor.chain()
      .focus()
      .command(({ tr }) => {
        const node = tr.doc.nodeAt(dragPos);
        if (!node) return false;

        // Delete the original node
        tr.delete(dragPos, dragPos + size);

        // Adjust drop position if it's after the deleted content
        const adjustedDropPos = dropPos > dragPos ? dropPos - size : dropPos;

        // Insert at new position
        tr.insert(adjustedDropPos, node);

        return true;
      })
      .run();

    setIsDragging(false);
  };

  useEffect(() => {
    if (!editor) return;

    const editorDom = editor.view.dom;
    
    const handleDragOver = (e) => {
      if (isDragging) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    };

    editorDom.addEventListener('dragover', handleDragOver);
    editorDom.addEventListener('drop', handleDrop);

    return () => {
      editorDom.removeEventListener('dragover', handleDragOver);
      editorDom.removeEventListener('drop', handleDrop);
    };
  }, [editor, isDragging]);

  if (!visible || !editor) return null;

  return (
    <div
      ref={dragHandleRef}
      className="tiptap-drag-handle"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: 1, // Always visible when rendered
        background: 'transparent',
        borderRadius: '4px',
        transition: 'all 0.15s ease',
        zIndex: 1000, // Higher z-index to ensure visibility
        transform: 'translateY(-50%)',
        pointerEvents: 'auto',
      }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
        }
      }}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        style={{ 
          color: '#9ca3af',
          transition: 'color 0.15s ease'
        }}
      >
        <circle cx="9" cy="5" r="1"></circle>
        <circle cx="9" cy="12" r="1"></circle>
        <circle cx="9" cy="19" r="1"></circle>
        <circle cx="15" cy="5" r="1"></circle>
        <circle cx="15" cy="12" r="1"></circle>
        <circle cx="15" cy="19" r="1"></circle>
      </svg>
    </div>
  );
};

export default TiptapDragHandle;