import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { 
  Card, 
  Button, 
  Select, 
  InlineStack,
  Text,
  Divider,
  Icon
} from '@shopify/polaris';

const SimpleRTE = ({ value, onChange, placeholder = "Start writing..." }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure built-in extensions
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        // Enable history for undo/redo
        history: {
          depth: 100,
        },
      }),
      TextStyle,
      Color,
      FontFamily.configure({
        types: ['textStyle'],
      }),
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
      <Card>
        <Card.Section>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '200px' 
          }}>
            <Text variant="bodyMd" tone="subdued">Loading editor...</Text>
          </div>
        </Card.Section>
      </Card>
    );
  }

  return (
    <Card>
      {/* Toolbar */}
      <div style={{
        borderBottom: '1px solid #e1e3e5',
        padding: '12px',
        backgroundColor: '#f6f6f7'
      }}>
        <InlineStack gap="300" wrap={true} align="start">
          {/* Text Formatting */}
          <InlineStack gap="200">
            <Button
              pressed={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
              accessibilityLabel="Bold"
            >
              B
            </Button>
            <Button
              pressed={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              accessibilityLabel="Italic"
            >
              I
            </Button>
            <Button
              pressed={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              accessibilityLabel="Underline"
            >
              U
            </Button>
            <Button
              pressed={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              accessibilityLabel="Strikethrough"
            >
              S
            </Button>
          </InlineStack>

          {/* Headings */}
          <InlineStack gap="200">
            {[1, 2, 3].map((level) => (
              <Button
                key={level}
                pressed={editor.isActive('heading', { level })}
                onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                accessibilityLabel={`Heading ${level}`}
              >
                H{level}
              </Button>
            ))}
          </InlineStack>

          {/* Lists */}
          <InlineStack gap="200">
            <Button
              pressed={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              accessibilityLabel="Bullet List"
            >
              •
            </Button>
            <Button
              pressed={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              accessibilityLabel="Numbered List"
            >
              1.
            </Button>
          </InlineStack>

          {/* Text Alignment */}
          <InlineStack gap="200">
            <Button
              pressed={editor.isActive({ textAlign: 'left' })}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              accessibilityLabel="Align Left"
            >
              ⬅
            </Button>
            <Button
              pressed={editor.isActive({ textAlign: 'center' })}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              accessibilityLabel="Align Center"
            >
              ⬌
            </Button>
            <Button
              pressed={editor.isActive({ textAlign: 'right' })}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              accessibilityLabel="Align Right"
            >
              ➡
            </Button>
          </InlineStack>

          {/* Color Picker */}
          <Button
            accessibilityLabel="Text Color"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'color';
              input.value = editor.getAttributes('textStyle').color || '#000000';
              input.onchange = (event) => editor.chain().focus().setColor(event.target.value).run();
              input.click();
            }}
          >
            Color
          </Button>

          {/* Font Family */}
          <Select
            label="Font"
            labelHidden
            options={[
              {label: 'Default', value: ''},
              {label: 'Inter', value: 'Inter'},
              {label: 'Comic Sans', value: 'Comic Sans MS, Comic Sans'},
              {label: 'Serif', value: 'serif'},
              {label: 'Monospace', value: 'monospace'},
              {label: 'Cursive', value: 'cursive'}
            ]}
            onChange={(value) => {
              if (value === '') {
                editor.chain().focus().unsetFontFamily().run();
              } else {
                editor.chain().focus().setFontFamily(value).run();
              }
            }}
            value={editor.getAttributes('textStyle').fontFamily || ''}
          />

          {/* Undo/Redo */}
          <InlineStack gap="200">
            <Button
              disabled={!editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
              accessibilityLabel="Undo"
            >
              ↶
            </Button>
            <Button
              disabled={!editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
              accessibilityLabel="Redo"
            >
              ↷
            </Button>
          </InlineStack>
        </InlineStack>
      </div>

      {/* Editor Content */}
      <Card.Section>
        <div style={{
          minHeight: '400px',
          padding: '8px'
        }}>
          <EditorContent 
            editor={editor}
            style={{
              outline: 'none'
            }}
          />
        </div>
      </Card.Section>
    </Card>
  );
};

export default SimpleRTE;