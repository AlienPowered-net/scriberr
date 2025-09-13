import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
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
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [showFormatPopover, setShowFormatPopover] = useState(false);
  const [showAlignPopover, setShowAlignPopover] = useState(false);
  const [showHeadingPopover, setShowHeadingPopover] = useState(false);
  const editorRef = useRef(null);
  const slashMenuRef = useRef(null);

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
        
        {/* Bubble Menu for selected text */}
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ duration: 100 }}
          className="notion-bubble-menu"
        >
          <ButtonGroup variant="segmented">
            <Button
              size="micro"
              pressed={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <TextIcon icon="bold" />
            </Button>
            <Button
              size="micro"
              pressed={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <TextIcon icon="italic" />
            </Button>
            <Button
              size="micro"
              pressed={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <TextIcon icon="underline" />
            </Button>
            <Button
              size="micro"
              pressed={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <TextIcon icon="strikethrough" />
            </Button>
            <Button
              size="micro"
              pressed={editor.isActive('code')}
              onClick={() => editor.chain().focus().toggleCode().run()}
            >
              <TextIcon icon="code" />
            </Button>
            <Button
              size="micro"
              pressed={editor.isActive('link')}
              onClick={() => setShowLinkModal(true)}
            >
              <TextIcon icon="link" />
            </Button>
          </ButtonGroup>
        </BubbleMenu>

        {/* Floating Menu for new blocks */}
        <FloatingMenu 
          editor={editor} 
          tippyOptions={{ duration: 100 }}
          className="notion-floating-menu"
        >
          <Button
            size="micro"
            onClick={() => {
              const coords = editor.view.coordsAtPos(editor.state.selection.from);
              setSlashMenuPosition({
                x: coords.left,
                y: coords.top + 20
              });
              setShowSlashMenu(true);
              setSlashMenuFilter('');
            }}
          >
            <TextIcon icon="plus" />
          </Button>
        </FloatingMenu>
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
        onClose={() => setShowAIModal(false)}
        title="AI Content Generator"
        primaryAction={{
          content: isGenerating ? 'Generating...' : 'Generate',
          onAction: generateAIContent,
          loading: isGenerating,
          variant: 'primary',
          tone: 'magic',
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowAIModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="4">
            <Box>
              <Icon source={MagicIcon} tone="magic" />
            </Box>
            <TextField
              label="What would you like AI to write about?"
              value={aiPrompt}
              onChange={setAIPrompt}
              placeholder="Write a blog post about sustainable technology..."
              multiline={3}
              autoComplete="off"
              helpText="Be specific about what you want AI to generate"
            />
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