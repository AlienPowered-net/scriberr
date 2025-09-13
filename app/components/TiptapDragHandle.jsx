import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@shopify/polaris';
import { DragHandleIcon } from '@shopify/polaris-icons';

const TiptapDragHandle = ({ editor }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [draggedNode, setDraggedNode] = useState(null);
  const handleRef = useRef(null);
  const dragStartPosRef = useRef(null);

  useEffect(() => {
    if (!editor) return;

    const updateDragHandle = () => {
      const { from, to } = editor.state.selection;
      
      // Check if we're in a block-level node
      const $from = editor.state.doc.resolve(from);
      const node = $from.node($from.depth);
      
      // Show drag handle for block-level nodes (paragraphs, headings, lists, etc.)
      const blockTypes = ['paragraph', 'heading', 'bulletList', 'orderedList', 'taskList', 'blockquote', 'codeBlock', 'horizontalRule', 'table'];
      
      // Walk up the node tree to find a block-level node
      let blockNode = null;
      let blockDepth = $from.depth;
      
      for (let depth = $from.depth; depth >= 0; depth--) {
        const currentNode = $from.node(depth);
        if (blockTypes.includes(currentNode.type.name)) {
          blockNode = currentNode;
          blockDepth = depth;
          break;
        }
      }
      
      if (blockNode && from === to) { // Only show when cursor is in the node, not when text is selected
        try {
          const pos = $from.before(blockDepth);
          const coords = editor.view.coordsAtPos(pos);
          const editorRect = editor.view.dom.getBoundingClientRect();
          
          setPosition({
            top: coords.top - editorRect.top,
            left: editorRect.left - 40 // Position to the left of the content
          });
          setVisible(true);
        } catch (error) {
          console.error('Error positioning drag handle:', error);
          setVisible(false);
        }
      } else {
        setVisible(false);
      }
    };

    // Update on selection change
    editor.on('selectionUpdate', updateDragHandle);
    editor.on('update', updateDragHandle);
    
    // Initial update
    updateDragHandle();

    return () => {
      editor.off('selectionUpdate', updateDragHandle);
      editor.off('update', updateDragHandle);
    };
  }, [editor]);

  const handleDragStart = (e) => {
    if (!editor) return;
    
    const { from } = editor.state.selection;
    const $from = editor.state.doc.resolve(from);
    
    // Find the block-level node
    const blockTypes = ['paragraph', 'heading', 'bulletList', 'orderedList', 'taskList', 'blockquote', 'codeBlock', 'horizontalRule', 'table'];
    let blockNode = null;
    let blockDepth = $from.depth;
    
    for (let depth = $from.depth; depth >= 0; depth--) {
      const currentNode = $from.node(depth);
      if (blockTypes.includes(currentNode.type.name)) {
        blockNode = currentNode;
        blockDepth = depth;
        break;
      }
    }
    
    if (!blockNode) return;
    
    const nodeStart = $from.before(blockDepth);
    const nodeEnd = nodeStart + blockNode.nodeSize;
    
    // Store the dragged node info
    setDraggedNode({
      node: blockNode,
      from: nodeStart,
      to: nodeEnd,
      content: editor.state.doc.slice(nodeStart, nodeEnd)
    });
    
    // Store drag start position
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    
    // Add drag image
    const dragImage = document.createElement('div');
    dragImage.style.position = 'absolute';
    dragImage.style.left = '-9999px';
    dragImage.style.background = '#f0f0f0';
    dragImage.style.padding = '8px';
    dragImage.style.borderRadius = '4px';
    dragImage.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    dragImage.textContent = blockNode.textContent.slice(0, 50) + (blockNode.textContent.length > 50 ? '...' : '');
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
  };

  const handleDragEnd = (e) => {
    setDraggedNode(null);
    dragStartPosRef.current = null;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    
    if (!editor || !draggedNode) return;
    
    // Get the position where we're dropping
    const { clientX, clientY } = e;
    const pos = editor.view.posAtCoords({ left: clientX, top: clientY });
    
    if (!pos) return;
    
    const $pos = editor.state.doc.resolve(pos.pos);
    const dropPos = $pos.before($pos.depth);
    
    // Don't drop on itself
    if (dropPos >= draggedNode.from && dropPos <= draggedNode.to) return;
    
    // Perform the move
    editor.chain()
      .focus()
      .deleteRange({ from: draggedNode.from, to: draggedNode.to })
      .insertContentAt(dropPos < draggedNode.from ? dropPos : dropPos - draggedNode.node.nodeSize, draggedNode.content.content)
      .run();
    
    setDraggedNode(null);
  };

  // Add drag over handler to editor
  useEffect(() => {
    if (!editor) return;
    
    const editorDom = editor.view.dom;
    editorDom.addEventListener('dragover', handleDragOver);
    editorDom.addEventListener('drop', handleDrop);
    
    return () => {
      editorDom.removeEventListener('dragover', handleDragOver);
      editorDom.removeEventListener('drop', handleDrop);
    };
  }, [editor, draggedNode]);

  if (!visible) return null;

  return (
    <div
      ref={handleRef}
      className="tiptap-drag-handle"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        cursor: 'grab',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        background: 'transparent',
        transition: 'background 0.2s ease',
        zIndex: 100,
      }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f0f0f0';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon source={DragHandleIcon} tone="subdued" />
    </div>
  );
};

export default TiptapDragHandle;