import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
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
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import CharacterCount from '@tiptap/extension-character-count';
import TiptapDragHandle from './TiptapDragHandle';
import { LineHeight } from './LineHeightExtension';
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
  Badge,
  Spinner,
  SkeletonBodyText,
  SkeletonDisplayText
} from '@shopify/polaris';
import { 
  SmileyHappyIcon,
  LogoYoutubeIcon,
  EditIcon,
  TextColorIcon,
  TextFontIcon,
  MegaphoneIcon,
  ProductIcon,
  VariantIcon,
  OrderIcon,
  PersonIcon,
  CollectionIcon,
  DiscountIcon,
  OrderDraftIcon,
  ProfileIcon,
  ClockIcon,
  MenuVerticalIcon,
  ClipboardChecklistIcon
} from '@shopify/polaris-icons';
import './NotionTiptapEditor.css';

// Helper function to ensure handlers work properly on both mobile and desktop
// Keep it simple - just call the handler without interfering with Polaris event handling
const createMobileFriendlyHandler = (handler) => {
  return () => {
    handler();
  };
};

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
    checkbox: '✓',  // Changed from ☑ to ✓ for better compatibility
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
      height: '20px',
      pointerEvents: 'none'  // Let parent handle events
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

const NotionTiptapEditor = ({ value, onChange, placeholder = "Press '/' for commands...", onFullscreenChange, noteId, onVersionCreated }) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [slashMenuFilter, setSlashMenuFilter] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [showFormatPopover, setShowFormatPopover] = useState(false);
  const [showAlignPopover, setShowAlignPopover] = useState(false);
  const [showHeadingPopover, setShowHeadingPopover] = useState(false);
  const [showTextColorPopover, setShowTextColorPopover] = useState(false);
  const [showHighlightColorPopover, setShowHighlightColorPopover] = useState(false);
  const [showFontFamilyPopover, setShowFontFamilyPopover] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLineHeightPopover, setShowLineHeightPopover] = useState(false);
  const [showClearMarksPopover, setShowClearMarksPopover] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showVersionPopover, setShowVersionPopover] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonVersions, setComparisonVersions] = useState({ version1: null, version2: null });
  const [versions, setVersions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastAutoVersion, setLastAutoVersion] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ lastChange: null, lastVersion: null });
  const editorRef = useRef(null);
  const slashMenuRef = useRef(null);
  const autoVersionIntervalRef = useRef(null);


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
    editable: true,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        // Disable default list extensions to avoid conflicts with TaskList
        bulletList: false,
        orderedList: false,
        listItem: false,
        // Disable extensions that we're adding separately to avoid duplicates
        link: false,
        underline: false,
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
      // List extensions
      BulletList,
      OrderedList,
      ListItem,
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
      LineHeight,
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      console.log('[Editor onUpdate] Content updated:', {
        contentLength: html.length,
        selectionFrom: editor.state.selection.from,
        selectionTo: editor.state.selection.to
      });
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'notion-editor',
      },
      handleKeyDown: (view, event) => {
        // Debug keyboard events
        const nodeAtPos = view.state.doc.nodeAt(view.state.selection.from);
        const nodeBefore = view.state.doc.nodeAt(view.state.selection.from - 1);
        
        console.log('[Editor handleKeyDown] Key pressed:', event.key, {
          selectionFrom: view.state.selection.from,
          selectionTo: view.state.selection.to,
          isEmpty: view.state.selection.empty,
          nodeAtCursor: view.state.selection.$from.parent.type.name,
          nodeAtPos: nodeAtPos?.type.name,
          nodeBefore: nodeBefore?.type.name,
          editable: view.editable
        });
        
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
        
        // Don't block any other keys - let them through
        return false;
      },
      handleDOMEvents: {
        beforeinput: (view, event) => {
          const nodeAt = view.state.doc.nodeAt(view.state.selection.from);
          const nodeBefore = view.state.doc.nodeAt(view.state.selection.from - 1);
          
          console.log('[NotionEditor beforeinput] Event:', event.inputType, {
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
            console.log('[NotionEditor beforeinput] Cursor at boundary, manually inserting text');
            
            // Manually insert the text at the current position
            const { state } = view;
            const tr = state.tr.insertText(event.data, state.selection.from);
            view.dispatch(tr);
            
            // Prevent default
            event.preventDefault();
            return true;
          }
          
          return false;
        },
      },
    },
  });

  // Update content when value prop changes
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

  // Enhanced version management functionality
  const createVersion = async (versionTitle = null, isAuto = false) => {
    if (!editor || !noteId) return;
    
    try {
      const content = editor.getHTML();
      const title = versionTitle || (isAuto ? `Auto-Saved ${new Date().toLocaleTimeString()}` : `Version ${new Date().toLocaleString()}`);
      
      // Create a snapshot of the current editor state
      const snapshot = editor.getJSON();
      
      const response = await fetch('/api/create-note-version', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteId,
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
      
      setShowVersionModal(false);
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

  const compareVersions = (version1, version2) => {
    setComparisonVersions({ version1, version2 });
    setShowComparisonModal(true);
    setShowVersionPopover(false);
  };

  // Auto-versioning functionality with robust change detection
  const lastChangeAt = useRef(0);
  const hasPendingChange = useRef(false);
  const lastContentRef = useRef('');

  // Track content changes for auto-versioning
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      setHasUnsavedChanges(true);
      hasPendingChange.current = true;
      lastChangeAt.current = Date.now();
      setDebugInfo(prev => ({ ...prev, lastChange: new Date().toLocaleTimeString() }));
      console.debug('Editor update detected at:', new Date().toLocaleTimeString());
    };

    editor.on('update', handleUpdate);
    
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  // Auto-versioning interval
  useEffect(() => {
    if (!editor || !noteId) return;

    const INTERVAL_MS = 30000; // 30 seconds
    const timer = setInterval(async () => {
      if (!hasPendingChange.current) return;
      
      // Reset flag immediately to avoid duplicate calls
      hasPendingChange.current = false;
      
      try {
        const currentContent = editor.getHTML();
        
        // Only create version if content actually changed
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
          
          if (!res.ok) {
            const errorText = await res.text();
            console.error('Auto-version failed:', res.status, errorText);
            // Don't throw error, just log it and continue
            setDebugInfo(prev => ({ ...prev, lastVersion: `Error: ${res.status}` }));
          } else {
            const newVersion = await res.json();
            setVersions(prev => [newVersion, ...prev.slice(0, 19)]);
            setDebugInfo(prev => ({ ...prev, lastVersion: new Date().toLocaleTimeString() }));
            console.debug('Auto-version created:', newVersion.id);
          }
        }
      } catch (err) {
        console.error('Auto-version error:', err);
      }
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [editor, noteId]);

  // Load versions when noteId changes
  useEffect(() => {
    if (noteId) {
      loadVersions();
    }
  }, [noteId]);

  const clearAllMarks = () => {
    if (editor) {
      editor.chain().focus().unsetAllMarks().run();
      setShowClearMarksPopover(false);
    }
  };

  // Fullscreen functionality
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
      onFullscreenChange(newExpandedState);
    }
  };

  // Cleanup effect for fullscreen
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('editor-fullscreen-active');
    };
  }, []);

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
      {/* Toolbar - Reorganized according to specifications */}
      <div className="notion-toolbar">
        <InlineStack gap="2" align="start">
          {/* Text Color */}
          <Popover
            active={showTextColorPopover}
            activator={
              <Tooltip content="Text Color">
                <Button
                  size="slim"
                  disclosure
                  onClick={() => setShowTextColorPopover(!showTextColorPopover)}
                >
                  <Icon source={TextColorIcon} />
                </Button>
              </Tooltip>
            }
            onClose={() => setShowTextColorPopover(false)}
          >
            <ActionList
              items={[
                {
                  content: 'Default',
                  onAction: () => {
                    editor.chain().focus().unsetColor().run();
                    setShowTextColorPopover(false);
                  }
                },
                {
                  content: 'Red',
                  onAction: () => {
                    editor.chain().focus().setColor('#ef4444').run();
                    setShowTextColorPopover(false);
                  }
                },
                {
                  content: 'Orange',
                  onAction: () => {
                    editor.chain().focus().setColor('#f97316').run();
                    setShowTextColorPopover(false);
                  }
                },
                {
                  content: 'Yellow',
                  onAction: () => {
                    editor.chain().focus().setColor('#eab308').run();
                    setShowTextColorPopover(false);
                  }
                },
                {
                  content: 'Green',
                  onAction: () => {
                    editor.chain().focus().setColor('#22c55e').run();
                    setShowTextColorPopover(false);
                  }
                },
                {
                  content: 'Blue',
                  onAction: () => {
                    editor.chain().focus().setColor('#3b82f6').run();
                    setShowTextColorPopover(false);
                  }
                },
                {
                  content: 'Purple',
                  onAction: () => {
                    editor.chain().focus().setColor('#a855f7').run();
                    setShowTextColorPopover(false);
                  }
                },
                {
                  content: 'Pink',
                  onAction: () => {
                    editor.chain().focus().setColor('#ec4899').run();
                    setShowTextColorPopover(false);
                  }
                },
              ]}
            />
          </Popover>

          {/* Highlight Text */}
          <Popover
            active={showHighlightColorPopover}
            activator={
              <Tooltip content="Highlight Text">
                <Button
                  size="slim"
                  disclosure
                  pressed={editor.isActive('highlight')}
                  onClick={() => setShowHighlightColorPopover(!showHighlightColorPopover)}
                >
                  <Icon source={EditIcon} />
                </Button>
              </Tooltip>
            }
            onClose={() => setShowHighlightColorPopover(false)}
          >
            <ActionList
              items={[
                {
                  content: 'Remove Highlight',
                  onAction: () => {
                    editor.chain().focus().unsetHighlight().run();
                    setShowHighlightColorPopover(false);
                  }
                },
                {
                  content: 'Yellow',
                  onAction: () => {
                    editor.chain().focus().setHighlight({ color: '#fef3c7' }).run();
                    setShowHighlightColorPopover(false);
                  }
                },
                {
                  content: 'Green',
                  onAction: () => {
                    editor.chain().focus().setHighlight({ color: '#d1fae5' }).run();
                    setShowHighlightColorPopover(false);
                  }
                },
                {
                  content: 'Blue',
                  onAction: () => {
                    editor.chain().focus().setHighlight({ color: '#dbeafe' }).run();
                    setShowHighlightColorPopover(false);
                  }
                },
                {
                  content: 'Pink',
                  onAction: () => {
                    editor.chain().focus().setHighlight({ color: '#fce7f3' }).run();
                    setShowHighlightColorPopover(false);
                  }
                },
                {
                  content: 'Purple',
                  onAction: () => {
                    editor.chain().focus().setHighlight({ color: '#f3e8ff' }).run();
                    setShowHighlightColorPopover(false);
                  }
                },
              ]}
            />
          </Popover>

          {/* Bold, Italic, Underline */}
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
          </ButtonGroup>

          {/* Insert Emoji */}
          <Tooltip content="Insert Emoji">
            <Button
              size="slim"
              onClick={() => {
                const emoji = prompt('Enter an emoji:');
                if (emoji) {
                  editor.chain().focus().insertContent(emoji).run();
                }
              }}
            >
              <Icon source={SmileyHappyIcon} />
            </Button>
          </Tooltip>

          {/* Font Family */}
          <Popover
            active={showFontFamilyPopover}
            activator={
              <Tooltip content="Font Family">
                <Button
                  size="slim"
                  disclosure
                  onClick={() => setShowFontFamilyPopover(!showFontFamilyPopover)}
                >
                  <Icon source={TextFontIcon} />
                </Button>
              </Tooltip>
            }
            onClose={() => setShowFontFamilyPopover(false)}
          >
            <ActionList
              items={[
                {
                  content: 'Default',
                  onAction: () => {
                    editor.chain().focus().unsetFontFamily().run();
                    setShowFontFamilyPopover(false);
                  }
                },
                {
                  content: 'Arial',
                  onAction: () => {
                    editor.chain().focus().setFontFamily('Arial, sans-serif').run();
                    setShowFontFamilyPopover(false);
                  }
                },
                {
                  content: 'Courier New',
                  onAction: () => {
                    editor.chain().focus().setFontFamily('Courier New, monospace').run();
                    setShowFontFamilyPopover(false);
                  }
                },
                {
                  content: 'Georgia',
                  onAction: () => {
                    editor.chain().focus().setFontFamily('Georgia, serif').run();
                    setShowFontFamilyPopover(false);
                  }
                },
                {
                  content: 'Times New Roman',
                  onAction: () => {
                    editor.chain().focus().setFontFamily('Times New Roman, serif').run();
                    setShowFontFamilyPopover(false);
                  }
                },
                {
                  content: 'Verdana',
                  onAction: () => {
                    editor.chain().focus().setFontFamily('Verdana, sans-serif').run();
                    setShowFontFamilyPopover(false);
                  }
                },
              ]}
            />
          </Popover>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

          {/* H1, H2, H3 */}
          <ButtonGroup variant="segmented">
            <Tooltip content="Heading 1">
              <Button
                size="slim"
                pressed={editor.isActive('heading', { level: 1 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              >
                H1
              </Button>
            </Tooltip>
            <Tooltip content="Heading 2">
              <Button
                size="slim"
                pressed={editor.isActive('heading', { level: 2 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                H2
              </Button>
            </Tooltip>
            <Tooltip content="Heading 3">
              <Button
                size="slim"
                pressed={editor.isActive('heading', { level: 3 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              >
                H3
              </Button>
            </Tooltip>
          </ButtonGroup>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

          {/* Hard Break */}
          <Tooltip content="Hard Break">
            <Button
              size="slim"
              onClick={() => editor.chain().focus().setHardBreak().run()}
            >
              <TextIcon icon="plus" />
            </Button>
          </Tooltip>

          {/* Line Height */}
          <Popover
            active={showLineHeightPopover}
            activator={
              <Tooltip content="Line Height">
                <Button
                  size="slim"
                  disclosure
                  onClick={createMobileFriendlyHandler(() => setShowLineHeightPopover(!showLineHeightPopover))}
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                  icon={MenuVerticalIcon}
                />
              </Tooltip>
            }
            onClose={() => setShowLineHeightPopover(false)}
          >
            <ActionList
              items={[
                {
                  content: 'Default',
                  onAction: () => {
                    editor.chain().focus().unsetLineHeight().run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '1.0',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(1.0).run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '1.2',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(1.2).run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '1.5',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(1.5).run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '2.0',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(2.0).run();
                    setShowLineHeightPopover(false);
                  }
                },
              ]}
            />
          </Popover>

          {/* Paragraph */}
          <Tooltip content="Paragraph">
            <Button
              size="slim"
              pressed={editor.isActive('paragraph')}
              onClick={() => editor.chain().focus().setParagraph().run()}
            >
              <TextIcon icon="text" />
            </Button>
          </Tooltip>

          {/* Text alignment */}
          <ButtonGroup variant="segmented">
            <Tooltip content="Align Left">
              <Button
                size="slim"
                pressed={editor.isActive({ textAlign: 'left' })}
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
              >
                <TextIcon icon="alignLeft" />
              </Button>
            </Tooltip>
            <Tooltip content="Align Center">
              <Button
                size="slim"
                pressed={editor.isActive({ textAlign: 'center' })}
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
              >
                <TextIcon icon="alignCenter" />
              </Button>
            </Tooltip>
            <Tooltip content="Align Right">
              <Button
                size="slim"
                pressed={editor.isActive({ textAlign: 'right' })}
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
              >
                <TextIcon icon="alignRight" />
              </Button>
            </Tooltip>
          </ButtonGroup>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

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
                icon={ClipboardChecklistIcon}
              />
            </Tooltip>
          </ButtonGroup>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

          {/* Horizontal Rule */}
          <Tooltip content="Horizontal Rule">
            <Button
              size="slim"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <TextIcon icon="horizontalDots" />
            </Button>
          </Tooltip>

          {/* Insert Table */}
          <Tooltip content="Insert Table">
            <Button
              size="slim"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            >
              <TextIcon icon="table" />
            </Button>
          </Tooltip>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

          {/* Insert Link */}
          <Tooltip content="Insert Link">
            <Button
              size="slim"
              onClick={createMobileFriendlyHandler(() => setShowLinkModal(true))}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
            >
              <TextIcon icon="link" />
            </Button>
          </Tooltip>

          {/* Insert Image */}
          <Tooltip content="Insert Image">
            <Button
              size="slim"
              onClick={createMobileFriendlyHandler(() => setShowImageModal(true))}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
            >
              <TextIcon icon="image" />
            </Button>
          </Tooltip>

          {/* Insert YouTube Video */}
          <Tooltip content="Insert YouTube Video">
            <Button
              size="slim"
              onClick={createMobileFriendlyHandler(() => setShowVideoModal(true))}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
            >
              <Icon source={LogoYoutubeIcon} />
            </Button>
          </Tooltip>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

          {/* Blockquote */}
          <Tooltip content="Blockquote">
            <Button
              size="slim"
              pressed={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <TextIcon icon="quote" />
            </Button>
          </Tooltip>

          {/* Code Block */}
          <Tooltip content="Code Block">
            <Button
              size="slim"
              pressed={editor.isActive('codeBlock')}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              <TextIcon icon="code" />
            </Button>
          </Tooltip>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

          {/* Clear Marks */}
          <Popover
            active={showClearMarksPopover}
            activator={
              <Tooltip content="Clear Marks">
                <Button
                  size="slim"
                  disclosure
                  onClick={() => setShowClearMarksPopover(!showClearMarksPopover)}
                >
                  <TextIcon icon="question" />
                </Button>
              </Tooltip>
            }
            onClose={() => setShowClearMarksPopover(false)}
          >
            <ActionList
              items={[
                {
                  content: 'Clear All Formatting',
                  onAction: clearAllMarks
                },
                {
                  content: 'Clear Bold',
                  onAction: () => {
                    editor.chain().focus().unsetBold().run();
                    setShowClearMarksPopover(false);
                  }
                },
                {
                  content: 'Clear Italic',
                  onAction: () => {
                    editor.chain().focus().unsetItalic().run();
                    setShowClearMarksPopover(false);
                  }
                },
                {
                  content: 'Clear Underline',
                  onAction: () => {
                    editor.chain().focus().unsetUnderline().run();
                    setShowClearMarksPopover(false);
                  }
                },
                {
                  content: 'Clear Highlight',
                  onAction: () => {
                    editor.chain().focus().unsetHighlight().run();
                    setShowClearMarksPopover(false);
                  }
                },
              ]}
            />
          </Popover>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

          {/* Versions */}
          <Tooltip content="Versions">
            <Button
              size="slim"
              onClick={() => setShowVersionModal(true)}
            >
              <TextIcon icon="chevronDown" />
            </Button>
          </Tooltip>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

          {/* Undo, Redo */}
          <ButtonGroup variant="segmented">
            <Tooltip content="Undo">
              <Button
                size="slim"
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
              >
                ↶
              </Button>
            </Tooltip>
            <Tooltip content="Redo">
              <Button
                size="slim"
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
              >
                ↷
              </Button>
            </Tooltip>
          </ButtonGroup>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

          {/* Version Management */}
          <Tooltip content="Version History">
            <Button
              data-testid="version-toolbar-button"
              size="slim"
              onClick={createMobileFriendlyHandler(() => {
                console.debug('Version button clicked');
                setShowVersionPopover(!showVersionPopover);
              })}
              icon={ClockIcon}
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
            />
          </Tooltip>
          
          {/* Version History Modal */}
          <div style={{ zIndex: 10000000 }}>
            <Modal
              open={showVersionPopover}
              onClose={() => setShowVersionPopover(false)}
              title="Version History"
              primaryAction={{
                content: 'Create New',
                onAction: () => {
                  const versionTitle = prompt('Enter a title for this version (optional):');
                  createVersion(versionTitle);
                  setShowVersionPopover(false);
                }
              }}
              secondaryActions={[
                {
                  content: 'Close',
                  onAction: () => setShowVersionPopover(false),
                },
              ]}
            >
            <Modal.Section>
              {versions.length > 0 ? (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <BlockStack gap="3">
                    {versions.map((version, index) => (
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
                              {index > 0 && (
                                <Button
                                  size="micro"
                                  variant="plain"
                                  onClick={() => {
                                    // Compare with previous version
                                    const prevVersion = versions[index - 1];
                                    compareVersions(prevVersion, version);
                                  }}
                                >
                                  Compare with previous
                                </Button>
                              )}
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
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <Text variant="bodyMd" color="subdued">
                    No versions available yet. Create your first version!
                  </Text>
                </div>
              )}
            </Modal.Section>
          </Modal>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

          {/* Fullscreen Button */}
          <Tooltip content={isExpanded ? "Exit Fullscreen" : "Enter Fullscreen"}>
            <Button
              size="slim"
              onClick={toggleExpanded}
            >
              {isExpanded ? '⤓' : '⤢'}
            </Button>
          </Tooltip>

        </InlineStack>
      </div>

      {/* Editor Content */}
      <div className="notion-editor-wrapper" ref={editorRef}>
        <EditorContent editor={editor} />
        {editor && <TiptapDragHandle editor={editor} />}
        
        {/* Debug indicator for development */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 1000
          }}>
            Last change: {debugInfo.lastChange || 'None'}<br/>
            Last version: {debugInfo.lastVersion || 'None'}
          </div>
        )}
        
        {/* Bubble Menu */}
        {editor && (
          <BubbleMenu 
            editor={editor} 
            tippyOptions={{ duration: 100 }}
            className="notion-bubble-menu"
          >
            <ButtonGroup variant="segmented">
              <Tooltip content="Bold">
                <Button
                  size="micro"
                  pressed={editor.isActive('bold')}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >
                  <TextIcon icon="bold" />
                </Button>
              </Tooltip>
              <Tooltip content="Italic">
                <Button
                  size="micro"
                  pressed={editor.isActive('italic')}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                  <TextIcon icon="italic" />
                </Button>
              </Tooltip>
              <Tooltip content="Underline">
                <Button
                  size="micro"
                  pressed={editor.isActive('underline')}
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                  <TextIcon icon="underline" />
                </Button>
              </Tooltip>
              <Tooltip content="Strikethrough">
                <Button
                  size="micro"
                  pressed={editor.isActive('strike')}
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                  <TextIcon icon="strikethrough" />
                </Button>
              </Tooltip>
              <Tooltip content="Text Color">
                <Popover
                  active={showTextColorPopover}
                  activator={
                    <Button
                      size="micro"
                      disclosure
                      onClick={() => setShowTextColorPopover(!showTextColorPopover)}
                    >
                      <Icon source={TextColorIcon} />
                    </Button>
                  }
                  onClose={() => setShowTextColorPopover(false)}
                >
                  <ActionList
                    items={[
                      {
                        content: 'Default',
                        onAction: () => {
                          editor.chain().focus().unsetColor().run();
                          setShowTextColorPopover(false);
                        }
                      },
                      {
                        content: 'Red',
                        onAction: () => {
                          editor.chain().focus().setColor('#ef4444').run();
                          setShowTextColorPopover(false);
                        }
                      },
                      {
                        content: 'Orange',
                        onAction: () => {
                          editor.chain().focus().setColor('#f97316').run();
                          setShowTextColorPopover(false);
                        }
                      },
                      {
                        content: 'Yellow',
                        onAction: () => {
                          editor.chain().focus().setColor('#eab308').run();
                          setShowTextColorPopover(false);
                        }
                      },
                      {
                        content: 'Green',
                        onAction: () => {
                          editor.chain().focus().setColor('#22c55e').run();
                          setShowTextColorPopover(false);
                        }
                      },
                      {
                        content: 'Blue',
                        onAction: () => {
                          editor.chain().focus().setColor('#3b82f6').run();
                          setShowTextColorPopover(false);
                        }
                      },
                      {
                        content: 'Purple',
                        onAction: () => {
                          editor.chain().focus().setColor('#a855f7').run();
                          setShowTextColorPopover(false);
                        }
                      },
                      {
                        content: 'Pink',
                        onAction: () => {
                          editor.chain().focus().setColor('#ec4899').run();
                          setShowTextColorPopover(false);
                        }
                      },
                    ]}
                  />
                </Popover>
              </Tooltip>
              <Tooltip content="Highlight">
                <Button
                  size="micro"
                  pressed={editor.isActive('highlight')}
                  onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef3c7' }).run()}
                >
                  <Icon source={EditIcon} />
                </Button>
              </Tooltip>
              <Tooltip content="Link">
                <Button
                  size="micro"
                  pressed={editor.isActive('link')}
                  onClick={() => setShowLinkModal(true)}
                >
                  <TextIcon icon="link" />
                </Button>
              </Tooltip>
            </ButtonGroup>
          </BubbleMenu>
        )}
        
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

      <div style={{ zIndex: 10000000 }}>
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
      </div>

      <div style={{ zIndex: 10000000 }}>
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

      {/* Version Modal */}
      <Modal
        open={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        title="Note Versions"
        primaryAction={{
          content: 'Create New Version',
          onAction: () => {
            const versionTitle = prompt('Enter a title for this version (optional):');
            createVersion(versionTitle);
            setShowVersionModal(false);
          },
        }}
        secondaryActions={[
          {
            content: 'Close',
            onAction: () => setShowVersionModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="4">
            <Text variant="bodyMd" color="subdued">
              Select a version to restore, or create a new version with a custom title.
            </Text>
            {versions.length > 0 ? (
              <BlockStack gap="2">
                {versions.map((version) => (
                  <Card key={version.id}>
                    <Card.Section>
                      <InlineStack gap="3" align="space-between">
                        <BlockStack gap="1">
                          <Text variant="bodyMd" fontWeight="medium">
                            {version.versionTitle || version.title}
                          </Text>
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
            ) : (
              <Text variant="bodyMd" color="subdued">
                No versions available yet. Create your first version!
              </Text>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Version Comparison Modal */}
      <div style={{ zIndex: 10000000 }}>
        <Modal
          open={showComparisonModal}
          onClose={() => setShowComparisonModal(false)}
          title="Compare Versions"
          large
          primaryAction={{
            content: 'Close',
            onAction: () => setShowComparisonModal(false),
          }}
        >
        <Modal.Section>
          <BlockStack gap="4">
            {comparisonVersions.version1 && comparisonVersions.version2 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Version 1 */}
                <div>
                  <Card>
                    <Card.Section>
                      <BlockStack gap="2">
                        <Text variant="headingMd">
                          {comparisonVersions.version1.versionTitle || comparisonVersions.version1.title}
                        </Text>
                        <Text variant="bodySm" color="subdued">
                          {new Date(comparisonVersions.version1.createdAt).toLocaleString()}
                        </Text>
                        <div 
                          style={{ 
                            border: '1px solid #e1e3e5', 
                            borderRadius: '4px', 
                            padding: '12px',
                            backgroundColor: '#f6f6f7',
                            maxHeight: '400px',
                            overflowY: 'auto'
                          }}
                          dangerouslySetInnerHTML={{ 
                            __html: comparisonVersions.version1.content 
                          }}
                        />
                        <Button
                          size="slim"
                          onClick={() => restoreVersion(comparisonVersions.version1)}
                        >
                          Restore This Version
                        </Button>
                      </BlockStack>
                    </Card.Section>
                  </Card>
                </div>

                {/* Version 2 */}
                <div>
                  <Card>
                    <Card.Section>
                      <BlockStack gap="2">
                        <Text variant="headingMd">
                          {comparisonVersions.version2.versionTitle || comparisonVersions.version2.title}
                        </Text>
                        <Text variant="bodySm" color="subdued">
                          {new Date(comparisonVersions.version2.createdAt).toLocaleString()}
                        </Text>
                        <div 
                          style={{ 
                            border: '1px solid #e1e3e5', 
                            borderRadius: '4px', 
                            padding: '12px',
                            backgroundColor: '#f6f6f7',
                            maxHeight: '400px',
                            overflowY: 'auto'
                          }}
                          dangerouslySetInnerHTML={{ 
                            __html: comparisonVersions.version2.content 
                          }}
                        />
                        <Button
                          size="slim"
                          onClick={() => restoreVersion(comparisonVersions.version2)}
                        >
                          Restore This Version
                        </Button>
                      </BlockStack>
                    </Card.Section>
                  </Card>
                </div>
              </div>
            ) : (
              <Text variant="bodyMd" color="subdued">
                No versions selected for comparison.
              </Text>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
      </div>

      {/* Fullscreen Editor */}
      {isExpanded && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#ffffff',
            zIndex: 9999999,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Fullscreen Toolbar */}
          <div className="notion-toolbar" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <InlineStack gap="2" align="start">
              {/* Text Color */}
              <Popover
                active={showTextColorPopover}
                activator={
                  <Tooltip content="Text Color">
                    <Button
                      size="slim"
                      disclosure
                      onClick={() => setShowTextColorPopover(!showTextColorPopover)}
                    >
                      <Icon source={TextColorIcon} />
                    </Button>
                  </Tooltip>
                }
                onClose={() => setShowTextColorPopover(false)}
              >
                <ActionList
                  items={[
                    {
                      content: 'Default',
                      onAction: () => {
                        editor.chain().focus().unsetColor().run();
                        setShowTextColorPopover(false);
                      }
                    },
                    {
                      content: 'Red',
                      onAction: () => {
                        editor.chain().focus().setColor('#ef4444').run();
                        setShowTextColorPopover(false);
                      }
                    },
                    {
                      content: 'Orange',
                      onAction: () => {
                        editor.chain().focus().setColor('#f97316').run();
                        setShowTextColorPopover(false);
                      }
                    },
                    {
                      content: 'Yellow',
                      onAction: () => {
                        editor.chain().focus().setColor('#eab308').run();
                        setShowTextColorPopover(false);
                      }
                    },
                    {
                      content: 'Green',
                      onAction: () => {
                        editor.chain().focus().setColor('#22c55e').run();
                        setShowTextColorPopover(false);
                      }
                    },
                    {
                      content: 'Blue',
                      onAction: () => {
                        editor.chain().focus().setColor('#3b82f6').run();
                        setShowTextColorPopover(false);
                      }
                    },
                    {
                      content: 'Purple',
                      onAction: () => {
                        editor.chain().focus().setColor('#a855f7').run();
                        setShowTextColorPopover(false);
                      }
                    },
                    {
                      content: 'Pink',
                      onAction: () => {
                        editor.chain().focus().setColor('#ec4899').run();
                        setShowTextColorPopover(false);
                      }
                    },
                  ]}
                />
              </Popover>

              {/* Highlight Text */}
              <Popover
                active={showHighlightColorPopover}
                activator={
                  <Tooltip content="Highlight Text">
                    <Button
                      size="slim"
                      disclosure
                      pressed={editor.isActive('highlight')}
                      onClick={() => setShowHighlightColorPopover(!showHighlightColorPopover)}
                    >
                      <Icon source={EditIcon} />
                    </Button>
                  </Tooltip>
                }
                onClose={() => setShowHighlightColorPopover(false)}
              >
                <ActionList
                  items={[
                    {
                      content: 'Remove Highlight',
                      onAction: () => {
                        editor.chain().focus().unsetHighlight().run();
                        setShowHighlightColorPopover(false);
                      }
                    },
                    {
                      content: 'Yellow',
                      onAction: () => {
                        editor.chain().focus().setHighlight({ color: '#fef3c7' }).run();
                        setShowHighlightColorPopover(false);
                      }
                    },
                    {
                      content: 'Green',
                      onAction: () => {
                        editor.chain().focus().setHighlight({ color: '#d1fae5' }).run();
                        setShowHighlightColorPopover(false);
                      }
                    },
                    {
                      content: 'Blue',
                      onAction: () => {
                        editor.chain().focus().setHighlight({ color: '#dbeafe' }).run();
                        setShowHighlightColorPopover(false);
                      }
                    },
                    {
                      content: 'Pink',
                      onAction: () => {
                        editor.chain().focus().setHighlight({ color: '#fce7f3' }).run();
                        setShowHighlightColorPopover(false);
                      }
                    },
                    {
                      content: 'Purple',
                      onAction: () => {
                        editor.chain().focus().setHighlight({ color: '#f3e8ff' }).run();
                        setShowHighlightColorPopover(false);
                      }
                    },
                  ]}
                />
              </Popover>

              {/* Bold, Italic, Underline */}
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
              </ButtonGroup>

              {/* Insert Emoji */}
              <Tooltip content="Insert Emoji">
                <Button
                  size="slim"
                  onClick={() => {
                    const emoji = prompt('Enter an emoji:');
                    if (emoji) {
                      editor.chain().focus().insertContent(emoji).run();
                    }
                  }}
                >
                  <Icon source={SmileyHappyIcon} />
                </Button>
              </Tooltip>

              {/* Font Family */}
              <Popover
                active={showFontFamilyPopover}
                activator={
                  <Tooltip content="Font Family">
                    <Button
                      size="slim"
                      disclosure
                      onClick={() => setShowFontFamilyPopover(!showFontFamilyPopover)}
                    >
                      <Icon source={TextFontIcon} />
                    </Button>
                  </Tooltip>
                }
                onClose={() => setShowFontFamilyPopover(false)}
              >
                <ActionList
                  items={[
                    {
                      content: 'Default',
                      onAction: () => {
                        editor.chain().focus().unsetFontFamily().run();
                        setShowFontFamilyPopover(false);
                      }
                    },
                    {
                      content: 'Arial',
                      onAction: () => {
                        editor.chain().focus().setFontFamily('Arial, sans-serif').run();
                        setShowFontFamilyPopover(false);
                      }
                    },
                    {
                      content: 'Courier New',
                      onAction: () => {
                        editor.chain().focus().setFontFamily('Courier New, monospace').run();
                        setShowFontFamilyPopover(false);
                      }
                    },
                    {
                      content: 'Georgia',
                      onAction: () => {
                        editor.chain().focus().setFontFamily('Georgia, serif').run();
                        setShowFontFamilyPopover(false);
                      }
                    },
                    {
                      content: 'Times New Roman',
                      onAction: () => {
                        editor.chain().focus().setFontFamily('Times New Roman, serif').run();
                        setShowFontFamilyPopover(false);
                      }
                    },
                    {
                      content: 'Verdana',
                      onAction: () => {
                        editor.chain().focus().setFontFamily('Verdana, sans-serif').run();
                        setShowFontFamilyPopover(false);
                      }
                    },
                  ]}
                />
              </Popover>

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

              {/* H1, H2, H3 */}
              <ButtonGroup variant="segmented">
                <Tooltip content="Heading 1">
                  <Button
                    size="slim"
                    pressed={editor.isActive('heading', { level: 1 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  >
                    H1
                  </Button>
                </Tooltip>
                <Tooltip content="Heading 2">
                  <Button
                    size="slim"
                    pressed={editor.isActive('heading', { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  >
                    H2
                  </Button>
                </Tooltip>
                <Tooltip content="Heading 3">
                  <Button
                    size="slim"
                    pressed={editor.isActive('heading', { level: 3 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  >
                    H3
                  </Button>
                </Tooltip>
              </ButtonGroup>

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

              {/* Hard Break */}
              <Tooltip content="Hard Break">
                <Button
                  size="slim"
                  onClick={() => editor.chain().focus().setHardBreak().run()}
                >
                  <TextIcon icon="plus" />
                </Button>
              </Tooltip>

              {/* Line Height */}
              <Popover
                active={showLineHeightPopover}
                activator={
                  <Tooltip content="Line Height">
                    <Button
                      size="slim"
                      disclosure
                      onClick={createMobileFriendlyHandler(() => setShowLineHeightPopover(!showLineHeightPopover))}
                      style={{
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation'
                      }}
                      icon={MenuVerticalIcon}
                    />
                  </Tooltip>
                }
                onClose={() => setShowLineHeightPopover(false)}
              >
                <ActionList
                  items={[
                    {
                      content: 'Default',
                      onAction: () => {
                        editor.chain().focus().unsetLineHeight().run();
                        setShowLineHeightPopover(false);
                      }
                    },
                    {
                      content: '1.0',
                      onAction: () => {
                        editor.chain().focus().setLineHeight(1.0).run();
                        setShowLineHeightPopover(false);
                      }
                    },
                    {
                      content: '1.2',
                      onAction: () => {
                        editor.chain().focus().setLineHeight(1.2).run();
                        setShowLineHeightPopover(false);
                      }
                    },
                    {
                      content: '1.5',
                      onAction: () => {
                        editor.chain().focus().setLineHeight(1.5).run();
                        setShowLineHeightPopover(false);
                      }
                    },
                    {
                      content: '2.0',
                      onAction: () => {
                        editor.chain().focus().setLineHeight(2.0).run();
                        setShowLineHeightPopover(false);
                      }
                    },
                  ]}
                />
              </Popover>

              {/* Paragraph */}
              <Tooltip content="Paragraph">
                <Button
                  size="slim"
                  pressed={editor.isActive('paragraph')}
                  onClick={() => editor.chain().focus().setParagraph().run()}
                >
                  <TextIcon icon="text" />
                </Button>
              </Tooltip>

              {/* Text alignment */}
              <ButtonGroup variant="segmented">
                <Tooltip content="Align Left">
                  <Button
                    size="slim"
                    pressed={editor.isActive({ textAlign: 'left' })}
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  >
                    <TextIcon icon="alignLeft" />
                  </Button>
                </Tooltip>
                <Tooltip content="Align Center">
                  <Button
                    size="slim"
                    pressed={editor.isActive({ textAlign: 'center' })}
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  >
                    <TextIcon icon="alignCenter" />
                  </Button>
                </Tooltip>
                <Tooltip content="Align Right">
                  <Button
                    size="slim"
                    pressed={editor.isActive({ textAlign: 'right' })}
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  >
                    <TextIcon icon="alignRight" />
                  </Button>
                </Tooltip>
              </ButtonGroup>

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

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
                    icon={ClipboardChecklistIcon}
                  />
                </Tooltip>
              </ButtonGroup>

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

              {/* Horizontal Rule */}
              <Tooltip content="Horizontal Rule">
                <Button
                  size="slim"
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                >
                  <TextIcon icon="horizontalDots" />
                </Button>
              </Tooltip>

              {/* Insert Table */}
              <Tooltip content="Insert Table">
                <Button
                  size="slim"
                  onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                >
                  <TextIcon icon="table" />
                </Button>
              </Tooltip>

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

              {/* Insert Link */}
              <Tooltip content="Insert Link">
                <Button
                  size="slim"
                  onClick={createMobileFriendlyHandler(() => setShowLinkModal(true))}
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <TextIcon icon="link" />
                </Button>
              </Tooltip>

              {/* Insert Image */}
              <Tooltip content="Insert Image">
                <Button
                  size="slim"
                  onClick={createMobileFriendlyHandler(() => setShowImageModal(true))}
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <TextIcon icon="image" />
                </Button>
              </Tooltip>

              {/* Insert YouTube Video */}
              <Tooltip content="Insert YouTube Video">
                <Button
                  size="slim"
                  onClick={createMobileFriendlyHandler(() => setShowVideoModal(true))}
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <Icon source={LogoYoutubeIcon} />
                </Button>
              </Tooltip>

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

              {/* Blockquote */}
              <Tooltip content="Blockquote">
                <Button
                  size="slim"
                  pressed={editor.isActive('blockquote')}
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                  <TextIcon icon="quote" />
                </Button>
              </Tooltip>

              {/* Code Block */}
              <Tooltip content="Code Block">
                <Button
                  size="slim"
                  pressed={editor.isActive('codeBlock')}
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                >
                  <TextIcon icon="code" />
                </Button>
              </Tooltip>

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

              {/* Clear Marks */}
              <Popover
                active={showClearMarksPopover}
                activator={
                  <Tooltip content="Clear Marks">
                    <Button
                      size="slim"
                      disclosure
                      onClick={() => setShowClearMarksPopover(!showClearMarksPopover)}
                    >
                      <TextIcon icon="question" />
                    </Button>
                  </Tooltip>
                }
                onClose={() => setShowClearMarksPopover(false)}
              >
                <ActionList
                  items={[
                    {
                      content: 'Clear All Formatting',
                      onAction: clearAllMarks
                    },
                    {
                      content: 'Clear Bold',
                      onAction: () => {
                        editor.chain().focus().unsetBold().run();
                        setShowClearMarksPopover(false);
                      }
                    },
                    {
                      content: 'Clear Italic',
                      onAction: () => {
                        editor.chain().focus().unsetItalic().run();
                        setShowClearMarksPopover(false);
                      }
                    },
                    {
                      content: 'Clear Underline',
                      onAction: () => {
                        editor.chain().focus().unsetUnderline().run();
                        setShowClearMarksPopover(false);
                      }
                    },
                    {
                      content: 'Clear Highlight',
                      onAction: () => {
                        editor.chain().focus().unsetHighlight().run();
                        setShowClearMarksPopover(false);
                      }
                    },
                  ]}
                />
              </Popover>

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

              {/* Versions */}
              <Tooltip content="Versions">
                <Button
                  size="slim"
                  onClick={() => setShowVersionModal(true)}
                >
                  <TextIcon icon="chevronDown" />
                </Button>
              </Tooltip>

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

              {/* Undo, Redo */}
              <ButtonGroup variant="segmented">
                <Tooltip content="Undo">
                  <Button
                    size="slim"
                    disabled={!editor.can().undo()}
                    onClick={() => editor.chain().focus().undo().run()}
                  >
                    ↶
                  </Button>
                </Tooltip>
                <Tooltip content="Redo">
                  <Button
                    size="slim"
                    disabled={!editor.can().redo()}
                    onClick={() => editor.chain().focus().redo().run()}
                  >
                    ↷
                  </Button>
                </Tooltip>
              </ButtonGroup>

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

              {/* Version Management */}
              <Tooltip content="Version History">
                <Button
                  data-testid="version-toolbar-button-fullscreen"
                  size="slim"
                  onClick={createMobileFriendlyHandler(() => {
                    console.debug('Version button clicked (fullscreen)');
                    setShowVersionPopover(!showVersionPopover);
                  })}
                  icon={ClockIcon}
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                />
              </Tooltip>

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: '#e1e3e5', margin: '0 4px' }} />

              {/* Fullscreen Button */}
              <Tooltip content={isExpanded ? "Exit Fullscreen" : "Enter Fullscreen"}>
                <Button
                  size="slim"
                  onClick={toggleExpanded}
                >
                  {isExpanded ? '⤓' : '⤢'}
                </Button>
              </Tooltip>

            </InlineStack>
          </div>

          {/* Fullscreen Editor Content */}
          <div className="notion-editor-wrapper" style={{ flex: 1, overflow: 'auto' }}>
            <EditorContent editor={editor} />
            {editor && <TiptapDragHandle editor={editor} />}
            
            {/* Bubble Menu */}
            {editor && (
              <BubbleMenu 
                editor={editor} 
                tippyOptions={{ duration: 100 }}
                className="notion-bubble-menu"
              >
                <ButtonGroup variant="segmented">
                  <Tooltip content="Bold">
                    <Button
                      size="micro"
                      pressed={editor.isActive('bold')}
                      onClick={() => editor.chain().focus().toggleBold().run()}
                    >
                      <TextIcon icon="bold" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Italic">
                    <Button
                      size="micro"
                      pressed={editor.isActive('italic')}
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                    >
                      <TextIcon icon="italic" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Underline">
                    <Button
                      size="micro"
                      pressed={editor.isActive('underline')}
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                    >
                      <TextIcon icon="underline" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Strikethrough">
                    <Button
                      size="micro"
                      pressed={editor.isActive('strike')}
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                    >
                      <TextIcon icon="strikethrough" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Text Color">
                    <Popover
                      active={showTextColorPopover}
                      activator={
                        <Button
                          size="micro"
                          disclosure
                          onClick={() => setShowTextColorPopover(!showTextColorPopover)}
                        >
                          <Icon source={TextColorIcon} />
                        </Button>
                      }
                      onClose={() => setShowTextColorPopover(false)}
                    >
                      <ActionList
                        items={[
                          {
                            content: 'Default',
                            onAction: () => {
                              editor.chain().focus().unsetColor().run();
                              setShowTextColorPopover(false);
                            }
                          },
                          {
                            content: 'Red',
                            onAction: () => {
                              editor.chain().focus().setColor('#ef4444').run();
                              setShowTextColorPopover(false);
                            }
                          },
                          {
                            content: 'Orange',
                            onAction: () => {
                              editor.chain().focus().setColor('#f97316').run();
                              setShowTextColorPopover(false);
                            }
                          },
                          {
                            content: 'Yellow',
                            onAction: () => {
                              editor.chain().focus().setColor('#eab308').run();
                              setShowTextColorPopover(false);
                            }
                          },
                          {
                            content: 'Green',
                            onAction: () => {
                              editor.chain().focus().setColor('#22c55e').run();
                              setShowTextColorPopover(false);
                            }
                          },
                          {
                            content: 'Blue',
                            onAction: () => {
                              editor.chain().focus().setColor('#3b82f6').run();
                              setShowTextColorPopover(false);
                            }
                          },
                          {
                            content: 'Purple',
                            onAction: () => {
                              editor.chain().focus().setColor('#a855f7').run();
                              setShowTextColorPopover(false);
                            }
                          },
                          {
                            content: 'Pink',
                            onAction: () => {
                              editor.chain().focus().setColor('#ec4899').run();
                              setShowTextColorPopover(false);
                            }
                          },
                        ]}
                      />
                    </Popover>
                  </Tooltip>
                  <Tooltip content="Highlight">
                    <Button
                      size="micro"
                      pressed={editor.isActive('highlight')}
                      onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef3c7' }).run()}
                    >
                      <Icon source={EditIcon} />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Link">
                    <Button
                      size="micro"
                      pressed={editor.isActive('link')}
                      onClick={() => setShowLinkModal(true)}
                    >
                      <TextIcon icon="link" />
                    </Button>
                  </Tooltip>
                </ButtonGroup>
              </BubbleMenu>
            )}
            
            {/* Character Count */}
            {editor && (
              <div className="notion-character-count">
                <Text variant="bodySm" color="subdued">
                  {editor.storage.characterCount.characters()} characters • {editor.storage.characterCount.words()} words
                </Text>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotionTiptapEditor;