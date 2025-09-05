import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { FloatingMenu as FloatingMenuExtension } from '@tiptap/extension-floating-menu';
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
import TableOfContents from '@tiptap/extension-table-of-contents';
import { createLowlight } from 'lowlight';
import { Button, Text, Modal, TextField, Card, InlineStack, BlockStack } from '@shopify/polaris';

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
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [floatingMenuPosition, setFloatingMenuPosition] = useState({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [headerColor, setHeaderColor] = useState('#f3f4f6');
  const [tempHeaderColor, setTempHeaderColor] = useState('#f3f4f6');
  const [tocItems, setTocItems] = useState([]);
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
      TableOfContents.configure({
        getIndex: (item, range) => range.from,
        onUpdate: (content) => {
          // Optional: handle table of contents updates
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
      FloatingMenuExtension.configure({
        shouldShow: ({ editor, view, state }) => {
          const { selection } = state;
          const { $anchor, empty } = selection;
          const isRootDepth = $anchor.depth === 1;
          const isEmptyTextBlock = $anchor.parent.isTextblock && !$anchor.parent.type.spec.code && !$anchor.parent.textContent;
          
          if (!view.hasFocus() || !empty || !isRootDepth || !isEmptyTextBlock || !editor.isEditable) {
            return false;
          }
          
          return true;
        },
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

  // Handle text selection for custom bubble menu
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      const isInTable = editor.isActive('table');
      const isEmpty = editor.isEmpty;
      
      if (hasSelection && !isInTable) {
        // Text selection bubble menu
        const coords = editor.view.coordsAtPos(from);
        setBubbleMenuPosition({
          x: coords.left,
          y: coords.top - 50
        });
        setShowBubbleMenu(true);
        setShowTableMenu(false);
        setShowFloatingMenu(false);
      } else if (isInTable && hasSelection) {
        // Text selection bubble menu in table (only when text is selected)
        const coords = editor.view.coordsAtPos(from);
        setBubbleMenuPosition({
          x: coords.left,
          y: coords.top - 50
        });
        setShowBubbleMenu(true);
        setShowTableMenu(false);
        setShowFloatingMenu(false);
      } else if (isEmpty && editor.isFocused) {
        // Floating menu for empty editor
        const coords = editor.view.coordsAtPos(from);
        setFloatingMenuPosition({
          x: coords.left,
          y: coords.top - 60 // Move up to avoid covering typing indicator
        });
        setShowFloatingMenu(true);
        setShowBubbleMenu(false);
        setShowTableMenu(false);
      } else {
        setShowBubbleMenu(false);
        setShowTableMenu(false);
        setShowFloatingMenu(false);
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

  // Handle TOC link clicks
  useEffect(() => {
    if (!editor) return;

    const handleTOCClick = (event) => {
      if (event.target.closest('.table-of-contents a')) {
        event.preventDefault();
        const link = event.target.closest('a');
        const anchorId = link.getAttribute('href').substring(1);
        scrollToAnchor(anchorId);
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener('click', handleTOCClick);
    
    return () => {
      editorElement.removeEventListener('click', handleTOCClick);
    };
  }, [editor, tocItems]);

  // Handle clicking outside to close color picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColorPicker && !event.target.closest('.table-menu')) {
        setShowColorPicker(false);
        setTempHeaderColor(headerColor);
      }
    };

    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showColorPicker, headerColor]);

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

  const updateTOCInEditor = () => {
    console.log('updateTOCInEditor called with items:', tocItems);
    if (tocItems.length === 0) return;
    
    const tocHTML = `
      <div class="table-of-contents">
        <h3>Table of Contents</h3>
        <ul>
          ${tocItems.map(item => `
            <li class="toc-level-${item.level}">
              <a href="#${item.id}">${item.text}</a>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
    
    console.log('Generated TOC HTML:', tocHTML);
    
    // Find and replace existing TOC or insert new one
    const existingTOC = editor.view.dom.querySelector('.table-of-contents');
    console.log('Existing TOC found:', existingTOC);
    
    if (existingTOC) {
      // Use editor commands to update content
      const tocPos = editor.view.posAtDOM(existingTOC, 0);
      const tocEndPos = editor.view.posAtDOM(existingTOC, existingTOC.childNodes.length);
      
      editor.chain()
        .focus()
        .setTextSelection({ from: tocPos, to: tocEndPos })
        .insertContent(tocHTML)
        .run();
    }
  };

  const scrollToAnchor = (anchorId) => {
    const element = editor.view.dom.querySelector(`[data-toc-anchor="${anchorId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the target briefly
      element.style.backgroundColor = '#fff3cd';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 2000);
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
      <div style={{ borderBottom: "1px solid #e1e3e5", padding: "12px", backgroundColor: "#f8f9fa", borderRadius: "8px 8px 0 0", position: "relative" }}>
        {/* Fullscreen Button - Top Right */}
        <button
          onClick={toggleExpanded}
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            padding: "8px 12px",
            border: "1px solid #e1e3e5",
            borderRadius: "6px",
            backgroundColor: "white",
            color: "#374151",
            cursor: "pointer",
            transition: "all 0.2s ease",
            fontSize: "14px",
            zIndex: 10
          }}
          title={isExpanded ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          <i className={`fas ${isExpanded ? 'fa-compress' : 'fa-expand'}`}></i>
        </button>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", paddingRight: "60px" }}>
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

          {/* Table & TOC */}
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
            <button
              onClick={() => {
                if (editor) {
                  const tocHTML = tocItems.length > 0 
                    ? `<div class="table-of-contents">
                         <h3>Table of Contents</h3>
                         <ul>
                           ${tocItems.map(item => `
                             <li class="toc-level-${item.level}">
                               <a href="#${item.id}" onclick="scrollToAnchor('${item.id}')">${item.text}</a>
                             </li>
                           `).join('')}
                         </ul>
                       </div>`
                    : `<div class="table-of-contents">
                         <h3>Table of Contents</h3>
                         <ul>
                           <li><em>No items yet. Highlight text and click the bookmark icon to add items.</em></li>
                         </ul>
                       </div>`;
                  
                  editor.chain().focus().insertContent(tocHTML).run();
                }
              }}
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
              title="Table of Contents"
            >
              <i className="far fa-newspaper"></i>
            </button>
          </div>

          {/* Media & Links */}
          <div style={{ display: "flex", gap: "4px", borderRight: "1px solid #e1e3e5", paddingRight: "8px" }}>
            <button
              onClick={() => setShowLinkModal(true)}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: editor.isActive('link') ? '#e3f2fd' : 'white',
                color: editor.isActive('link') ? '#1976d2' : '#374151',
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="Insert Link"
            >
              <i className="fas fa-link"></i>
            </button>
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

          {/* Advanced Formatting */}
          <div style={{ display: "flex", gap: "4px", borderRight: "1px solid #e1e3e5", paddingRight: "8px" }}>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: editor.isActive('blockquote') ? '#e3f2fd' : 'white',
                color: editor.isActive('blockquote') ? '#1976d2' : '#374151',
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="Blockquote"
            >
              <i className="fas fa-quote-left"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: editor.isActive('codeBlock') ? '#e3f2fd' : 'white',
                color: editor.isActive('codeBlock') ? '#1976d2' : '#374151',
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="Code Block"
            >
              <i className="fas fa-code"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
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
              title="Horizontal Rule"
            >
              <i className="fas fa-minus"></i>
            </button>
          </div>

          {/* Task Lists */}
          <div style={{ display: "flex", gap: "4px", borderRight: "1px solid #e1e3e5", paddingRight: "8px" }}>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              style={{
                padding: "8px 12px",
                border: "1px solid #e1e3e5",
                borderRadius: "6px",
                backgroundColor: editor.isActive('taskList') ? '#e3f2fd' : 'white',
                color: editor.isActive('taskList') ? '#1976d2' : '#374151',
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="Task List"
            >
              <i className="fas fa-tasks"></i>
            </button>
          </div>

          {/* AI */}
          <div style={{ display: "flex", gap: "4px", borderRight: "1px solid #e1e3e5", paddingRight: "8px" }}>
            <button
              onClick={() => setShowAIModal(true)}
              style={{
                padding: "8px 12px",
                border: "1px solid #16a34a",
                borderRadius: "6px",
                background: "linear-gradient(45deg, #dcfce7, #bbf7d0)",
                color: "#15803d",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px"
              }}
              title="AI Assistant"
            >
              <i className="fas fa-wand-magic-sparkles"></i>
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
        
        {/* Custom Floating Menu for empty editor */}
        {showFloatingMenu && editor && (
          <div
            style={{
              position: 'fixed',
              left: floatingMenuPosition.x,
              top: floatingMenuPosition.y,
              background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "8px 12px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              zIndex: 1000
            }}
          >
            <button
              onClick={() => {
                editor.chain().focus().toggleBold().run();
                setShowFloatingMenu(false);
              }}
              style={{
                padding: "6px 8px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                backgroundColor: editor?.isActive('bold') ? '#e3f2fd' : 'white',
                color: editor?.isActive('bold') ? '#1976d2' : '#374151',
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Bold"
            >
              <i className="fas fa-bold"></i>
            </button>
            <button
              onClick={() => {
                editor.chain().focus().toggleItalic().run();
                setShowFloatingMenu(false);
              }}
              style={{
                padding: "6px 8px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                backgroundColor: editor?.isActive('italic') ? '#e3f2fd' : 'white',
                color: editor?.isActive('italic') ? '#1976d2' : '#374151',
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Italic"
            >
              <i className="fas fa-italic"></i>
            </button>
            <button
              onClick={() => {
                editor.chain().focus().toggleUnderline().run();
                setShowFloatingMenu(false);
              }}
              style={{
                padding: "6px 8px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                backgroundColor: editor?.isActive('underline') ? '#e3f2fd' : 'white',
                color: editor?.isActive('underline') ? '#1976d2' : '#374151',
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Underline"
            >
              <i className="fas fa-underline"></i>
            </button>
            <button
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 1 }).run();
                setShowFloatingMenu(false);
              }}
              style={{
                padding: "6px 8px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                backgroundColor: editor?.isActive('heading', { level: 1 }) ? '#e3f2fd' : 'white',
                color: editor?.isActive('heading', { level: 1 }) ? '#1976d2' : '#374151',
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Heading 1"
            >
              <i className="fas fa-heading"></i>
            </button>
          </div>
        )}
        
        {/* Custom Bubble Menu for text selection */}
        {showBubbleMenu && editor && (
          <div
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
            <button
              onClick={() => {
                console.log('TOC button clicked');
                const selectedText = editor.state.doc.textBetween(
                  editor.state.selection.from,
                  editor.state.selection.to
                );
                console.log('Selected text:', selectedText);
                
                if (selectedText.trim()) {
                  const anchorId = `toc-${Date.now()}`;
                  console.log('Creating anchor:', anchorId);
                  
                  // Wrap selected text with anchor span
                  editor.chain().focus().insertContent(
                    `<span id="${anchorId}" data-toc-anchor="${anchorId}" style="background-color: rgba(255, 235, 59, 0.3);">${selectedText.trim()}</span>`
                  ).run();
                  
                  // Add to TOC items
                  const newTocItem = {
                    id: anchorId,
                    text: selectedText.trim(),
                    level: 1
                  };
                  console.log('Adding TOC item:', newTocItem);
                  setTocItems(prev => {
                    const updated = [...prev, newTocItem];
                    console.log('Updated TOC items:', updated);
                    return updated;
                  });
                  
                  // Update existing TOC in editor if it exists
                  setTimeout(() => {
                    updateTOCInEditor();
                  }, 100);
                }
                setShowBubbleMenu(false);
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
              title="Add to Table of Contents"
            >
              <i className="fas fa-bookmark"></i>
            </button>
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
                            const tableHeaders = editor.view.dom.querySelectorAll('th');
                            tableHeaders.forEach(th => {
                              th.style.backgroundColor = tempHeaderColor;
                              th.style.color = tempHeaderColor === '#f3f4f6' ? '#374151' : 'white';
                            });
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