import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, UNDO_COMMAND, REDO_COMMAND } from 'lexical';
import { $getSelection, $isRangeSelection } from 'lexical';
import { useState, useEffect } from 'react';

function LexicalToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const updateToolbar = () => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
    }
  };

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor]);

  const handleBold = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
  };

  const handleItalic = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
  };

  const handleUnderline = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
  };

  const handleHeading = (level) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, `h${level}`);
  };

  const handleList = (type) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, type);
  };

  const handleUndo = () => {
    editor.dispatchCommand(UNDO_COMMAND);
  };

  const handleRedo = () => {
    editor.dispatchCommand(REDO_COMMAND);
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
        Bold: {isBold ? 'Y' : 'N'} | Italic: {isItalic ? 'Y' : 'N'} | Underline: {isUnderline ? 'Y' : 'N'}
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
        onClick={handleBold}
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
        onClick={handleItalic}
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
        onClick={handleUnderline}
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
        onClick={() => handleHeading(1)}
        style={{
          padding: '6px 8px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          backgroundColor: 'white',
          color: '#333',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'white';
        }}
      >
        H1
      </button>
      
      <button
        onClick={() => handleHeading(2)}
        style={{
          padding: '6px 8px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          backgroundColor: 'white',
          color: '#333',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'white';
        }}
      >
        H2
      </button>
      
      <button
        onClick={() => handleHeading(3)}
        style={{
          padding: '6px 8px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          backgroundColor: 'white',
          color: '#333',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'white';
        }}
      >
        H3
      </button>

      {/* Separator */}
      <div style={{ width: '1px', backgroundColor: '#c9cccf', margin: '0 4px' }} />

      {/* Lists */}
      <button
        onClick={() => handleList('ul')}
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
        • List
      </button>
      
      <button
        onClick={() => handleList('ol')}
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
        1. List
      </button>
    </div>
  );
}

export default LexicalToolbarPlugin;