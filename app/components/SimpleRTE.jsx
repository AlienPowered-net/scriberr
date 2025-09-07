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
    <div className="tiptap-editor">
      {/* Toolbar */}
      <div className="tiptap-toolbar">
        <div className="flex flex-wrap gap-1">
          {/* Text Formatting */}
          <div className="tiptap-button-group">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`tiptap-button ${editor.isActive('bold') ? 'active' : ''}`}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`tiptap-button ${editor.isActive('italic') ? 'active' : ''}`}
              title="Italic"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`tiptap-button ${editor.isActive('underline') ? 'active' : ''}`}
              title="Underline"
            >
              <u>U</u>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`tiptap-button ${editor.isActive('strike') ? 'active' : ''}`}
              title="Strikethrough"
            >
              <s>S</s>
            </button>
          </div>

          {/* Headings */}
          <div className="tiptap-button-group">
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                className={`tiptap-button ${editor.isActive('heading', { level }) ? 'active' : ''}`}
                title={`Heading ${level}`}
              >
                H{level}
              </button>
            ))}
          </div>

          {/* Lists */}
          <div className="tiptap-button-group">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`tiptap-button ${editor.isActive('bulletList') ? 'active' : ''}`}
              title="Bullet List"
            >
              •
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`tiptap-button ${editor.isActive('orderedList') ? 'active' : ''}`}
              title="Numbered List"
            >
              1.
            </button>
          </div>

          {/* Text Alignment */}
          <div className="tiptap-button-group">
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`tiptap-button ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
              title="Align Left"
            >
              ⫷
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`tiptap-button ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
              title="Align Center"
            >
              ≡
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`tiptap-button ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
              title="Align Right"
            >
              ⫸
            </button>
          </div>

          {/* Color Picker */}
          <input
            type="color"
            onInput={(event) => editor.chain().focus().setColor(event.target.value).run()}
            value={editor.getAttributes('textStyle').color || '#000000'}
            className="tiptap-color-picker"
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
            className="tiptap-select"
          >
            <option value="">Default</option>
            <option value="Inter">Inter</option>
            <option value="Comic Sans MS, Comic Sans">Comic Sans</option>
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
            <option value="cursive">Cursive</option>
          </select>
        </div>
      </div>

      {/* Editor Content */}
      <div className="tiptap-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default SimpleRTE;