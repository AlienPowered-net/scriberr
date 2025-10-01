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
        
        // Add comprehensive CSS to fix all z-index and positioning issues
        const style = document.createElement('style');
        style.textContent = `
          /* Ensure Quill editor container is above everything */
          .editor-container {
            position: relative !important;
            z-index: 99999 !important;
          }
          
          /* Fix Quill popup z-index issues - comprehensive approach */
          .ql-tooltip {
            z-index: 999999 !important;
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background: white !important;
            border: 1px solid #ccc !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
            padding: 10px !important;
            padding-right: 8% !important;
            border-radius: 4px !important;
            min-width: 300px !important;
          }
          
          /* Ensure Quill tooltips appear above all other elements */
          .ql-editor .ql-tooltip {
            z-index: 999999 !important;
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
          }
          
          /* Fix any positioning issues */
          .ql-tooltip[data-mode="link"] {
            z-index: 999999 !important;
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
          }
          
          .ql-tooltip[data-mode="video"] {
            z-index: 999999 !important;
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
          }
          
          /* Ensure table UI appears above other elements */
          .ql-table-ui {
            z-index: 999999 !important;
          }
          
          /* Fix double border issue */
          .ql-container {
            border-bottom: none !important;
          }
          
          .ql-toolbar {
            border-bottom: 1px solid #c9cccf !important;
          }
          
          /* Ensure Quill editor itself is above other elements */
          .ql-editor {
            z-index: 99999 !important;
            position: relative !important;
          }
          
          .ql-toolbar {
            z-index: 99999 !important;
            position: relative !important;
          }
          
          /* Fix input fields in tooltips */
          .ql-tooltip input[type=text] {
            width: 100% !important;
            padding: 5px !important;
            border: 1px solid #ccc !important;
            border-radius: 3px !important;
            margin-bottom: 5px !important;
            box-sizing: border-box !important;
          }
          
          /* Fix tooltip links */
          .ql-tooltip a {
            margin-right: 10px !important;
            text-decoration: none !important;
            color: #06c !important;
            cursor: pointer !important;
          }
          
          /* Ensure all Quill elements are above everything */
          .ql-container,
          .ql-toolbar,
          .ql-editor,
          .ql-tooltip,
          .ql-table-ui,
          .ql-picker,
          .ql-picker-options {
            z-index: 99999 !important;
          }
          
          /* Mobile responsive styles for better text editor sizing */
          @media (max-width: 768px) {
            .editor-container {
              min-height: 200px !important;
              max-height: 400px !important;
            }
            .ql-editor {
              min-height: 200px !important;
              max-height: 400px !important;
              overflow-y: auto !important;
              font-size: 18px !important;
              line-height: 1.6 !important;
              padding: 16px !important;
            }
            .ql-container {
              height: auto !important;
              min-height: 200px !important;
              max-height: 400px !important;
              overflow: hidden !important;
            }
            .ql-toolbar {
              padding: 8px !important;
              overflow-x: auto !important;
            }
            .ql-toolbar .ql-formats {
              margin-right: 8px !important;
            }
          }
          
          /* Checkbox styles for Quill editor */
          .quill-checkbox-item {
            display: flex;
            align-items: center;
            margin: 8px 0;
            padding: 4px 0;
            cursor: pointer;
          }
          
          .quill-checkbox {
            margin-right: 8px;
            cursor: pointer;
            width: 16px;
            height: 16px;
            accent-color: #3b82f6;
          }
          
          .quill-checkbox-text {
            flex: 1;
            cursor: pointer;
            user-select: none;
            transition: all 0.2s ease;
          }
          
          .quill-checkbox-text:hover {
            background-color: rgba(59, 130, 246, 0.1);
            border-radius: 4px;
            padding: 2px 4px;
            margin: -2px -4px;
          }
          
          /* Toolbar checkbox button styling */
          .ql-toolbar .ql-checkbox::before {
            content: "☑";
            font-size: 18px;
            line-height: 1;
          }
        `;
        document.head.appendChild(style);
      });
    }
  }, []);

  // Custom checkbox handler
  const addCheckboxHandler = (quill) => {
    const checkboxHandler = () => {
      const range = quill.getSelection();
      if (range) {
        // Insert checkbox HTML at current position
        const checkboxHtml = '<div class="quill-checkbox-item"><input type="checkbox" class="quill-checkbox"> <span class="quill-checkbox-text">Checkbox item</span></div>';
        quill.clipboard.dangerouslyPasteHTML(range.index, checkboxHtml);
        quill.setSelection(range.index + 1);
      }
    };
    
    // Add checkbox button to toolbar
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('checkbox', checkboxHandler);
  };

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
      ['table', 'checkbox'],
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

  // Quill editor formats - all available formats including table and checkbox
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
    'table', 'checkbox',
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
        backgroundColor: '#f9f9f9',
        position: 'relative',
        zIndex: 99999
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

  // Initialize checkbox handler when Quill is ready
  useEffect(() => {
    if (quillRef.current && ReactQuill) {
      const quill = quillRef.current.getEditor();
      if (quill) {
        addCheckboxHandler(quill);
        
        // Add event listeners for checkbox interactions
        const editorElement = quill.container.querySelector('.ql-editor');
        if (editorElement) {
          const handleCheckboxClick = (e) => {
            if (e.target.type === 'checkbox') {
              e.preventDefault();
              e.target.checked = !e.target.checked;
              
              // Update the text styling based on checkbox state
              const checkboxText = e.target.nextElementSibling;
              if (checkboxText) {
                if (e.target.checked) {
                  checkboxText.style.textDecoration = 'line-through';
                  checkboxText.style.color = '#6b7280';
                } else {
                  checkboxText.style.textDecoration = 'none';
                  checkboxText.style.color = 'inherit';
                }
              }
            }
          };
          
          const handleCheckboxTextClick = (e) => {
            if (e.target.classList.contains('quill-checkbox-text')) {
              e.preventDefault();
              const checkbox = e.target.previousElementSibling;
              if (checkbox) {
                checkbox.checked = !checkbox.checked;
                
                // Update the text styling
                if (checkbox.checked) {
                  e.target.style.textDecoration = 'line-through';
                  e.target.style.color = '#6b7280';
                } else {
                  e.target.style.textDecoration = 'none';
                  e.target.style.color = 'inherit';
                }
              }
            }
          };
          
          editorElement.addEventListener('click', handleCheckboxClick);
          editorElement.addEventListener('click', handleCheckboxTextClick);
          
          // Cleanup function
          return () => {
            editorElement.removeEventListener('click', handleCheckboxClick);
            editorElement.removeEventListener('click', handleCheckboxTextClick);
          };
        }
      }
    }
  }, [ReactQuill]);

  return (
    <div className="editor-container" style={{ 
      border: '1px solid #c9cccf', 
      borderRadius: '4px', 
      minHeight: '300px',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 99999
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