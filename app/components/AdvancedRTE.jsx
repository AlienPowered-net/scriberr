import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { Button, Text, Modal, TextField, Card, InlineStack, BlockStack } from '@shopify/polaris';

const AdvancedRTE = ({ value, onChange, placeholder = "Start writing..." }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [aiPrompt, setAIPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const editorRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Youtube.configure({
        controls: false,
        nocookie: true,
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const insertImage = () => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageModal(false);
    }
  };

  const insertVideo = () => {
    if (videoUrl && editor) {
      editor.chain().focus().setYoutubeVideo({ src: videoUrl }).run();
      setVideoUrl('');
      setShowVideoModal(false);
    }
  };

  const generateAIContent = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      // TODO: Implement OpenAI API call
      // For now, we'll add a placeholder
      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      
      if (response.ok) {
        const data = await response.json();
        editor?.chain().focus().insertContent(data.content).run();
      } else {
        // Fallback for when API is not yet implemented
        editor?.chain().focus().insertContent(`[AI Generated Content for: "${aiPrompt}"]`).run();
      }
    } catch (error) {
      console.error('AI generation error:', error);
      // Fallback content
      editor?.chain().focus().insertContent(`[AI Generated Content for: "${aiPrompt}"]`).run();
    } finally {
      setIsGenerating(false);
      setAIPrompt('');
      setShowAIModal(false);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <Text variant="bodyMd" color="subdued">Loading editor...</Text>
      </div>
    );
  }

  return (
    <div 
      className={`relative border rounded-lg bg-white transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 shadow-2xl' : 'w-full'
      }`}
      ref={editorRef}
    >
      {/* Toolbar */}
      <div className="border-b p-3 bg-gray-50 rounded-t-lg">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Text Formatting */}
          <div className="flex gap-1 border-r pr-2">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : ''
              }`}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : ''
              }`}
              title="Italic"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('underline') ? 'bg-blue-100 text-blue-600' : ''
              }`}
              title="Underline"
            >
              <u>U</u>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('strike') ? 'bg-blue-100 text-blue-600' : ''
              }`}
              title="Strikethrough"
            >
              <s>S</s>
            </button>
          </div>

          {/* Headings */}
          <div className="flex gap-1 border-r pr-2">
            {[1, 2, 3, 4].map((level) => (
              <button
                key={level}
                onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                className={`px-2 py-1 rounded text-sm hover:bg-gray-200 ${
                  editor.isActive('heading', { level }) ? 'bg-blue-100 text-blue-600' : ''
                }`}
                title={`Heading ${level}`}
              >
                H{level}
              </button>
            ))}
          </div>

          {/* Lists */}
          <div className="flex gap-1 border-r pr-2">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : ''
              }`}
              title="Bullet List"
            >
              •
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : ''
              }`}
              title="Numbered List"
            >
              1.
            </button>
          </div>

          {/* Table */}
          <div className="flex gap-1 border-r pr-2">
            <button
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              className="p-2 rounded hover:bg-gray-200"
              title="Insert Table"
            >
              ⊞
            </button>
          </div>

          {/* Media */}
          <div className="flex gap-1 border-r pr-2">
            <button
              onClick={() => setShowImageModal(true)}
              className="p-2 rounded hover:bg-gray-200"
              title="Insert Image"
            >
              🖼️
            </button>
            <button
              onClick={() => setShowVideoModal(true)}
              className="p-2 rounded hover:bg-gray-200"
              title="Insert Video"
            >
              🎥
            </button>
          </div>

          {/* AI */}
          <div className="flex gap-1 border-r pr-2">
            <button
              onClick={() => setShowAIModal(true)}
              className="p-2 rounded hover:bg-gray-200 bg-gradient-to-r from-purple-100 to-blue-100"
              title="AI Assistant"
            >
              🤖
            </button>
          </div>

          {/* Expand */}
          <div className="flex gap-1 ml-auto">
            <button
              onClick={toggleExpanded}
              className="p-2 rounded hover:bg-gray-200"
              title={isExpanded ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isExpanded ? "⤴️" : "⤢"}
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className={`${isExpanded ? 'h-full overflow-auto' : 'min-h-[400px]'}`}>
        <EditorContent 
          editor={editor} 
          className="prose max-w-none p-4 focus-within:outline-none"
        />
      </div>

      {/* Modals */}
      <Modal
        open={showImageModal}
        onClose={() => setShowImageModal(false)}
        title="Insert Image"
        primaryAction={{
          content: 'Insert',
          onAction: insertImage,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowImageModal(false),
          },
        ]}
      >
        <Modal.Section>
          <TextField
            label="Image URL"
            value={imageUrl}
            onChange={setImageUrl}
            placeholder="https://example.com/image.jpg"
            autoComplete="off"
          />
        </Modal.Section>
      </Modal>

      <Modal
        open={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        title="Insert Video"
        primaryAction={{
          content: 'Insert',
          onAction: insertVideo,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowVideoModal(false),
          },
        ]}
      >
        <Modal.Section>
          <TextField
            label="YouTube URL"
            value={videoUrl}
            onChange={setVideoUrl}
            placeholder="https://www.youtube.com/watch?v=..."
            autoComplete="off"
          />
        </Modal.Section>
      </Modal>

      <Modal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        title="AI Content Generator"
        primaryAction={{
          content: isGenerating ? 'Generating...' : 'Generate',
          onAction: generateAIContent,
          loading: isGenerating,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowAIModal(false),
          },
        ]}
      >
        <Modal.Section>
          <TextField
            label="What would you like AI to write about?"
            value={aiPrompt}
            onChange={setAIPrompt}
            placeholder="Write a blog post about sustainable technology..."
            multiline={3}
            autoComplete="off"
          />
        </Modal.Section>
      </Modal>

      {/* Overlay for expanded mode */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleExpanded}
        />
      )}
    </div>
  );
};

export default AdvancedRTE;