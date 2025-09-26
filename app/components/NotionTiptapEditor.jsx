import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import CharacterCount from '@tiptap/extension-character-count';
import TiptapDragHandle from './TiptapDragHandle';
import { createLowlight } from 'lowlight';
import { 
  Button, 
  Text, 
  Modal, 
  TextField, 
  Card, 
  InlineStack, 
  BlockStack,
  Popover,
  ActionList,
  Icon,
  Tooltip,
  ButtonGroup,
  Box,
  Badge
} from '@shopify/polaris';
import { 
  MagicIcon
} from '@shopify/polaris-icons';
import './NotionTiptapEditor.css';

// Simple icon component using emoji/text since many Polaris icons don't exist
const TextIcon = ({ icon }) => {
  const iconMap = {
    bold: '𝐁',
    italic: '𝐼',
    underline: 'U̲',
    strikethrough: 'S̶',
    code: '</>',
    link: '🔗',
    image: '🖼️',
    video: '📹',
    text: '¶',
    bulletList: '•',
    numberedList: '1.',
    checkbox: '☑',
    question: '?',
    alignLeft: '⬅',
    alignCenter: '⬛',
    alignRight: '➡',
    table: '⊞',
    horizontalDots: '•••',
    plus: '+',
    hashtag: '#',
    chevronDown: '▼',
    sort: '↕',
    type: 'Aa',
    quote: '❝'
  };
  
  return (
    <span style={{ 
      fontWeight: 'bold', 
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      height: '20px'
    }}>
      {iconMap[icon] || icon}
    </span>
  );
};

