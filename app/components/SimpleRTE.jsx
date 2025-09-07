import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';

const SimpleRTE = ({ value, onChange, placeholder = "Start writing..." }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div>Loading editor...</div>
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      backgroundColor: 'white',
      overflow: 'hidden'
    }}>
      {/* Toolbar */}
      <div style={{
        borderBottom: '1px solid #d1d5db',
        padding: '0.75rem',
        backgroundColor: '#f9fafb',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        alignItems: 'center'
      }}>
        {/* Text Formatting */}
        <div style={{
          display: 'flex',
          border: '1px solid #d1d5db',
          borderRadius: '0.375rem',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            style={{
              padding: '0.5rem 0.75rem',
              border: 'none',
              backgroundColor: editor.isActive('bold') ? '#3b82f6' : 'white',
              color: editor.isActive('bold') ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              borderRight: '1px solid #d1d5db',
              transition: 'all 0.15s ease-in-out'
            }}
            title="Bold"
            onMouseEnter={(e) => !editor.isActive('bold') && (e.target.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => !editor.isActive('bold') && (e.target.style.backgroundColor = 'white')}
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            style={{
              padding: '0.5rem 0.75rem',
              border: 'none',
              backgroundColor: editor.isActive('italic') ? '#3b82f6' : 'white',
              color: editor.isActive('italic') ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontStyle: 'italic',
              borderRight: '1px solid #d1d5db',
              transition: 'all 0.15s ease-in-out'
            }}
            title="Italic"
            onMouseEnter={(e) => !editor.isActive('italic') && (e.target.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => !editor.isActive('italic') && (e.target.style.backgroundColor = 'white')}
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            style={{
              padding: '0.5rem 0.75rem',
              border: 'none',
              backgroundColor: editor.isActive('underline') ? '#3b82f6' : 'white',
              color: editor.isActive('underline') ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '0.875rem',
              textDecoration: 'underline',
              borderRight: '1px solid #d1d5db',
              transition: 'all 0.15s ease-in-out'
            }}
            title="Underline"
            onMouseEnter={(e) => !editor.isActive('underline') && (e.target.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => !editor.isActive('underline') && (e.target.style.backgroundColor = 'white')}
          >
            U
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            style={{
              padding: '0.5rem 0.75rem',
              border: 'none',
              backgroundColor: editor.isActive('strike') ? '#3b82f6' : 'white',
              color: editor.isActive('strike') ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '0.875rem',
              textDecoration: 'line-through',
              transition: 'all 0.15s ease-in-out'
            }}
            title="Strikethrough"
            onMouseEnter={(e) => !editor.isActive('strike') && (e.target.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => !editor.isActive('strike') && (e.target.style.backgroundColor = 'white')}
          >
            S
          </button>
        </div>


        {/* Text Alignment */}
        <div style={{
          display: 'flex',
          border: '1px solid #d1d5db',
          borderRadius: '0.375rem',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            style={{
              padding: '0.5rem 0.75rem',
              border: 'none',
              backgroundColor: editor.isActive({ textAlign: 'left' }) ? '#3b82f6' : 'white',
              color: editor.isActive({ textAlign: 'left' }) ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '0.875rem',
              borderRight: '1px solid #d1d5db',
              transition: 'all 0.15s ease-in-out'
            }}
            title="Align Left"
            onMouseEnter={(e) => !editor.isActive({ textAlign: 'left' }) && (e.target.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => !editor.isActive({ textAlign: 'left' }) && (e.target.style.backgroundColor = 'white')}
          >
            ⬅
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            style={{
              padding: '0.5rem 0.75rem',
              border: 'none',
              backgroundColor: editor.isActive({ textAlign: 'center' }) ? '#3b82f6' : 'white',
              color: editor.isActive({ textAlign: 'center' }) ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '0.875rem',
              borderRight: '1px solid #d1d5db',
              transition: 'all 0.15s ease-in-out'
            }}
            title="Align Center"
            onMouseEnter={(e) => !editor.isActive({ textAlign: 'center' }) && (e.target.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => !editor.isActive({ textAlign: 'center' }) && (e.target.style.backgroundColor = 'white')}
          >
            ⬌
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            style={{
              padding: '0.5rem 0.75rem',
              border: 'none',
              backgroundColor: editor.isActive({ textAlign: 'right' }) ? '#3b82f6' : 'white',
              color: editor.isActive({ textAlign: 'right' }) ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.15s ease-in-out'
            }}
            title="Align Right"
            onMouseEnter={(e) => !editor.isActive({ textAlign: 'right' }) && (e.target.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => !editor.isActive({ textAlign: 'right' }) && (e.target.style.backgroundColor = 'white')}
          >
            ➡
          </button>
        </div>

        {/* Color Picker */}
        <input
          type="color"
          onInput={(event) => editor.chain().focus().setColor(event.target.value).run()}
          value={editor.getAttributes('textStyle').color || '#000000'}
          style={{
            width: '2rem',
            height: '2rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            padding: '0'
          }}
          title="Text Color"
        />

        {/* Font Family */}
        <select
          onChange={(event) => {
            if (event.target.value === 'unset') {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(event.target.value).run();
            }
          }}
          value={editor.getAttributes('textStyle').fontFamily || ''}
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            backgroundColor: 'white',
            color: '#374151',
            fontSize: '0.875rem',
            cursor: 'pointer',
            minWidth: '120px'
          }}
        >
          <option value="">Default</option>
          <option value="Inter">Inter</option>
          <option value="Comic Sans MS, Comic Sans">Comic Sans</option>
          <option value="serif">Serif</option>
          <option value="monospace">Monospace</option>
          <option value="cursive">Cursive</option>
        </select>
      </div>

      {/* Editor Content */}
      <div style={{
        padding: '1rem',
        minHeight: '400px',
        backgroundColor: 'white'
      }}>
        <EditorContent 
          editor={editor}
          style={{
            outline: 'none'
          }}
        />
      </div>
    </div>
  );
};

export default SimpleRTE;