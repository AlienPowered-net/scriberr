import React, { useEffect, useRef, useState } from 'react';

// Remove emoji characters from input
const removeEmojis = (str) => {
  if (!str) return str;
  return str.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]/gu, '');
};

// Client-only Quill component
function ClientQuill({ value, onChange, placeholder }) {
  const [ReactQuill, setReactQuill] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const quillRef = useRef(null);

  useEffect(() => {
    // Only import Quill on the client side
    if (typeof window !== 'undefined') {
      // Import both the component and CSS
      Promise.all([
        import('react-quill'),
        import('react-quill/dist/quill.snow.css')
      ]).then(([module]) => {
        setReactQuill(() => module.default);
        setIsLoaded(true);
        
        // Add custom CSS for Quill popups after Quill is loaded
        const style = document.createElement('style');
        style.textContent = `
          /* Fix Quill popup z-index issues */
          .ql-tooltip {
            z-index: 9999 !important;
            position: fixed !important;
          }
          
          .ql-tooltip[data-mode="link"]::before {
            content: "Enter link:";
          }
          
          .ql-tooltip a.ql-action::after {
            content: "Edit";
          }
          
          .ql-tooltip a.ql-remove::after {
            content: "Remove";
          }
          
          .ql-tooltip[data-mode="video"]::before {
            content: "Enter video:";
          }
          
          .ql-tooltip::before {
            content: "Shortcuts:";
          }
          
          .ql-tooltip a {
            color: #06c;
          }
          
          .ql-tooltip.ql-editing a.ql-action::after {
            content: "Save";
          }
          
          .ql-tooltip[data-mode="link"]::before {
            content: "Enter link:";
          }
          
          .ql-tooltip[data-mode="formula"]::before {
            content: "Enter formula:";
          }
          
          .ql-tooltip[data-mode="video"]::before {
            content: "Enter video:";
          }
          
          /* Ensure Quill toolbar and popups are always on top */
          .ql-container {
            z-index: 1;
          }
          
          .ql-toolbar {
            z-index: 2;
          }
          
          .ql-tooltip {
            z-index: 9999 !important;
            position: fixed !important;
            background: white !important;
            border: 1px solid #ccc !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
            padding: 5px 12px !important;
            border-radius: 3px !important;
          }
          
          /* Fix positioning for link tooltip */
          .ql-tooltip[data-mode="link"] {
            z-index: 9999 !important;
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background: white !important;
            border: 1px solid #ccc !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
            padding: 10px !important;
            border-radius: 4px !important;
            min-width: 300px !important;
          }
          
          .ql-tooltip[data-mode="link"] input[type=text] {
            width: 100% !important;
            padding: 5px !important;
            border: 1px solid #ccc !important;
            border-radius: 3px !important;
            margin-bottom: 5px !important;
          }
          
          .ql-tooltip[data-mode="link"] a {
            margin-right: 10px !important;
            text-decoration: none !important;
            color: #06c !important;
          }
        `;
        document.head.appendChild(style);
      });
    }
  }, []);

  // Quill modules to attach to editor
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  };

  // Quill editor formats
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'blockquote', 'code-block',
    'link'
  ];

  const handleChange = (content, delta, source, editor) => {
    // Remove emojis from the content
    const filteredContent = removeEmojis(content);
    
    // Only call onChange if content actually changed (not just emoji removal)
    if (content !== filteredContent) {
      console.warn('Emojis detected and removed from content');
    }
    
    onChange(filteredContent);
  };

  // Show loading state while Quill is being loaded
  if (!isLoaded || !ReactQuill) {
    return (
      <div className="editor-container" style={{ 
        border: '1px solid #c9cccf', 
        borderRadius: '4px', 
        minHeight: '300px',
        padding: '12px',
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{ 
          color: '#6d7175',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container" style={{ border: '1px solid #c9cccf', borderRadius: '4px', minHeight: '300px' }}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{
          height: '250px',
          fontSize: '14px',
          lineHeight: '1.5'
        }}
      />
    </div>
  );
}

function QuillEditor({ value, onChange, placeholder }) {
  return <ClientQuill value={value} onChange={onChange} placeholder={placeholder} />;
}

export default QuillEditor;