import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
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
      style={{
        ...(isExpanded && {
          position: 'fixed',
          top: '20px',
          left: '20px',
          right: '20px',
          bottom: '20px',
          zIndex: 9999,
          maxHeight: 'calc(100vh - 40px)',
          maxWidth: 'calc(100vw - 40px)'
        })
      }}
      ref={editorRef}
    >
      {/* Toolbar */}
      <div style={{ borderBottom: "1px solid #e1e3e5", padding: "12px", backgroundColor: "#f8f9fa", borderRadius: "8px 8px 0 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          {/* Text Formatting */}
          <div style={{ display: "flex", gap: "4px", borderRight: "1px solid #e1e3e5", paddingRight: "8px" }}>
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: editor.isActive('bold') ? '#e3f2fd' : 'white',
                color: editor.isActive('bold') ? '#1976d2' : '#374151',
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="Bold"
            >
              <i className="fas fa-bold"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: editor.isActive('italic') ? '#e3f2fd' : 'white',
                color: editor.isActive('italic') ? '#1976d2' : '#374151',
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="Italic"
            >
              <i className="fas fa-italic"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: editor.isActive('underline') ? '#e3f2fd' : 'white',
                color: editor.isActive('underline') ? '#1976d2' : '#374151',
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="Underline"
            >
              <i className="fas fa-underline"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: editor.isActive('strike') ? '#e3f2fd' : 'white',
                color: editor.isActive('strike') ? '#1976d2' : '#374151',
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="Strikethrough"
            >
              <i className="fas fa-strikethrough"></i>
            </button>
          </div>

          {/* Headings */}
          <div style={{ display: "flex", gap: "4px", borderRight: "1px solid #e1e3e5", paddingRight: "8px" }}>
            {[1, 2, 3, 4].map((level) => (
              <button
                key={level}
                onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #e1e3e5",
                  borderRadius: "6px",
                  backgroundColor: editor.isActive('heading', { level }) ? '#e3f2fd' : 'white',
                  color: editor.isActive('heading', { level }) ? '#1976d2' : '#374151',
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontSize: "12px",
                  fontWeight: "600"
                }}
                title={`Heading ${level}`}
              >
                H{level}
              </button>
            ))}
          </div>

          {/* Lists */}
          <div style={{ display: "flex", gap: "4px", borderRight: "1px solid #e1e3e5", paddingRight: "8px" }}>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: editor.isActive('bulletList') ? '#e3f2fd' : 'white',
                color: editor.isActive('bulletList') ? '#1976d2' : '#374151',
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="Bullet List"
            >
              <i className="fas fa-list-ul"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: editor.isActive('orderedList') ? '#e3f2fd' : 'white',
                color: editor.isActive('orderedList') ? '#1976d2' : '#374151',
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="Numbered List"
            >
              <i className="fas fa-list-ol"></i>
            </button>
          </div>

          {/* Table */}
          <div style={{ display: "flex", gap: "4px", borderRight: "1px solid #e1e3e5", paddingRight: "8px" }}>
            <button
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: "white",
                color: "#374151",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="Insert Table"
            >
              <i className="fas fa-table"></i>
            </button>
          </div>

          {/* Media */}
          <div style={{ display: "flex", gap: "4px", borderRight: "1px solid #e1e3e5", paddingRight: "8px" }}>
            <button
              onClick={() => setShowImageModal(true)}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: "white",
                color: "#374151",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="Insert Image"
            >
              <i className="fas fa-image"></i>
            </button>
            <button
              onClick={() => setShowVideoModal(true)}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: "white",
                color: "#374151",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="Insert Video"
            >
              <i className="fas fa-video"></i>
            </button>
          </div>

          {/* AI */}
          <div style={{ display: "flex", gap: "4px", borderRight: "1px solid #e1e3e5", paddingRight: "8px" }}>
            <button
              onClick={() => setShowAIModal(true)}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                background: "linear-gradient(45deg, #e8f5e8, #e3f2fd)",
                color: "#1976d2",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="AI Assistant"
            >
              <i className="fas fa-robot"></i>
            </button>
          </div>

          {/* Expand */}
          <div style={{ display: "flex", gap: "4px", marginLeft: "auto" }}>
            <button
              onClick={toggleExpanded}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: "white",
                color: "#374151",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title={isExpanded ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              <i className={`fas ${isExpanded ? 'fa-compress' : 'fa-expand'}`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div 
        className={`${isExpanded ? 'h-full overflow-auto' : 'min-h-[400px]'}`}
        style={{
          backgroundColor: "#fefefe",
          border: "2px solid #e1e3e5",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          margin: "0",
          padding: "0"
        }}
      >
        <EditorContent 
          editor={editor} 
          style={{
            backgroundColor: "#fefefe",
            minHeight: "400px",
            padding: "16px",
            border: "none",
            outline: "none",
            borderRadius: "0 0 8px 8px"
          }}
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