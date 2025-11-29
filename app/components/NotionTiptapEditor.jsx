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
import ContactCard from './ContactCard';
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
  SkeletonDisplayText,
  Banner,
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
    product: '#44AF69',
    variant: '#33CC68',
    order: '#3B82F6',
    customer: '#8B5CF6',
    collection: '#FCAB10',
    discount: '#2B9EB3',
    draftOrder: '#64748B',
    person: '#F8333C'
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
  const [versionsMeta, setVersionsMeta] = useState({
    plan: null,
    visibleCount: 0,
    hasAllManualVisible: false,
    lastActionInlineAlert: null,
  });
  const [inlineAlertCode, setInlineAlertCode] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastAutoVersion, setLastAutoVersion] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ lastChange: null, lastVersion: null });
  const [mobileCompareMode, setMobileCompareMode] = useState(false);
  const [mobileSelectedVersions, setMobileSelectedVersions] = useState({ version1: null, version2: null });
  const [deletingVersionId, setDeletingVersionId] = useState(null);
  const [restoringVersionId, setRestoringVersionId] = useState(null);
  const [restorationInfo, setRestorationInfo] = useState(null);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [pendingRestoreVersion, setPendingRestoreVersion] = useState(null);
  
  // Contact card state
  const [showContactCard, setShowContactCard] = useState(false);
  const [contactCardContact, setContactCardContact] = useState(null);
  const [contactCardVariant, setContactCardVariant] = useState('modal');
  const [contactCardFromEditor, setContactCardFromEditor] = useState(false);
  
  const editorRef = useRef(null);
  const slashMenuRef = useRef(null);
  const autoVersionIntervalRef = useRef(null);

  const synchronizeVersionsState = useCallback(
    (payload, { selectCreated = false } = {}) => {
      if (!payload || typeof payload !== 'object') {
        return null;
      }

      const {
        versions: incomingVersions,
        meta,
        inlineAlert,
        version: createdVersion,
      } = payload;

      if (meta) {
        setVersionsMeta(meta);
        const metaAlert =
          Object.prototype.hasOwnProperty.call(meta, 'lastActionInlineAlert')
            ? meta.lastActionInlineAlert
            : null;
        if (inlineAlert !== undefined || metaAlert !== undefined) {
          setInlineAlertCode(
            inlineAlert !== undefined ? inlineAlert : metaAlert ?? null,
          );
        }
        if (metaAlert === null && inlineAlert === undefined) {
          setInlineAlertCode(null);
        }
      } else if (inlineAlert !== undefined) {
        setInlineAlertCode(inlineAlert);
      }

      if (Array.isArray(incomingVersions)) {
        setVersions(incomingVersions);
        setCurrentVersionId((previous) => {
          if (
            selectCreated &&
            createdVersion &&
            createdVersion.freeVisible
          ) {
            return createdVersion.id;
          }

          if (previous && incomingVersions.some((v) => v.id === previous)) {
            return previous;
          }

          return incomingVersions[0]?.id ?? null;
        });
      }

      return createdVersion ?? null;
    },
    [setVersions, setVersionsMeta, setInlineAlertCode, setCurrentVersionId],
  );

  const renderVersionInlineAlert = useCallback(() => {
    if (inlineAlertCode !== 'NO_ROOM_DUE_TO_MANUALS') {
      return null;
    }

    return (
      <Banner
        tone="warning"
        title="Version limit reached"
        onDismiss={() => setInlineAlertCode(null)}
      >
        You’ve reached your version limit. Remove a manual save to make room for auto-saves.
      </Banner>
    );
  }, [inlineAlertCode]);


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
                  let metadataDiv = null;
                  if (metadata) {
                    metadataDiv = document.createElement('div');
                    metadataDiv.style.cssText = 'font-size: 11px; color: inherit; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                    metadataDiv.textContent = metadata;
                    contentDiv.appendChild(metadataDiv);
                  }
                  
                  container.appendChild(contentDiv);
                  button.appendChild(container);
                  
                  const isSelected = index === props.selectedIndex && !item.disabled;
                  
                  button.style.cssText = `
                    display: block;
                    width: 100%;
                    text-align: left;
                    padding: 10px;
                    border: none;
                    background: ${isSelected ? bgColor : 'transparent'};
                    color: ${isSelected ? 'white' : 'inherit'};
                    cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
                    opacity: ${item.disabled ? '0.6' : '1'};
                    border-radius: 6px;
                    transition: background 0.15s, color 0.15s;
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
                      button.style.color = 'white';
                      if (metadataDiv) {
                        metadataDiv.style.color = 'white';
                        metadataDiv.style.opacity = '0.9';
                      }
                    });
                    button.addEventListener('mouseleave', () => {
                      const stillSelected = index === props.selectedIndex;
                      button.style.background = stillSelected ? getEntityColor(item.type) : 'transparent';
                      button.style.color = stillSelected ? 'white' : 'inherit';
                      if (metadataDiv) {
                        metadataDiv.style.color = stillSelected ? 'white' : '#666';
                        metadataDiv.style.opacity = stillSelected ? '0.9' : '0.8';
                      }
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
                  let metadataDiv = null;
                  if (metadata) {
                    metadataDiv = document.createElement('div');
                    metadataDiv.style.cssText = 'font-size: 11px; color: inherit; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                    metadataDiv.textContent = metadata;
                    contentDiv.appendChild(metadataDiv);
                  }
                  
                  container.appendChild(contentDiv);
                  button.appendChild(container);
                  
                  const isSelected = index === props.selectedIndex && !item.disabled;
                  
                  button.style.cssText = `
                    display: block;
                    width: 100%;
                    text-align: left;
                    padding: 10px;
                    border: none;
                    background: ${isSelected ? bgColor : 'transparent'};
                    color: ${isSelected ? 'white' : 'inherit'};
                    cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
                    opacity: ${item.disabled ? '0.6' : '1'};
                    border-radius: 6px;
                    transition: background 0.15s, color 0.15s;
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
                      button.style.color = 'white';
                      if (metadataDiv) {
                        metadataDiv.style.color = 'white';
                        metadataDiv.style.opacity = '0.9';
                      }
                    });
                    button.addEventListener('mouseleave', () => {
                      const stillSelected = index === props.selectedIndex;
                      button.style.background = stillSelected ? getEntityColor(item.type) : 'transparent';
                      button.style.color = stillSelected ? 'white' : 'inherit';
                      if (metadataDiv) {
                        metadataDiv.style.color = stillSelected ? 'white' : '#666';
                        metadataDiv.style.opacity = stillSelected ? '0.9' : '0.8';
                      }
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
              onExit(props) {
                if (component) {
                  component.remove();
                  component = null;
                }
                // Also remove any orphaned components
                const orphaned = document.querySelectorAll('.entity-mention-suggestions');
                orphaned.forEach(el => {
                  if (el !== component) {
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
          const parentNode = view.state.selection.$from.parent;
          const isAtParagraphStart = view.state.selection.from === 1 || 
            (parentNode.type.name === 'paragraph' && view.state.selection.$from.parentOffset === 0);
          const isEmptyDocument = view.state.doc.textContent.length === 0;
          
          console.log('[NotionEditor beforeinput] Event:', event.inputType, {
            data: event.data,
            selectionFrom: view.state.selection.from,
            selectionTo: view.state.selection.to,
            nodeAtCursor: nodeAt?.type.name,
            nodeBefore: nodeBefore?.type.name,
            parentNode: parentNode.type.name,
            editable: view.editable,
            isAtParagraphStart,
            isEmptyDocument
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
          
          // Handle spacebar at beginning of paragraph or empty document
          // This ensures spaces appear immediately when typing at the start
          if (event.inputType === 'insertText' && event.data === ' ' && (isAtParagraphStart || isEmptyDocument)) {
            console.log('[NotionEditor beforeinput] Spacebar at paragraph/document start, manually inserting space');
            
            // Manually insert the space at the current position
            const { state } = view;
            const tr = state.tr.insertText(' ', state.selection.from);
            view.dispatch(tr);
            
            // Prevent default to ensure our manual insertion is used
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

  // Handle contact card display
  const handleContactCardShow = async (contactId, variant, event, fromEditor = false) => {
    try {
      // Fetch full contact details by ID
      const response = await fetch(`/api/contacts?id=${contactId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contact = await response.json();
      
      if (contact && contact.id) {
        setContactCardContact(contact);
        setContactCardVariant(variant);
        setContactCardFromEditor(fromEditor);
        
        setShowContactCard(true);
      }
    } catch (error) {
      console.error('Error fetching contact details:', error);
    }
  };

  const handleContactCardClose = () => {
    setShowContactCard(false);
    setContactCardContact(null);
    setContactCardFromEditor(false);
  };

  // Add global click handlers for entity mentions (desktop only, disabled on mobile)
  useEffect(() => {
    const handleMentionInteraction = (event) => {
      // Find the closest entity-mention element (in case click is on child element)
      const mentionElement = event.target.closest('.entity-mention');
      if (!mentionElement) return;

      // Check if we're on mobile
      const isMobile = window.innerWidth <= 1024 || ('ontouchstart' in window);
      
      if (isMobile) {
        // On mobile, prevent default behavior and show alert
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        alert('Mention interactions are only available on desktop. Please use a desktop device to view contact details.');
        return;
      }

      const contactId = mentionElement.getAttribute('data-id');
      const type = mentionElement.getAttribute('data-type');
      
      // Only handle person and business mentions (not Shopify entities)
      if (type === 'person' || type === 'business') {
        // Open contact card modal when clicking on contact mention (desktop only)
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        handleContactCardShow(contactId, 'modal', event, true);
        return;
      } else {
        // Handle Shopify entity mentions (existing behavior, desktop only)
        const url = mentionElement.getAttribute('data-url');
        if (url) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
    };

    // Add event listeners to editor
    const editorElement = editorRef.current;
    if (editorElement) {
      // Use capture phase to catch events before they reach the editor
      editorElement.addEventListener('click', handleMentionInteraction, true);
      
      return () => {
        editorElement.removeEventListener('click', handleMentionInteraction, true);
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
      const title =
        versionTitle ||
        (isAuto
          ? `Auto-Saved ${new Date().toLocaleTimeString()}`
          : `Version ${new Date().toLocaleString()}`);
      const snapshot = editor.getJSON();
      console.info('[versions] autosave call', { noteId, ts: Date.now(), isAuto });

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
          isAuto,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const shouldSelectCreated =
          !isAuto || Boolean(result?.version?.freeVisible);
        const createdVersion = synchronizeVersionsState(result, {
          selectCreated: shouldSelectCreated,
        });

        if (isAuto) {
          setLastAutoVersion(new Date());
          setHasUnsavedChanges(false);
          const alertCode =
            result.inlineAlert ??
            result?.meta?.lastActionInlineAlert ??
            null;
          setDebugInfo((prev) => ({
            ...prev,
            lastVersion:
              alertCode === 'NO_ROOM_DUE_TO_MANUALS'
                ? 'Hidden (manual limit reached)'
                : new Date().toLocaleTimeString(),
          }));
        } else {
          hasPendingChange.current = false;
          lastContentRef.current = content;
          setHasUnsavedChanges(false);
          if (onVersionCreated && createdVersion) {
            onVersionCreated(createdVersion);
          }
        }

        return createdVersion ?? null;
      } else {
        const errorData = await response.json();
        console.error('[NotionTiptapEditor] Failed to create version:', errorData);

        if (!isAuto && errorData.upgradeHint) {
          throw new Error(errorData.message || 'Version limit reached');
        }
      }
    } catch (error) {
      console.error('Failed to create version:', error);
    }
  };

  const restoreVersion = async (version, createCheckpoint = false) => {
    if (!editor || !version || !noteId) return;

    setRestoringVersionId(version.id);

    try {
      const response = await fetch('/api/restore-note-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId,
          versionId: version.id,
          preserveCurrentChanges: createCheckpoint,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[NotionTiptapEditor] Failed to restore version:', errorData);
        if (errorData.upgradeHint) {
          throw new Error(errorData.message || 'Version limit reached');
        }
        throw new Error(errorData.error || 'Failed to restore version');
      }

      const result = await response.json();

      if (result.restoredVersion?.snapshot) {
        editor.commands.setContent(result.restoredVersion.snapshot);
      } else if (result.restoredVersion?.content) {
        editor.commands.setContent(result.restoredVersion.content);
      } else if (version.snapshot) {
        editor.commands.setContent(version.snapshot);
      } else if (version.content) {
        editor.commands.setContent(version.content);
      }

      setShowVersionModal(false);
      setShowVersionPopover(false);
      setHasUnsavedChanges(false);

      setRestorationInfo({
        title: version.versionTitle || version.title || 'Unknown Version',
        time: version.createdAt,
      });

      synchronizeVersionsState(result, { selectCreated: false });
      setCurrentVersionId(version.id);
    } catch (error) {
      console.error('Failed to restore version:', error);
    } finally {
      setRestoringVersionId(null);
    }
  };

  const handleRestoreClick = (version) => {
    // Show dialog asking if user wants to create restore point
    setPendingRestoreVersion(version);
    setShowRestoreDialog(true);
  };

  const confirmRestore = (createCheckpoint) => {
    if (pendingRestoreVersion) {
      restoreVersion(pendingRestoreVersion, createCheckpoint);
      setPendingRestoreVersion(null);
      setShowRestoreDialog(false);
    }
  };

  const loadVersions = async () => {
    if (!noteId) return;
    
    try {
      const response = await fetch(`/api/get-note-versions?noteId=${noteId}`);
      if (response.ok) {
        const data = await response.json();
        synchronizeVersionsState(data, { selectCreated: false });
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

  const deleteVersion = async (version) => {
    console.log('[NotionTiptapEditor] deleteVersion called', { versionId: version.id });
    try {
      if (!noteId) {
        console.error('[NotionTiptapEditor] Cannot delete version: noteId is missing');
        return;
      }

      // Set loading state
      setDeletingVersionId(version.id);
      console.log('Setting deletingVersionId to:', version.id);

      const response = await fetch('/api/delete-note-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: noteId,
          versionId: version.id,
        }),
      });

      if (response.ok) {
        console.log('[NotionTiptapEditor] Version deleted successfully');
        const payload = await response.json();
        synchronizeVersionsState(payload, { selectCreated: false });
      } else {
        const errorData = await response.json();
        console.error('[NotionTiptapEditor] Failed to delete version:', errorData);
      }
    } catch (error) {
      console.error('[NotionTiptapEditor] Failed to delete version:', error);
    } finally {
      setDeletingVersionId(null);
    }
  };

  const isCurrentVersion = (version) => {
    // Use tracked current version ID instead of content comparison
    return currentVersionId === version.id;
  };

  const toggleMobileVersionSelection = (versionId) => {
    setMobileSelectedVersions(prev => {
      if (prev.version1 === versionId) {
        return { version1: null, version2: prev.version2 };
      } else if (prev.version2 === versionId) {
        return { version1: prev.version1, version2: null };
      } else if (!prev.version1) {
        return { version1: versionId, version2: prev.version2 };
      } else if (!prev.version2) {
        return { version1: prev.version1, version2: versionId };
      } else {
        return { version1: versionId, version2: null };
      }
    });
  };

  const compareMobileVersions = async () => {
    const version1 = versions.find(v => v.id === mobileSelectedVersions.version1);
    const version2 = versions.find(v => v.id === mobileSelectedVersions.version2);
    
    if (version1 && version2) {
      compareVersions(version1, version2);
      setMobileCompareMode(false);
      setMobileSelectedVersions({ version1: null, version2: null });
      setShowVersionPopover(false);
    }
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
          
          if (res.ok) {
            const result = await res.json();
            const createdVersion = synchronizeVersionsState(result, {
              selectCreated: Boolean(result?.version?.freeVisible),
            });
            setLastAutoVersion(new Date());
            const alertCode =
              result.inlineAlert ??
              result?.meta?.lastActionInlineAlert ??
              null;
            setDebugInfo(prev => ({
              ...prev,
              lastVersion:
                alertCode === 'NO_ROOM_DUE_TO_MANUALS'
                  ? 'Hidden (manual limit reached)'
                  : new Date().toLocaleTimeString(),
            }));
            if (createdVersion) {
              console.debug('Auto-version created:', createdVersion.id);
            }
          } else {
            const errorText = await res.text();
            console.error('Auto-version failed:', res.status, errorText);
            // Don't throw error for auto-saves, just log it and continue
            setDebugInfo(prev => ({ ...prev, lastVersion: `Error: ${res.status}` }));
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

  // Clear restoration pill when user makes changes or auto-saves
  useEffect(() => {
    if (restorationInfo && hasUnsavedChanges) {
      setRestorationInfo(null);
    }
  }, [hasUnsavedChanges, restorationInfo]);

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

  // Debug modal state changes
  useEffect(() => {
    console.log('Modal states changed:', {
      showVersionPopover,
      showImageModal,
      showVideoModal,
      documentExists: typeof document !== 'undefined'
    });
  }, [showVersionPopover, showImageModal, showVideoModal]);

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

  // Debug: Log render with modal states
  console.log('NotionTiptapEditor rendering with states:', {
    showVersionPopover,
    showImageModal,
    showVideoModal,
    documentUndefined: typeof document === 'undefined',
    deletingVersionId,
    restoringVersionId,
    restorationInfo
  });

  return (
    <div className="notion-tiptap-container">
      {/* Debug State Display */}
      {(deletingVersionId || restoringVersionId) && (
        <div style={{ 
          padding: '4px 8px', 
          backgroundColor: '#fff3cd', 
          borderBottom: '1px solid #ffeaa7',
          fontSize: '12px',
          color: '#856404'
        }}>
          DEBUG: deletingVersionId={deletingVersionId}, restoringVersionId={restoringVersionId}
        </div>
      )}
      
      {/* Status Pills */}
      {restorationInfo && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #e1e3e5' }}>
          <Badge tone="info">
            Reverted to {restorationInfo.title} at {new Date(restorationInfo.time).toLocaleTimeString()}
          </Badge>
        </div>
      )}
      
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
                  icon={MeasurementSizeIcon}
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
                  content: '1.15',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(1.15).run();
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
                  content: '1.75',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(1.75).run();
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
                {
                  content: '2.15',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(2.15).run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '2.5',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(2.5).run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '2.75',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(2.75).run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '3.0',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(3.0).run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '3.15',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(3.15).run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '3.5',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(3.5).run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '3.75',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(3.75).run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '4.0',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(4.0).run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '4.15',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(4.15).run();
                    setShowLineHeightPopover(false);
                  }
                },
                {
                  content: '4.5',
                  onAction: () => {
                    editor.chain().focus().setLineHeight(4.5).run();
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Insert Image button clicked, current state:', showImageModal);
                setShowImageModal(true);
                console.log('Image modal state set to true');
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Insert YouTube button clicked, current state:', showVideoModal);
                setShowVideoModal(true);
                console.log('Video modal state set to true');
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Version button clicked, current state:', showVersionPopover);
                setShowVersionPopover(true);
                console.log('Version modal state set to true');
                // Force a small delay to ensure state updates
                setTimeout(() => {
                  console.log('After timeout, showVersionPopover should be:', true);
                }, 100);
              }}
            >
              <Icon source={ClockIcon} />
            </Button>
          </Tooltip>

          {inlineAlertCode === 'NO_ROOM_DUE_TO_MANUALS' && (
            <div style={{ flexBasis: '100%', marginTop: '8px' }}>
              {renderVersionInlineAlert()}
            </div>
          )}
          
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
                        <InlineStack gap="2">
                          <Button
                            size="slim"
                            onClick={() => handleRestoreClick(version)}
                            disabled={restoringVersionId === version.id || deletingVersionId === version.id}
                          >
                            {restoringVersionId === version.id && <Spinner size="small" />}
                            Restore
                          </Button>
                          <Button
                            size="slim"
                            tone="critical"
                            onClick={() => deleteVersion(version)}
                            disabled={restoringVersionId === version.id || deletingVersionId === version.id}
                          >
                            {deletingVersionId === version.id && <Spinner size="small" />}
                            Delete
                          </Button>
                        </InlineStack>
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

      {/* Restore Dialog */}
      <Modal
        open={showRestoreDialog}
        onClose={() => {
          setShowRestoreDialog(false);
          setPendingRestoreVersion(null);
        }}
        title="Restore Version"
        primaryAction={{
          content: 'Restore with Checkpoint',
          onAction: () => confirmRestore(true),
        }}
        secondaryActions={[
          {
            content: 'Restore without Checkpoint',
            onAction: () => confirmRestore(false),
          },
          {
            content: 'Cancel',
            onAction: () => {
              setShowRestoreDialog(false);
              setPendingRestoreVersion(null);
            },
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="4">
            <Text variant="bodyMd">
              You're about to restore to "{pendingRestoreVersion?.versionTitle || pendingRestoreVersion?.title || 'Unknown Version'}" 
              created on {pendingRestoreVersion ? new Date(pendingRestoreVersion.createdAt).toLocaleString() : ''}.
            </Text>
            <Text variant="bodyMd" color="subdued">
              Would you like to create a restore point with your current content before restoring? This will save your current work as a checkpoint in case you need to revert back.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>

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
                      icon={MeasurementSizeIcon}
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Version button clicked (fullscreen), current state:', showVersionPopover);
                    setShowVersionPopover(true);
                    console.log('Version modal state set to true (fullscreen)');
                  }}
                >
                  <Icon source={ClockIcon} />
                </Button>
              </Tooltip>

              {inlineAlertCode === 'NO_ROOM_DUE_TO_MANUALS' && (
                <div style={{ flexBasis: '100%', marginTop: '8px' }}>
                  {renderVersionInlineAlert()}
                </div>
              )}

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

      {/* Custom Modals - render directly to document.body with z-index above mobile wrapper - MOBILE ONLY */}
      {typeof document !== 'undefined' && showVersionPopover && window.innerWidth <= 768 && (() => {
        console.log('RENDERING VERSION HISTORY MODAL VIA PORTAL, showVersionPopover:', showVersionPopover);
        return createPortal(
          <>
            {/* Backdrop */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 99999998
              }}
              onClick={() => {
                console.log('Modal backdrop clicked - closing');
                setShowVersionPopover(false);
              }}
            />
            {/* Modal Content */}
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'white',
                borderRadius: '8px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 99999999,
                pointerEvents: 'auto'
              }}
              onClick={(e) => {
                console.log('Modal content clicked - keeping open');
                e.stopPropagation();
              }}
            >
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e1e3e5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Version History</h2>
              <button
                onClick={() => setShowVersionPopover(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              {inlineAlertCode === 'NO_ROOM_DUE_TO_MANUALS' && renderVersionInlineAlert()}
              {/* Create New Version Button */}
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowVersionNameModal(true)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 600,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  Create New Version
                </button>
              </div>

              {versions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {versions.map((version, index) => {
                    const isCurrent = isCurrentVersion(version);
                    return (
                      <div 
                        key={version.id} 
                        onClick={() => mobileCompareMode && toggleMobileVersionSelection(version.id)}
                        style={{
                          padding: '16px',
                          border: isCurrent ? '2px solid #10b981' : mobileCompareMode && (mobileSelectedVersions.version1 === version.id || mobileSelectedVersions.version2 === version.id) ? '2px solid #3b82f6' : '1px solid #e1e3e5',
                          borderRadius: '8px',
                          backgroundColor: isCurrent ? '#f0fdf4' : mobileCompareMode && (mobileSelectedVersions.version1 === version.id || mobileSelectedVersions.version2 === version.id) ? '#f0f7ff' : '#f9fafb',
                          boxShadow: isCurrent ? '0 2px 8px rgba(16, 185, 129, 0.15)' : mobileCompareMode && (mobileSelectedVersions.version1 === version.id || mobileSelectedVersions.version2 === version.id) ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none',
                          cursor: mobileCompareMode ? 'pointer' : 'default'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            {mobileCompareMode && (
                              <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                border: (mobileSelectedVersions.version1 === version.id || mobileSelectedVersions.version2 === version.id) ? '2px solid #3b82f6' : '2px solid #d1d5db',
                                backgroundColor: (mobileSelectedVersions.version1 === version.id || mobileSelectedVersions.version2 === version.id) ? '#3b82f6' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                flexShrink: 0,
                                marginTop: '2px'
                              }}>
                                {mobileSelectedVersions.version1 === version.id ? '1' : mobileSelectedVersions.version2 === version.id ? '2' : ''}
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {version.versionTitle || version.title}
                                {version.isAuto && (
                                  <span style={{ 
                                    fontSize: '12px', 
                                    padding: '2px 8px', 
                                    backgroundColor: '#dbeafe', 
                                    color: '#1e40af',
                                    borderRadius: '4px'
                                  }}>Auto</span>
                                )}
                                {isCurrent && (
                                  <span style={{ 
                                    fontSize: '12px', 
                                    padding: '2px 8px', 
                                    backgroundColor: '#10b981', 
                                    color: 'white',
                                    borderRadius: '4px'
                                  }}>Current</span>
                                )}
                              </div>
                              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                {new Date(version.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <button
                              onClick={() => {
                                handleRestoreClick(version);
                                setShowVersionPopover(false);
                              }}
                              disabled={restoringVersionId === version.id || deletingVersionId === version.id}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: restoringVersionId === version.id || deletingVersionId === version.id ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: 500,
                                opacity: restoringVersionId === version.id || deletingVersionId === version.id ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              {restoringVersionId === version.id && <Spinner size="small" />}
                              Restore
                            </button>
                            <button
                              onClick={() => deleteVersion(version)}
                              disabled={restoringVersionId === version.id || deletingVersionId === version.id}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: restoringVersionId === version.id || deletingVersionId === version.id ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: 500,
                                opacity: restoringVersionId === version.id || deletingVersionId === version.id ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              {deletingVersionId === version.id && <Spinner size="small" />}
                              Delete
                            </button>
                          </div>
                        </div>
                        {/* Compare Versions Button */}
                        <div style={{ marginTop: '8px' }}>
                          <button
                            onClick={() => setMobileCompareMode(!mobileCompareMode)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: mobileCompareMode ? '#3b82f6' : 'transparent',
                              color: mobileCompareMode ? 'white' : '#3b82f6',
                              border: '1px solid #3b82f6',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 500
                            }}
                          >
                            {mobileCompareMode ? 'Cancel Compare' : 'Compare Versions'}
                          </button>
                          {mobileCompareMode && mobileSelectedVersions.version1 && mobileSelectedVersions.version2 && (
                            <button
                              onClick={compareMobileVersions}
                              style={{
                                marginLeft: '8px',
                                padding: '6px 12px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500
                              }}
                            >
                              Compare Selected
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
                  No versions available yet. Create your first version!
                </div>
              )}
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    const versionTitle = prompt('Enter a title for this version (optional):');
                    createVersion(versionTitle);
                    setShowVersionPopover(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Create New
                </button>
              </div>
            </div>
          </div>
          </>,
          document.body
        );
      })()}

      {/* Insert Image Modal - MOBILE ONLY */}
      {typeof document !== 'undefined' && showImageModal && window.innerWidth <= 768 && (() => {
        console.log('RENDERING IMAGE MODAL VIA PORTAL, showImageModal:', showImageModal);
        return createPortal(
          <>
            {/* Backdrop */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 99999998
              }}
              onClick={() => {
                console.log('Image modal backdrop clicked - closing');
                setShowImageModal(false);
              }}
            />
            {/* Modal Content */}
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'white',
                borderRadius: '8px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 99999999,
                pointerEvents: 'auto'
              }}
              onClick={(e) => {
                console.log('Image modal content clicked - keeping open');
                e.stopPropagation();
              }}
            >
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e1e3e5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Insert Image</h2>
              <button
                onClick={() => setShowImageModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Image URL</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  pointerEvents: 'auto',
                  zIndex: 100000000
                }}
              />
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                Enter the URL of the image you want to embed
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowImageModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    insertImage();
                    setShowImageModal(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
          </>,
          document.body
        );
      })()}

      {/* Insert YouTube Video Modal - MOBILE ONLY */}
      {typeof document !== 'undefined' && showVideoModal && window.innerWidth <= 768 && (() => {
        console.log('RENDERING YOUTUBE MODAL VIA PORTAL, showVideoModal:', showVideoModal);
        return createPortal(
          <>
            {/* Backdrop */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 99999998
              }}
              onClick={() => {
                console.log('Video modal backdrop clicked - closing');
                setShowVideoModal(false);
              }}
            />
            {/* Modal Content */}
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'white',
                borderRadius: '8px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 99999999,
                pointerEvents: 'auto'
              }}
              onClick={(e) => {
                console.log('Video modal content clicked - keeping open');
                e.stopPropagation();
              }}
            >
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e1e3e5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Insert YouTube Video</h2>
              <button
                onClick={() => setShowVideoModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>YouTube URL</label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  pointerEvents: 'auto',
                  zIndex: 100000000
                }}
              />
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                Paste a YouTube video URL
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowVideoModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    insertVideo();
                    setShowVideoModal(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
          </>,
          document.body
        );
      })()}

      {/* Insert Link Modal - MOBILE ONLY */}
      {typeof document !== 'undefined' && showLinkModal && window.innerWidth <= 768 && (() => {
        console.log('RENDERING LINK MODAL VIA PORTAL, showLinkModal:', showLinkModal);
        return createPortal(
          <>
            {/* Backdrop */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 99999998
              }}
              onClick={() => {
                console.log('Link modal backdrop clicked - closing');
                setShowLinkModal(false);
              }}
            />
            {/* Modal Content */}
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'white',
                borderRadius: '8px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 99999999,
                pointerEvents: 'auto'
              }}
              onClick={(e) => {
                console.log('Link modal content clicked - keeping open');
                e.stopPropagation();
              }}
            >
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e1e3e5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Insert Link</h2>
              <button
                onClick={() => setShowLinkModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Link URL</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  pointerEvents: 'auto',
                  zIndex: 100000000,
                  marginBottom: '16px'
                }}
              />
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Link Text (optional)</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Click here"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  pointerEvents: 'auto',
                  zIndex: 100000000
                }}
              />
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                Leave empty to use selected text
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowLinkModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    insertLink();
                    setShowLinkModal(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
          </>,
          document.body
        );
      })()}

      {/* Contact Card Modal/Tooltip */}
      {showContactCard && contactCardContact && (
        <ContactCard
          contact={contactCardContact}
          variant={contactCardVariant}
          isVisible={showContactCard}
          onClose={handleContactCardClose}
          onEdit={contactCardFromEditor ? undefined : () => {
            // Only allow editing when not triggered from editor
            handleContactCardClose();
            // Navigate to edit page if needed
            window.location.href = `/app/contacts?edit=${contactCardContact.id}`;
          }}
        />
      )}
    </div>
  );
};

export default NotionTiptapEditor;