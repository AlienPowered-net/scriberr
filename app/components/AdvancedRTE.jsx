import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
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
import { EntityMention } from './EntityMention';
import { FontFamily } from '@tiptap/extension-font-family';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import CharacterCount from '@tiptap/extension-character-count';
import { LineHeight } from './LineHeightExtension';
import TiptapDragHandle from './TiptapDragHandle';
import { createLowlight } from 'lowlight';
import { Button, Text, Modal, TextField, Card, InlineStack, BlockStack, Spinner, SkeletonBodyText, SkeletonDisplayText, Icon, Popover, ActionList, Tooltip, ButtonGroup, Badge } from '@shopify/polaris';
import { 
  CheckboxIcon,
  SmileyHappyIcon,
  LogoYoutubeIcon,
  EditIcon,
  TextColorIcon,
  TextFontIcon,
  UndoIcon,
  RedoIcon,
  MegaphoneIcon,
  ProductIcon,
  VariantIcon,
  OrderIcon,
  PersonIcon,
  CollectionIcon,
  DiscountIcon,
  OrderDraftIcon,
  ProfileIcon,
  MeasurementSizeIcon,
  ClockIcon
} from '@shopify/polaris-icons';

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
    lineHeight: <MeasurementSizeIcon />,
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

// Helper functions for entity mentions
const getEntityIcon = (type) => {
  const icons = {
    product: ProductIcon,
    variant: VariantIcon,
    order: OrderIcon,
    customer: PersonIcon,
    collection: CollectionIcon,
    discount: DiscountIcon,
    draftOrder: OrderDraftIcon,
    person: ProfileIcon
  };
  return icons[type] || ProfileIcon;
};

const getEntityIconElement = (type) => {
  const IconComponent = getEntityIcon(type);
  
  // Create a container for the React-rendered Polaris icon
  const container = document.createElement('span');
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  container.style.width = '20px';
  container.style.height = '20px';
  container.style.flexShrink = '0';
  
  // Render the Polaris Icon component using createRoot
  const iconElement = React.createElement(Icon, { 
    source: IconComponent, 
    tone: 'base'
  });
  
  const root = createRoot(container);
  root.render(iconElement);
  
  return container;
};

const getEntityColor = (type) => {
  const colors = {
    product: '#e3f2fd',
    variant: '#f3e5f5',
    order: '#fff3e0',
    customer: '#e8f5e9',
    collection: '#fce4ec',
    discount: '#fff9c4',
    draftOrder: '#f1f8e9',
    person: '#e0f2f1'
  };
  return colors[type] || '#f5f5f5';
};

const getMetadataPreview = (type, metadata) => {
  if (!metadata) return '';
  
  switch (type) {
    case 'product':
      return `${metadata.handle || ''} • ${metadata.status || ''}`;
    case 'variant':
      return metadata.sku ? `SKU: ${metadata.sku}` : '';
    case 'order':
      return `${metadata.customer || ''} • ${metadata.financialStatus || ''}`;
    case 'customer':
      return `${metadata.email || ''} • ${metadata.numberOfOrders || 0} orders`;
    case 'collection':
      return `${metadata.productsCount || 0} products`;
    case 'discount':
      return metadata.code ? `Code: ${metadata.code}` : '';
    case 'draftOrder':
      return `${metadata.customer || ''} • ${metadata.status || ''}`;
    case 'person':
      return metadata.email || '';
    default:
      return '';
  }
};

