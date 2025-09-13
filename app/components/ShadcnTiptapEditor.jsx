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
import TextAlign from '@tiptap/extension-text-align';
import { createLowlight } from 'lowlight';
import { Button, Text, Modal, TextField, Card, InlineStack, BlockStack } from '@shopify/polaris';
import { MagicIcon } from '@shopify/polaris-icons';
import { cn } from '../lib/utils';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Table,
  Wand2,
  Type,
  Eraser,
  CornerDownLeft,
} from 'lucide-react';

const ShadcnTiptapEditor = ({ value, onChange, placeholder = "Start writing..." }) => {
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
  
  // Register common languages
  useEffect(() => {
    const registerLanguages = async () => {
      try {
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
        blockquote: false,
        codeBlock: false,
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
      TextAlign.configure({
        types: ['heading', 'paragraph'],
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
        return false;
      },
      handleKeyDown: (view, event) => {
        return false;
      },
      handleDOMEvents: {
        click: (view, event) => {
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
        const coords = editor.view.coordsAtPos(from);
        setBubbleMenuPosition({
          x: coords.left,
          y: coords.top - 50
        });
        setShowBubbleMenu(true);
        setShowTableMenu(false);
      } else if (isInTable && hasSelection) {
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
        editor?.chain().focus().insertContent(`[AI Generated Content for: "${aiPrompt}"]`).run();
      }
    } catch (error) {
      console.error('AI generation error:', error);
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
      className={cn(
        "relative border rounded-lg bg-white transition-all duration-300",
        isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "w-full"
      )}
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
      <div className="border-b border-gray-200 p-2 bg-gray-50 rounded-t-lg">
        {/* Fullscreen Button - Top Right */}
        <button
          onClick={toggleExpanded}
          className="absolute top-2 right-2 p-1.5 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50 transition-all text-xs z-10"
          title={isExpanded ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isExpanded ? "⛶" : "⛶"}
        </button>
        
        <div className="flex flex-wrap gap-1 pr-12">
          {/* Text Formatting */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center",
              editor.isActive('bold') 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center",
              editor.isActive('italic') 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center",
              editor.isActive('underline') 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center",
              editor.isActive('strike') 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center",
              editor.isActive('code') 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Code"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            className="p-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all text-sm min-w-8 h-8 flex items-center justify-center"
            title="Clear Marks"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setHardBreak().run()}
            className="p-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all text-sm min-w-8 h-8 flex items-center justify-center"
            title="Hard Break"
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Paragraph and Headings */}
          <button
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center font-semibold",
              editor.isActive('paragraph') 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Paragraph"
          >
            P
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center font-semibold",
              editor.isActive('heading', { level: 1 }) 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Heading 1"
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center font-semibold",
              editor.isActive('heading', { level: 2 }) 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Heading 2"
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center font-semibold",
              editor.isActive('heading', { level: 3 }) 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Heading 3"
          >
            H3
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Lists */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center",
              editor.isActive('bulletList') 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center",
              editor.isActive('orderedList') 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Alignment */}
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center",
              editor.isActive({ textAlign: 'left' }) 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center",
              editor.isActive({ textAlign: 'center' }) 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center",
              editor.isActive({ textAlign: 'right' }) 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Insert Elements */}
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all text-sm min-w-8 h-8 flex items-center justify-center"
            title="Horizontal Rule"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center",
              editor.isActive('blockquote') 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center",
              editor.isActive('codeBlock') 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Code Block"
          >
            <Type className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLinkModal(true)}
            className={cn(
              "p-2 rounded border transition-all text-sm min-w-8 h-8 flex items-center justify-center",
              editor.isActive('link') 
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
            title="Insert Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowImageModal(true)}
            className="p-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all text-sm min-w-8 h-8 flex items-center justify-center"
            title="Insert Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="p-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all text-sm min-w-8 h-8 flex items-center justify-center"
            title="Insert Table"
          >
            <Table className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* History */}
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm min-w-8 h-8 flex items-center justify-center"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm min-w-8 h-8 flex items-center justify-center"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* AI Assistant */}
          <button
            onClick={() => setShowAIModal(true)}
            className="p-2 rounded border border-purple-500 bg-purple-500 text-white hover:bg-purple-600 transition-all text-sm min-w-8 h-8 flex items-center justify-center"
            title="AI Assistant"
          >
            <Wand2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div 
        className={cn(
          "bg-white rounded-b-lg border border-t-0 border-gray-200 cursor-text",
          isExpanded ? "h-full overflow-auto" : "min-h-[400px]"
        )}
        onClick={() => {
          if (editor) {
            editor.commands.focus();
          }
        }}
      >
        <EditorContent 
          editor={editor} 
          className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4 w-full cursor-text"
        />
        
        {/* Custom Bubble Menu for text selection */}
        {showBubbleMenu && editor && (
          <div
            className="bubble-menu fixed bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex gap-0.5 z-50"
            style={{
              left: bubbleMenuPosition.x,
              top: bubbleMenuPosition.y,
            }}
          >
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn(
                "p-1.5 rounded border-none transition-all text-xs",
                editor.isActive('bold') ? "bg-blue-100 text-blue-700" : "bg-transparent text-gray-600 hover:bg-gray-100"
              )}
              title="Bold"
            >
              <Bold className="w-3 h-3" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn(
                "p-1.5 rounded border-none transition-all text-xs",
                editor.isActive('italic') ? "bg-blue-100 text-blue-700" : "bg-transparent text-gray-600 hover:bg-gray-100"
              )}
              title="Italic"
            >
              <Italic className="w-3 h-3" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={cn(
                "p-1.5 rounded border-none transition-all text-xs",
                editor.isActive('strike') ? "bg-blue-100 text-blue-700" : "bg-transparent text-gray-600 hover:bg-gray-100"
              )}
              title="Strikethrough"
            >
              <Strikethrough className="w-3 h-3" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={cn(
                "p-1.5 rounded border-none transition-all text-xs",
                editor.isActive('underline') ? "bg-blue-100 text-blue-700" : "bg-transparent text-gray-600 hover:bg-gray-100"
              )}
              title="Underline"
            >
              <UnderlineIcon className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowLinkModal(true)}
              className={cn(
                "p-1.5 rounded border-none transition-all text-xs",
                editor.isActive('link') ? "bg-blue-100 text-blue-700" : "bg-transparent text-gray-600 hover:bg-gray-100"
              )}
              title="Link"
            >
              <LinkIcon className="w-3 h-3" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={cn(
                "p-1.5 rounded border-none transition-all text-xs",
                editor.isActive('blockquote') ? "bg-blue-100 text-blue-700" : "bg-transparent text-gray-600 hover:bg-gray-100"
              )}
              title="Quote"
            >
              <Quote className="w-3 h-3" />
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
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"
          onClick={toggleExpanded}
        />
      )}
    </div>
  );
};

export default ShadcnTiptapEditor;