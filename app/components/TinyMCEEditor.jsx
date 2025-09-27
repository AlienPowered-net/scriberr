import React, { useState, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { Button, Card, Text, BlockStack } from '@shopify/polaris';

const TinyMCEEditor = ({ 
  value = '', 
  onChange, 
  placeholder = "Start writing your note...",
  height = 400,
  isMobile = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const editorRef = useRef(null);

  const handleEditorChange = (content) => {
    if (onChange) {
      onChange(content);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Mobile-specific configuration
  const mobileConfig = {
    height: isMobile ? 300 : height,
    menubar: false,
    toolbar: 'undo redo | bold italic underline | bullist numlist | link image | removeformat',
    plugins: 'lists link image wordcount',
    toolbar_mode: 'sliding',
    resize: false,
    branding: false,
    promotion: false,
    statusbar: false,
    content_style: `
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
        font-size: 16px; 
        line-height: 1.6; 
        margin: 16px;
        color: #37352f;
      }
      @media (max-width: 768px) {
        body { 
          font-size: 18px; 
          margin: 16px 12px;
        }
      }
    `,
    mobile: {
      toolbar_mode: 'sliding',
      plugins: 'lists link wordcount',
      toolbar: 'undo redo | bold italic | bullist numlist | link | removeformat'
    }
  };

  // Desktop configuration
  const desktopConfig = {
    height: height,
    menubar: false,
    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | removeformat',
    plugins: 'anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount',
    toolbar_mode: 'sliding',
    resize: true,
    branding: false,
    promotion: false,
    statusbar: true,
    content_style: `
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
        font-size: 16px; 
        line-height: 1.6; 
        margin: 20px;
        color: #37352f;
        max-width: 800px;
      }
      h1, h2, h3, h4, h5, h6 {
        color: #37352f;
        font-weight: 600;
      }
      h1 { font-size: 2em; margin: 1.5rem 0 0.75rem 0; }
      h2 { font-size: 1.5em; margin: 1.25rem 0 0.5rem 0; }
      h3 { font-size: 1.25em; margin: 1rem 0 0.5rem 0; }
      blockquote {
        border-left: 3px solid #37352f;
        padding-left: 1rem;
        margin: 1rem 0;
        font-style: italic;
        color: #37352f;
      }
      code {
        background: #f7f6f3;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 0.9em;
        color: #eb5757;
      }
      pre {
        background: #f7f6f3;
        border-radius: 4px;
        padding: 16px;
        overflow-x: auto;
        margin: 1rem 0;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 0.9em;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 1rem 0;
        font-size: 0.9em;
      }
      th, td {
        border: 1px solid #e1e3e5;
        padding: 8px 12px;
        text-align: left;
      }
      th {
        background: #f7f6f3;
        font-weight: 600;
      }
      tr:hover {
        background: #f7f6f3;
      }
    `,
    setup: (editor) => {
      editor.on('init', () => {
        editor.setContent(value || '');
      });
    }
  };

  const config = isMobile ? mobileConfig : desktopConfig;

  return (
    <div 
      className={`tinymce-editor-container ${isExpanded ? 'expanded' : ''}`}
      style={{
        position: isExpanded ? 'fixed' : 'relative',
        top: isExpanded ? '20px' : 'auto',
        left: isExpanded ? '20px' : 'auto',
        right: isExpanded ? '20px' : 'auto',
        bottom: isExpanded ? '20px' : 'auto',
        zIndex: isExpanded ? 9999 : 'auto',
        maxHeight: isExpanded ? 'calc(100vh - 40px)' : 'none',
        maxWidth: isExpanded ? 'calc(100vw - 40px)' : '100%',
        boxShadow: isExpanded ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 10px 20px -5px rgba(0, 0, 0, 0.3)' : 'none',
        borderRadius: isExpanded ? '12px' : '8px',
        backgroundColor: '#ffffff',
        border: '1px solid #e1e3e5',
        overflow: 'hidden'
      }}
    >
      {/* Fullscreen Toggle Button */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '4px',
        padding: '4px'
      }}>
        <Button
          size="slim"
          onClick={toggleExpanded}
          title={isExpanded ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isExpanded ? '🗗' : '🗖'}
        </Button>
      </div>

      {/* Editor */}
      <div style={{
        padding: isExpanded ? '0' : '0',
        height: '100%'
      }}>
        <Editor
          apiKey='aonhc7oetfpegxi4wo9ycjsix90drx35thn9usgmaf50vi5c'
          onInit={(evt, editor) => editorRef.current = editor}
          initialValue={value || ''}
          init={{
            ...config,
            placeholder: placeholder,
            // Mobile-specific overrides
            ...(isMobile && {
              height: 300,
              menubar: false,
              toolbar_sticky: false,
              toolbar_mode: 'sliding',
              resize: false,
              mobile: {
                toolbar_mode: 'sliding',
                plugins: 'lists link wordcount',
                toolbar: 'undo redo | bold italic | bullist numlist | link | removeformat'
              }
            })
          }}
          onEditorChange={handleEditorChange}
        />
      </div>

      {/* Overlay for expanded mode */}
      {isExpanded && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: -1
          }}
          onClick={toggleExpanded}
        />
      )}

      <style jsx>{`
        .tinymce-editor-container {
          transition: all 0.3s ease;
        }
        
        .tinymce-editor-container.expanded {
          animation: expandIn 0.3s ease-out;
        }
        
        @keyframes expandIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        /* Mobile-specific styles */
        @media (max-width: 768px) {
          .tinymce-editor-container {
            min-height: 350px;
            max-height: 500px;
          }
          
          .tinymce-editor-container .tox-tinymce {
            border-radius: 8px;
          }
          
          .tinymce-editor-container .tox-edit-area {
            min-height: 280px;
          }
        }
        
        /* iOS Safari specific fixes */
        @supports (-webkit-touch-callout: none) {
          .tinymce-editor-container .tox-edit-area {
            -webkit-overflow-scrolling: touch;
            transform: translateZ(0);
          }
        }
      `}</style>
    </div>
  );
};

export default TinyMCEEditor;