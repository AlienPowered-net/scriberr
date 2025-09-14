import React, { useEffect, useRef, useState } from 'react';
import { NodeSelection } from '@tiptap/pm/state';

const TiptapDragHandle = ({ editor }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragHandleRef = useRef(null);
  const draggedNodeInfo = useRef(null);

  useEffect(() => {
    if (!editor) return;

    const updateDragHandle = () => {
      const { from, to, $from } = editor.state.selection;
      
      // Only show for cursor selections (not text selections)
      if (from !== to) {
        setVisible(false);
        return;
      }

      // Find the nearest block node
      let depth = $from.depth;
      while (depth > 0 && $from.node(depth).isInline) {
        depth -= 1;
      }

      const node = $from.node(depth);
      if (!node || node.isInline) {
        setVisible(false);
        return;
      }

      // Get the position of the block
      const pos = depth > 0 ? $from.before(depth) : 0;
      const coords = editor.view.coordsAtPos(pos);
      const editorRect = editor.view.dom.getBoundingClientRect();

      setPosition({
        top: coords.top - editorRect.top,
        left: 16 // Position inside the editor with some padding
      });
      setVisible(true);

      // Store node info for dragging
      draggedNodeInfo.current = {
        node,
        pos,
        depth,
        size: node.nodeSize
      };
    };

    editor.on('selectionUpdate', updateDragHandle);
    editor.on('update', updateDragHandle);

    return () => {
      editor.off('selectionUpdate', updateDragHandle);
      editor.off('update', updateDragHandle);
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
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        background: 'transparent',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
        zIndex: 10,
      }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.08)';
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        style={{ color: '#6b7280' }}
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