import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND } from 'lexical';
import { $getSelection, $isRangeSelection } from 'lexical';
import { useState } from 'react';

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

  const formatText = (format) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatElement = (format) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format);
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
      {/* Text Formatting */}
      <button
        onClick={() => formatText('bold')}
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
        onClick={() => formatText('italic')}
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
        onClick={() => formatText('underline')}
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
        onClick={() => formatElement('h1')}
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
        onClick={() => formatElement('h2')}
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
        onClick={() => formatElement('h3')}
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
        onClick={() => formatElement('ul')}
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
        onClick={() => formatElement('ol')}
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