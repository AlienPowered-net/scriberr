import React, { useEffect, useRef, useState } from 'react';

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
        import('react-quill/dist/quill.snow.css'),
        import('quill-table-ui')
      ]).then(([module, quillCSS, tableModule]) => {
        // Register table UI module with Quill
        const Quill = module.default.Quill;
        const TableUI = tableModule.default;
        Quill.register('modules/tableUI', TableUI);
        
        setReactQuill(() => module.default);
        setIsLoaded(true);
        
        // Add minimal CSS to fix z-index issues only
        const style = document.createElement('style');
        style.textContent = `
          /* Fix Quill popup z-index issues - minimal approach */
          .ql-tooltip {
            z-index: 9999 !important;
          }
          
          /* Ensure Quill tooltips appear above all other elements */
          .ql-editor .ql-tooltip {
            z-index: 9999 !important;
          }
          
          /* Fix any positioning issues */
          .ql-tooltip[data-mode="link"] {
            z-index: 9999 !important;
          }
          
          /* Ensure table UI appears above other elements */
          .ql-table-ui {
            z-index: 9999 !important;
          }
          
          /* Fix double border issue */
          .ql-container {
            border-bottom: none !important;
          }
          
          .ql-toolbar {
            border-bottom: 1px solid #c9cccf !important;
          }
        `;
        document.head.appendChild(style);
      });
    }
  }, []);

  // Quill modules to attach to editor - comprehensive toolbar with table UI
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }, { 'align': [] }],
      ['link', 'image', 'video'],
      ['table'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    },
    tableUI: {
      operationMenu: {
        items: {
          unmergeCells: {
            text: 'Unmerge cells'
          }
        }
      }
    }
  };

  // Quill editor formats - all available formats including table
  const formats = [
    'header',
    'font',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'blockquote', 'code-block',
    'list', 'bullet',
    'indent',
    'direction', 'align',
    'link', 'image', 'video',
    'table',
    'clean'
  ];

  const handleChange = (content, delta, source, editor) => {
    // Call onChange directly
    onChange(content);
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
    <div className="editor-container" style={{ 
      border: '1px solid #c9cccf', 
      borderRadius: '4px', 
      minHeight: '300px',
      overflow: 'hidden'
    }}>
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