const AdvancedRTE = ({ value, onChange, placeholder = "Start writing...", isMobileProp = false, onFullscreenChange, noteId, onVersionCreated }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showLineHeightPopover, setShowLineHeightPopover] = useState(false);
  const [showVersionPopover, setShowVersionPopover] = useState(false);
  const [versions, setVersions] = useState([]);
  const [lastAutoVersion, setLastAutoVersion] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ lastChange: null, lastVersion: null });
  const autoVersionIntervalRef = useRef(null);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPage, setEmojiPage] = useState(0);
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontFamilyPicker, setShowFontFamilyPicker] = useState(false);
  const [showToolbarTextColorPicker, setShowToolbarTextColorPicker] = useState(false);
  const [tempBorderColor, setTempBorderColor] = useState('#d1d5db');
  const [isMobile, setIsMobile] = useState(false);
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

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Check on mount
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cleanup effect to restore body overflow when component unmounts
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('editor-fullscreen-active');
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        // Disable default extensions to avoid conflicts
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        // Use StarterKit's built-in history instead of custom extension
        history: {
          depth: 100,
          newGroupDelay: 500,
        },
      }),
      Blockquote,
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
      }),
      Emoji.configure({
        enableEmoticons: true,
      }),
      EntityMention.configure({
        HTMLAttributes: {
          class: 'entity-mention',
        },
        suggestion: {
          items: async ({ query }) => {
            try {
              const results = [];
              
              // Fetch Shopify entities
              const entitiesResponse = await fetch(`/api/shopify-entities?query=${encodeURIComponent(query || '')}&type=all`);
              const entitiesData = await entitiesResponse.json();
              
              if (entitiesData.success && entitiesData.results) {
                const { products, orders, customers, collections, discounts, draftOrders } = entitiesData.results;
                
                // Add products
                products.forEach(product => {
                  results.push({
                    id: product.id,
                    label: product.title,
                    type: 'product',
                    url: product.adminUrl,
                    metadata: {
                      handle: product.handle,
                      status: product.status,
                      image: product.image
                    }
                  });
                  
                  // Add product variants
                  if (product.variants && product.variants.length > 0) {
                    product.variants.forEach(variant => {
                      if (variant.sku || variant.title !== 'Default Title') {
                        results.push({
                          id: variant.id,
                          label: `${product.title} - ${variant.title}`,
                          type: 'variant',
                          url: variant.adminUrl,
                          metadata: {
                            sku: variant.sku,
                            displayName: variant.displayName
                          }
                        });
                      }
                    });
                  }
                });
                
                // Add orders
                orders.forEach(order => {
                  results.push({
                    id: order.id,
                    label: order.name,
                    type: 'order',
                    url: order.adminUrl,
                    metadata: {
                      customer: order.customerName,
                      financialStatus: order.financialStatus,
                      fulfillmentStatus: order.fulfillmentStatus,
                      totalPrice: order.totalPrice,
                      currency: order.currency
                    }
                  });
                });
                
                // Add customers
                customers.forEach(customer => {
                  results.push({
                    id: customer.id,
                    label: customer.displayName || customer.email,
                    type: 'customer',
                    url: customer.adminUrl,
                    metadata: {
                      email: customer.email,
                      phone: customer.phone,
                      numberOfOrders: customer.numberOfOrders
                    }
                  });
                });
                
                // Add collections
                collections.forEach(collection => {
                  results.push({
                    id: collection.id,
                    label: collection.title,
                    type: 'collection',
                    url: collection.adminUrl,
                    metadata: {
                      handle: collection.handle,
                      productsCount: collection.productsCount
                    }
                  });
                });
                
                // Add discounts
                discounts.forEach(discount => {
                  results.push({
                    id: discount.id,
                    label: discount.title || discount.code,
                    type: 'discount',
                    url: discount.adminUrl,
                    metadata: {
                      code: discount.code,
                      status: discount.status
                    }
                  });
                });
                
                // Add draft orders
                draftOrders.forEach(draftOrder => {
                  results.push({
                    id: draftOrder.id,
                    label: draftOrder.name,
                    type: 'draftOrder',
                    url: draftOrder.adminUrl,
                    metadata: {
                      customer: draftOrder.customerName,
                      status: draftOrder.status,
                      totalPrice: draftOrder.totalPrice,
                      currency: draftOrder.currency
                    }
                  });
                });
              }

              // Fetch custom mentions (people)
              const mentionsResponse = await fetch('/api/custom-mentions');
              const mentionsData = await mentionsResponse.json();
              
              if (mentionsData.success && mentionsData.mentions && mentionsData.mentions.length > 0) {
                mentionsData.mentions.forEach(mention => {
                  const searchText = `${mention.name} ${mention.email}`.toLowerCase();
                  if (!query || searchText.includes(query.toLowerCase())) {
                    results.push({
                      id: mention.id,
                      label: mention.name,
                      type: 'person',
                      metadata: {
                        email: mention.email
                      }
                    });
                  }
                });
              }
              
              // Limit results
              const filtered = results.slice(0, 15);
              
              return filtered.length > 0 ? filtered : [{ id: 'no-results', label: 'No matches found. Try a different search.', disabled: true }];
            } catch (error) {
              console.error('Error fetching entity mentions:', error);
              return [{ id: 'error', label: 'Error loading mentions', disabled: true }];
            }
          },
          render: () => {
            let component;
            let componentId = 'mention-suggestions-' + Date.now();

            return {
              onStart: props => {
                // Remove any existing orphaned components first
                const existingComponents = document.querySelectorAll('.entity-mention-suggestions');
                existingComponents.forEach(el => el.remove());
                
                component = document.createElement('div');
                component.className = 'entity-mention-suggestions';
                component.id = componentId;
                component.style.cssText = `
                  position: fixed;
                  background: white;
                  border: 1px solid #dee2e6;
                  border-radius: 8px;
                  padding: 8px;
                  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
                  z-index: 10000;
                  max-height: 300px;
                  overflow-y: auto;
                  min-width: 280px;
                  max-width: 400px;
                `;

                // Show loading skeletons if no items yet
                if (!props.items || props.items.length === 0) {
                  const loadingDiv = document.createElement('div');
                  loadingDiv.style.cssText = 'padding: 16px; width: 100%; display: flex; align-items: center; gap: 12px;';
                  
                  const skeletonRoot = createRoot(loadingDiv);
                  skeletonRoot.render(
                    React.createElement(InlineStack, { gap: '3', align: 'start', blockAlign: 'center' }, [
                      React.createElement(Spinner, { key: 'spinner', size: 'small' }),
                      React.createElement('div', { key: 'skeleton', style: { flex: 1 } },
                        React.createElement(SkeletonDisplayText, { size: 'small' })
                      )
                    ])
                  );
                  
                  component.appendChild(loadingDiv);
                  document.body.appendChild(component);
                  
                  if (props.clientRect) {
                    const rect = props.clientRect();
                    component.style.left = `${rect.left}px`;
                    component.style.top = `${rect.bottom + 8}px`;
                  }
                  
                  // Auto-remove after 10 seconds if still showing (prevents stuck loading)
                  setTimeout(() => {
                    if (component && component.parentElement) {
                      console.log('[Mention Suggestion] Timeout reached - removing stuck loading component');
                      component.remove();
                      component = null;
                    }
                  }, 10000);
                  
                  return;
                }

                props.items.forEach((item, index) => {
                  const button = document.createElement('button');
                  button.className = 'entity-mention-item';
                  button.disabled = item.disabled || false;
                  
                  const bgColor = getEntityColor(item.type);
                  
                  // Create container div
                  const container = document.createElement('div');
                  container.style.cssText = 'display: flex; align-items: center; gap: 10px;';
                  
                  // Add icon
                  if (item.type) {
                    const iconElement = getEntityIconElement(item.type);
                    container.appendChild(iconElement);
                  }
                  
                  // Create content wrapper
                  const contentDiv = document.createElement('div');
                  contentDiv.style.cssText = 'flex: 1; min-width: 0;';
                  
                  // Add label
                  const labelDiv = document.createElement('div');
                  labelDiv.style.cssText = 'font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                  labelDiv.textContent = item.label;
                  contentDiv.appendChild(labelDiv);
                  
                  // Add metadata if exists
                  const metadata = getMetadataPreview(item.type, item.metadata);
                  if (metadata) {
                    const metadataDiv = document.createElement('div');
                    metadataDiv.style.cssText = 'font-size: 11px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                    metadataDiv.textContent = metadata;
                    contentDiv.appendChild(metadataDiv);
                  }
                  
                  container.appendChild(contentDiv);
                  button.appendChild(container);
                  
                  button.style.cssText = `
                    display: block;
                    width: 100%;
                    text-align: left;
                    padding: 10px;
                    border: none;
                    background: ${index === props.selectedIndex && !item.disabled ? bgColor : 'transparent'};
                    cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
                    opacity: ${item.disabled ? '0.6' : '1'};
                    border-radius: 6px;
                    transition: background 0.15s;
                    font-size: 13px;
                  `;
                  
                  if (!item.disabled) {
                    button.addEventListener('click', () => props.command({ 
                      id: item.id, 
                      label: item.label,
                      type: item.type,
                      url: item.url,
                      metadata: item.metadata
                    }));
                    button.addEventListener('mouseenter', () => {
                      button.style.background = getEntityColor(item.type);
                    });
                    button.addEventListener('mouseleave', () => {
                      button.style.background = index === props.selectedIndex ? getEntityColor(item.type) : 'transparent';
                    });
                  }
                  component.appendChild(button);
                });

                document.body.appendChild(component);

                if (props.clientRect) {
                  const rect = props.clientRect();
                  component.style.left = `${rect.left}px`;
                  component.style.top = `${rect.bottom + 8}px`;
                }
              },
              onUpdate(props) {
                if (!component) return;

                component.innerHTML = '';
                props.items.forEach((item, index) => {
                  const button = document.createElement('button');
                  button.className = 'entity-mention-item';
                  button.disabled = item.disabled || false;
                  
                  const bgColor = getEntityColor(item.type);
                  
                  // Create container div
                  const container = document.createElement('div');
                  container.style.cssText = 'display: flex; align-items: center; gap: 10px;';
                  
                  // Add icon
                  if (item.type) {
                    const iconElement = getEntityIconElement(item.type);
                    container.appendChild(iconElement);
                  }
                  
                  // Create content wrapper
                  const contentDiv = document.createElement('div');
                  contentDiv.style.cssText = 'flex: 1; min-width: 0;';
                  
                  // Add label
                  const labelDiv = document.createElement('div');
                  labelDiv.style.cssText = 'font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                  labelDiv.textContent = item.label;
                  contentDiv.appendChild(labelDiv);
                  
                  // Add metadata if exists
                  const metadata = getMetadataPreview(item.type, item.metadata);
                  if (metadata) {
                    const metadataDiv = document.createElement('div');
                    metadataDiv.style.cssText = 'font-size: 11px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                    metadataDiv.textContent = metadata;
                    contentDiv.appendChild(metadataDiv);
                  }
                  
                  container.appendChild(contentDiv);
                  button.appendChild(container);
                  
                  button.style.cssText = `
                    display: block;
                    width: 100%;
                    text-align: left;
                    padding: 10px;
                    border: none;
                    background: ${index === props.selectedIndex && !item.disabled ? bgColor : 'transparent'};
                    cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
                    opacity: ${item.disabled ? '0.6' : '1'};
                    border-radius: 6px;
                    transition: background 0.15s;
                    font-size: 13px;
                  `;
                  
                  if (!item.disabled) {
                    button.addEventListener('click', () => props.command({ 
                      id: item.id, 
                      label: item.label,
                      type: item.type,
                      url: item.url,
                      metadata: item.metadata
                    }));
                    button.addEventListener('mouseenter', () => {
                      button.style.background = getEntityColor(item.type);
                    });
                    button.addEventListener('mouseleave', () => {
                      button.style.background = index === props.selectedIndex ? getEntityColor(item.type) : 'transparent';
                    });
                  }
                  component.appendChild(button);
                });

                if (props.clientRect) {
                  const rect = props.clientRect();
                  component.style.left = `${rect.left}px`;
                  component.style.top = `${rect.bottom + 8}px`;
                }
              },
              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  if (component) {
                    component.remove();
                    component = null;
                  }
                  return true;
                }

                if (props.event.key === 'ArrowUp' || props.event.key === 'ArrowDown') {
                  return false;
                }

                if (props.event.key === 'Enter') {
                  if (props.items[props.selectedIndex] && !props.items[props.selectedIndex].disabled) {
                    const item = props.items[props.selectedIndex];
                    props.command({ 
                      id: item.id, 
                      label: item.label,
                      type: item.type,
                      url: item.url,
                      metadata: item.metadata
                    });
                  }
                  return true;
                }

                return false;
              },
              onExit() {
                console.log('[Mention Suggestion] onExit called - cleaning up component');
                if (component) {
                  component.remove();
                  component = null;
                }
                // Also remove any orphaned components
                const orphaned = document.querySelectorAll('.entity-mention-suggestions');
                orphaned.forEach(el => {
                  if (el !== component) {
                    console.log('[Mention Suggestion] Removing orphaned component');
                    el.remove();
                  }
                });
              }
            };
          }
        },
      }),
      FontFamily.configure({
        types: ['textStyle'],
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
      LineHeight.configure({
        types: ['heading', 'paragraph'],
        defaultLineHeight: 'normal',
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
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none p-4',
        style: 'min-height: 8rem; max-height: 25rem; overflow: visible; width: 100%; outline: none; cursor: text; line-height: 1.6; padding-left: 1rem; font-size: 16px;',
      },
      handleClick: (view, pos, event) => {
        // Ensure the entire editor area is clickable and focuses properly
        return false;
      },
      handleKeyDown: (view, event) => {
        // Debug keyboard events
        console.log('[AdvancedRTE handleKeyDown] Key pressed:', event.key, {
          selectionFrom: view.state.selection.from,
          selectionTo: view.state.selection.to,
          isEmpty: view.state.selection.empty,
          nodeAtCursor: view.state.selection.$from.parent.type.name
        });
        
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
        beforeinput: (view, event) => {
          const nodeAt = view.state.doc.nodeAt(view.state.selection.from);
          const nodeBefore = view.state.doc.nodeAt(view.state.selection.from - 1);
          
          console.log('[AdvancedRTE beforeinput] Event:', event.inputType, {
            data: event.data,
            selectionFrom: view.state.selection.from,
            selectionTo: view.state.selection.to,
            nodeAtCursor: nodeAt?.type.name,
            nodeBefore: nodeBefore?.type.name,
            parentNode: view.state.selection.$from.parent.type.name,
            editable: view.editable
          });
          
          // If inserting text and cursor is at end boundary (nodeAtCursor is undefined)
          // and there's a text node before (likely the space after mention)
          if (event.inputType === 'insertText' && event.data && !nodeAt && nodeBefore?.type.name === 'text') {
            console.log('[AdvancedRTE beforeinput] Cursor at boundary, manually inserting text');
            
            // Manually insert the text at the current position
            const { state } = view;
            const tr = state.tr.insertText(event.data, state.selection.from);
            view.dispatch(tr);
            
            // Prevent default
            event.preventDefault();
            return true;
          }
          
          // Don't block input
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

  // Add global click handler for entity mentions (to handle saved mentions)
  useEffect(() => {
    const handleMentionClick = (event) => {
      const target = event.target;
      if (target && target.classList && target.classList.contains('entity-mention')) {
        const url = target.getAttribute('data-url');
        if (url) {
          event.preventDefault();
          event.stopPropagation();
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
    };

    // Add click listener to editor
    const editorElement = editorRef.current;
    if (editorElement) {
      editorElement.addEventListener('click', handleMentionClick);
      return () => {
        editorElement.removeEventListener('click', handleMentionClick);
      };
    }
  }, [editor]);

  // Cleanup orphaned suggestion components on unmount
  useEffect(() => {
    return () => {
      const existingComponents = document.querySelectorAll('.entity-mention-suggestions');
      existingComponents.forEach(el => el.remove());
    };
  }, []);

  // Add click-away listener to remove orphaned suggestions
  useEffect(() => {
    const handleDocumentClick = (event) => {
      // Check if click is outside any suggestion component
      const suggestions = document.querySelectorAll('.entity-mention-suggestions');
      suggestions.forEach(suggestion => {
        if (!suggestion.contains(event.target)) {
          console.log('[Mention Suggestion] Click outside detected - removing suggestion');
          suggestion.remove();
        }
      });
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

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

  // Version history functionality
  const createVersion = async (versionTitle = null, isAuto = false) => {
    if (!editor || !noteId) return;
    
    try {
      const content = editor.getHTML();
      const title = versionTitle || (isAuto ? `Auto-Saved ${new Date().toLocaleTimeString()}` : `Version ${new Date().toLocaleString()}`);
      
      // Create a snapshot of the current editor state
      const snapshot = editor.getJSON();
      
      const response = await fetch('/api/create-note-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: noteId,
          title,
          content,
          versionTitle: versionTitle || null,
          snapshot: JSON.stringify(snapshot),
          isAuto
        }),
      });

      if (response.ok) {
        const newVersion = await response.json();
        setVersions(prev => [newVersion, ...prev.slice(0, 19)]); // Keep last 20 versions
        setLastAutoVersion(new Date());
        setHasUnsavedChanges(false);
        
        if (onVersionCreated) {
          onVersionCreated(newVersion);
        }
        
        return newVersion;
      }
    } catch (error) {
      console.error('Failed to create version:', error);
    }
  };

  const restoreVersion = async (version) => {
    if (!editor || !version || !noteId) return;
    
    try {
      // If there are unsaved changes, create a new version to preserve them
      if (hasUnsavedChanges) {
        await createVersion(`Auto-saved before revert - ${new Date().toLocaleString()}`, true);
      }
      
      // Restore the selected version
      if (version.snapshot) {
        editor.commands.setContent(version.snapshot);
      } else {
        editor.commands.setContent(version.content);
      }
      
      setShowVersionPopover(false);
      setHasUnsavedChanges(false);
      
      // Reload versions to get the updated list
      await loadVersions();
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  const loadVersions = async () => {
    if (!noteId) return;
    
    try {
      const response = await fetch(`/api/get-note-versions?noteId=${noteId}`);
      if (response.ok) {
        const versionsData = await response.json();
        setVersions(versionsData);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  // Load versions when noteId changes
  useEffect(() => {
    if (noteId) {
      loadVersions();
    }
  }, [noteId]);

  // Auto-versioning functionality - creates a version every 30 seconds if content has changed
  useEffect(() => {
    if (!editor || !noteId) return;

    const INTERVAL_MS = 30000; // 30 seconds
    const lastContentRef = { current: '' };

    const timer = setInterval(async () => {
      try {
        if (editor && noteId) {
          const currentContent = editor.getHTML();
          
          // Only create version if content has actually changed
          if (currentContent !== lastContentRef.current) {
            lastContentRef.current = currentContent;
            
            const snapshot = editor.getJSON();
            const res = await fetch('/api/create-note-version', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                noteId: noteId,
                title: `Auto-Saved ${new Date().toLocaleTimeString()}`,
                content: currentContent,
                snapshot: JSON.stringify(snapshot),
                isAuto: true
              })
            });

            if (res.ok) {
              const newVersion = await res.json();
              setVersions(prev => [newVersion, ...prev.slice(0, 19)]);
              setLastAutoVersion(new Date());
              setDebugInfo(prev => ({
                ...prev,
                lastVersion: new Date().toLocaleTimeString()
              }));
              console.log('Auto-version created at:', new Date().toLocaleTimeString());
            }
          }
        }
      } catch (err) {
        console.error('Auto-version error:', err);
      }
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [editor, noteId]);

  const toggleExpanded = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    
    // Prevent body and html scrolling when in fullscreen mode
    if (newExpandedState) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('editor-fullscreen-active');
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('editor-fullscreen-active');
    }
    
    // Notify parent component about fullscreen state change
    if (onFullscreenChange) {
      console.log('AdvancedRTE: Notifying parent of fullscreen state change:', newExpandedState);
      onFullscreenChange(newExpandedState);
    }
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <Text variant="bodyMd" color="subdued">Loading editor...</Text>
      </div>
    );
  }

  // Fullscreen editor component that will be rendered via portal
  const FullscreenEditor = () => (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999999,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 10px 20px -5px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Toolbar */}
      <div style={{ 
        borderBottom: "1px solid #e1e5e9", 
        padding: "8px 12px", 
        backgroundColor: "#f8f9fa", 
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
          title="Exit Fullscreen"
        >
          <i className="fas fa-compress"></i>
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
          <button
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
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
            title="Clear Marks"
          >
            <i className="fas fa-eraser"></i>
          </button>
          <button
            onClick={() => editor.chain().focus().setHardBreak().run()}
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
            title="Hard Break"
          >
            <i className="fas fa-level-down-alt"></i>
          </button>
          
          <div style={{ width: "1px", height: "24px", backgroundColor: "#dee2e6", margin: "0 4px" }} />

          {/* Paragraph Button */}
          <button
            onClick={() => editor.chain().focus().setParagraph().run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive('paragraph') ? '#007bff' : 'white',
              color: editor.isActive('paragraph') ? 'white' : '#495057',
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
            title="Paragraph"
          >
            P
          </button>

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
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive('taskList') ? '#007bff' : 'white',
              color: editor.isActive('taskList') ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Task List"
          >
            <CheckboxIcon />
          </button>
          
          <div style={{ width: "1px", height: "24px", backgroundColor: "#dee2e6", margin: "0 4px" }} />

          {/* Horizontal Rule */}
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
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
            title="Horizontal Rule"
          >
            <i className="fas fa-minus"></i>
          </button>
          
          <div style={{ width: "1px", height: "24px", backgroundColor: "#dee2e6", margin: "0 4px" }} />

          {/* Text Alignment */}
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive({ textAlign: 'left' }) ? '#007bff' : 'white',
              color: editor.isActive({ textAlign: 'left' }) ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Align Left"
          >
            <i className="fas fa-align-left"></i>
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive({ textAlign: 'center' }) ? '#007bff' : 'white',
              color: editor.isActive({ textAlign: 'center' }) ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Align Center"
          >
            <i className="fas fa-align-center"></i>
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive({ textAlign: 'right' }) ? '#007bff' : 'white',
              color: editor.isActive({ textAlign: 'right' }) ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Align Right"
          >
            <i className="fas fa-align-right"></i>
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
          <button
            onClick={() => setShowVideoModal(true)}
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
            title="Insert YouTube Video"
          >
            <i className="fab fa-youtube"></i>
          </button>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: showEmojiPicker ? '#007bff' : 'white',
              color: showEmojiPicker ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Insert Emoji"
          >
            <i className="fas fa-smile"></i>
          </button>
          <button
            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: showHighlightPicker ? '#007bff' : (editor.isActive('highlight') ? '#fef3c7' : 'white'),
              color: showHighlightPicker ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Highlight Text"
          >
            <i className="fas fa-highlighter"></i>
          </button>
          <button
            onClick={() => setShowToolbarTextColorPicker(!showToolbarTextColorPicker)}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: showToolbarTextColorPicker ? '#007bff' : 'white',
              color: showToolbarTextColorPicker ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Text Color"
          >
            <i className="fas fa-palette"></i>
          </button>
          <button
            onClick={() => setShowFontFamilyPicker(!showFontFamilyPicker)}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: showFontFamilyPicker ? '#007bff' : 'white',
              color: showFontFamilyPicker ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Font Family"
          >
            <i className="fas fa-font"></i>
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

        </div>
      </div>

      {/* Editor Content */}
      <div 
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          cursor: "text",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
        onClick={() => {
          if (editor) {
            editor.commands.focus();
          }
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <EditorContent 
            editor={editor} 
            style={{
              height: "100%",
              minHeight: "100%",
              maxHeight: "100%",
              overflowY: "auto",
              overflowX: "hidden",
              padding: "24px",
              border: "none",
              outline: "none",
              fontSize: "16px",
              lineHeight: "1.6",
              color: "#212529",
              cursor: "text",
              width: "100%",
              backgroundColor: "#ffffff"
            }}
          />
          {editor && <TiptapDragHandle editor={editor} />}
        </div>
        
        {/* Character Count */}
        {editor && (
          <div style={{
            padding: "8px 20px",
            borderTop: "1px solid #dee2e6",
            backgroundColor: "#f8f9fa",
            fontSize: "12px",
            color: "#6c757d",
            textAlign: "right"
          }}>
            {editor.storage.characterCount.characters()} characters • {editor.storage.characterCount.words()} words
          </div>
        )}
      </div>

      {/* Overlay for expanded mode */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(4px)",
          zIndex: -1,
          pointerEvents: 'none'
        }}
      />
    </div>
  );

  return (
    <>
      <style>
        {`
          /* Fix double scroll bars and mobile issues */
          .advanced-rte-container {
            overflow: hidden !important;
          }
          
          /* Ensure proper scrolling and mobile visibility */
          .advanced-rte-content {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch !important; /* Smooth scrolling on iOS */
          }
          
          .advanced-rte-content .ProseMirror {
            overflow: visible !important; /* Remove scroll from inner ProseMirror */
            min-height: 100% !important; /* Ensure content fills container */
          }
          
          /* Mobile-specific fixes */
          @media (max-width: 768px) {
            .advanced-rte-toolbar {
              position: sticky !important;
              top: 0 !important;
              z-index: 10 !important;
              background: #f8f9fa !important;
              padding: 6px 8px !important;
              overflow-x: auto !important;
              white-space: nowrap !important;
            }
            
            .advanced-rte-content {
              min-height: 400px !important; /* 15+ lines on mobile */
              max-height: 600px !important; /* 20+ lines on mobile */
              overflow-y: auto !important;
              -webkit-overflow-scrolling: touch !important;
            }
            
            .advanced-rte-content .ProseMirror {
              min-height: 380px !important; /* Ensure content area is visible */
              padding: 16px !important;
              font-size: 18px !important;
              line-height: 1.6 !important;
            }
          }
          
          /* List styles for proper alignment */
          .advanced-rte-content ul[data-type="taskList"],
          .advanced-rte-content ul[data-type="bulletList"],
          .advanced-rte-content ol[data-type="orderedList"] {
            list-style: none;
            padding: 0;
            margin: 0.25rem 0;
          }

          .advanced-rte-content ul[data-type="taskList"] {
            list-style: none;
            padding: 0;
            margin: 0.25rem 0;
          }

          .advanced-rte-content ul[data-type="taskList"] li {
            display: flex;
            align-items: center;
            margin: -1.5rem 0;
            line-height: 1.4;
            min-height: 1.4em;
          }

          .advanced-rte-content ul[data-type="bulletList"] li,
          .advanced-rte-content ol[data-type="orderedList"] li {
            display: flex;
            align-items: center;
            margin: -1.5rem 0;
            line-height: 1.4;
            min-height: 1.4em;
          }

          .advanced-rte-content ul[data-type="taskList"] li > label {
            flex: 0 0 auto;
            margin-right: 0.5rem;
            user-select: none;
            display: flex;
            align-items: center;
          }

          .advanced-rte-content ul[data-type="taskList"] li > div {
            flex: 1 1 auto;
            min-height: 1.4em;
          }

          .advanced-rte-content ul[data-type="bulletList"] li > div,
          .advanced-rte-content ol[data-type="orderedList"] li > div {
            flex: 1 1 auto;
            display: flex;
            align-items: center;
            min-height: 1.4em;
          }

          .advanced-rte-content ul[data-type="taskList"] input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
            margin: 0;
            accent-color: #007bff;
            vertical-align: middle;
            position: relative;
            top: 0;
          }

          .advanced-rte-content ul[data-type="taskList"] li[data-checked="true"] > div {
            text-decoration: line-through;
            color: #6c757d;
          }

          /* iOS Safari specific fixes */
          @supports (-webkit-touch-callout: none) {
            .advanced-rte-content {
              -webkit-overflow-scrolling: touch !important;
              transform: translateZ(0) !important; /* Force hardware acceleration */
            }
            
            .advanced-rte-content .ProseMirror {
              -webkit-overflow-scrolling: touch !important;
              transform: translateZ(0) !important;
            }
          }
          
          /* Additional mobile fixes for better touch interaction */
          @media (max-width: 768px) {
            .advanced-rte-container {
              touch-action: manipulation !important;
              -webkit-touch-callout: none !important;
              -webkit-user-select: none !important;
              -moz-user-select: none !important;
              -ms-user-select: none !important;
              user-select: none !important;
            }
            
            .advanced-rte-content {
              touch-action: auto !important;
              -webkit-user-select: text !important;
              -moz-user-select: text !important;
              -ms-user-select: text !important;
              user-select: text !important;
            }
            
            .advanced-rte-content .ProseMirror {
              touch-action: auto !important;
              -webkit-user-select: text !important;
              -moz-user-select: text !important;
              -ms-user-select: text !important;
              user-select: text !important;
            }
          }
          
          /* Prevent all parent containers from scrolling when editor is fullscreen */
          body.editor-fullscreen-active {
            overflow: hidden !important;
          }
          
          body.editor-fullscreen-active * {
            overflow: hidden !important;
          }
          
          /* Allow only the editor content to scroll */
          body.editor-fullscreen-active .advanced-rte-content {
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
        `}
      </style>

      {/* Render fullscreen editor via portal when expanded */}
      {isExpanded && typeof document !== 'undefined' && createPortal(
        <FullscreenEditor />,
        document.body
      )}

      {/* Regular editor container - only show when not expanded */}
      {!isExpanded && (
      <div 
        className={`advanced-rte-container relative transition-all duration-300 ${
          isExpanded ? 'fixed inset-4 z-50 shadow-2xl' : 'w-full'
        }`}
        style={{
        border: isMobileProp ? 'none' : '1px solid #e1e3e5',
        borderRadius: isMobileProp ? '0px' : '8px',
        backgroundColor: '#ffffff',
        ...(isExpanded && {
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          zIndex: 9999999,
          height: '100vh',
          width: '100vw',
          maxHeight: '100vh',
          maxWidth: '100vw',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 10px 20px -5px rgba(0, 0, 0, 0.3)',
          borderRadius: '0px'
        }),
        ...(isMobileProp && !isExpanded && {
          minHeight: '500px', // Ensure minimum height on mobile
          maxHeight: '700px' // Prevent excessive height on mobile
        })
      }}
      ref={editorRef}
    >
      {/* Toolbar */}
      <div className="advanced-rte-toolbar" style={{ 
        borderBottom: isMobileProp ? "none" : "1px solid #e1e5e9", 
        padding: "8px 12px", 
        backgroundColor: "#f8f9fa", 
        borderRadius: isMobileProp ? "0px" : "8px 8px 0 0", 
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
          {/* Undo/Redo Buttons */}
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: "white",
              color: editor?.can().undo() ? "#495057" : "#adb5bd",
              cursor: editor?.can().undo() ? "pointer" : "not-allowed",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Undo (Ctrl+Z)"
          >
            <Icon source={UndoIcon} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: "white",
              color: editor?.can().redo() ? "#495057" : "#adb5bd",
              cursor: editor?.can().redo() ? "pointer" : "not-allowed",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Redo (Ctrl+Y)"
          >
            <Icon source={RedoIcon} />
          </button>

          {/* Version Management */}
          <Popover
            active={showVersionPopover}
            activator={
              <Tooltip content="Version History">
                <Button
                  data-testid="version-toolbar-button"
                  size="slim"
                  onClick={() => {
                    console.debug('Version button clicked');
                    setShowVersionPopover(!showVersionPopover);
                  }}
                  icon={ClockIcon}
                  style={{ 
                    backgroundColor: '#f0f0f0', 
                    border: '2px solid #007ace',
                    minWidth: '32px',
                    minHeight: '32px'
                  }}
                >
                  🕐
                </Button>
              </Tooltip>
            }
            onClose={() => setShowVersionPopover(false)}
            preferredAlignment="left"
            preferredPosition="below"
          >
            <div style={{ padding: '16px', minWidth: '300px', maxWidth: '400px' }}>
              <BlockStack gap="4">
                <InlineStack gap="2" align="space-between">
                  <Text variant="headingMd">Version History</Text>
                  <Button
                    size="slim"
                    onClick={() => {
                      const versionTitle = prompt('Enter a title for this version (optional):');
                      createVersion(versionTitle);
                      setShowVersionPopover(false);
                    }}
                  >
                    Create New
                  </Button>
                </InlineStack>
                
                {versions.length > 0 ? (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <BlockStack gap="2">
                      {versions.map((version) => (
                        <Card key={version.id} padding="3">
                          <Card.Section>
                            <InlineStack gap="3" align="space-between">
                              <BlockStack gap="1">
                                <InlineStack gap="2" align="start">
                                  <Text variant="bodyMd" fontWeight="medium">
                                    {version.versionTitle || version.title}
                                  </Text>
                                  {version.isAuto && (
                                    <Badge size="small" tone="info">Auto</Badge>
                                  )}
                                </InlineStack>
                                <Text variant="bodySm" color="subdued">
                                  {new Date(version.createdAt).toLocaleString()}
                                </Text>
                              </BlockStack>
                              <Button
                                size="slim"
                                onClick={() => restoreVersion(version)}
                              >
                                Restore
                              </Button>
                            </InlineStack>
                          </Card.Section>
                        </Card>
                      ))}
                    </BlockStack>
                  </div>
                ) : (
                  <Text variant="bodyMd" color="subdued">
                    No versions available yet. Create your first version!
                  </Text>
                )}
              </BlockStack>
            </div>
          </Popover>

          {/* Line Height Button with Popover */}
          <Popover
            active={showLineHeightPopover}
            activator={
              <button
                onClick={() => setShowLineHeightPopover(!showLineHeightPopover)}
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
                title="Line Height"
              >
                <TextIcon icon="lineHeight" />
              </button>
            }
            onClose={() => setShowLineHeightPopover(false)}
            preferredPosition="below"
          >
            <ActionList
              items={[
                {
                  content: 'Normal',
                  onAction: () => {
                    editor.chain().focus().setLineHeight('normal').run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '1.0',
                  onAction: () => {
                    editor.chain().focus().setLineHeight('1.0').run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '1.15',
                  onAction: () => {
                    editor.chain().focus().setLineHeight('1.15').run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '1.5',
                  onAction: () => {
                    editor.chain().focus().setLineHeight('1.5').run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '2.0',
                  onAction: () => {
                    editor.chain().focus().setLineHeight('2.0').run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '4.0',
                  onAction: () => {
                    editor.chain().focus().setLineHeight('4.0').run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '4.5',
                  onAction: () => {
                    editor.chain().focus().setLineHeight('4.5').run();
                    setShowLineHeightPopover(false);
                  }
                },
              ]}
            />
          </Popover>

          
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
          <button
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
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
            title="Clear Marks"
          >
            <i className="fas fa-eraser"></i>
          </button>
          <button
            onClick={() => editor.chain().focus().setHardBreak().run()}
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
            title="Hard Break"
          >
            <i className="fas fa-level-down-alt"></i>
          </button>
          
          <div style={{ width: "1px", height: "24px", backgroundColor: "#dee2e6", margin: "0 4px" }} />

          {/* Paragraph Button */}
          <button
            onClick={() => editor.chain().focus().setParagraph().run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive('paragraph') ? '#007bff' : 'white',
              color: editor.isActive('paragraph') ? 'white' : '#495057',
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
            title="Paragraph"
          >
            P
          </button>

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
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive('taskList') ? '#007bff' : 'white',
              color: editor.isActive('taskList') ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Task List"
          >
            <CheckboxIcon />
          </button>
          
          <div style={{ width: "1px", height: "24px", backgroundColor: "#dee2e6", margin: "0 4px" }} />

          {/* Horizontal Rule */}
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
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
            title="Horizontal Rule"
          >
            <i className="fas fa-minus"></i>
          </button>
          
          <div style={{ width: "1px", height: "24px", backgroundColor: "#dee2e6", margin: "0 4px" }} />

          {/* Text Alignment */}
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive({ textAlign: 'left' }) ? '#007bff' : 'white',
              color: editor.isActive({ textAlign: 'left' }) ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Align Left"
          >
            <i className="fas fa-align-left"></i>
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive({ textAlign: 'center' }) ? '#007bff' : 'white',
              color: editor.isActive({ textAlign: 'center' }) ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Align Center"
          >
            <i className="fas fa-align-center"></i>
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: editor.isActive({ textAlign: 'right' }) ? '#007bff' : 'white',
              color: editor.isActive({ textAlign: 'right' }) ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Align Right"
          >
            <i className="fas fa-align-right"></i>
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
          <button
            onClick={() => setShowVideoModal(true)}
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
            title="Insert YouTube Video"
          >
            <i className="fab fa-youtube"></i>
          </button>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: showEmojiPicker ? '#007bff' : 'white',
              color: showEmojiPicker ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Insert Emoji"
          >
            <i className="fas fa-smile"></i>
          </button>
          <button
            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: showHighlightPicker ? '#007bff' : (editor.isActive('highlight') ? '#fef3c7' : 'white'),
              color: showHighlightPicker ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Highlight Text"
          >
            <i className="fas fa-highlighter"></i>
          </button>
          <button
            onClick={() => setShowToolbarTextColorPicker(!showToolbarTextColorPicker)}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: showToolbarTextColorPicker ? '#007bff' : 'white',
              color: showToolbarTextColorPicker ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Text Color"
          >
            <i className="fas fa-palette"></i>
          </button>
          <button
            onClick={() => setShowFontFamilyPicker(!showFontFamilyPicker)}
            style={{
              padding: "6px 8px",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              backgroundColor: showFontFamilyPicker ? '#007bff' : 'white',
              color: showFontFamilyPicker ? 'white' : '#495057',
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "13px",
              minWidth: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Font Family"
          >
            <i className="fas fa-font"></i>
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


        </div>
      </div>

      {/* Editor Content */}
      <div 
        className={`${isExpanded ? 'h-full overflow-hidden' : isMobile ? 'min-h-[500px] max-h-[700px]' : 'min-h-[400px]'}`}
        style={{
          position: "relative",
          backgroundColor: "#ffffff",
          borderRadius: isExpanded ? "0px" : "0 0 8px 8px",
          margin: "0",
          padding: "0",
          border: isExpanded ? "none" : "1px solid #dee2e6",
          borderTop: "none",
          cursor: "text",
          overflow: "hidden", // Prevent outer container from scrolling
          ...(isExpanded && {
            height: "calc(100vh - 60px)", // Full height minus toolbar
            maxHeight: "calc(100vh - 60px)", // Ensure it doesn't exceed viewport
            display: "flex",
            flexDirection: "column",
            overflow: "hidden" // Explicitly prevent any scrolling on outer container
          }),
          ...(isMobile && {
            minHeight: "500px",
            maxHeight: "700px",
            display: "flex",
            flexDirection: "column"
          })
        }}
        onClick={() => {
          if (editor) {
            editor.commands.focus();
          }
        }}
      >
        <div style={{ position: 'relative' }}>
          <EditorContent 
            editor={editor} 
            className="advanced-rte-content"
            style={isExpanded ? {
              height: "calc(100vh - 120px)", // Full height minus toolbar and padding
              minHeight: "calc(100vh - 120px)",
              maxHeight: "calc(100vh - 120px)",
              overflowY: "auto",
              overflowX: "hidden",
              padding: "24px",
              border: "none",
              outline: "none",
              fontSize: "16px",
              lineHeight: "1.6",
              color: "#212529",
              cursor: "text",
              width: "100%",
              backgroundColor: "#ffffff"
            } : isMobile ? {
              minHeight: "400px", // 15+ lines on mobile (400px = ~15 lines at 18px font)
              maxHeight: "600px", // 20+ lines on mobile (600px = ~20 lines at 18px font)
              overflowY: "auto", // Add scroll when content exceeds max height
              overflowX: "hidden", // Prevent horizontal scroll
              padding: "16px",
              border: "none",
              outline: "none",
              fontSize: "18px", // Larger font for mobile
              lineHeight: "1.6", // Line height for precise calculations
              color: "#212529",
              cursor: "text",
              width: "100%",
              WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
              transform: "translateZ(0)" // Force hardware acceleration on iOS
            } : {
              minHeight: "8rem", // Default minimum height (5 lines)
              maxHeight: "25rem", // Max at 15+ lines on desktop
              overflowY: "auto", // Add scroll when content exceeds max height
              overflowX: "hidden", // Prevent horizontal scroll
              padding: "20px 24px",
              paddingLeft: "24px", // Reduced left padding to move text closer to edge
              border: "none",
              outline: "none",
              fontSize: "16px", // Font size for line calculations
              lineHeight: "1.6", // Line height for precise calculations
              color: "#212529",
              cursor: "text",
              width: "100%"
            }}
          />
          {editor && <TiptapDragHandle editor={editor} />}
        </div>
        
        {/* Character Count */}
        {editor && (
          <div style={{
            padding: "8px 20px",
            borderTop: "1px solid #dee2e6",
            backgroundColor: "#f8f9fa",
            borderRadius: "0 0 8px 8px",
            fontSize: "12px",
            color: "#6c757d",
            textAlign: "right"
          }}>
            {editor.storage.characterCount.characters()} characters • {editor.storage.characterCount.words()} words
          </div>
        )}
        
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

      {/* Emoji Picker Popup with Pagination and Search */}
      {showEmojiPicker && (() => {
        const emojiData = [
          { emoji: '😀', tags: 'happy smile grin' },
          { emoji: '😃', tags: 'happy smile joy' },
          { emoji: '😄', tags: 'happy smile laugh' },
          { emoji: '😁', tags: 'happy smile grin' },
          { emoji: '😆', tags: 'happy laugh lol' },
          { emoji: '😅', tags: 'happy sweat laugh' },
          { emoji: '🤣', tags: 'laugh lol rofl' },
          { emoji: '😂', tags: 'laugh cry joy' },
          { emoji: '🙂', tags: 'smile happy' },
          { emoji: '🙃', tags: 'smile upside' },
          { emoji: '😉', tags: 'wink flirt' },
          { emoji: '😊', tags: 'happy smile blush' },
          { emoji: '😇', tags: 'angel halo innocent' },
          { emoji: '🥰', tags: 'love hearts smile' },
          { emoji: '😍', tags: 'love heart eyes' },
          { emoji: '🤩', tags: 'star eyes wow' },
          { emoji: '😘', tags: 'kiss love' },
          { emoji: '😗', tags: 'kiss' },
          { emoji: '😚', tags: 'kiss closed eyes' },
          { emoji: '😙', tags: 'kiss smile' },
          { emoji: '🥲', tags: 'smile tear happy cry' },
          { emoji: '😋', tags: 'yummy tasty delicious' },
          { emoji: '😛', tags: 'tongue' },
          { emoji: '😜', tags: 'wink tongue' },
          { emoji: '🤪', tags: 'crazy wild' },
          { emoji: '😝', tags: 'tongue eyes' },
          { emoji: '🤑', tags: 'money rich dollar' },
          { emoji: '🤗', tags: 'hug' },
          { emoji: '🤭', tags: 'giggle blush' },
          { emoji: '🤫', tags: 'shush quiet silence' },
          { emoji: '🤔', tags: 'think hmm' },
          { emoji: '🤐', tags: 'zipper quiet' },
          { emoji: '🤨', tags: 'eyebrow suspicious' },
          { emoji: '😐', tags: 'neutral meh' },
          { emoji: '😑', tags: 'expressionless' },
          { emoji: '😶', tags: 'no mouth' },
          { emoji: '😏', tags: 'smirk' },
          { emoji: '😒', tags: 'unamused annoyed' },
          { emoji: '🙄', tags: 'eye roll annoyed' },
          { emoji: '😬', tags: 'grimace awkward' },
          { emoji: '🤥', tags: 'lie pinocchio' },
          { emoji: '😌', tags: 'relieved' },
          { emoji: '😔', tags: 'sad pensive' },
          { emoji: '😪', tags: 'sleepy tired' },
          { emoji: '🤤', tags: 'drool' },
          { emoji: '😴', tags: 'sleep zzz' },
          { emoji: '😷', tags: 'sick mask' },
          { emoji: '🤒', tags: 'sick fever' },
          { emoji: '🤕', tags: 'hurt bandage' },
          { emoji: '🤢', tags: 'sick nausea' },
          { emoji: '🤮', tags: 'vomit sick' },
          { emoji: '🤧', tags: 'sneeze sick' },
          { emoji: '🥵', tags: 'hot sweat' },
          { emoji: '🥶', tags: 'cold freeze' },
          { emoji: '🥴', tags: 'dizzy drunk' },
          { emoji: '😵', tags: 'dizzy confused' },
          { emoji: '🤯', tags: 'mind blown shocked' },
          { emoji: '🤠', tags: 'cowboy hat' },
          { emoji: '🥳', tags: 'party celebrate' },
          { emoji: '🥸', tags: 'disguise' },
          { emoji: '😎', tags: 'cool sunglasses' },
          { emoji: '🤓', tags: 'nerd glasses' },
          { emoji: '🧐', tags: 'monocle' },
          { emoji: '😕', tags: 'confused' },
          { emoji: '😟', tags: 'worried' },
          { emoji: '🙁', tags: 'sad frown' },
          { emoji: '☹️', tags: 'sad frown' },
          { emoji: '😮', tags: 'wow surprised' },
          { emoji: '😯', tags: 'surprised' },
          { emoji: '😲', tags: 'shocked' },
          { emoji: '😳', tags: 'flushed embarrassed' },
          { emoji: '🥺', tags: 'pleading puppy eyes' },
          { emoji: '😦', tags: 'frown worried' },
          { emoji: '😧', tags: 'anguish worried' },
          { emoji: '😨', tags: 'fear scared' },
          { emoji: '😰', tags: 'anxious nervous sweat' },
          { emoji: '😥', tags: 'sad sweat' },
          { emoji: '😢', tags: 'cry sad tear' },
          { emoji: '😭', tags: 'cry sobbing' },
          { emoji: '😱', tags: 'scream fear' },
          { emoji: '😖', tags: 'confounded upset' },
          { emoji: '😣', tags: 'persevere struggle' },
          { emoji: '😞', tags: 'disappointed sad' },
          { emoji: '😓', tags: 'sweat tired' },
          { emoji: '😩', tags: 'weary tired' },
          { emoji: '😫', tags: 'tired exhausted' },
          { emoji: '🥱', tags: 'yawn tired bored' },
          { emoji: '😤', tags: 'triumph proud' },
          { emoji: '😡', tags: 'angry mad' },
          { emoji: '😠', tags: 'angry upset' },
          { emoji: '🤬', tags: 'cursing angry' },
          { emoji: '👍', tags: 'thumbs up good yes' },
          { emoji: '👎', tags: 'thumbs down bad no' },
          { emoji: '👌', tags: 'ok okay good' },
          { emoji: '✌️', tags: 'peace victory' },
          { emoji: '🤞', tags: 'fingers crossed luck' },
          { emoji: '🤟', tags: 'love you sign' },
          { emoji: '🤘', tags: 'rock on' },
          { emoji: '🤙', tags: 'call me shaka' },
          { emoji: '👈', tags: 'point left' },
          { emoji: '👉', tags: 'point right' },
          { emoji: '👆', tags: 'point up' },
          { emoji: '👇', tags: 'point down' },
          { emoji: '☝️', tags: 'point up' },
          { emoji: '👏', tags: 'clap applause' },
          { emoji: '🙌', tags: 'hands raised celebrate' },
          { emoji: '👐', tags: 'hands open' },
          { emoji: '🤲', tags: 'palms together prayer' },
          { emoji: '🤝', tags: 'handshake deal' },
          { emoji: '🙏', tags: 'pray thanks please' },
          { emoji: '💪', tags: 'muscle strong flex' },
          { emoji: '❤️', tags: 'love heart red' },
          { emoji: '🧡', tags: 'love heart orange' },
          { emoji: '💛', tags: 'love heart yellow' },
          { emoji: '💚', tags: 'love heart green' },
          { emoji: '💙', tags: 'love heart blue' },
          { emoji: '💜', tags: 'love heart purple' },
          { emoji: '🖤', tags: 'love heart black' },
          { emoji: '🤍', tags: 'love heart white' },
          { emoji: '🤎', tags: 'love heart brown' },
          { emoji: '💔', tags: 'broken heart sad' },
          { emoji: '⭐', tags: 'star' },
          { emoji: '🌟', tags: 'star sparkle' },
          { emoji: '✨', tags: 'sparkles stars' },
          { emoji: '⚡', tags: 'lightning bolt' },
          { emoji: '🔥', tags: 'fire hot flame' },
          { emoji: '💥', tags: 'boom explosion' },
          { emoji: '💯', tags: 'hundred perfect' },
          { emoji: '✅', tags: 'check mark done yes' },
          { emoji: '❌', tags: 'x cross no' },
          { emoji: '⚠️', tags: 'warning caution' },
          { emoji: '🎉', tags: 'party celebrate' },
          { emoji: '🎊', tags: 'party confetti' },
          { emoji: '🎈', tags: 'balloon party' },
          { emoji: '🎁', tags: 'gift present' },
          { emoji: '🏆', tags: 'trophy win champion' },
          { emoji: '🥇', tags: 'gold medal first' },
          { emoji: '🥈', tags: 'silver medal second' },
          { emoji: '🥉', tags: 'bronze medal third' },
          { emoji: '🎯', tags: 'target bullseye' },
          { emoji: '🎮', tags: 'game controller' },
          { emoji: '📱', tags: 'phone mobile' },
          { emoji: '💻', tags: 'laptop computer' },
          { emoji: '⌨️', tags: 'keyboard' },
          { emoji: '🖥️', tags: 'computer desktop' },
          { emoji: '💡', tags: 'light bulb idea' },
          { emoji: '🔥', tags: 'fire hot' },
          { emoji: '💰', tags: 'money bag cash' },
          { emoji: '💳', tags: 'credit card' },
          { emoji: '📧', tags: 'email mail' },
          { emoji: '📨', tags: 'incoming mail' },
          { emoji: '📩', tags: 'envelope arrow' },
          { emoji: '📝', tags: 'memo note write' },
          { emoji: '💼', tags: 'briefcase work' },
          { emoji: '📁', tags: 'folder file' },
          { emoji: '📂', tags: 'folder open' },
          { emoji: '📅', tags: 'calendar date' },
          { emoji: '📆', tags: 'calendar' },
          { emoji: '📈', tags: 'chart up growth' },
          { emoji: '📉', tags: 'chart down' },
          { emoji: '📊', tags: 'bar chart data' },
          { emoji: '✏️', tags: 'pencil write' },
          { emoji: '✂️', tags: 'scissors cut' },
        ];

        // Filter emojis based on search query
        const filteredEmojis = emojiSearchQuery.trim()
          ? emojiData.filter(item => 
              item.tags.toLowerCase().includes(emojiSearchQuery.toLowerCase()) ||
              item.emoji.includes(emojiSearchQuery)
            )
          : emojiData;

        const emojisPerPage = 25;
        const totalPages = Math.ceil(filteredEmojis.length / emojisPerPage);
        const startIndex = emojiPage * emojisPerPage;
        const endIndex = startIndex + emojisPerPage;
        const currentEmojis = filteredEmojis.slice(startIndex, endIndex);

        return (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10000,
            minWidth: '350px',
            maxHeight: '550px'
          }}>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Select an Emoji</span>
              <span style={{ fontSize: '12px', color: '#6c757d' }}>
                {filteredEmojis.length > 0 ? `Page ${emojiPage + 1} of ${totalPages}` : 'No results'}
              </span>
            </div>
            
            {/* Search Input */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search emojis (e.g., happy, heart, fire)..."
                value={emojiSearchQuery}
                onChange={(e) => {
                  setEmojiSearchQuery(e.target.value);
                  setEmojiPage(0); // Reset to first page on search
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
              />
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(5, 1fr)', 
              gap: '8px',
              marginBottom: '16px',
              minHeight: '280px'
            }}>
              {currentEmojis.length > 0 ? currentEmojis.map((item) => (
                <button
                  key={item.emoji}
                  onClick={() => {
                    editor.chain().focus().insertContent(item.emoji).run();
                    setShowEmojiPicker(false);
                    setEmojiPage(0);
                    setEmojiSearchQuery('');
                  }}
                  style={{
                    fontSize: '28px',
                    padding: '12px',
                    border: '1px solid #e0e0e0',
                    background: 'white',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'all 0.2s'
                  }}
                  title={item.tags}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f0f0f0';
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  {item.emoji}
                </button>
              )) : (
                <div style={{ 
                  gridColumn: '1 / -1', 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: '#6c757d'
                }}>
                  No emojis found for "{emojiSearchQuery}"
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #dee2e6', paddingTop: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setEmojiPage(Math.max(0, emojiPage - 1))}
                  disabled={emojiPage === 0}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: emojiPage === 0 ? '#e0e0e0' : '#007bff',
                    color: emojiPage === 0 ? '#999' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: emojiPage === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ← Previous
                </button>
                <button 
                  onClick={() => setEmojiPage(Math.min(totalPages - 1, emojiPage + 1))}
                  disabled={emojiPage === totalPages - 1}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: emojiPage === totalPages - 1 ? '#e0e0e0' : '#007bff',
                    color: emojiPage === totalPages - 1 ? '#999' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: emojiPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Next →
                </button>
              </div>
              <button 
                onClick={() => {
                  setShowEmojiPicker(false);
                  setEmojiPage(0);
                  setEmojiSearchQuery('');
                }}
                style={{
                  padding: '6px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}

      {/* Highlight Color Picker */}
      {showHighlightPicker && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          minWidth: '250px'
        }}>
          <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Select Highlight Color</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { name: 'Yellow', color: '#fef3c7' },
              { name: 'Green', color: '#d1fae5' },
              { name: 'Blue', color: '#dbeafe' },
              { name: 'Pink', color: '#fce7f3' },
              { name: 'Purple', color: '#f3e8ff' },
              { name: 'Orange', color: '#fed7aa' },
              { name: 'Red', color: '#fee2e2' },
              { name: 'Remove Highlight', color: null }
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  if (item.color) {
                    editor.chain().focus().setHighlight({ color: item.color }).run();
                  } else {
                    editor.chain().focus().unsetHighlight().run();
                  }
                  setShowHighlightPicker(false);
                }}
                style={{
                  padding: '10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  backgroundColor: item.color || 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div style={{ marginTop: '12px', textAlign: 'right' }}>
            <button 
              onClick={() => setShowHighlightPicker(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Text Color Picker */}
      {showToolbarTextColorPicker && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          minWidth: '250px'
        }}>
          <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Select Text Color</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { name: 'Black (Default)', color: '#000000' },
              { name: 'Red', color: '#ef4444' },
              { name: 'Orange', color: '#f97316' },
              { name: 'Yellow', color: '#eab308' },
              { name: 'Green', color: '#22c55e' },
              { name: 'Blue', color: '#3b82f6' },
              { name: 'Purple', color: '#a855f7' },
              { name: 'Pink', color: '#ec4899' },
              { name: 'Gray', color: '#6b7280' }
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  if (item.color === '#000000') {
                    editor.chain().focus().unsetColor().run();
                  } else {
                    editor.chain().focus().setColor(item.color).run();
                  }
                  setShowToolbarTextColorPicker(false);
                }}
                style={{
                  padding: '10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  color: item.color,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.02)';
                  e.target.style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.backgroundColor = 'white';
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div style={{ marginTop: '12px', textAlign: 'right' }}>
            <button 
              onClick={() => setShowToolbarTextColorPicker(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Font Family Picker */}
      {showFontFamilyPicker && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          minWidth: '280px'
        }}>
          <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Select Font Family</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { name: 'Default', font: null },
              { name: 'Arial', font: 'Arial, sans-serif' },
              { name: 'Courier New', font: 'Courier New, monospace' },
              { name: 'Georgia', font: 'Georgia, serif' },
              { name: 'Times New Roman', font: 'Times New Roman, serif' },
              { name: 'Verdana', font: 'Verdana, sans-serif' },
              { name: 'Comic Sans MS', font: 'Comic Sans MS, cursive' },
              { name: 'Impact', font: 'Impact, sans-serif' }
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  if (item.font) {
                    editor.chain().focus().setFontFamily(item.font).run();
                  } else {
                    editor.chain().focus().unsetFontFamily().run();
                  }
                  setShowFontFamilyPicker(false);
                }}
                style={{
                  padding: '10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: item.font || 'inherit',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.02)';
                  e.target.style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.backgroundColor = 'white';
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div style={{ marginTop: '12px', textAlign: 'right' }}>
            <button 
              onClick={() => setShowFontFamilyPicker(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
      )}


    </>
  );
};

export default AdvancedRTE;