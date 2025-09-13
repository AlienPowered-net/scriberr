import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Blockquote from '@tiptap/extension-blockquote';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Emoji } from '@tiptap/extension-emoji';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { createLowlight } from 'lowlight';
import { Button, Text, Modal, TextField, Card, InlineStack, BlockStack } from '@shopify/polaris';
import { MagicIcon } from '@shopify/polaris-icons';

const AdvancedRTE = ({ value, onChange, placeholder = "Start writing..." }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [aiPrompt, setAIPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBubbleMenu, setShowBubbleMenu] = useState(false);
  const [bubbleMenuPosition, setBubbleMenuPosition] = useState({ x: 0, y: 0 });
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableMenuPosition, setTableMenuPosition] = useState({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [headerColor, setHeaderColor] = useState('#f3f4f6');
  const [tempHeaderColor, setTempHeaderColor] = useState('#f3f4f6');
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [tempTextColor, setTempTextColor] = useState('#000000');
  const [showHeaderTextColorPicker, setShowHeaderTextColorPicker] = useState(false);
  const [headerTextColor, setHeaderTextColor] = useState('#000000');
  const [tempHeaderTextColor, setTempHeaderTextColor] = useState('#000000');
  const [showBorderColorPicker, setShowBorderColorPicker] = useState(false);
  const [borderColor, setBorderColor] = useState('#d1d5db');
  const [tempBorderColor, setTempBorderColor] = useState('#d1d5db');
  const editorRef = useRef(null);

  // Create lowlight instance for syntax highlighting
  const lowlight = createLowlight();
  
  // Register common languages (you can add more as needed)
  useEffect(() => {
    const registerLanguages = async () => {
      try {
        // Import and register common languages
        const { default: javascript } = await import('highlight.js/lib/languages/javascript');
        const { default: typescript } = await import('highlight.js/lib/languages/typescript');
        const { default: python } = await import('highlight.js/lib/languages/python');
        const { default: css } = await import('highlight.js/lib/languages/css');
        const { default: html } = await import('highlight.js/lib/languages/xml');
        const { default: json } = await import('highlight.js/lib/languages/json');
        
        lowlight.register('javascript', javascript);
        lowlight.register('typescript', typescript);
        lowlight.register('python', python);
        lowlight.register('css', css);
        lowlight.register('html', html);
        lowlight.register('json', json);
      } catch (error) {
        console.log('Some languages could not be loaded:', error);
      }
    };
    
    registerLanguages();
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        // Disable default blockquote since we're using the dedicated extension
        blockquote: false,
        // Disable default codeBlock since we're using CodeBlockLowlight
        codeBlock: false,
        // Disable default horizontalRule since we're using the dedicated extension
        horizontalRule: false,
      }),
      Blockquote,
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
      }),
      Emoji.configure({
        enableEmoticons: true,
      }),
      HorizontalRule,
      TableKit.configure({
        resizable: true,
        allowTableNodeSelection: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'custom-link',
        },
      }),
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
      Placeholder.configure({
        placeholder: placeholder,
        showOnlyWhenEditable: true,
        showOnlyCurrent: false,
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
        style: 'min-height: 300px; width: 100%; outline: none; cursor: text;',
      },
      handleClick: (view, pos, event) => {
        // Ensure the entire editor area is clickable and focuses properly
        return false;
      },
      handleKeyDown: (view, event) => {
        // Allow normal keyboard navigation and editing
        return false;
      },
      handleDOMEvents: {
        click: (view, event) => {
          // Focus the editor when clicking anywhere in the content area
          if (!view.hasFocus()) {
            view.focus();
          }
          return false;
        },
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // Handle text selection for custom bubble menu
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      const isInTable = editor.isActive('table');
      
      if (hasSelection && !isInTable) {
        // Text selection bubble menu
        const coords = editor.view.coordsAtPos(from);
        setBubbleMenuPosition({
          x: coords.left,
          y: coords.top - 50
        });
        setShowBubbleMenu(true);
        setShowTableMenu(false);
      } else if (isInTable && hasSelection) {
        // Text selection bubble menu in table (only when text is selected)
        const coords = editor.view.coordsAtPos(from);
        setBubbleMenuPosition({
          x: coords.left,
          y: coords.top - 50
        });
        setShowBubbleMenu(true);
        setShowTableMenu(false);
      } else {
        setShowBubbleMenu(false);
        setShowTableMenu(false);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor]);

  // Handle right-click for table cell menu
  useEffect(() => {
    if (!editor) return;

    const handleContextMenu = (event) => {
      if (!editor.isActive('table')) return;
      
      event.preventDefault();
      setTableMenuPosition({
        x: event.clientX,
        y: event.clientY
      });
      setShowTableMenu(true);
      setShowBubbleMenu(false);
      setShowFloatingMenu(false);
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      editorElement.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [editor]);


  // Handle clicking outside to close color pickers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColorPicker && !event.target.closest('.table-menu')) {
        setShowColorPicker(false);
        setTempHeaderColor(headerColor);
      }
      if (showTextColorPicker && !event.target.closest('.bubble-menu')) {
        setShowTextColorPicker(false);
        setTempTextColor(textColor);
      }
      if (showBorderColorPicker && !event.target.closest('.table-menu')) {
        setShowBorderColorPicker(false);
        setTempBorderColor(borderColor);
      }
    };

    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showColorPicker, headerColor, showTextColorPicker, textColor, showBorderColorPicker, borderColor]);

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

  const insertLink = () => {
    if (linkUrl && editor) {
      if (linkText) {
        editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run();
      } else {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }
      setLinkUrl('');
      setLinkText('');
      setShowLinkModal(false);
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
          maxWidth: 'calc(100vw - 40px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 10px 20px -5px rgba(0, 0, 0, 0.3)',
          borderRadius: '12px'
        })
      }}
      ref={editorRef}
    >
      {/* Toolbar */}
      <div style={{ 
        borderBottom: "1px solid #e1e5e9", 
        padding: "8px 12px", 
        backgroundColor: "#f8f9fa", 
        borderRadius: "8px 8px 0 0", 
        position: "relative"
      }}>
        {/* Fullscreen Button - Top Right */}
        <button
          onClick={toggleExpanded}
          style={{
            position: "absolute",
            top: "6px",
            right: "8px",
            padding: "6px 8px",
            border: "1px solid #dee2e6",
            borderRadius: "4px",
            backgroundColor: "white",
            color: "#495057",
            cursor: "pointer",
            transition: "all 0.2s ease",
            fontSize: "12px",
            zIndex: 10
          }}
          title={isExpanded ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          <i className={`fas ${isExpanded ? 'fa-compress' : 'fa-expand'}`}></i>
        </button>
        
        <div style={{ 
          display: "flex", 
          gap: "4px", 
          alignItems: "center", 
          paddingRight: "60px",
          flexWrap: "wrap"
        }}>
          {/* Text Formatting */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive('bold') ? '#007bff' : 'white',
              color: editor.isActive('bold') ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Bold"
          >
            <i className="fas fa-bold"></i>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive('italic') ? '#007bff' : 'white',
              color: editor.isActive('italic') ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Italic"
          >
            <i className="fas fa-italic"></i>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive('underline') ? '#007bff' : 'white',
              color: editor.isActive('underline') ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Underline"
          >
            <i className="fas fa-underline"></i>
          </button>
          
          <div style={{ width: "1px", height: "24px", backgroundColor: "#dee2e6", margin: "0 4px" }} />

          {/* Headings */}
          {[1, 2, 3].map((level) => (
            <button
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              style={{
                padding: "6px 8px",
                border: "1px solid #dee2e6",
                borderRadius: "4px",
                backgroundColor: editor.isActive('heading', { level }) ? '#007bff' : 'white',
                color: editor.isActive('heading', { level }) ? 'white' : '#495057',
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "12px",
                fontWeight: "600",
                minWidth: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title={`Heading ${level}`}
            >
              H{level}
            </button>
          ))}
          
          <div style={{ width: "1px", height: "24px", backgroundColor: "#dee2e6", margin: "0 4px" }} />

          {/* Lists */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive('bulletList') ? '#007bff' : 'white',
              color: editor.isActive('bulletList') ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Bullet List"
          >
            <i className="fas fa-list-ul"></i>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive('orderedList') ? '#007bff' : 'white',
              color: editor.isActive('orderedList') ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Numbered List"
          >
            <i className="fas fa-list-ol"></i>
          </button>
          
          <div style={{ width: "1px", height: "24px", backgroundColor: "#dee2e6", margin: "0 4px" }} />

          {/* Insert Elements */}
          <button
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: "white",
              color: "#495057",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Insert Table"
          >
            <i className="fas fa-table"></i>
          </button>
          <button
            onClick={() => setShowLinkModal(true)}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive('link') ? '#007bff' : 'white',
              color: editor.isActive('link') ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Insert Link"
          >
            <i className="fas fa-link"></i>
          </button>
          <button
            onClick={() => setShowImageModal(true)}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: "white",
              color: "#495057",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Insert Image"
          >
            <i className="fas fa-image"></i>
          </button>
          
          <div style={{ width: "1px", height: "24px", backgroundColor: "#dee2e6", margin: "0 4px" }} />

          {/* Advanced Formatting */}
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive('blockquote') ? '#007bff' : 'white',
              color: editor.isActive('blockquote') ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Blockquote"
          >
            <i className="fas fa-quote-left"></i>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive('codeBlock') ? '#007bff' : 'white',
              color: editor.isActive('codeBlock') ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Code Block"
          >
            <i className="fas fa-code"></i>
          </button>
          
          <div style={{ width: "1px", height: "24px", backgroundColor: "#dee2e6", margin: "0 4px" }} />

          {/* AI Assistant */}
          <button
            onClick={() => setShowAIModal(true)}
            style={{
              padding: "6px 8px",
              border: "1px solid #8052fe",
              borderRadius: "4px",
              backgroundColor: "#8052fe",
              color: "#ffffff",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="AI Assistant"
            onMouseEnter={(e) => e.target.style.backgroundColor = "#6d3dd8"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#8052fe"}
          >
            <MagicIcon style={{ color: "#ffffff", fill: "#ffffff" }} />
          </button>

        </div>
      </div>

      {/* Editor Content */}
      <div 
        className={`${isExpanded ? 'h-full overflow-auto' : 'min-h-[400px]'}`}
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "0 0 8px 8px",
          margin: "0",
          padding: "0",
          border: "1px solid #dee2e6",
          borderTop: "none",
          cursor: "text"
        }}
        onClick={() => {
          if (editor) {
            editor.commands.focus();
          }
        }}
      >
        <EditorContent 
          editor={editor} 
          style={{
            backgroundColor: "#ffffff",
            minHeight: "400px",
            padding: "16px 20px",
            border: "none",
            outline: "none",
            borderRadius: "0 0 8px 8px",
            fontSize: "14px",
            lineHeight: "1.5",
            color: "#212529",
            cursor: "text",
            width: "100%"
          }}
        />
        
        {/* Custom Bubble Menu for text selection */}
        {showBubbleMenu && editor && (
          <div
            className="bubble-menu"
            style={{
              position: 'fixed',
              left: bubbleMenuPosition.x,
              top: bubbleMenuPosition.y,
              backgroundColor: "white",
              border: "1px solid #e1e3e5",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              padding: "4px",
              display: "flex",
              gap: "2px",
              zIndex: 1000
            }}
          >
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: editor.isActive('bold') ? '#e3f2fd' : 'transparent',
                color: editor.isActive('bold') ? '#1976d2' : '#374151',
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Bold"
            >
              <i className="fas fa-bold"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: editor.isActive('italic') ? '#e3f2fd' : 'transparent',
                color: editor.isActive('italic') ? '#1976d2' : '#374151',
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Italic"
            >
              <i className="fas fa-italic"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: editor.isActive('strike') ? '#e3f2fd' : 'transparent',
                color: editor.isActive('strike') ? '#1976d2' : '#374151',
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Strikethrough"
            >
              <i className="fas fa-strikethrough"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: editor.isActive('underline') ? '#e3f2fd' : 'transparent',
                color: editor.isActive('underline') ? '#1976d2' : '#374151',
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Underline"
            >
              <i className="fas fa-underline"></i>
            </button>
            <button
              onClick={() => setShowLinkModal(true)}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: editor.isActive('link') ? '#e3f2fd' : 'transparent',
                color: editor.isActive('link') ? '#1976d2' : '#374151',
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Link"
            >
              <i className="fas fa-link"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: editor.isActive('blockquote') ? '#e3f2fd' : 'transparent',
                color: editor.isActive('blockquote') ? '#1976d2' : '#374151',
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Quote"
            >
              <i className="fas fa-quote-left"></i>
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  if (!showTextColorPicker) {
                    setTempTextColor(textColor);
                  }
                  setShowTextColorPicker(!showTextColorPicker);
                }}
                style={{
                  padding: "6px 8px",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: "transparent",
                  color: "#374151",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
                title="Text Color"
              >
                <i className="fas fa-palette"></i>
              </button>
              {showTextColorPicker && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '30px',
                    left: '-80px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1001,
                    minWidth: '240px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Text Color
                  </div>
                  
                  {/* Color Preview */}
                  <div style={{
                    width: '100%',
                    height: '32px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: tempTextColor,
                    fontWeight: '500'
                  }}>
                    Preview Text
                  </div>

                  {/* Color Wheel */}
                  <input
                    type="color"
                    value={tempTextColor}
                    onChange={(e) => {
                      setTempTextColor(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginBottom: '12px'
                    }}
                  />

                  {/* Hex Input */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '4px', 
                      fontSize: '12px', 
                      fontWeight: '500',
                      color: '#6b7280'
                    }}>
                      Hex Code
                    </label>
                    <input
                      type="text"
                      value={tempTextColor}
                      onChange={(e) => {
                        if (/^#[0-9A-F]{6}$/i.test(e.target.value) || e.target.value.length <= 7) {
                          setTempTextColor(e.target.value);
                        }
                      }}
                      placeholder="#000000"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  {/* Apply/Cancel Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setTextColor(tempTextColor);
                        // Apply color to selected text
                        if (editor) {
                          editor.chain().focus().setColor(tempTextColor).run();
                        }
                        setShowTextColorPicker(false);
                        setShowBubbleMenu(false);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => {
                        setTempTextColor(textColor);
                        setShowTextColorPicker(false);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Table Cell Bubble Menu for table manipulation */}
        {showTableMenu && editor && (
          <div
            className="table-menu"
            style={{
              position: 'fixed',
              left: tableMenuPosition.x,
              top: tableMenuPosition.y,
              backgroundColor: "white",
              border: "1px solid #e1e3e5",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              padding: "4px",
              display: "flex",
              gap: "2px",
              zIndex: 1000
            }}
          >
            <button
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: editor.isActive('tableHeader') ? '#e3f2fd' : 'transparent',
                color: editor.isActive('tableHeader') ? '#1976d2' : '#374151',
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Toggle Header Row"
            >
              <i className="fas fa-heading"></i>
            </button>
            {editor.isActive('tableHeader') && (
              <>
                <div style={{ width: "1px", height: "20px", backgroundColor: "#e5e7eb", margin: "0 4px" }} />
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => {
                      if (!showColorPicker) {
                        setTempHeaderColor(headerColor);
                      }
                      setShowColorPicker(!showColorPicker);
                    }}
                    style={{
                      padding: "4px 8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "3px",
                      backgroundColor: headerColor,
                      cursor: "pointer",
                      fontSize: "10px",
                      color: headerColor === '#f3f4f6' ? '#374151' : 'white'
                    }}
                    title="Header Color"
                  >
                    <i className="fas fa-palette"></i>
                  </button>
                  {showColorPicker && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: '30px',
                        left: '-80px',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        padding: '16px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1001,
                        minWidth: '240px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                        Header Color
                      </div>
                      
                      {/* Color Preview */}
                      <div style={{
                        width: '100%',
                        height: '32px',
                        backgroundColor: tempHeaderColor,
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: tempHeaderColor === '#f3f4f6' ? '#374151' : 'white',
                        fontWeight: '500'
                      }}>
                        Preview
                      </div>

                      {/* Color Wheel */}
                      <input
                        type="color"
                        value={tempHeaderColor}
                        onChange={(e) => {
                          setTempHeaderColor(e.target.value);
                        }}
                        style={{
                          width: '100%',
                          height: '48px',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginBottom: '12px'
                        }}
                      />

                      {/* Hex Input */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '4px', 
                          fontSize: '12px', 
                          fontWeight: '500',
                          color: '#6b7280'
                        }}>
                          Hex Code
                        </label>
                        <input
                          type="text"
                          value={tempHeaderColor}
                          onChange={(e) => {
                            if (/^#[0-9A-F]{6}$/i.test(e.target.value) || e.target.value.length <= 7) {
                              setTempHeaderColor(e.target.value);
                            }
                          }}
                          placeholder="#ffffff"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontFamily: 'monospace'
                          }}
                        />
                      </div>

                      {/* Apply/Cancel Buttons */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setHeaderColor(tempHeaderColor);
                            // Apply color to table headers
                            if (editor) {
                              console.log('Applying header color:', tempHeaderColor);
                              
                              // Method 1: Direct DOM manipulation with !important
                              const tableHeaders = editor.view.dom.querySelectorAll('th');
                              console.log('Found table headers:', tableHeaders.length);
                              
                              tableHeaders.forEach((th, index) => {
                                console.log(`Styling header ${index}:`, th);
                                const textColor = tempHeaderColor === '#f3f4f6' ? '#374151' : 'white';
                                
                                // Remove any existing background properties
                                th.style.setProperty('background', tempHeaderColor, 'important');
                                th.style.setProperty('background-color', tempHeaderColor, 'important');
                                th.style.setProperty('background-image', 'none', 'important');
                                th.style.setProperty('background-gradient', 'none', 'important');
                                th.style.setProperty('color', textColor, 'important');
                                th.style.setProperty('border', `1px solid ${tempHeaderColor}`, 'important');
                                th.style.setProperty('border-color', tempHeaderColor, 'important');
                                
                                // Also set the style attribute directly with comprehensive override
                                const newStyle = `
                                  background: ${tempHeaderColor} !important;
                                  background-color: ${tempHeaderColor} !important;
                                  background-image: none !important;
                                  background-gradient: none !important;
                                  color: ${textColor} !important;
                                  border: 1px solid ${tempHeaderColor} !important;
                                  border-color: ${tempHeaderColor} !important;
                                `.replace(/\s+/g, ' ').trim();
                                
                                th.setAttribute('style', newStyle);
                              });
                              
                              // Method 2: Add CSS class dynamically with comprehensive background override
                              const styleId = 'dynamic-table-header-style';
                              let styleElement = document.getElementById(styleId);
                              if (!styleElement) {
                                styleElement = document.createElement('style');
                                styleElement.id = styleId;
                                document.head.appendChild(styleElement);
                              }
                              
                              const textColor = tempHeaderColor === '#f3f4f6' ? '#374151' : 'white';
                              
                              styleElement.textContent = `
                                .ProseMirror table th {
                                  background: ${tempHeaderColor} !important;
                                  background-color: ${tempHeaderColor} !important;
                                  background-image: none !important;
                                  background-gradient: none !important;
                                  color: ${textColor} !important;
                                  border: 1px solid ${tempHeaderColor} !important;
                                  border-color: ${tempHeaderColor} !important;
                                }
                                
                                .ProseMirror table th:hover {
                                  background: ${tempHeaderColor} !important;
                                  background-color: ${tempHeaderColor} !important;
                                  background-image: none !important;
                                }
                              `;
                              
                              console.log('Applied styles and CSS');
                            }
                            setShowColorPicker(false);
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 16px',
                            backgroundColor: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => {
                            setTempHeaderColor(headerColor);
                            setShowColorPicker(false);
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 16px',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Text Color Picker for Table Headers */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  if (!showHeaderTextColorPicker) {
                    setTempHeaderTextColor(headerTextColor);
                  }
                  setShowHeaderTextColorPicker(!showHeaderTextColorPicker);
                }}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "3px",
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontSize: "10px",
                  color: "#374151"
                }}
                title="Text Color"
              >
                <i className="fas fa-font"></i>
              </button>
              {showHeaderTextColorPicker && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '30px',
                    left: '-80px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1001,
                    minWidth: '240px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Header Text Color
                  </div>
                  
                  {/* Color Preview */}
                  <div style={{
                    width: '100%',
                    height: '32px',
                    backgroundColor: headerColor,
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: tempHeaderTextColor,
                    fontWeight: '500'
                  }}>
                    Header Text
                  </div>

                  {/* Color Wheel */}
                  <input
                    type="color"
                    value={tempHeaderTextColor}
                    onChange={(e) => {
                      setTempHeaderTextColor(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginBottom: '12px'
                    }}
                  />

                  {/* Hex Input */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '4px', 
                      fontSize: '12px', 
                      fontWeight: '500',
                      color: '#6b7280'
                    }}>
                      Hex Code
                    </label>
                    <input
                      type="text"
                      value={tempHeaderTextColor}
                      onChange={(e) => {
                        if (/^#[0-9A-F]{6}$/i.test(e.target.value) || e.target.value.length <= 7) {
                          setTempHeaderTextColor(e.target.value);
                        }
                      }}
                      placeholder="#000000"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  {/* Apply/Cancel Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setHeaderTextColor(tempHeaderTextColor);
                        // Apply color to selected text in table headers
                        if (editor) {
                          editor.chain().focus().setColor(tempHeaderTextColor).run();
                        }
                        setShowHeaderTextColorPicker(false);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => {
                        setTempHeaderTextColor(headerTextColor);
                        setShowHeaderTextColorPicker(false);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Table Border Color Picker */}
            <div style={{ width: "1px", height: "20px", backgroundColor: "#e5e7eb", margin: "0 4px" }} />
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  if (!showBorderColorPicker) {
                    setTempBorderColor(borderColor);
                  }
                  setShowBorderColorPicker(!showBorderColorPicker);
                }}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "3px",
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontSize: "10px",
                  color: "#374151"
                }}
                title="Table Border Color"
              >
                <i className="fas fa-border-all"></i>
              </button>
              {showBorderColorPicker && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '30px',
                    left: '-80px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1001,
                    minWidth: '240px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Table Border Color
                  </div>
                  
                  {/* Color Preview */}
                  <div style={{
                    width: '100%',
                    height: '32px',
                    backgroundColor: 'white',
                    border: `2px solid ${tempBorderColor}`,
                    borderRadius: '6px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: '#374151',
                    fontWeight: '500'
                  }}>
                    Border Preview
                  </div>

                  {/* Color Wheel */}
                  <input
                    type="color"
                    value={tempBorderColor}
                    onChange={(e) => {
                      setTempBorderColor(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginBottom: '12px'
                    }}
                  />

                  {/* Hex Input */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '4px', 
                      fontSize: '12px', 
                      fontWeight: '500',
                      color: '#6b7280'
                    }}>
                      Hex Code
                    </label>
                    <input
                      type="text"
                      value={tempBorderColor}
                      onChange={(e) => {
                        if (/^#[0-9A-F]{6}$/i.test(e.target.value) || e.target.value.length <= 7) {
                          setTempBorderColor(e.target.value);
                        }
                      }}
                      placeholder="#d1d5db"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  {/* Apply/Cancel Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setBorderColor(tempBorderColor);
                        // Apply border color to entire table
                        if (editor) {
                          const tableElements = editor.view.dom.querySelectorAll('table, th, td');
                          
                          tableElements.forEach(element => {
                            element.style.setProperty('border-color', tempBorderColor, 'important');
                            element.style.setProperty('border', `1px solid ${tempBorderColor}`, 'important');
                          });
                          
                          // Also add CSS rule for persistence
                          const styleId = 'dynamic-table-border-style';
                          let styleElement = document.getElementById(styleId);
                          if (!styleElement) {
                            styleElement = document.createElement('style');
                            styleElement.id = styleId;
                            document.head.appendChild(styleElement);
                          }
                          
                          styleElement.textContent = `
                            .ProseMirror table, .ProseMirror table th, .ProseMirror table td {
                              border-color: ${tempBorderColor} !important;
                              border: 1px solid ${tempBorderColor} !important;
                            }
                          `;
                        }
                        setShowBorderColorPicker(false);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => {
                        setTempBorderColor(borderColor);
                        setShowBorderColorPicker(false);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Row Operations */}
            <button
              onClick={() => editor.chain().focus().addRowBefore().run()}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: "#dcfce7",
                color: "#15803d",
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Add Row Above"
            >
              <i className="far fa-square-caret-up"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().addRowAfter().run()}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: "#dcfce7",
                color: "#15803d",
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Add Row Below"
            >
              <i className="far fa-square-caret-down"></i>
            </button>
            
            {/* Column Operations */}
            <button
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: "#dcfce7",
                color: "#15803d",
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Add Column Left"
            >
              <i className="far fa-square-caret-left"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: "#dcfce7",
                color: "#15803d",
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Add Column Right"
            >
              <i className="far fa-square-caret-right"></i>
            </button>

            {/* Single Cell Operations */}
            <div style={{ width: "1px", height: "20px", backgroundColor: "#e5e7eb", margin: "0 4px" }} />
            <button
              onClick={() => {
                // Merge cells vertically to create single cell above
                if (editor.can().mergeCells()) {
                  editor.chain().focus().mergeCells().run();
                } else {
                  // If can't merge, add row and merge with current cell
                  editor.chain().focus().addRowBefore().run();
                  setTimeout(() => {
                    if (editor.can().mergeCells()) {
                      editor.chain().focus().mergeCells().run();
                    }
                  }, 100);
                }
              }}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Merge Cell Above"
            >
              <i className="fas fa-compress-arrows-alt"></i>↑
            </button>
            <button
              onClick={() => {
                // Merge cells vertically to create single cell below
                if (editor.can().mergeCells()) {
                  editor.chain().focus().mergeCells().run();
                } else {
                  // If can't merge, add row and merge with current cell
                  editor.chain().focus().addRowAfter().run();
                  setTimeout(() => {
                    if (editor.can().mergeCells()) {
                      editor.chain().focus().mergeCells().run();
                    }
                  }, 100);
                }
              }}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Merge Cell Below"
            >
              <i className="fas fa-compress-arrows-alt"></i>↓
            </button>
            <button
              onClick={() => {
                // Split merged cell
                editor.chain().focus().splitCell().run();
              }}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: "#fef3c7",
                color: "#92400e",
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Split Cell"
            >
              <i className="fas fa-expand-arrows-alt"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().deleteRow().run()}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Delete Row"
            >
              <i className="fas fa-trash"></i>Row
            </button>
            <button
              onClick={() => editor.chain().focus().deleteColumn().run()}
              style={{
                padding: "6px 8px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Delete Column"
            >
              <i className="fas fa-trash"></i>Col
            </button>
          </div>
        )}
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
        open={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        title="Insert Link"
        primaryAction={{
          content: 'Insert',
          onAction: insertLink,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowLinkModal(false),
          },
        ]}
      >
        <Modal.Section>
          <TextField
            label="Link URL"
            value={linkUrl}
            onChange={setLinkUrl}
            placeholder="https://example.com"
            autoComplete="off"
          />
          <div style={{ marginTop: '12px' }}>
            <TextField
              label="Link Text (optional)"
              value={linkText}
              onChange={setLinkText}
              placeholder="Click here"
              autoComplete="off"
              helpText="Leave empty to use selected text"
            />
          </div>
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
          className="fixed inset-0 z-40"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)"
          }}
          onClick={toggleExpanded}
        />
      )}
    </div>
  );
};

export default AdvancedRTE;