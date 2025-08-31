import React, { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Remove emoji characters from input
const removeEmojis = (str) => {
  if (!str) return str;
  return str.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]/gu, '');
};

function QuillEditor({ value, onChange, placeholder }) {
  const quillRef = useRef(null);

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

export default QuillEditor;