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
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4',
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
    <div className="border border-gray-300 rounded-lg bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-300 p-2 bg-gray-50">
        <div className="flex flex-wrap gap-1">
          {/* Text Formatting */}
          <div className="flex border border-gray-300 rounded">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`px-2 py-1 text-sm ${
                editor.isActive('bold') ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              } border-r border-gray-300 first:rounded-l last:rounded-r last:border-r-0`}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`px-2 py-1 text-sm ${
                editor.isActive('italic') ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              } border-r border-gray-300 first:rounded-l last:rounded-r last:border-r-0`}
              title="Italic"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`px-2 py-1 text-sm ${
                editor.isActive('underline') ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              } border-r border-gray-300 first:rounded-l last:rounded-r last:border-r-0`}
              title="Underline"
            >
              <u>U</u>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`px-2 py-1 text-sm ${
                editor.isActive('strike') ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              } first:rounded-l last:rounded-r last:border-r-0`}
              title="Strikethrough"
            >
              <s>S</s>
            </button>
          </div>

          {/* Headings */}
          <div className="flex border border-gray-300 rounded">
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                className={`px-2 py-1 text-sm font-bold ${
                  editor.isActive('heading', { level }) ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                } border-r border-gray-300 first:rounded-l last:rounded-r last:border-r-0`}
                title={`Heading ${level}`}
              >
                H{level}
              </button>
            ))}
          </div>

          {/* Lists */}
          <div className="flex border border-gray-300 rounded">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`px-2 py-1 text-sm ${
                editor.isActive('bulletList') ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              } border-r border-gray-300 first:rounded-l last:rounded-r last:border-r-0`}
              title="Bullet List"
            >
              •
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`px-2 py-1 text-sm ${
                editor.isActive('orderedList') ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              } first:rounded-l last:rounded-r last:border-r-0`}
              title="Numbered List"
            >
              1.
            </button>
          </div>

          {/* Text Alignment */}
          <div className="flex border border-gray-300 rounded">
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`px-2 py-1 text-sm ${
                editor.isActive({ textAlign: 'left' }) ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              } border-r border-gray-300 first:rounded-l last:rounded-r last:border-r-0`}
              title="Align Left"
            >
              ⫷
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`px-2 py-1 text-sm ${
                editor.isActive({ textAlign: 'center' }) ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              } border-r border-gray-300 first:rounded-l last:rounded-r last:border-r-0`}
              title="Align Center"
            >
              ≡
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`px-2 py-1 text-sm ${
                editor.isActive({ textAlign: 'right' }) ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              } first:rounded-l last:rounded-r last:border-r-0`}
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
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
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
            className="px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-700"
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
      <EditorContent 
        editor={editor} 
        className="min-h-[400px] p-4 focus-within:outline-none"
        style={{ fontSize: '16px', lineHeight: '1.6' }}
      />
    </div>
  );
};

export default SimpleRTE;