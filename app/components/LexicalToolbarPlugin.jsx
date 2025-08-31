import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, UNDO_COMMAND, REDO_COMMAND } from 'lexical';
import { $getSelection, $isRangeSelection, $isElementNode } from 'lexical';
import { useState, useEffect } from 'react';

function LexicalToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [elementFormat, setElementFormat] = useState('paragraph');

  const updateToolbar = () => {
    try {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        setIsBold(selection.hasFormat('bold'));
        setIsItalic(selection.hasFormat('italic'));
        setIsUnderline(selection.hasFormat('underline'));
        
        // Get the parent element format - use proper Lexical API
        const anchor = selection.anchor;
        const anchorNode = anchor.getNode();
        const element = anchorNode.getParent();
        
        if ($isElementNode(element)) {
          // Use getType() instead of getTag() for element type
          const elementType = element.getType();
          setElementFormat(elementType);
        } else {
          setElementFormat('paragraph');
        }
      }
    } catch (error) {
      console.warn('Error updating toolbar:', error);
      // Set default values on error
      setElementFormat('paragraph');
    }
  };

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor]);

  const formatText = (format) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatElement = (format) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format);
  };

  const handleUndo = () => {
    editor.dispatchCommand(UNDO_COMMAND);
  };

  const handleRedo = () => {
    editor.dispatchCommand(REDO_COMMAND);
  };

  // Debug function to test if commands are being dispatched
  const testCommand = (command, format) => {
    console.log(`Dispatching ${command.name || command} with format: ${format}`);
    editor.dispatchCommand(command, format);
  };

  return (
    <div className="toolbar" style={{
      borderBottom: '1px solid #c9cccf',
      padding: '8px 12px',
      backgroundColor: '#f6f6f7',
      borderTopLeftRadius: '4px',
      borderTopRightRadius: '4px',
      display: 'flex',
      gap: '4px',
      flexWrap: 'wrap'
    }}>
      {/* Debug Info */}
      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', width: '100%' }}>
        Format: {elementFormat} | Bold: {isBold ? 'Y' : 'N'} | Italic: {isItalic ? 'Y' : 'N'} | Underline: {isUnderline ? 'Y' : 'N'}
      </div>

      {/* Undo/Redo */}
      <button
        onClick={handleUndo}
        style={{
          padding: '6px 8px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          backgroundColor: 'white',
          color: '#333',
          cursor: 'pointer',
          fontSize: '12px'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'white';
        }}
      >
        ↶
      </button>
      
      <button
        onClick={handleRedo}
        style={{
          padding: '6px 8px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          backgroundColor: 'white',
          color: '#333',
          cursor: 'pointer',
          fontSize: '12px'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'white';
        }}
      >
        ↷
      </button>

      {/* Separator */}
      <div style={{ width: '1px', backgroundColor: '#c9cccf', margin: '0 4px' }} />

      {/* Text Formatting */}
      <button
        onClick={() => testCommand(FORMAT_TEXT_COMMAND, 'bold')}
        className={`toolbar-item ${isBold ? 'active' : ''}`}
        style={{
          padding: '6px 8px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          backgroundColor: isBold ? '#007cba' : 'white',
          color: isBold ? 'white' : '#333',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = isBold ? '#005a87' : '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = isBold ? '#007cba' : 'white';
        }}
      >
        B
      </button>
      
      <button
        onClick={() => testCommand(FORMAT_TEXT_COMMAND, 'italic')}
        className={`toolbar-item ${isItalic ? 'active' : ''}`}
        style={{
          padding: '6px 8px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          backgroundColor: isItalic ? '#007cba' : 'white',
          color: isItalic ? 'white' : '#333',
          cursor: 'pointer',
          fontSize: '12px',
          fontStyle: 'italic'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = isItalic ? '#005a87' : '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = isItalic ? '#007cba' : 'white';
        }}
      >
        I
      </button>
      
      <button
        onClick={() => testCommand(FORMAT_TEXT_COMMAND, 'underline')}
        className={`toolbar-item ${isUnderline ? 'active' : ''}`}
        style={{
          padding: '6px 8px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          backgroundColor: isUnderline ? '#007cba' : 'white',
          color: isUnderline ? 'white' : '#333',
          cursor: 'pointer',
          fontSize: '12px',
          textDecoration: 'underline'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = isUnderline ? '#005a87' : '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = isUnderline ? '#007cba' : 'white';
        }}
      >
        U
      </button>

      {/* Separator */}
      <div style={{ width: '1px', backgroundColor: '#c9cccf', margin: '0 4px' }} />

      {/* Headers */}
      <button
        onClick={() => testCommand(FORMAT_ELEMENT_COMMAND, 'h1')}
        style={{
          padding: '6px 8px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          backgroundColor: elementFormat === 'heading' ? '#007cba' : 'white',
          color: elementFormat === 'heading' ? 'white' : '#333',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = elementFormat === 'heading' ? '#005a87' : '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = elementFormat === 'heading' ? '#007cba' : 'white';
        }}
      >
        H1
      </button>
      
      <button
        onClick={() => testCommand(FORMAT_ELEMENT_COMMAND, 'h2')}
        style={{
          padding: '6px 8px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          backgroundColor: elementFormat === 'heading' ? '#007cba' : 'white',
          color: elementFormat === 'heading' ? 'white' : '#333',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = elementFormat === 'heading' ? '#005a87' : '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = elementFormat === 'heading' ? '#007cba' : 'white';
        }}
      >
        H2
      </button>
      
      <button
        onClick={() => testCommand(FORMAT_ELEMENT_COMMAND, 'h3')}
        style={{
          padding: '6px 8px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          backgroundColor: elementFormat === 'heading' ? '#007cba' : 'white',
          color: elementFormat === 'heading' ? 'white' : '#333',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = elementFormat === 'heading' ? '#005a87' : '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = elementFormat === 'heading' ? '#007cba' : 'white';
        }}
      >
        H3
      </button>

      {/* Separator */}
      <div style={{ width: '1px', backgroundColor: '#c9cccf', margin: '0 4px' }} />

      {/* Lists */}
      <button
        onClick={() => testCommand(FORMAT_ELEMENT_COMMAND, 'ul')}
        style={{
          padding: '6px 8px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          backgroundColor: elementFormat === 'list' ? '#007cba' : 'white',
          color: elementFormat === 'list' ? 'white' : '#333',
          cursor: 'pointer',
          fontSize: '12px'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = elementFormat === 'list' ? '#005a87' : '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = elementFormat === 'list' ? '#007cba' : 'white';
        }}
      >
        • List
      </button>
      
      <button
        onClick={() => testCommand(FORMAT_ELEMENT_COMMAND, 'ol')}
        style={{
          padding: '6px 8px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          backgroundColor: elementFormat === 'list' ? '#007cba' : 'white',
          color: elementFormat === 'list' ? 'white' : '#333',
          cursor: 'pointer',
          fontSize: '12px'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = elementFormat === 'list' ? '#005a87' : '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = elementFormat === 'list' ? '#007cba' : 'white';
        }}
      >
        1. List
      </button>
    </div>
  );
}

export default LexicalToolbarPlugin;