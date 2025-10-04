import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
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
  ProfileIcon
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

const NotionTiptapEditor = ({ value, onChange, placeholder = "Press '/' for commands..." }) => {
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

            return {
              onStart: props => {
                component = document.createElement('div');
                component.className = 'entity-mention-suggestions';
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
                if (component) {
                  component.remove();
                  component = null;
                }
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
          </ButtonGroup>

          {/* Task List - Separate button for visibility */}
          <Tooltip content="Task List">
            <Button
              size="slim"
              pressed={editor.isActive('taskList')}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            >
              <TextIcon icon="checkbox" />
            </Button>
          </Tooltip>

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

          {/* Font Family Dropdown */}
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

          {/* Highlight Color */}
          <Popover
            active={showHighlightColorPopover}
            activator={
              <Tooltip content="Highlight">
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

          {/* Emoji Button */}
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

          {/* YouTube Button */}
          <Tooltip content="Insert YouTube Video">
            <Button
              size="slim"
              onClick={() => setShowVideoModal(true)}
            >
              <Icon source={LogoYoutubeIcon} />
            </Button>
          </Tooltip>

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

        </InlineStack>
      </div>

      {/* Editor Content */}
      <div className="notion-editor-wrapper" ref={editorRef}>
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