const NotionTiptapEditor = ({ value, onChange, placeholder = "Press '/' for commands..." }) => {
  const [showAIModal, setShowAIModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [slashMenuFilter, setSlashMenuFilter] = useState('');
  const [aiPrompt, setAIPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState('');
  const [showUseCaseSelection, setShowUseCaseSelection] = useState(true);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [showFormatPopover, setShowFormatPopover] = useState(false);
  const [showAlignPopover, setShowAlignPopover] = useState(false);
  const [showHeadingPopover, setShowHeadingPopover] = useState(false);
  const editorRef = useRef(null);
  const slashMenuRef = useRef(null);

  // AI Use Cases
  const aiUseCases = [
    {
      id: 'blog-post',
      title: 'Blog Post',
      description: 'Write engaging blog articles and long-form content',
      icon: '📝',
      prompt: 'Write a comprehensive blog post about'
    },
    {
      id: 'email',
      title: 'Email',
      description: 'Professional emails, newsletters, and communications',
      icon: '📧',
      prompt: 'Write a professional email about'
    },
    {
      id: 'social-media',
      title: 'Social Media',
      description: 'Posts for Twitter, LinkedIn, Instagram, and Facebook',
      icon: '📱',
      prompt: 'Write engaging social media content about'
    },
    {
      id: 'marketing',
      title: 'Marketing Copy',
      description: 'Ad copy, product descriptions, and sales content',
      icon: '🎯',
      prompt: 'Write compelling marketing copy for'
    },
    {
      id: 'spell-check',
      title: 'Spell Check',
      description: 'Check and correct spelling errors in your text',
      icon: '✅',
      prompt: 'Check and correct spelling errors in this text:'
    },
    {
      id: 'grammar-check',
      title: 'Grammar Check',
      description: 'Improve grammar, punctuation, and sentence structure',
      icon: '📚',
      prompt: 'Check and improve grammar in this text:'
    },
    {
      id: 'creative-writing',
      title: 'Creative Writing',
      description: 'Stories, poems, scripts, and creative content',
      icon: '✨',
      prompt: 'Write creative content about'
    },
    {
      id: 'business-doc',
      title: 'Business Document',
      description: 'Reports, proposals, and professional documents',
      icon: '📊',
      prompt: 'Write a professional business document about'
    },
    {
      id: 'product-description',
      title: 'Product Description',
      description: 'Compelling product descriptions and features',
      icon: '🛍️',
      prompt: 'Write a product description for'
    },
    {
      id: 'summary',
      title: 'Summary',
      description: 'Summarize long texts and extract key points',
      icon: '📋',
      prompt: 'Summarize this content:'
    }
  ];

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
          levels: [1, 2, 3],
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
          class: 'notion-link',
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
      CharacterCount.configure({
        limit: null, // No character limit
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'notion-editor',
      },
      handleKeyDown: (view, event) => {
        // Handle slash commands
        if (event.key === '/' && !showSlashMenu) {
          const coords = view.coordsAtPos(view.state.selection.from);
          setSlashMenuPosition({
            x: coords.left,
            y: coords.top + 20
          });
          setShowSlashMenu(true);
          setSlashMenuFilter('');
          return true;
        }
        
        // Close slash menu on Escape
        if (event.key === 'Escape' && showSlashMenu) {
          setShowSlashMenu(false);
          return true;
        }
        
        return false;
      },
    },
  });

  // Update content when value prop changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // Handle slash menu filter
  useEffect(() => {
    if (showSlashMenu) {
      const handleInput = (e) => {
        if (e.key.length === 1) {
          setSlashMenuFilter(prev => prev + e.key);
        } else if (e.key === 'Backspace') {
          setSlashMenuFilter(prev => prev.slice(0, -1));
        }
      };

      document.addEventListener('keydown', handleInput);
      return () => document.removeEventListener('keydown', handleInput);
    }
  }, [showSlashMenu]);

  // Close slash menu on click outside
  useEffect(() => {
    if (showSlashMenu) {
      const handleClickOutside = (e) => {
        if (slashMenuRef.current && !slashMenuRef.current.contains(e.target)) {
          setShowSlashMenu(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSlashMenu]);

  // Slash command items
  const slashCommands = [
    { 
      id: 'heading1',
      title: 'Heading 1',
      iconType: 'hashtag',
      description: 'Big section heading',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run()
    },
    { 
      id: 'heading2',
      title: 'Heading 2',
      iconType: 'hashtag',
      description: 'Medium section heading',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
    { 
      id: 'heading3',
      title: 'Heading 3',
      iconType: 'hashtag',
      description: 'Small section heading',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run()
    },
    { 
      id: 'paragraph',
      title: 'Text',
      iconType: 'text',
      description: 'Just start writing with plain text',
      action: () => editor.chain().focus().setParagraph().run()
    },
    { 
      id: 'bulletList',
      title: 'Bullet List',
      iconType: 'bulletList',
      description: 'Create a simple bullet list',
      action: () => editor.chain().focus().toggleBulletList().run()
    },
    { 
      id: 'numberedList',
      title: 'Numbered List',
      iconType: 'numberedList',
      description: 'Create a numbered list',
      action: () => editor.chain().focus().toggleOrderedList().run()
    },
    { 
      id: 'taskList',
      title: 'Task List',
      iconType: 'checkbox',
      description: 'Track tasks with checkboxes',
      action: () => editor.chain().focus().toggleTaskList().run()
    },
    { 
      id: 'quote',
      title: 'Quote',
      iconType: 'quote',
      description: 'Capture a quote',
      action: () => editor.chain().focus().toggleBlockquote().run()
    },
    { 
      id: 'code',
      title: 'Code',
      iconType: 'code',
      description: 'Capture a code snippet',
      action: () => editor.chain().focus().toggleCodeBlock().run()
    },
    { 
      id: 'table',
      title: 'Table',
      iconType: 'table',
      description: 'Add a table',
      action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
    { 
      id: 'image',
      title: 'Image',
      iconType: 'image',
      description: 'Upload or embed with a link',
      action: () => setShowImageModal(true)
    },
    { 
      id: 'video',
      title: 'Video',
      iconType: 'video',
      description: 'Embed a YouTube video',
      action: () => setShowVideoModal(true)
    },
    { 
      id: 'divider',
      title: 'Divider',
      iconType: 'horizontalDots',
      description: 'Visually divide sections',
      action: () => editor.chain().focus().setHorizontalRule().run()
    },
    { 
      id: 'ai',
      title: 'Ask AI to write',
      icon: MagicIcon,
      description: 'Generate content with AI',
      action: () => setShowAIModal(true),
      highlight: true
    },
  ];

  // Filter slash commands based on input
  const filteredCommands = slashCommands.filter(cmd => 
    cmd.title.toLowerCase().includes(slashMenuFilter.toLowerCase())
  );

  const handleSlashCommand = (command) => {
    setShowSlashMenu(false);
    setSlashMenuFilter('');
    command.action();
  };

  const generateAIContent = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      // Get the selected use case
      const useCase = aiUseCases.find(uc => uc.id === selectedUseCase);
      const enhancedPrompt = useCase ? `${useCase.prompt} ${aiPrompt}` : aiPrompt;
      
      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: enhancedPrompt }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Insert content and keep modal open briefly to show success
        editor?.chain().focus().insertContent(data.content).run();
        
        // Close modal after a short delay to show the content was inserted
        setTimeout(() => {
          setIsGenerating(false);
          setAIPrompt('');
          setSelectedUseCase('');
          setShowUseCaseSelection(true);
          setShowAIModal(false);
        }, 1000);
        return;
      } else {
        const errorData = await response.json();
        if (errorData.quotaExceeded) {
          // Handle quota exceeded error
          editor?.chain().focus().insertContent(`<p style="color: #dc2626; font-style: italic;">⚠️ AI service quota exceeded. The functionality is working correctly but requires quota to be available. Please try again later.</p>`).run();
        } else {
          // Fallback for other errors
          editor?.chain().focus().insertContent(`[AI Generated Content for: "${aiPrompt}"]`).run();
        }
      }
    } catch (error) {
      console.error('AI generation error:', error);
      // Fallback content
      editor?.chain().focus().insertContent(`[AI Generated Content for: "${aiPrompt}"]`).run();
    }
    
    // Only close modal if there was an error (success case handled above)
    setIsGenerating(false);
    setAIPrompt('');
    setSelectedUseCase('');
    setShowUseCaseSelection(true);
    setShowAIModal(false);
  };

  const handleUseCaseSelection = (useCaseId) => {
    setSelectedUseCase(useCaseId);
    setShowUseCaseSelection(false);
  };

  const resetAIModal = () => {
    setAIPrompt('');
    setSelectedUseCase('');
    setShowUseCaseSelection(true);
    setIsGenerating(false);
    setShowAIModal(false);
  };

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

  if (!editor) {
    return (
      <Card>
        <Card.Section>
          <Box padding="6">
            <Text variant="bodyMd" color="subdued">Loading editor...</Text>
          </Box>
        </Card.Section>
      </Card>
    );
  }

  return (
    <div className="notion-tiptap-container">
      {/* Toolbar - Notion-like minimal toolbar */}
      <div className="notion-toolbar">
        <InlineStack gap="2" align="start">
          {/* Basic formatting */}
          <ButtonGroup variant="segmented">
            <Tooltip content="Bold (⌘B)">
              <Button
                size="slim"
                pressed={editor.isActive('bold')}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <TextIcon icon="bold" />
              </Button>
            </Tooltip>
            <Tooltip content="Italic (⌘I)">
              <Button
                size="slim"
                pressed={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <TextIcon icon="italic" />
              </Button>
            </Tooltip>
            <Tooltip content="Underline (⌘U)">
              <Button
                size="slim"
                pressed={editor.isActive('underline')}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <TextIcon icon="underline" />
              </Button>
            </Tooltip>
            <Tooltip content="Strikethrough">
              <Button
                size="slim"
                pressed={editor.isActive('strike')}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <TextIcon icon="strikethrough" />
              </Button>
            </Tooltip>
          </ButtonGroup>

          {/* Heading dropdown */}
          <Popover
            active={showHeadingPopover}
            activator={
              <Button
                size="slim"
                disclosure
                onClick={() => setShowHeadingPopover(!showHeadingPopover)}
              >
                <TextIcon icon="type" />
                {editor.isActive('heading', { level: 1 }) ? 'H1' :
                 editor.isActive('heading', { level: 2 }) ? 'H2' :
                 editor.isActive('heading', { level: 3 }) ? 'H3' : 'Text'}
              </Button>
            }
            onClose={() => setShowHeadingPopover(false)}
          >
            <ActionList
              items={[
                {
                  content: 'Text',
                  active: editor.isActive('paragraph'),
                  onAction: () => {
                    editor.chain().focus().setParagraph().run();
                    setShowHeadingPopover(false);
                  }
                },
                {
                  content: 'Heading 1',
                  active: editor.isActive('heading', { level: 1 }),
                  onAction: () => {
                    editor.chain().focus().toggleHeading({ level: 1 }).run();
                    setShowHeadingPopover(false);
                  }
                },
                {
                  content: 'Heading 2',
                  active: editor.isActive('heading', { level: 2 }),
                  onAction: () => {
                    editor.chain().focus().toggleHeading({ level: 2 }).run();
                    setShowHeadingPopover(false);
                  }
                },
                {
                  content: 'Heading 3',
                  active: editor.isActive('heading', { level: 3 }),
                  onAction: () => {
                    editor.chain().focus().toggleHeading({ level: 3 }).run();
                    setShowHeadingPopover(false);
                  }
                },
              ]}
            />
          </Popover>

          {/* Lists */}
          <ButtonGroup variant="segmented">
            <Tooltip content="Bullet List">
              <Button
                size="slim"
                pressed={editor.isActive('bulletList')}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <TextIcon icon="bulletList" />
              </Button>
            </Tooltip>
            <Tooltip content="Numbered List">
              <Button
                size="slim"
                pressed={editor.isActive('orderedList')}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <TextIcon icon="numberedList" />
              </Button>
            </Tooltip>
            <Tooltip content="Task List">
              <Button
                size="slim"
                pressed={editor.isActive('taskList')}
                onClick={() => editor.chain().focus().toggleTaskList().run()}
              >
                <TextIcon icon="checkbox" />
              </Button>
            </Tooltip>
          </ButtonGroup>

          {/* Text alignment */}
          <Popover
            active={showAlignPopover}
            activator={
              <Button
                size="slim"
                disclosure
                onClick={() => setShowAlignPopover(!showAlignPopover)}
              >
                <TextIcon icon="alignLeft" />
              </Button>
            }
            onClose={() => setShowAlignPopover(false)}
          >
            <ActionList
              items={[
                {
                  content: 'Align Left',
                  prefix: <TextIcon icon="alignLeft" />,
                  active: editor.isActive({ textAlign: 'left' }),
                  onAction: () => {
                    editor.chain().focus().setTextAlign('left').run();
                    setShowAlignPopover(false);
                  }
                },
                {
                  content: 'Align Center',
                  prefix: <TextIcon icon="alignCenter" />,
                  active: editor.isActive({ textAlign: 'center' }),
                  onAction: () => {
                    editor.chain().focus().setTextAlign('center').run();
                    setShowAlignPopover(false);
                  }
                },
                {
                  content: 'Align Right',
                  prefix: <TextIcon icon="alignRight" />,
                  active: editor.isActive({ textAlign: 'right' }),
                  onAction: () => {
                    editor.chain().focus().setTextAlign('right').run();
                    setShowAlignPopover(false);
                  }
                },
              ]}
            />
          </Popover>

          {/* More formatting */}
          <Popover
            active={showFormatPopover}
            activator={
              <Button
                size="slim"
                disclosure
                onClick={() => setShowFormatPopover(!showFormatPopover)}
              >
                <TextIcon icon="horizontalDots" />
              </Button>
            }
            onClose={() => setShowFormatPopover(false)}
          >
            <ActionList
              sections={[
                {
                  title: 'Insert',
                  items: [
                    {
                      content: 'Link',
                      prefix: <TextIcon icon="link" />,
                      onAction: () => {
                        setShowLinkModal(true);
                        setShowFormatPopover(false);
                      }
                    },
                    {
                      content: 'Image',
                      prefix: <TextIcon icon="image" />,
                      onAction: () => {
                        setShowImageModal(true);
                        setShowFormatPopover(false);
                      }
                    },
                    {
                      content: 'Video',
                      prefix: <TextIcon icon="video" />,
                      onAction: () => {
                        setShowVideoModal(true);
                        setShowFormatPopover(false);
                      }
                    },
                    {
                      content: 'Table',
                      prefix: <TextIcon icon="table" />,
                      onAction: () => {
                        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                        setShowFormatPopover(false);
                      }
                    },
                  ]
                },
                {
                  title: 'Blocks',
                  items: [
                    {
                      content: 'Quote',
                      prefix: <TextIcon icon="quote" />,
                      active: editor.isActive('blockquote'),
                      onAction: () => {
                        editor.chain().focus().toggleBlockquote().run();
                        setShowFormatPopover(false);
                      }
                    },
                    {
                      content: 'Code Block',
                      prefix: <TextIcon icon="code" />,
                      active: editor.isActive('codeBlock'),
                      onAction: () => {
                        editor.chain().focus().toggleCodeBlock().run();
                        setShowFormatPopover(false);
                      }
                    },
                    {
                      content: 'Divider',
                      prefix: <TextIcon icon="horizontalDots" />,
                      onAction: () => {
                        editor.chain().focus().setHorizontalRule().run();
                        setShowFormatPopover(false);
                      }
                    },
                  ]
                }
              ]}
            />
          </Popover>

          {/* AI Magic Button - with Polaris magic theme */}
          <div className="notion-ai-button-wrapper">
            <Button
              variant="primary"
              tone="magic"
              size="slim"
              onClick={() => setShowAIModal(true)}
              icon={MagicIcon}
            >
              Ask AI
            </Button>
          </div>
        </InlineStack>
      </div>

      {/* Editor Content */}
      <div className="notion-editor-wrapper" ref={editorRef}>
        <EditorContent editor={editor} />
        {editor && <TiptapDragHandle editor={editor} />}
        
        {/* Character Count */}
        {editor && (
          <div className="notion-character-count">
            <Text variant="bodySm" color="subdued">
              {editor.storage.characterCount.characters()} characters • {editor.storage.characterCount.words()} words
            </Text>
          </div>
        )}
      </div>

      {/* Slash Command Menu */}
      {showSlashMenu && (
        <div 
          className="notion-slash-menu"
          style={{
            position: 'fixed',
            left: slashMenuPosition.x,
            top: slashMenuPosition.y,
            zIndex: 1000
          }}
          ref={slashMenuRef}
        >
          <Card>
            <Card.Section>
              {slashMenuFilter && (
                <Box paddingBlockEnd="2">
                  <Text variant="bodySm" color="subdued">
                    Filtering: "{slashMenuFilter}"
                  </Text>
                </Box>
              )}
              <BlockStack gap="1">
                {filteredCommands.map((command) => (
                  <button
                    key={command.id}
                    className={`notion-slash-command ${command.highlight ? 'highlight' : ''}`}
                    onClick={() => handleSlashCommand(command)}
                  >
                    <InlineStack gap="3" align="start" blockAlign="center">
                      <div className="notion-slash-icon">
                        {command.icon ? (
                          <Icon source={command.icon} color={command.highlight ? 'magic' : 'base'} />
                        ) : (
                          <TextIcon icon={command.iconType} />
                        )}
                      </div>
                      <BlockStack gap="1">
                        <Text variant="bodyMd" fontWeight="medium">
                          {command.title}
                        </Text>
                        <Text variant="bodySm" color="subdued">
                          {command.description}
                        </Text>
                      </BlockStack>
                      {command.highlight && (
                        <Badge tone="magic">AI</Badge>
                      )}
                    </InlineStack>
                  </button>
                ))}
              </BlockStack>
            </Card.Section>
          </Card>
        </div>
      )}

      {/* Modals */}
      <Modal
        open={showAIModal}
        onClose={resetAIModal}
        title="AI Content Generator"
        primaryAction={!showUseCaseSelection ? {
          content: isGenerating ? 'Generating...' : 'Generate',
          onAction: generateAIContent,
          loading: isGenerating,
          variant: 'primary',
          tone: 'magic',
          disabled: !aiPrompt.trim(),
        } : undefined}
        secondaryActions={[
          {
            content: showUseCaseSelection ? 'Cancel' : 'Back',
            onAction: showUseCaseSelection ? resetAIModal : () => setShowUseCaseSelection(true),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="4">
            <Box>
              <Icon source={MagicIcon} tone="magic" />
            </Box>
            
            {showUseCaseSelection ? (
              <>
                <Text variant="headingMd">What would you like to create?</Text>
                <Text variant="bodyMd" color="subdued">
                  Choose a use case to help AI generate the perfect content for your needs.
                </Text>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '12px',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {aiUseCases.map((useCase) => (
                    <button
                      key={useCase.id}
                      onClick={() => handleUseCaseSelection(useCase.id)}
                      style={{
                        padding: '16px',
                        border: '2px solid #e1e5e9',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        minHeight: '100px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.borderColor = '#8052fe';
                        e.target.style.backgroundColor = '#f8f6ff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.borderColor = '#e1e5e9';
                        e.target.style.backgroundColor = 'white';
                      }}
                    >
                      <div style={{ fontSize: '24px' }}>{useCase.icon}</div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                          {useCase.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {useCase.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Text variant="headingMd">
                  {aiUseCases.find(uc => uc.id === selectedUseCase)?.title} Generation
                </Text>
                <Text variant="bodyMd" color="subdued">
                  {aiUseCases.find(uc => uc.id === selectedUseCase)?.description}
                </Text>
                
                <TextField
                  label="What would you like AI to write about?"
                  value={aiPrompt}
                  onChange={setAIPrompt}
                  placeholder={`${aiUseCases.find(uc => uc.id === selectedUseCase)?.prompt}...`}
                  multiline={3}
                  autoComplete="off"
                  helpText="Be specific about what you want AI to generate"
                />
              </>
            )}
          </BlockStack>
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
          <BlockStack gap="4">
            <TextField
              label="Link URL"
              value={linkUrl}
              onChange={setLinkUrl}
              placeholder="https://example.com"
              autoComplete="off"
            />
            <TextField
              label="Link Text (optional)"
              value={linkText}
              onChange={setLinkText}
              placeholder="Click here"
              autoComplete="off"
              helpText="Leave empty to use selected text"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

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
            helpText="Enter the URL of the image you want to embed"
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
            helpText="Paste a YouTube video URL"
          />
        </Modal.Section>
      </Modal>
    </div>
  );
};

export default NotionTiptapEditor;