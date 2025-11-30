import { json } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";
import packageJson from "../../package.json";
import { usePlanContext } from "../hooks/usePlanContext";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);
  
  try {
    // Load folders and contacts in parallel
    const [folders, contacts] = await Promise.all([
      prisma.contactFolder.findMany({
        where: { shopId },
        include: {
          _count: {
            select: { contacts: true }
          }
        },
        orderBy: { position: 'asc' }
      }),
      prisma.contact.findMany({
        where: { shopId },
        include: {
          folder: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return json({ folders, contacts, version: packageJson.version });
  } catch (error) {
    console.error('Error loading contacts data:', error);
    return json({ folders: [], contacts: [], version: packageJson.version });
  }
};

import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  ResourceList,
  ResourceItem,
  Avatar,
  EmptyState,
  ButtonGroup,
  Popover,
  ActionList,
  Modal,
  Select,
  Banner,
  Spinner,
  Icon
} from "@shopify/polaris";
import { 
  DeleteIcon,
  EditIcon,
  FolderIcon,
  PersonIcon,
  OrganizationIcon,
  PhoneIcon,
  EmailIcon,
  CollectionIcon,
  MenuVerticalIcon,
  MenuHorizontalIcon,
  DragHandleIcon,
  XIcon,
  ExchangeIcon,
  SearchIcon,
  ChevronRightIcon,
  PinFilledIcon
} from "@shopify/polaris-icons";
import { useState, useEffect, useRef, useCallback } from "react";
import FolderIconPicker from "../components/FolderIconPicker";
import NewFolderModal from "../components/NewFolderModal";
import DraggableFolder from "../components/DraggableFolder";
import ContactCard from "../components/ContactCard";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// SortableColumn Component
function SortableColumn({ id, children, ...props }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `col-${id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
    height: '100%',
    minHeight: '100%',
    ...props.style,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="draggable-column"
      {...attributes}
      {...props}
    >
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          zIndex: 10,
          cursor: 'grab',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px'
        }}
        {...listeners}
      >
        <div style={{ 
          fontSize: "14px", 
          color: "#6d7175",
          userSelect: "none",
          cursor: "grab"
        }}>
          ⋮⋮
        </div>
      </div>
      {children}
    </div>
  );
}

// Contact Form Component
function ContactForm({ 
  contact, 
  folders, 
  onSave, 
  onCancel, 
  isEditing = false 
}) {
  const [formData, setFormData] = useState({
    type: contact?.type || 'PERSON',
    folderId: contact?.folderId || '',
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    businessName: contact?.businessName || '',
    company: contact?.company || '',
    phone: contact?.phone || '',
    mobile: contact?.mobile || '',
    email: contact?.email || '',
    role: contact?.role || '',
    memo: contact?.memo || '',
    pointsOfContact: contact?.pointsOfContact || []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPointOfContact = () => {
    setFormData(prev => ({
      ...prev,
      pointsOfContact: [...prev.pointsOfContact, { name: '', phone: '', email: '' }]
    }));
  };

  const removePointOfContact = (index) => {
    setFormData(prev => ({
      ...prev,
      pointsOfContact: prev.pointsOfContact.filter((_, i) => i !== index)
    }));
  };

  const updatePointOfContact = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      pointsOfContact: prev.pointsOfContact.map((point, i) => 
        i === index ? { ...point, [field]: value } : point
      )
    }));
  };

  return (
    <Card sectioned>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          {isEditing ? 'Edit Contact' : 'New Contact'}
        </Text>

        <form onSubmit={handleSubmit}>
          <BlockStack gap="400">
            {/* Contact Type */}
            <Select
              label="Contact Type"
              options={[
                { label: 'Person', value: 'PERSON' },
                { label: 'Business', value: 'BUSINESS' }
              ]}
              value={formData.type}
              onChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            />

            {/* Folder is automatically set based on selected folder */}

            {/* Avatar Color Picker */}
            <div>
              <Text as="label" variant="bodyMd" fontWeight="medium">
                Avatar Color
              </Text>
              <div style={{ 
                marginTop: "8px",
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: "8px",
                padding: "8px",
                border: "1px solid #e1e3e5",
                borderRadius: "8px",
                backgroundColor: "#fafbfb"
              }}>
                {[
                  { color: "#10b981", name: "Green" },
                  { color: "#f97316", name: "Orange" },
                  { color: "#ef4444", name: "Red" },
                  { color: "#eab308", name: "Yellow" },
                  { color: "#3b82f6", name: "Blue" },
                  { color: "#8b5cf6", name: "Purple" },
                  { color: "#6b7280", name: "Gray" },
                  { color: "#f59e0b", name: "Amber" }
                ].map((colorData, index) => (
                  <button
                    key={index}
                    onClick={() => setFormData(prev => ({ ...prev, avatarColor: colorData.color }))}
                    style={{
                      width: "40px",
                      height: "40px",
                      border: formData.avatarColor === colorData.color ? "3px solid #2e7d32" : "2px solid #e1e3e5",
                      borderRadius: "50%",
                      backgroundColor: colorData.color,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease"
                    }}
                    title={colorData.name}
                  >
                    {formData.avatarColor === colorData.color && (
                      <i className="fas fa-check" style={{ 
                        color: "white",
                        fontSize: "14px" 
                      }}></i>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Person fields */}
            {formData.type === 'PERSON' && (
              <InlineStack gap="300">
                <TextField
                  label="First Name"
                  value={formData.firstName}
                  onChange={(value) => setFormData(prev => ({ ...prev, firstName: value }))}
                  required
                />
                <TextField
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(value) => setFormData(prev => ({ ...prev, lastName: value }))}
                  required
                />
              </InlineStack>
            )}

            {/* Business fields */}
            {formData.type === 'BUSINESS' && (
              <TextField
                label="Business Name"
                value={formData.businessName}
                onChange={(value) => setFormData(prev => ({ ...prev, businessName: value }))}
                required
              />
            )}

            {/* Common fields */}
            <TextField
              label="Company"
              value={formData.company}
              onChange={(value) => setFormData(prev => ({ ...prev, company: value }))}
            />

            <InlineStack gap="300">
              <TextField
                label="Phone"
                value={formData.phone}
                onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                type="tel"
              />
              <TextField
                label="Mobile"
                value={formData.mobile}
                onChange={(value) => setFormData(prev => ({ ...prev, mobile: value }))}
                type="tel"
              />
            </InlineStack>

            <TextField
              label="Email"
              value={formData.email}
              onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
              type="email"
            />

            <TextField
              label="Role"
              value={formData.role}
              onChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
            />

            {/* Business points of contact */}
            {formData.type === 'BUSINESS' && (
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm">Points of Contact</Text>
                  <Button onClick={addPointOfContact} size="slim">
                    Add Contact
                  </Button>
                </InlineStack>

                {formData.pointsOfContact.map((point, index) => (
                  <Card key={index} sectioned>
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h4" variant="headingSm">Contact {index + 1}</Text>
                        <Button
                          onClick={() => removePointOfContact(index)}
                          icon={DeleteIcon}
                          size="slim"
                          tone="critical"
                        >
                          Remove
                        </Button>
                      </InlineStack>

                      <TextField
                        label="Name"
                        value={point.name}
                        onChange={(value) => updatePointOfContact(index, 'name', value)}
                      />

                      <InlineStack gap="300">
                        <TextField
                          label="Phone"
                          value={point.phone}
                          onChange={(value) => updatePointOfContact(index, 'phone', value)}
                          type="tel"
                        />
                        <TextField
                          label="Email"
                          value={point.email}
                          onChange={(value) => updatePointOfContact(index, 'email', value)}
                          type="email"
                        />
                      </InlineStack>
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            )}

            <TextField
              label="Memo"
              value={formData.memo}
              onChange={(value) => setFormData(prev => ({ ...prev, memo: value }))}
              multiline={3}
            />

            <TextField
              label="Address"
              value={formData.address}
              onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
              multiline={3}
              placeholder="Enter full address"
            />

            {/* Tags Field */}
            <div>
              <Text as="label" variant="bodyMd" fontWeight="medium">
                Tags
              </Text>
              <div style={{ marginTop: "8px" }}>
                <div onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagsInputValue.trim()) {
                    e.preventDefault();
                    // Add the current tag
                    const newTag = tagsInputValue.trim();
                    setFormData(prev => ({ 
                      ...prev, 
                      tags: [...(prev.tags || []), newTag]
                    }));
                    setTagsInputValue('');
                  }
                }}>
                  <TextField
                    label="Add tags (press Enter or comma to add)"
                    labelHidden
                    placeholder="e.g., client, vip, important (press Enter or comma)"
                    value={tagsInputValue}
                    onChange={(value) => {
                      // Check if user typed a comma
                      if (value.includes(',')) {
                        // Process all complete tags (before commas)
                        const parts = value.split(',');
                        const completeTags = parts.slice(0, -1).map(tag => tag.trim()).filter(tag => tag.length > 0);
                        
                        if (completeTags.length > 0) {
                          setFormData(prev => ({ 
                            ...prev, 
                            tags: [...(prev.tags || []), ...completeTags]
                          }));
                        }
                        
                        // Keep the text after the last comma
                        setTagsInputValue(parts[parts.length - 1]);
                      } else {
                        setTagsInputValue(value);
                      }
                    }}
                  />
                </div>
                {formData.tags.length > 0 && (
                  <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#e8f5e8",
                          color: "#008060",
                          border: "1px solid #b8e6b8",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500"
                        }}
                      >
                        {tag}
                        <button
                          onClick={() => {
                            const newTags = formData.tags.filter((_, i) => i !== index);
                            setFormData(prev => ({ ...prev, tags: newTags }));
                          }}
                          style={{
                            marginLeft: "4px",
                            background: "none",
                            border: "none",
                            color: "#008060",
                            cursor: "pointer",
                            padding: "0",
                            fontSize: "12px"
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <ButtonGroup>
              <Button
                submit
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {isEditing ? 'Update Contact' : 'Create Contact'}
              </Button>
              <Button onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            </ButtonGroup>
          </BlockStack>
        </form>
      </BlockStack>
    </Card>
  );
}

// Main Contacts Page Component
export default function ContactsPage() {
  const { folders: initialFolders, contacts: initialContacts, version } = useLoaderData();
  const { flags, openUpgradeModal } = usePlanContext();
  
  // Add CSS for custom contact list
  useEffect(() => {
    if (!flags.contactsEnabled) {
      return;
    }

    const style = document.createElement('style');
    style.textContent = `
      /* Custom Contact List Styles */
      .custom-contact-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .custom-contact-row {
        display: flex !important;
        align-items: center !important;
        padding: 8px 12px !important;
        border-radius: 8px !important;
        margin-bottom: 4px !important;
        transition: all 0.2s ease !important;
        cursor: pointer !important;
        background-color: transparent !important;
        border: 1px solid transparent !important;
        min-height: 60px !important;
        height: 60px !important;
      }
      
      .custom-contact-row.pinned {
        background-color: #f0f8ff !important;
        border: 1px solid #007bff !important;
      }
      
      .custom-contact-row.selected {
        background-color: #fffbf8 !important;
        border: 1px solid #ff8c00 !important;
      }
      
      .custom-contact-row:hover {
        background-color: #f1f1f1 !important;
        border: 1px solid #dedede !important;
        border-radius: 8px !important;
      }
      
      .custom-contact-row.pinned:hover {
        background-color: #d5ebff !important;
        border: 1px solid #007bff !important;
        border-radius: 8px !important;
      }
      
      .custom-contact-row.selected:hover {
        background-color: #ffe7d5 !important;
        border: 1px solid #ff8c00 !important;
        border-radius: 8px !important;
      }
      
      .contact-avatar {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin-right: 16px !important;
        flex-shrink: 0 !important;
        border-radius: 10px !important;
        overflow: hidden !important;
        width: 40px !important;
        height: 40px !important;
      }
      
      .contact-avatar .Polaris-Avatar {
        width: 40px !important;
        height: 40px !important;
        border-radius: 10px !important;
      }
      
      .custom-contact-row .contact-avatar .Polaris-Avatar__Image {
        width: 40px !important;
        height: 40px !important;
        border-radius: 10px !important;
      }
      
      .custom-contact-row .contact-avatar .Polaris-Avatar__Text {
        font-size: 16px !important;
        font-weight: 600 !important;
      }
      
      .contact-content {
        display: grid;
        grid-template-columns: 200px 180px 120px 150px 150px;
        gap: 16px;
        align-items: center;
        flex: 1;
      }
      
      .contact-name,
      .contact-info,
      .contact-date,
      .contact-tags {
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .contact-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
        align-items: center;
      }
      
      .contact-tags {
        gap: 4px;
        flex-wrap: wrap;
      }
      
      .tag-clickable {
        cursor: pointer;
      }
      
      .contact-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-left: auto;
        width: fit-content;
      }
      
      .dropdown-item {
        width: 100%;
        padding: 8px 16px;
        border: none;
        background: none;
        text-align: left;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #374151;
      }
      
      .dropdown-item:hover {
        background-color: #f6f6f7;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [flags.contactsEnabled]);
  
  if (!flags.contactsEnabled) {
    return (
      <Page title="Contacts" subtitle={`Version ${version}`}>
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="Contacts are a Pro feature"
                action={{
                  content: "Upgrade to PRO – $5/mo",
                  onAction: () =>
                    openUpgradeModal({
                      code: "FEATURE_CONTACTS_DISABLED",
                      message:
                        "Upgrade to Pro to unlock the Contacts workspace, unlimited contacts, and advanced organization tools.",
                    }),
                }}
                image="https://cdn.shopify.com/s/files/1/2376/3307/articles/PolarisPlaceholders--product-features_480x480_crop_center.png?v=1623437273"
              >
                <p>
                  Manage unlimited contacts, folders, and tags with Scriberr Pro. Upgrade to unlock the full CRM toolkit.
                </p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  
  // State management
  const [folders, setFolders] = useState(initialFolders || []);
  const [contacts, setContacts] = useState(initialContacts || []);
  const [selectedFolder, setSelectedFolder] = useState(null);

  // Fetch folders on mount to ensure they're loaded
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const response = await fetch('/api/contact-folders');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setFolders(data);
          }
        }
      } catch (error) {
        console.error('Error fetching folders:', error);
      }
    };

    // Only fetch if folders are empty or undefined
    if (!folders || folders.length === 0) {
      fetchFolders();
    }
  }, []); // Empty dependency array - run once on mount

  const [editingContact, setEditingContact] = useState(null);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [formData, setFormData] = useState(getInitialFormData());

  // Helper function to get initial form data
  function getInitialFormData() {
    return {
      type: 'PERSON',
      firstName: '',
      lastName: '',
      businessName: '',
      company: '',
      phone: '',
      mobile: '',
      email: '',
      role: '',
      memo: '',
      address: '',
      folderId: selectedFolder?.id,
      pointsOfContact: [{ name: '', phone: '', email: '' }],
      tags: [],
      avatarColor: '#10b981'
    };
  }

  // Contact card state
  const [showContactCard, setShowContactCard] = useState(false);
  const [contactCardContact, setContactCardContact] = useState(null);
  const [contactCardVariant, setContactCardVariant] = useState('tooltip');
  const [contactCardPosition, setContactCardPosition] = useState({ x: 0, y: 0 });

  // DnD state
  const [activeId, setActiveId] = useState(null);
  const [columnOrder, setColumnOrder] = useState(['folders', 'contacts']);
  
  // Folder menu state
  const [openFolderMenu, setOpenFolderMenu] = useState(null);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Toast notification state
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState(""); // "error" or "success"

  // Mobile detection and layout state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileActiveSection, setMobileActiveSection] = useState('folders'); // 'folders', 'contacts', 'editor'
  
  // Selection and bulk actions state
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedTagFilter, setSelectedTagFilter] = useState([]);
  const [tagPopoverActive, setTagPopoverActive] = useState({});
  const [showTagsSection, setShowTagsSection] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagsInputValue, setTagsInputValue] = useState('');
  const [tagToDelete, setTagToDelete] = useState(null);
  
  // Manage menu state
  const [manageMenuContact, setManageMenuContact] = useState(null);
  const [manageMenuPosition, setManageMenuPosition] = useState({ x: 0, y: 0 });
  
  // Bulk actions state
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [selectedFolderForMove, setSelectedFolderForMove] = useState(null);
  const [showContactDeleteModal, setShowContactDeleteModal] = useState(null);
  const [bulkActionType, setBulkActionType] = useState('move'); // 'move' or 'duplicate'
  
  // Manage button popover state (desktop)
  const [managePopoverActive, setManagePopoverActive] = useState({});

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close folder menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFolderMenu && !event.target.closest('.folder-menu-container')) {
        setOpenFolderMenu(null);
      }
      if (manageMenuContact && !event.target.closest('.manage-menu')) {
        closeManageMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openFolderMenu, manageMenuContact]);

  // Close manage menu when bulk move modal opens
  useEffect(() => {
    if (showBulkMoveModal && manageMenuContact) {
      closeManageMenu();
    }
  }, [showBulkMoveModal]);

  // Filter contacts based on selected folder, search, and tags
  const filteredContacts = contacts.filter(contact => {
    const matchesFolder = !selectedFolder || contact.folderId === selectedFolder.id;
    const matchesSearch = !searchQuery || 
      (contact.firstName && contact.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.lastName && contact.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.businessName && contact.businessName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.company && contact.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTags = selectedTags.length === 0 || 
      (contact.tags && selectedTags.every(tag => contact.tags.includes(tag)));
    
    // Tag filter from clicking tags - now supports multiple tags
    const matchesTagFilter = selectedTagFilter.length === 0 || 
      selectedTagFilter.every(filterTag => {
        // Handle Person/Business type filters
        if (filterTag === 'Person' && contact.type === 'PERSON') return true;
        if (filterTag === 'Business' && contact.type === 'BUSINESS') return true;
        // Handle regular tag filters
        return contact.tags && contact.tags.includes(filterTag);
      });
    
    return matchesFolder && matchesSearch && matchesTags && matchesTagFilter;
  }).sort((a, b) => {
    // Sort pinned first, then by creation date
    if (a.pinnedAt && !b.pinnedAt) return -1;
    if (!a.pinnedAt && b.pinnedAt) return 1;
    if (a.pinnedAt && b.pinnedAt) {
      return new Date(b.pinnedAt) - new Date(a.pinnedAt);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Helper function to toggle tag filter
  const toggleTagFilter = (tag) => {
    setSelectedTagFilter(prev => {
      if (prev.includes(tag)) {
        // Remove tag if already selected
        return prev.filter(t => t !== tag);
      } else {
        // Add tag if not selected
        return [...prev, tag];
      }
    });
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle folder selection
  const handleFolderSelect = (folder) => {
    setSelectedFolder(folder);
    setShowNewContactForm(false);
    setEditingContact(null);
    
    // Don't automatically navigate on mobile - let user click "View Contacts" button
  };

  // Handle folder drag and drop
  const handleFolderDragEnd = async (event) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = folders.findIndex(folder => folder.id === active.id);
      const newIndex = folders.findIndex(folder => folder.id === over.id);
      
      const reorderedFolders = arrayMove(folders, oldIndex, newIndex);
      setFolders(reorderedFolders);
      
      // Update positions in database
      try {
        const formData = new FormData();
        formData.append('_action', 'reorder');
        formData.append('folderIds', JSON.stringify(reorderedFolders.map(f => f.id)));
        
        const response = await fetch('/api/contact-folders', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          console.error('Failed to update folder order');
        }
      } catch (error) {
        console.error('Error updating folder order:', error);
      }
    }
  };

  // Handle folder menu actions
  const handleFolderRename = async (folderId, newName) => {
    try {
      const formData = new FormData();
      formData.append('_action', 'rename');
      formData.append('id', folderId);
      formData.append('name', newName);
      
      const response = await fetch('/api/contact-folders', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Refresh folders
          const updatedFolders = await fetch('/api/contact-folders').then(r => r.json());
          setFolders(updatedFolders);
          setOpenFolderMenu(null);
          setAlertMessage("Folder renamed successfully");
          setAlertType("success");
          setTimeout(() => setAlertMessage(''), 3000);
        } else {
          setAlertMessage(result.error || "Failed to rename folder");
          setAlertType("error");
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        const result = await response.json();
        setAlertMessage(result.error || "Failed to rename folder");
        setAlertType("error");
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error renaming folder:', error);
      setAlertMessage("Failed to rename folder");
      setAlertType("error");
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  const handleFolderDelete = async (folderId) => {
    try {
      const formData = new FormData();
      formData.append('_action', 'delete');
      formData.append('id', folderId);
      
      const response = await fetch('/api/contact-folders', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Refresh folders and contacts
          const updatedFolders = await fetch('/api/contact-folders').then(r => r.json());
          setFolders(updatedFolders);
          
          // Update contacts by removing any that were in the deleted folder
          setContacts(prev => prev.filter(contact => contact.folderId !== folderId));
          setOpenFolderMenu(null);
          
          // Clear selection if deleted folder was selected
          if (selectedFolder?.id === folderId) {
            setSelectedFolder(null);
          }
          
          setAlertMessage("Folder deleted successfully");
          setAlertType("success");
          setTimeout(() => setAlertMessage(''), 3000);
        } else {
          setAlertMessage(result.error || "Failed to delete folder");
          setAlertType("error");
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        const result = await response.json();
        setAlertMessage(result.error || "Failed to delete folder");
        setAlertType("error");
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      setAlertMessage("Failed to delete folder");
      setAlertType("error");
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  const handleFolderIconChange = async (folderId, icon, iconColor) => {
    try {
      const formData = new FormData();
      formData.append('_action', 'update-icon');
      formData.append('id', folderId);
      formData.append('icon', icon);
      formData.append('iconColor', iconColor);
      
      const response = await fetch('/api/contact-folders', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Refresh folders
          const updatedFolders = await fetch('/api/contact-folders').then(r => r.json());
          setFolders(updatedFolders);
          setOpenFolderMenu(null);
          setAlertMessage("Folder icon updated successfully");
          setAlertType("success");
          setTimeout(() => setAlertMessage(''), 3000);
        } else {
          setAlertMessage(result.error || "Failed to update folder icon");
          setAlertType("error");
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        const result = await response.json();
        setAlertMessage(result.error || "Failed to update folder icon");
        setAlertType("error");
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error updating folder icon:', error);
      setAlertMessage("Failed to update folder icon");
      setAlertType("error");
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  // Handle contact edit on mobile
  const handleContactEdit = (contact) => {
    setEditingContact(contact);
    const contactTags = contact.tags || [];
    setFormData({
      type: contact.type,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      businessName: contact.businessName || '',
      company: contact.company || '',
      email: contact.email || '',
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      role: contact.role || '',
      memo: contact.memo || '',
      address: contact.address || '',
      folderId: contact.folderId || null,
      pointsOfContact: contact.pointsOfContact || [],
      tags: contactTags,
      avatarColor: contact.avatarColor || '#10b981'
    });
    setTagsInputValue(''); // Clear input field, existing tags shown as pills
    
    if (isMobile) {
      setMobileActiveSection('editor');
    }
  };

  // Handle new contact on mobile
  const handleNewContact = () => {
    if (folders.length === 0 || !selectedFolder) {
      setAlertMessage("Create or select a folder first before adding a contact.");
      setAlertType("error");
      setTimeout(() => setAlertMessage(''), 3000);
      return;
    }
    
    setShowNewContactForm(true);
    setEditingContact(null);
    setFormData(getInitialFormData());
    setTagsInputValue('');
    
    if (isMobile) {
      setMobileActiveSection('editor');
    }
  };

  // Handle contact save
  const handleContactSave = async (formData) => {
    setIsLoading(true);
    
    try {
      const form = new FormData();
      form.append('_action', editingContact ? 'update' : 'create');
      
      if (editingContact) {
        form.append('id', editingContact.id);
      }
      
      // Append all form data
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'pointsOfContact') {
          form.append(key, JSON.stringify(value));
        } else {
          form.append(key, value);
        }
      });

      const response = await fetch('/api/contacts', {
        method: 'POST',
        body: form
      });

      const result = await response.json();

      if (result.success) {
        if (editingContact) {
          setContacts(prev => prev.map(c => c.id === result.contact.id ? result.contact : c));
        } else {
          setContacts(prev => [result.contact, ...prev]);
        }
        
        setEditingContact(null);
        setShowNewContactForm(false);
      } else {
        console.error('Error saving contact:', result.error);
      }
    } catch (error) {
      console.error('Error saving contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle contact delete
  const handleContactDelete = async (contactId) => {
    setShowContactDeleteModal(contactId);
  };

  const confirmContactDelete = async (contactId) => {
    setIsLoading(true);
    
    try {
      const form = new FormData();
      form.append('_action', 'delete');
      form.append('id', contactId);

      const response = await fetch('/api/contacts', {
        method: 'POST',
        body: form
      });

      const result = await response.json();

      if (result.success) {
        setContacts(prev => prev.filter(c => c.id !== contactId));
        // Remove from selection if it was selected
        setSelectedContacts(prev => prev.filter(id => id !== contactId));
      } else {
        console.error('Error deleting contact:', result.error);
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle contact selection
  const handleContactSelect = (contactId) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  // Handle contact pin/unpin
  const handleContactPin = async (contactId) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pin-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contactId })
      });

      const result = await response.json();

      if (result.success) {
        // Update the contact in the list
        setContacts(prev => prev.map(contact => 
          contact.id === contactId 
            ? { ...contact, pinnedAt: result.pinnedAt }
            : contact
        ));
        
        setAlertMessage(result.isPinned ? 'Contact pinned' : 'Contact unpinned');
        setAlertType("success");
        setTimeout(() => setAlertMessage(''), 3000);
      } else {
        setAlertMessage(result.error || "Failed to toggle pin");
        setAlertType("error");
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error toggling contact pin:', error);
      setAlertMessage("Failed to toggle pin");
      setAlertType("error");
      setTimeout(() => setAlertMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle tag deletion from all contacts
  const handleDeleteTag = async (tagName) => {
    setIsLoading(true);
    try {
      // Get all contacts that have this tag
      const contactsWithTag = contacts.filter(contact => 
        contact.tags && contact.tags.includes(tagName)
      );

      // Update each contact to remove the tag
      for (const contact of contactsWithTag) {
        const updatedTags = contact.tags.filter(tag => tag !== tagName);
        
        const form = new FormData();
        form.append('_action', 'update');
        form.append('id', contact.id);
        form.append('tags', JSON.stringify(updatedTags));

        await fetch('/api/contacts', {
          method: 'POST',
          body: form
        });
      }

      // Update local state
      setContacts(prev => prev.map(contact => {
        if (contact.tags && contact.tags.includes(tagName)) {
          return {
            ...contact,
            tags: contact.tags.filter(tag => tag !== tagName)
          };
        }
        return contact;
      }));

      // Remove from selected tags if it was selected
      setSelectedTags(prev => prev.filter(tag => tag !== tagName));

      setAlertMessage(`Tag "${tagName}" deleted from all contacts`);
      setAlertType("success");
      setTimeout(() => setAlertMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting tag:', error);
      setAlertMessage("Failed to delete tag");
      setAlertType("error");
      setTimeout(() => setAlertMessage(''), 3000);
    } finally {
      setIsLoading(false);
      setTagToDelete(null);
    }
  };

  // Handle manage menu
  const handleManageMenu = (contact, event) => {
    event.stopPropagation();
    const rect = event.target.getBoundingClientRect();
    
    // Menu dimensions (approximate)
    const menuWidth = 250;
    const menuHeight = 180;
    const padding = 8;
    
    // Viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate initial position (below and to the left of button)
    let x = rect.left;
    let y = rect.bottom + 4;
    
    // Check if menu would overflow right edge
    if (x + menuWidth > viewportWidth - padding) {
      // Position menu to the left of the button instead
      x = rect.right - menuWidth;
      // If still overflowing, align to right edge with padding
      if (x < padding) {
        x = viewportWidth - menuWidth - padding;
      }
    }
    
    // Check if menu would overflow bottom edge
    if (y + menuHeight > viewportHeight - padding) {
      // Position menu above the button instead
      y = rect.top - menuHeight - 4;
      // If still overflowing, align to bottom with padding
      if (y < padding) {
        y = viewportHeight - menuHeight - padding;
      }
    }
    
    // Ensure minimum padding from edges
    x = Math.max(padding, Math.min(x, viewportWidth - menuWidth - padding));
    y = Math.max(padding, Math.min(y, viewportHeight - menuHeight - padding));
    
    setManageMenuContact(contact);
    setManageMenuPosition({ x, y });
  };

  const closeManageMenu = () => {
    setManageMenuContact(null);
  };

  // Handle contact duplication
  const handleContactDuplicate = async (contactId, targetFolderId) => {
    setIsLoading(true);
    try {
      const contactToDuplicate = contacts.find(c => c.id === contactId);
      if (!contactToDuplicate) return;

      // Ensure we have a valid folder ID
      const folderId = targetFolderId || selectedFolder?.id;
      if (!folderId) {
        setAlertMessage("Please select a folder to duplicate the contact to");
        setAlertType("error");
        setTimeout(() => setAlertMessage(''), 3000);
        setIsLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('_action', 'create');
      formData.append('type', contactToDuplicate.type);
      formData.append('folderId', folderId);
      
      // Copy all contact data
      if (contactToDuplicate.firstName) formData.append('firstName', contactToDuplicate.firstName);
      if (contactToDuplicate.lastName) formData.append('lastName', contactToDuplicate.lastName);
      if (contactToDuplicate.businessName) formData.append('businessName', contactToDuplicate.businessName);
      if (contactToDuplicate.company) formData.append('company', contactToDuplicate.company);
      if (contactToDuplicate.phone) formData.append('phone', contactToDuplicate.phone);
      if (contactToDuplicate.mobile) formData.append('mobile', contactToDuplicate.mobile);
      if (contactToDuplicate.email) formData.append('email', contactToDuplicate.email);
      if (contactToDuplicate.role) formData.append('role', contactToDuplicate.role);
      if (contactToDuplicate.memo) formData.append('memo', contactToDuplicate.memo);
      if (contactToDuplicate.pointsOfContact) formData.append('pointsOfContact', JSON.stringify(contactToDuplicate.pointsOfContact));
      if (contactToDuplicate.tags) formData.append('tags', JSON.stringify(contactToDuplicate.tags));
      if (contactToDuplicate.avatarColor) formData.append('avatarColor', contactToDuplicate.avatarColor);

      const response = await fetch('/api/contacts', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setContacts(prev => [result.contact, ...prev]);
        setAlertMessage("Contact duplicated successfully");
        setAlertType("success");
        setTimeout(() => setAlertMessage(''), 3000);
      } else {
        setAlertMessage(result.error || "Failed to duplicate contact");
        setAlertType("error");
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error duplicating contact:', error);
      setAlertMessage("Failed to duplicate contact");
      setAlertType("error");
      setTimeout(() => setAlertMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle bulk move/duplicate contacts
  const handleBulkMoveContacts = async () => {
    if (selectedContacts.length === 0 || !selectedFolderForMove) return;

    setIsLoading(true);
    const targetFolderId = selectedFolderForMove;
    const actionType = bulkActionType;
    try {
      const form = new FormData();
      form.append('_action', actionType === 'duplicate' ? 'bulk-duplicate' : 'bulk-move');
      form.append('contactIds', JSON.stringify(selectedContacts));
      form.append('folderId', targetFolderId);

      const response = await fetch('/api/contacts', {
        method: 'POST',
        body: form
      });

      const result = await response.json();

      if (result.success) {
        if (actionType === 'move') {
          // Update contacts state for move
          setContacts(prev => prev.map(contact => 
            selectedContacts.includes(contact.id) 
              ? { ...contact, folderId: targetFolderId }
              : contact
          ));
        } else {
          // Add duplicated contacts to state
          if (result.duplicatedContacts) {
            setContacts(prev => [...result.duplicatedContacts, ...prev]);
          }
        }
        
        setSelectedContacts([]);
        setShowBulkMoveModal(false);
        setSelectedFolderForMove(null);
        setBulkActionType('move');
        setAlertMessage(`Successfully ${actionType === 'duplicate' ? 'duplicated' : 'moved'} ${selectedContacts.length} contact(s)`);
        setAlertType("success");
        setTimeout(() => setAlertMessage(''), 3000);
      } else {
        setAlertMessage(result.error || `Failed to ${actionType} contacts`);
        setAlertType("error");
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error(`Error ${actionType}ing contacts:`, error);
      setAlertMessage(`Failed to ${actionType} contacts`);
      setAlertType("error");
      setTimeout(() => setAlertMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // DnD handlers
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id.replace('col-', ''));
        const newIndex = items.indexOf(over.id.replace('col-', ''));
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  // Handle contact card display
  const handleContactCardShow = (contact, variant, event) => {
    setContactCardContact(contact);
    setContactCardVariant(variant);
    
    if (variant === 'tooltip' && event) {
      const rect = event.target.getBoundingClientRect();
      setContactCardPosition({
        x: rect.right + 10,
        y: rect.top
      });
    }
    
    setShowContactCard(true);
  };

  const handleContactCardClose = () => {
    setShowContactCard(false);
    setContactCardContact(null);
  };

  // Form handlers
  const handleSubmit = async () => {
    console.log('🚀 handleSubmit called', { editingContact: !!editingContact, showNewContactForm, formData });
    
    // Validate required fields
    if (folders.length === 0 || !selectedFolder || !formData.folderId) {
      setAlertMessage('Please create or select a folder first before adding a contact.');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
      return;
    }
    
    if (formData.type === 'PERSON') {
      if (!formData.firstName || !formData.lastName) {
        setAlertMessage('Please provide both first name and last name for person contacts');
        setAlertType('error');
        setTimeout(() => setAlertMessage(''), 3000);
        return;
      }
    } else if (formData.type === 'BUSINESS') {
      if (!formData.businessName) {
        setAlertMessage('Please provide a business name for business contacts');
        setAlertType('error');
        setTimeout(() => setAlertMessage(''), 3000);
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      const action = editingContact ? 'update' : 'create';
      
      // Create FormData object
      const submitData = new FormData();
      submitData.append('_action', action);
      
      if (editingContact) {
        submitData.append('id', editingContact.id);
      }
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'pointsOfContact' || key === 'tags') {
          submitData.append(key, JSON.stringify(formData[key]));
        } else if (formData[key] !== null && formData[key] !== undefined) {
          submitData.append(key, formData[key]);
        }
      });
      
      const response = await fetch('/api/contacts', {
        method: 'POST',
        body: submitData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update contacts list with the new/updated contact
          if (editingContact) {
            setContacts(prev => prev.map(c => c.id === editingContact.id ? result.contact : c));
          } else {
            setContacts(prev => [result.contact, ...prev]);
          }
          
          // Reset form
          setEditingContact(null);
          setShowNewContactForm(false);
          setFormData(getInitialFormData());
          
          // Navigate back to contacts section on mobile
          if (isMobile) {
            setMobileActiveSection('contacts');
          }
          
          setAlertMessage(editingContact ? "Contact updated successfully" : "Contact created successfully");
          setAlertType("success");
          setTimeout(() => setAlertMessage(''), 3000);
        } else {
          setAlertMessage(result.error || "Failed to save contact");
          setAlertType("error");
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        const error = await response.json();
        console.error('Error saving contact:', error);
        setAlertMessage(error.error || "Failed to save contact");
        setAlertType("error");
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      setAlertMessage("Failed to save contact");
      setAlertType("error");
      setTimeout(() => setAlertMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Folder handlers
  const handleCreateFolder = async (folderData) => {
    console.log('🚀 handleCreateFolder called', folderData);
    
    if (!folderData.name) {
      setAlertMessage('Please provide a folder name');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const submitData = new FormData();
      submitData.append('_action', 'create');
      submitData.append('name', folderData.name);
      submitData.append('icon', folderData.icon || 'folder');
      submitData.append('iconColor', folderData.color || folderData.iconColor || '#f57c00');
      
      const response = await fetch('/api/contact-folders', {
        method: 'POST',
        body: submitData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Refresh folders
          const updatedFolders = await fetch('/api/contact-folders').then(r => r.json());
          setFolders(updatedFolders);
          setShowNewFolderModal(false);
          setAlertMessage("Folder created successfully");
          setAlertType("success");
          setTimeout(() => setAlertMessage(''), 3000);
        } else {
          setAlertMessage(result.error || "Failed to create folder");
          setAlertType("error");
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        const error = await response.json();
        console.error('Error creating folder:', error);
        setAlertMessage(error.error || "Failed to create folder");
        setAlertType("error");
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      setAlertMessage("Failed to create folder");
      setAlertType("error");
      setTimeout(() => setAlertMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Desktop Layout */}
      {!isMobile && (
        <>
          <style>{`
            .Polaris-Page__Content {
              padding: 0 !important;
              margin: 0 !important;
            }
            .Polaris-Page {
              padding: 0 !important;
              margin: 0 !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
              padding-top: 0 !important;
              padding-bottom: 0 !important;
            }
            @media (min-width: 30.625em) {
              .Polaris-Page {
                padding: 0 !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
              }
            }
            @media (min-width: 48.75em) {
              .Polaris-Page {
                padding: 0 !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
              }
            }
            .Polaris-Layout {
              padding: 0 !important;
              margin: 0 !important;
            }
            .Polaris-Layout__Section {
              padding: 0 !important;
              margin: 0 !important;
            }
            .Polaris-Layout__AnnotatedSection {
              padding: 0 !important;
              margin: 0 !important;
            }
            .app-layout {
              padding: 0 !important;
              margin: 0 !important;
              padding-left: 20px !important;
            }
            .Polaris-Box {
              padding-left: 20px !important;
            }
            .app-layout > * {
              padding-left: 0 !important;
              margin-left: 0 !important;
            }
            .Polaris-Button {
              box-sizing: content-box !important;
            }
          `}</style>
          <Page title="Contacts" style={{ padding: '0', margin: '0', paddingLeft: '0', marginLeft: '0' }}>
          {/* Toast Notifications */}
          {alertMessage && (
            <div 
              style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                padding: "12px 16px",
                borderRadius: "6px",
                color: "white",
                fontSize: "14px",
                fontWeight: "500",
                zIndex: 10002,
                maxWidth: "300px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                animation: "slideIn 0.3s ease-out",
                backgroundColor: alertType === 'error' ? "#d82c0d" : "#008060",
                textAlign: "left"
              }}
            >
              {alertMessage}
            </div>
          )}

          <style>{`
            @keyframes slideIn {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          `}</style>

          <div style={{ paddingBottom: "160px", padding: "0", margin: "0" }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="app-layout" style={{ 
            display: "flex", 
            gap: "16px", 
            minHeight: "calc(100vh - 80px)", // Account for fixed footer height
            paddingBottom: "100px", // Space for fixed footer with breathing room
            marginLeft: "-20px",
            paddingLeft: "20px"
          }}>
            {columnOrder.map((columnId, index) => (
              <div key={`slot-${index}`} style={{ 
                position: 'relative',
                ...(columnId === 'folders' ? {
                  width: "380px",
                  minWidth: "380px", 
                  maxWidth: "380px",
                  overflow: "hidden"
                } : {
                  flex: "1",
                  minWidth: "1200px"
                })
              }}>
                <SortableColumn id={columnId}>
                  {columnId === 'folders' && (
                    <Card style={{ 
                      flex: "1", 
                      display: "flex", 
                      flexDirection: "column", 
                      backgroundColor: "#fff", 
                      height: "100%", 
                      minHeight: "100%", 
                      padding: "0", 
                      margin: "0", 
                      borderRadius: "8px", 
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", 
                      border: "1px solid #e1e3e5" 
                    }}>
                      {/* Fixed Header Section */}
                      <div style={{ 
                        padding: "16px", 
                        borderBottom: "1px solid #e1e3e5",
                        backgroundColor: "white",
                        flexShrink: 0
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                          <Text as="h2" variant="headingLg" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <i className="far fa-folder-open"></i>
                            Folders
                          </Text>
                        </div>
                        
                        {/* Global Search */}
                        <div style={{ marginBottom: "16px", position: "relative" }}>
                          <input
                            type="text"
                            style={{
                              border: "none",
                              outline: "none",
                              fontSize: "14px",
                              color: "#1E1E1E",
                              padding: "12px 16px",
                              paddingRight: "44px",
                              borderRadius: "24px",
                              cursor: "text",
                              width: "100%",
                              backgroundColor: "#FAFAF8",
                              fontFamily: "inherit",
                              transition: "all 0.2s ease",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search all contacts..."
                            onFocus={(e) => {
                              e.target.style.boxShadow = "0 0 0 2px #008060, 0 1px 2px rgba(0,0,0,0.05)";
                              e.target.style.backgroundColor = "#FFFFFF";
                            }}
                            onBlur={(e) => {
                              e.target.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
                              e.target.style.backgroundColor = "#FAFAF8";
                            }}
                          />
                          <span 
                            style={{
                              position: "absolute",
                              right: "16px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: "18px",
                              color: "#6B7280",
                              pointerEvents: "none"
                            }}
                          >
                            <i className="fas fa-search"></i>
                          </span>
                        </div>

                        {/* All Contacts and All Tags Buttons - Under Search Box */}
                        <div style={{ marginBottom: "16px" }}>
                          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                            {/* All Contacts Button */}
                            <button
                              style={{ 
                                padding: "12px 16px", 
                                flex: "1",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                cursor: "pointer",
                                backgroundColor: selectedFolder === null ? "#f6fff8" : "white",
                                border: selectedFolder === null ? "2px solid #008060" : "1px solid #e1e3e5",
                                borderRadius: "8px",
                                transition: "all 0.2s ease",
                                fontSize: "14px",
                                fontWeight: "600",
                                color: selectedFolder === null ? "#008060" : "#374151"
                              }}
                              onClick={() => setSelectedFolder(null)}
                            >
                              <i className="far fa-address-book" style={{ fontSize: "16px", marginRight: "8px" }}></i>
                              All Contacts
                            </button>

                            {/* All Tags Button */}
                            <button
                              style={{ 
                                padding: "12px 16px", 
                                flex: "1",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                cursor: "pointer",
                                backgroundColor: showTagsSection ? "#f6fff8" : "white",
                                border: showTagsSection ? "2px solid #008060" : "1px solid #e1e3e5",
                                borderRadius: "8px",
                                transition: "all 0.2s ease",
                                fontSize: "14px",
                                fontWeight: "600",
                                color: showTagsSection ? "#008060" : "#374151"
                              }}
                              onClick={() => {
                                setShowTagsSection(!showTagsSection);
                              }}
                            >
                              <i className="far fa-bookmark" style={{ fontSize: "16px", marginRight: "8px" }}></i>
                              All Tags
                            </button>
                          </div>
                        </div>

                        {/* Tags Section */}
                        {(showTagsSection || selectedTags.length > 0) && (
                          <div style={{ 
                            marginBottom: "12px",
                            padding: "12px",
                            backgroundColor: "#f8f9fa",
                            border: "1px solid #e1e3e5",
                            borderRadius: "8px"
                          }}>
                            <div style={{ marginBottom: "8px", fontSize: "12px", fontWeight: "600", color: "#374151" }}>
                              All Tags:
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {(() => {
                                const allTags = contacts.reduce((acc, contact) => {
                                  if (contact.tags) {
                                    contact.tags.forEach(tag => {
                                      acc[tag] = (acc[tag] || 0) + 1;
                                    });
                                  }
                                  return acc;
                                }, {});
                                
                                const tagsToShow = Object.entries(allTags).map(([tag, count]) => ({ name: tag, count }));
                                
                                return tagsToShow.map((tagData, index) => (
                                  <span
                                    key={index}
                                    onClick={() => {
                                      // Add tag to filter section under search bar
                                      toggleTagFilter(tagData.name);
                                    }}
                                    style={{
                                      padding: "6px 10px",
                                      backgroundColor: selectedTagFilter.includes(tagData.name) ? "#e8f5e8" : "#f1f3f4",
                                      color: selectedTagFilter.includes(tagData.name) ? "#008060" : "#374151",
                                      border: selectedTagFilter.includes(tagData.name) ? "1px solid #b8e6b8" : "1px solid #e1e3e5",
                                      borderRadius: "16px",
                                      fontSize: "12px",
                                      fontWeight: "500",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px"
                                    }}
                                  >
                                    {tagData.name} ({tagData.count})
                                    {showTagsSection && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTagToDelete(tagData.name);
                                        }}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "#dc2626",
                                          cursor: "pointer",
                                          padding: "0 2px",
                                          fontSize: "14px",
                                          marginLeft: "4px",
                                          fontWeight: "bold",
                                          display: "flex",
                                          alignItems: "center"
                                        }}
                                        title="Delete tag from all contacts"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </span>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Scrollable Folders Section */}
                      <div style={{ 
                          flex: "1",
                          overflowY: folders.length > 9 ? "auto" : "visible",
                          overflowX: "hidden", 
                          padding: "16px 20px 16px 16px",
                          maxHeight: folders.length > 9 ? "500px" : "none"
                        }}>
                          {folders.length === 0 ? (
                            <div style={{ 
                              textAlign: "center", 
                              padding: "40px 20px",
                              color: "#6d7175",
                              backgroundColor: "#f8f9fa",
                              borderRadius: "8px",
                              border: "1px solid #e1e3e5"
                            }}>
                              <img 
                                src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png" 
                                alt="No folders" 
                                style={{ 
                                  width: "120px", 
                                  height: "auto", 
                                  marginBottom: "16px", 
                                  display: "block",
                                  margin: "0 auto 16px auto"
                                }} 
                              />
                              <p style={{ margin: 0, fontSize: "16px", fontWeight: "500", color: "#202223", marginBottom: "8px" }}>No folders yet</p>
                              <p style={{ margin: "8px 0 24px 0", fontSize: "14px", color: "#6d7175" }}>
                                Get started by creating your first folder to organize your contacts.
                              </p>
                              <Button
                                variant="primary"
                                onClick={() => setShowNewFolderModal(true)}
                                size="medium"
                              >
                                Create your first folder
                              </Button>
                            </div>
                          ) : (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleFolderDragEnd}
                            >
                              <SortableContext
                                items={folders.map(f => f.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div>
                                  {folders.map((folder) => (
                                    <DraggableFolder 
                                      key={folder.id} 
                                      folder={folder}
                                      selectedFolder={selectedFolder?.id}
                                      openFolderMenu={openFolderMenu}
                                      setOpenFolderMenu={setOpenFolderMenu}
                                      onFolderClick={handleFolderSelect}
                                    >
                                      {openFolderMenu === folder.id && (
                                        <div style={{
                                          position: 'absolute',
                                          top: '100%',
                                          right: '8px',
                                          backgroundColor: 'white',
                                          border: '1px solid #e1e3e5',
                                          borderRadius: '8px',
                                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                          zIndex: 1000,
                                          minWidth: '120px',
                                          padding: '4px 0'
                                        }}>
                                          <button
                                            onClick={() => {
                                              setShowRenameFolderModal(folder.id);
                                              setEditingFolderName(folder.name);
                                              setOpenFolderMenu(null);
                                            }}
                                            style={{
                                              width: '100%',
                                              padding: '8px 12px',
                                              border: 'none',
                                              background: 'none',
                                              textAlign: 'left',
                                              cursor: 'pointer',
                                              fontSize: '14px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px'
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                          >
                                            <i className="far fa-edit" style={{ fontSize: '12px' }}></i>
                                            Rename
                                          </button>
                                          <button
                                            onClick={() => {
                                              setShowIconPicker(folder.id);
                                              setOpenFolderMenu(null);
                                            }}
                                            style={{
                                              width: '100%',
                                              padding: '8px 12px',
                                              border: 'none',
                                              background: 'none',
                                              textAlign: 'left',
                                              cursor: 'pointer',
                                              fontSize: '14px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px'
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                          >
                                            <ExchangeIcon style={{ width: '15px', height: '15px' }} />
                                            Change Icon
                                          </button>
                                          <button
                                            onClick={() => {
                                              setShowDeleteConfirm(folder.id);
                                              setOpenFolderMenu(null);
                                            }}
                                            style={{
                                              width: '100%',
                                              padding: '8px 12px',
                                              border: 'none',
                                              background: 'none',
                                              textAlign: 'left',
                                              cursor: 'pointer',
                                              fontSize: '14px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              color: '#dc2626'
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                          >
                                            <i className="far fa-trash-alt" style={{ fontSize: '12px' }}></i>
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </DraggableFolder>
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          )}
                      </div>

                      {/* Sticky Bottom - New Folder Button */}
                      <div style={{ 
                        padding: "20px", 
                        borderTop: "1px solid #e1e3e5",
                        backgroundColor: "white",
                        flexShrink: 0
                      }}>
                        <Button
                          onClick={() => setShowNewFolderModal(true)}
                          variant="primary"
                          size="large"
                          fullWidth
                        >
                          New Folder
                        </Button>
                      </div>
                    </Card>
                  )}

                  {columnId === 'contacts' && (
                    <Card style={{ 
                      flex: "1", 
                      display: "flex", 
                      flexDirection: "column", 
                      backgroundColor: "#fff", 
                      height: "100%", 
                      minHeight: "100%", 
                      padding: "0", 
                      margin: "0", 
                      borderRadius: "8px", 
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", 
                      border: "1px solid #e1e3e5" 
                    }}>
                      {/* Fixed Header Section */}
                      <div style={{ 
                        padding: "16px", 
                        borderBottom: "1px solid #e1e3e5",
                        backgroundColor: "white",
                        flexShrink: 0
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                          <div>
                            <Text as="h2" variant="headingLg" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                              <i className="far fa-address-book" style={{ fontSize: "20px" }}></i>
                              Contacts ({filteredContacts.length})
                            </Text>
                          </div>
                          <Button
                            onClick={handleNewContact}
                            variant="primary"
                            disabled={!selectedFolder || folders.length === 0}
                          >
                            Add new contact
                          </Button>
                        </div>

                        {/* Bulk Action Buttons */}
                        {selectedContacts.length > 0 && (
                          <div style={{ 
                            display: "flex", 
                            gap: "8px", 
                            marginBottom: "16px",
                            padding: "12px",
                            backgroundColor: "#fffbf8",
                            border: "1px solid #FF8C00",
                            borderRadius: "8px"
                          }}>
                            <Button
                              variant="primary"
                              tone="critical"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete ${selectedContacts.length} selected contact(s)?`)) {
                                  setIsLoading(true);
                                  try {
                                    const form = new FormData();
                                    form.append('_action', 'bulk-delete');
                                    form.append('contactIds', JSON.stringify(selectedContacts));

                                    const response = await fetch('/api/contacts', {
                                      method: 'POST',
                                      body: form
                                    });

                                    const result = await response.json();

                                    if (result.success) {
                                      setContacts(prev => prev.filter(c => !selectedContacts.includes(c.id)));
                                      setSelectedContacts([]);
                                      setAlertMessage(`Successfully deleted ${result.deletedCount} contact(s)`);
                                      setAlertType("success");
                                      setTimeout(() => setAlertMessage(''), 3000);
                                    } else {
                                      setAlertMessage(result.error || "Failed to delete contacts");
                                      setAlertType("error");
                                      setTimeout(() => setAlertMessage(''), 3000);
                                    }
                                  } catch (error) {
                                    console.error('Error deleting contacts:', error);
                                    setAlertMessage("Failed to delete contacts");
                                    setAlertType("error");
                                    setTimeout(() => setAlertMessage(''), 3000);
                                  } finally {
                                    setIsLoading(false);
                                  }
                                }
                              }}
                            >
                              Delete Selected ({selectedContacts.length})
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setShowBulkMoveModal(true);
                              }}
                            >
                              Move Selected ({selectedContacts.length})
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setSelectedContacts([]);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}

                        <TextField
                          label="Search contact"
                          labelHidden
                          placeholder="Search contact"
                          value={searchQuery}
                          onChange={setSearchQuery}
                        />
                      </div>

                      {/* Tag Filter Badge */}
                      {selectedTagFilter.length > 0 && (
                        <div style={{ padding: '8px 16px', backgroundColor: '#f6f6f7', borderBottom: '1px solid #e1e3e5' }}>
                          <InlineStack gap="200" align="start" blockAlign="center">
                            <Text variant="bodySm" as="span" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>Filtering by tag:</Text>
                            <InlineStack gap="100" wrap={true} blockAlign="center">
                              {selectedTagFilter.map((tag, index) => (
                                <Badge 
                                  key={index} 
                                  tone={tag === 'Person' || tag === 'Business' ? (tag === 'Person' ? 'info' : 'success') : 'info'}
                                  style={{ height: '24px', fontSize: '12px', padding: '2px 8px' }}
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </InlineStack>
                            <Button
                              size="micro"
                              onClick={() => setSelectedTagFilter([])}
                              style={{ height: '24px', padding: '4px 12px' }}
                            >
                              Clear filter
                            </Button>
                          </InlineStack>
                        </div>
                      )}

                      {/* Table Header */}
                      {filteredContacts.length > 0 && (
                        <div style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid transparent",
                          backgroundColor: "#fff",
                          display: "grid",
                          gridTemplateColumns: "60px 200px 180px 120px 150px 150px",
                          gap: "16px",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6d7175",
                          textTransform: "capitalize",
                          alignItems: "center"
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>Profile</div>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>Name</div>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>Contact info</div>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>Creation date</div>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>Tags</div>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>Actions</div>
                        </div>
                      )}

                      {/* Scrollable Content */}
                      <div style={{ 
                        maxHeight: filteredContacts.length > 10 ? "600px" : "auto",
                        overflowY: filteredContacts.length > 10 ? "auto" : "visible",
                        overflowX: "hidden"
                      }}>
                        {filteredContacts.length > 0 ? (
                          <div className="custom-contact-list">
                            {filteredContacts.map((contact) => {
                              const { id, firstName, lastName, businessName, email, phone, type, createdAt, pinnedAt } = contact;
                              const isContactSelected = selectedContacts.includes(id);
                              
                              return (
                                <div 
                                  key={id}
                                  className={`custom-contact-row ${pinnedAt ? 'pinned' : ''} ${isContactSelected ? 'selected' : ''}`}
                                  onClick={(e) => {
                                    // Only show modal if not clicking on buttons or badges
                                    if (e.target && !e.target.closest('button') && !e.target.closest('.Polaris-Badge') && !e.target.closest('[class*="tag-"]')) {
                                      setSelectedContact(contact);
                                      setShowContactDetails(true);
                                    }
                                  }}
                                >
                                  {/* Avatar */}
                                  <div className="contact-avatar">
                                    <Avatar 
                                      initials={(() => {
                                        if (type === 'PERSON') {
                                          const first = (firstName || '').trim();
                                          const last = (lastName || '').trim();
                                          if (first && last) return (first[0] + last[0]).toUpperCase();
                                          else if (first) return first.substring(0, 2).toUpperCase();
                                          else if (last) return last.substring(0, 2).toUpperCase();
                                          return 'UN';
                                        } else {
                                          const business = (businessName || '').trim();
                                          if (business.length >= 2) return business.substring(0, 2).toUpperCase();
                                          else if (business.length === 1) return business[0].toUpperCase();
                                          return 'BU';
                                        }
                                      })()}
                                      size="large"
                                    />
                                  </div>
                                  {/* Contact Content */}
                                  <div className="contact-content">
                                    {/* Name */}
                                    <div className="contact-name">
                                      <Text as="span" variant="bodyMd">
                                        {type === 'PERSON' 
                                          ? `${firstName || ''} ${lastName || ''}`.trim() || '-'
                                          : businessName || '-'
                                        }
                                      </Text>
                                    </div>
                                    
                                    {/* Contact Info */}
                                    <div className="contact-info">
                                      <div className="contact-details">
                                        {email && (
                                          <Text as="span" variant="bodySm" tone="subdued">
                                            {email}
                                          </Text>
                                        )}
                                        {phone && (
                                          <Text as="span" variant="bodySm" tone="subdued">
                                            {phone}
                                          </Text>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Creation Date */}
                                    <div className="contact-date">
                                      <Text as="span" variant="bodySm" tone="subdued">
                                        {new Date(createdAt).toLocaleDateString()}
                                      </Text>
                                    </div>
                                    
                                    {/* Tags */}
                                    <div className="contact-tags">
                                      <div 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleTagFilter(type === 'PERSON' ? 'Person' : 'Business');
                                        }}
                                        className="tag-clickable"
                                      >
                                        <Badge tone={type === 'PERSON' ? 'info' : 'success'}>
                                          {type === 'PERSON' ? 'Person' : 'Business'}
                                        </Badge>
                                      </div>
                                      {(contact.tags || []).slice(0, 2).map((tag, index) => (
                                        <div 
                                          key={index}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTagFilter(tag);
                                          }}
                                          className="tag-clickable"
                                        >
                                          <Badge tone="default">
                                            {tag}
                                          </Badge>
                                        </div>
                                      ))}
                                      {(contact.tags || []).length > 2 && (
                                        <Popover
                                          active={tagPopoverActive[id] || false}
                                          activator={
                                            <div 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setTagPopoverActive(prev => ({ ...prev, [id]: !prev[id] }));
                                              }}
                                              className="tag-clickable"
                                            >
                                              <Badge tone="default">
                                                +{(contact.tags || []).length - 2}
                                              </Badge>
                                            </div>
                                          }
                                          onClose={() => setTagPopoverActive(prev => ({ ...prev, [id]: false }))}
                                          preferredAlignment="left"
                                        >
                                          <div style={{ padding: '12px', maxWidth: '200px' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                              {(contact.tags || []).slice(2).map((tag, index) => (
                                                <div 
                                                  key={index}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleTagFilter(tag);
                                                    setTagPopoverActive(prev => ({ ...prev, [id]: false }));
                                                  }}
                                                  className="tag-clickable"
                                                >
                                                  <Badge tone="default">
                                                    {tag}
                                                  </Badge>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </Popover>
                                      )}
                                    </div>
                                    
                                    {/* Actions */}
                                    <div className="contact-actions">
                                      <Button
                                        size="medium"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleContactSelect(id);
                                        }}
                                      >
                                        {selectedContacts.includes(id) ? 'Deselect' : 'Select'}
                                      </Button>
                                      <Popover
                                          active={managePopoverActive[id] || false}
                                          activator={
                                            <Button
                                              size="medium"
                                              disclosure="select"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setManagePopoverActive(prev => ({ ...prev, [id]: !prev[id] }));
                                              }}
                                            >
                                              Manage
                                            </Button>
                                          }
                                          onClose={() => setManagePopoverActive(prev => ({ ...prev, [id]: false }))}
                                          preferredAlignment="left"
                                        >
                                          <div style={{ padding: '8px 0', minWidth: '200px' }}>
                                            <button
                                              onClick={() => {
                                                handleContactPin(id);
                                                setManagePopoverActive(prev => ({ ...prev, [id]: false }));
                                              }}
                                              style={{
                                                width: '100%',
                                                padding: '8px 16px',
                                                border: 'none',
                                                background: 'none',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '14px',
                                                color: '#374151'
                                              }}
                                              onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                            >
                                              <i className="fas fa-thumbtack" style={{ fontSize: '14px', width: '16px' }}></i>
                                              {pinnedAt ? 'Unpin' : 'Pin'}
                                            </button>
                                            
                                            <button
                                              onClick={() => {
                                                setSelectedContacts([id]);
                                                setBulkActionType('move');
                                                setShowBulkMoveModal(true);
                                                setManagePopoverActive(prev => ({ ...prev, [id]: false }));
                                              }}
                                              style={{
                                                width: '100%',
                                                padding: '8px 16px',
                                                border: 'none',
                                                background: 'none',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '14px',
                                                color: '#374151'
                                              }}
                                              onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                            >
                                              <i className="fas fa-folder" style={{ fontSize: '14px', width: '16px' }}></i>
                                              Move to different folder
                                            </button>
                                            
                                            <button
                                              onClick={() => {
                                                handleContactDuplicate(id, selectedFolder?.id || null);
                                                setManagePopoverActive(prev => ({ ...prev, [id]: false }));
                                              }}
                                              style={{
                                                width: '100%',
                                                padding: '8px 16px',
                                                border: 'none',
                                                background: 'none',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '14px',
                                                color: '#374151'
                                              }}
                                              onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                            >
                                              <i className="fas fa-copy" style={{ fontSize: '14px', width: '16px' }}></i>
                                              Duplicate to current folder
                                            </button>
                                            
                                            <button
                                              onClick={() => {
                                                setSelectedContacts([id]);
                                                setBulkActionType('duplicate');
                                                setShowBulkMoveModal(true);
                                                setManagePopoverActive(prev => ({ ...prev, [id]: false }));
                                              }}
                                              style={{
                                                width: '100%',
                                                padding: '8px 16px',
                                                border: 'none',
                                                background: 'none',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '14px',
                                                color: '#374151'
                                              }}
                                              onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                            >
                                              <i className="fas fa-copy" style={{ fontSize: '14px', width: '16px' }}></i>
                                              Duplicate to different folder
                                            </button>
                                          </div>
                                        </Popover>
                                      <Button
                                        size="medium"
                                        tone="critical"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleContactDelete(id);
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <EmptyState
                            heading="No contacts yet"
                            action={{
                              content: "Create your first contact",
                              onAction: handleNewContact,
                            }}
                            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                          >
                            <p>Start building your contact list by adding people and businesses.</p>
                          </EmptyState>
                        )}
                      </div>
                    </Card>
                  )}

                </SortableColumn>
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeId ? (
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e1e3e5',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}>
                Dragging...
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Contact Card Modal/Tooltip */}
        {showContactCard && contactCardContact && (
          <ContactCard
            contact={contactCardContact}
            variant={contactCardVariant}
            isVisible={showContactCard}
            onClose={handleContactCardClose}
            onEdit={() => {
              console.log('Edit button clicked in tooltip, contactCardContact:', contactCardContact);
              setShowContactCard(false);
              setShowNewContactForm(true);
              setFormData({
                type: contactCardContact.type,
                firstName: contactCardContact.firstName || '',
                lastName: contactCardContact.lastName || '',
                businessName: contactCardContact.businessName || '',
                email: contactCardContact.email || '',
                phone: contactCardContact.phone || '',
                mobile: contactCardContact.mobile || '',
                company: contactCardContact.company || '',
                role: contactCardContact.role || '',
                memo: contactCardContact.memo || '',
                tags: contactCardContact.tags || [],
                pointsOfContact: contactCardContact.pointsOfContact || []
              });
              setEditingContactId(contactCardContact.id);
              console.log('Form should be shown now, showNewContactForm:', true);
            }}
            position={contactCardPosition}
          />
        )}

        {/* Manage Menu Dropdown */}
        {manageMenuContact && (
          <div
            className="manage-menu"
            style={{
              position: 'fixed',
              left: manageMenuPosition.x,
              top: manageMenuPosition.y,
              backgroundColor: 'white',
              border: '1px solid #e1e3e5',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 99998,
              minWidth: '200px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '8px 0'
              }}
            >
              <button
                onClick={() => {
                  if (manageMenuContact) {
                    handleContactPin(manageMenuContact.id);
                  }
                  closeManageMenu();
                }}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f6f6f7';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <i className="fas fa-thumbtack" style={{ fontSize: '14px' }}></i>
                {manageMenuContact.pinnedAt ? 'Unpin' : 'Pin'}
              </button>
              
              <button
                onClick={() => {
                  if (manageMenuContact) {
                    closeManageMenu();
                    // Add a small delay to ensure manage menu is fully closed
                    setTimeout(() => {
                      setSelectedContacts([manageMenuContact.id]);
                      setShowBulkMoveModal(true);
                    }, 100);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f6f6f7';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <i className="fas fa-folder" style={{ fontSize: '14px' }}></i>
                Move to different folder
              </button>
              
              <button
                onClick={() => {
                  if (manageMenuContact) {
                    handleContactDuplicate(manageMenuContact.id, selectedFolder?.id || null);
                  }
                  closeManageMenu();
                }}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f6f6f7';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <i className="fas fa-copy" style={{ fontSize: '14px' }}></i>
                Duplicate to current folder
              </button>
              
              <button
                onClick={() => {
                  if (manageMenuContact) {
                    closeManageMenu();
                    // Add a small delay to ensure manage menu is fully closed
                    setTimeout(() => {
                      setSelectedContacts([manageMenuContact.id]);
                      setShowBulkMoveModal(true);
                      // We'll handle the duplicate logic in the bulk move modal
                    }, 100);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f6f6f7';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <i className="fas fa-copy" style={{ fontSize: '14px' }}></i>
                Duplicate to different folder
              </button>
            </div>
          </div>
        )}

        {/* Desktop Modals */}
        {!isMobile && (
          <>
            {/* New Folder Modal */}
            {showNewFolderModal && (
              <NewFolderModal
                isOpen={showNewFolderModal}
                onClose={() => setShowNewFolderModal(false)}
                onCreateFolder={handleCreateFolder}
              />
            )}

            {/* Rename Folder Modal */}
            {showRenameFolderModal && (
              <Modal
                open={!!showRenameFolderModal}
                onClose={() => setShowRenameFolderModal(null)}
                title="Rename Folder"
                primaryAction={{
                  content: 'Save',
                  onAction: async () => {
                    if (editingFolderName.trim() && editingFolderName !== folders.find(f => f.id === showRenameFolderModal)?.name) {
                      await handleFolderRename(showRenameFolderModal, editingFolderName.trim());
                    }
                    setShowRenameFolderModal(null);
                    setEditingFolderName('');
                  }
                }}
                secondaryActions={[{
                  content: 'Cancel',
                  onAction: () => {
                    setShowRenameFolderModal(null);
                    setEditingFolderName('');
                  }
                }]}
              >
                <Modal.Section>
                  <TextField
                    label="Folder Name"
                    value={editingFolderName}
                    onChange={setEditingFolderName}
                    autoComplete="off"
                  />
                </Modal.Section>
              </Modal>
            )}

            {/* Icon Picker Modal */}
            {showIconPicker && (
              <FolderIconPicker
                isOpen={!!showIconPicker}
                onClose={() => setShowIconPicker(null)}
                onSelectIcon={async ({ icon, color }) => {
                  await handleFolderIconChange(showIconPicker, icon, color);
                  setShowIconPicker(null);
                }}
                currentIcon={folders.find(f => f.id === showIconPicker)?.icon || 'folder'}
                currentColor={folders.find(f => f.id === showIconPicker)?.iconColor || '#f57c00'}
                folderName={folders.find(f => f.id === showIconPicker)?.name || 'Folder'}
              />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <Modal
                open={!!showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(null)}
                title="Delete Folder"
                primaryAction={{
                  content: 'Delete',
                  destructive: true,
                  onAction: async () => {
                    await handleFolderDelete(showDeleteConfirm);
                    setShowDeleteConfirm(null);
                  }
                }}
                secondaryActions={[{
                  content: 'Cancel',
                  onAction: () => setShowDeleteConfirm(null)
                }]}
              >
                <Modal.Section>
                  <Text as="p">
                    Are you sure you want to delete this folder? All contacts in this folder will be moved to "All Contacts".
                  </Text>
                </Modal.Section>
              </Modal>
            )}
          </>
        )}

        {/* Contact Edit/Create Modal - Desktop Only */}
        {!isMobile && (
          <Modal
            open={editingContact !== null || showNewContactForm}
            onClose={() => {
              setEditingContact(null);
              setShowNewContactForm(false);
              setFormData(getInitialFormData());
              setTagsInputValue('');
            }}
            title={editingContact ? 'Edit Contact' : 'Add new contact'}
            primaryAction={{
              content: editingContact ? 'Update Contact' : 'Create Contact',
              onAction: handleSubmit
            }}
            secondaryActions={[{
              content: 'Cancel',
              onAction: () => {
                setEditingContact(null);
                setShowNewContactForm(false);
                setFormData(getInitialFormData());
                setTagsInputValue('');
              }
            }]}
          >
          <Modal.Section>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Select
                label="Contact Type"
                options={[
                  { label: 'Person', value: 'PERSON' },
                  { label: 'Business', value: 'BUSINESS' }
                ]}
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value })}
              />

              {formData.type === 'PERSON' ? (
                <>
                  <TextField
                    label="First Name"
                    value={formData.firstName}
                    onChange={(value) => setFormData({ ...formData, firstName: value })}
                    required
                  />
                  <TextField
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(value) => setFormData({ ...formData, lastName: value })}
                    required
                  />
                  <TextField
                    label="Company"
                    value={formData.company}
                    onChange={(value) => setFormData({ ...formData, company: value })}
                  />
                  <TextField
                    label="Phone"
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                  />
                  <TextField
                    label="Mobile"
                    value={formData.mobile}
                    onChange={(value) => setFormData({ ...formData, mobile: value })}
                  />
                  <TextField
                    label="Role"
                    value={formData.role}
                    onChange={(value) => setFormData({ ...formData, role: value })}
                  />
                  <TextField
                    label="Email"
                    value={formData.email}
                    onChange={(value) => setFormData({ ...formData, email: value })}
                  />
                  <TextField
                    label="Memo"
                    value={formData.memo}
                    onChange={(value) => setFormData({ ...formData, memo: value })}
                    multiline={3}
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="Business Name"
                    value={formData.businessName}
                    onChange={(value) => setFormData({ ...formData, businessName: value })}
                    required
                  />
                  <TextField
                    label="Business Phone"
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                  />
                  <TextField
                    label="Business Email"
                    value={formData.email}
                    onChange={(value) => setFormData({ ...formData, email: value })}
                  />
                  <TextField
                    label="Role"
                    value={formData.role}
                    onChange={(value) => setFormData({ ...formData, role: value })}
                  />
                  <TextField
                    label="Memo"
                    value={formData.memo}
                    onChange={(value) => setFormData({ ...formData, memo: value })}
                    multiline={3}
                  />
                  
                  <div>
                    <Text as="h3" variant="headingMd" style={{ marginBottom: "12px" }}>
                      Points of Contact
                    </Text>
                    {formData.pointsOfContact.map((point, index) => (
                      <div key={index} style={{ 
                        display: "flex", 
                        gap: "8px", 
                        marginBottom: "12px",
                        alignItems: "flex-end"
                      }}>
                        <TextField
                          label="Name"
                          value={point.name}
                          onChange={(value) => {
                            const newPoints = [...formData.pointsOfContact];
                            newPoints[index] = { ...point, name: value };
                            setFormData({ ...formData, pointsOfContact: newPoints });
                          }}
                        />
                        <TextField
                          label="Phone"
                          value={point.phone}
                          onChange={(value) => {
                            const newPoints = [...formData.pointsOfContact];
                            newPoints[index] = { ...point, phone: value };
                            setFormData({ ...formData, pointsOfContact: newPoints });
                          }}
                        />
                        <TextField
                          label="Email"
                          value={point.email}
                          onChange={(value) => {
                            const newPoints = [...formData.pointsOfContact];
                            newPoints[index] = { ...point, email: value };
                            setFormData({ ...formData, pointsOfContact: newPoints });
                          }}
                        />
                        <Button
                          variant="tertiary"
                          icon={XIcon}
                          onClick={() => {
                            const newPoints = formData.pointsOfContact.filter((_, i) => i !== index);
                            setFormData({ ...formData, pointsOfContact: newPoints });
                          }}
                        />
                      </div>
                    ))}
                    <Button
                      variant="tertiary"
                      icon={EditIcon}
                      onClick={() => {
                        setFormData({
                          ...formData,
                          pointsOfContact: [...formData.pointsOfContact, { name: '', phone: '', email: '' }]
                        });
                      }}
                    >
                      Add Point of Contact
                    </Button>
                  </div>
                </>
              )}

              <Select
                label="Folder"
                options={folders.map(folder => ({ label: folder.name, value: folder.id }))}
                value={formData.folderId}
                onChange={(value) => setFormData({ ...formData, folderId: value })}
              />

              {/* Tags Field */}
              <div>
                <div onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagsInputValue.trim()) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Add the current tag
                    const newTag = tagsInputValue.trim();
                    setFormData(prev => ({ 
                      ...prev, 
                      tags: [...(prev.tags || []), newTag]
                    }));
                    setTagsInputValue('');
                  }
                }}>
                  <TextField
                    label="Tags"
                    placeholder="e.g., client, vip, important (press Enter or comma)"
                    value={tagsInputValue}
                    onChange={(value) => {
                      // Check if user typed a comma
                      if (value.includes(',')) {
                        // Process all complete tags (before commas)
                        const parts = value.split(',');
                        const completeTags = parts.slice(0, -1).map(tag => tag.trim()).filter(tag => tag.length > 0);
                        
                        if (completeTags.length > 0) {
                          setFormData(prev => ({ 
                            ...prev, 
                            tags: [...(prev.tags || []), ...completeTags]
                          }));
                        }
                        
                        // Keep the text after the last comma
                        setTagsInputValue(parts[parts.length - 1]);
                      } else {
                        setTagsInputValue(value);
                      }
                    }}
                  />
                </div>
                {formData.tags && formData.tags.length > 0 && (
                  <div style={{ 
                    marginTop: '8px', 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px' 
                  }}>
                    {formData.tags.map((tag, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          backgroundColor: '#f6fff8',
                          border: '1px solid #008060',
                          borderRadius: '16px',
                          fontSize: '12px',
                          color: '#008060'
                        }}
                      >
                        <span>{tag}</span>
                        <button
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              tags: prev.tags.filter((_, i) => i !== index)
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: 'rgba(199, 10, 36, 1)',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center',
                            fontWeight: 'bold'
                          }}
                          aria-label={`Remove tag ${tag}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Modal.Section>
        </Modal>
        )}


        {/* Desktop Bulk Move Modal */}
        {!isMobile && showBulkMoveModal && (
          <Modal
            open={showBulkMoveModal}
            onClose={() => {
              setShowBulkMoveModal(false);
              setSelectedContacts([]);
              setSelectedFolderForMove(null);
              setBulkActionType('move');
            }}
            title={bulkActionType === 'duplicate' ? 'Duplicate Contacts' : 'Move Contacts'}
            primaryAction={{
              content: bulkActionType === 'duplicate' ? 'Duplicate' : 'Move',
              disabled: !selectedFolderForMove,
              onAction: async () => {
                await handleBulkMoveContacts();
              }
            }}
            secondaryActions={[{
              content: 'Cancel',
              onAction: () => {
                setShowBulkMoveModal(false);
                setSelectedContacts([]);
                setSelectedFolderForMove(null);
                setBulkActionType('move');
              }
            }]}
          >
            <Modal.Section>
              <Text as="p" style={{ marginBottom: '16px' }}>
                Select a folder to {bulkActionType === 'duplicate' ? 'duplicate' : 'move'} {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} to.
              </Text>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {folders.map((folder) => {
                  const isCurrentFolder = selectedContacts.length === 1 && contacts.find(c => c.id === selectedContacts[0])?.folderId === folder.id;
                  const isSelected = selectedFolderForMove === folder.id;
                  
                  return (
                    <div
                      key={folder.id}
                      onClick={() => {
                        if (!isCurrentFolder) {
                          setSelectedFolderForMove(folder.id);
                        }
                      }}
                      style={{
                        padding: '12px',
                        border: isSelected ? '2px solid #008060' : '1px solid #e1e3e5',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        cursor: isCurrentFolder ? 'not-allowed' : 'pointer',
                        backgroundColor: isSelected ? '#e8f5e8' : (isCurrentFolder ? '#f1f3f4' : '#fafbfb'),
                        opacity: isCurrentFolder ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <i 
                        className={`far fa-${folder.icon || 'folder'}`} 
                        style={{ 
                          fontSize: '18px', 
                          color: folder.iconColor || '#f57c00' 
                        }}
                      ></i>
                      <span style={{ fontWeight: '500', flex: 1 }}>{folder.name}</span>
                      {isCurrentFolder && (
                        <span style={{ 
                          fontSize: '12px', 
                          color: '#6d7175',
                          fontWeight: '600',
                          backgroundColor: '#e1e3f4',
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>
                          Current
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Modal.Section>
          </Modal>
        )}

        {/* Contact Details Modal */}
        {showContactDetails && selectedContact && (
          <ContactCard 
            contact={selectedContact}
            variant="modal"
            isVisible={true}
            onClose={() => {
              setShowContactDetails(false);
              setSelectedContact(null);
            }}
            onEdit={() => {
              console.log('Edit button clicked in main modal, selectedContact:', selectedContact);
              setShowContactDetails(false);
              setShowNewContactForm(true);
              setFormData({
                type: selectedContact.type,
                firstName: selectedContact.firstName || '',
                lastName: selectedContact.lastName || '',
                businessName: selectedContact.businessName || '',
                email: selectedContact.email || '',
                phone: selectedContact.phone || '',
                mobile: selectedContact.mobile || '',
                company: selectedContact.company || '',
                role: selectedContact.role || '',
                memo: selectedContact.memo || '',
                tags: selectedContact.tags || [],
                pointsOfContact: selectedContact.pointsOfContact || []
              });
              setEditingContactId(selectedContact.id);
              console.log('Form should be shown now, showNewContactForm:', true);
            }}
          />
        )}
      </div>
    </Page>
        </>
      )}

      {/* Mobile Layout */}
      {isMobile && (
        <div 
          className="mobile-layout"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f6f6f7',
            zIndex: 'auto',
            pointerEvents: (showBulkMoveModal || showContactDeleteModal) ? 'none' : 'auto'
          }}
        >
          {/* Mobile Toast Notifications */}
          {alertMessage && (
            <div 
              style={{
                position: "fixed",
                top: "10px",
                left: "10px",
                right: "10px",
                padding: "16px 20px",
                borderRadius: "8px",
                color: "white",
                fontSize: "16px",
                fontWeight: "600",
                zIndex: 10001,
                boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                animation: "slideIn 0.3s ease-out",
                backgroundColor: alertType === 'error' ? "#d82c0d" : "#008060",
                textAlign: "center",
                border: "2px solid rgba(255,255,255,0.3)"
              }}
            >
              {alertMessage}
            </div>
          )}

          <style>{`
            @keyframes slideIn {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
            .mobile-layout {
              height: 100vh;
              overflow: hidden;
            }
            .mobile-section {
              flex: 1;
              overflow-y: auto;
              -webkit-overflow-scrolling: touch;
            }
          `}</style>

          {/* Mobile Header */}
          <div style={{
            backgroundColor: 'white',
            borderBottom: '1px solid #e1e3e5',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Left Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {mobileActiveSection === 'folders' && (
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                  Contacts
                </h1>
              )}
              {mobileActiveSection === 'contacts' && (
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                  Contacts
                </h1>
              )}
              {(editingContact || showNewContactForm) && mobileActiveSection === 'editor' && (
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                  {editingContact ? 'Edit Contact' : 'New Contact'}
                </h1>
              )}
            </div>
            
            {/* Right Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {mobileActiveSection === 'folders' && (
                <Button
                  variant="primary"
                  size="slim"
                  onClick={() => {
                    if (selectedFolder || !selectedFolder) {
                      setMobileActiveSection('contacts');
                    }
                  }}
                  style={{ fontSize: '14px', fontWeight: '500' }}
                >
                  View Contacts
                </Button>
              )}
              {mobileActiveSection === 'contacts' && (
                <>
                  <Button
                    variant="secondary"
                    size="slim"
                    onClick={() => setMobileActiveSection('folders')}
                    style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      backgroundColor: '#000000', 
                      color: '#ffffff', 
                      borderColor: '#000000' 
                    }}
                  >
                    Back to Folders
                  </Button>
                  <Button
                    variant="primary"
                    size="slim"
                    onClick={handleNewContact}
                    disabled={!selectedFolder || folders.length === 0}
                    style={{ fontSize: '14px', fontWeight: '500' }}
                  >
                    Add Contact
                  </Button>
                </>
              )}
              {(editingContact || showNewContactForm) && mobileActiveSection === 'editor' && (
                <>
                  <Button
                    variant="secondary"
                    size="slim"
                    onClick={() => setMobileActiveSection('folders')}
                    style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      backgroundColor: '#000000', 
                      color: '#ffffff', 
                      borderColor: '#000000' 
                    }}
                  >
                    Back to Folders
                  </Button>
                  <Button
                    variant="secondary"
                    size="slim"
                    onClick={() => setMobileActiveSection('contacts')}
                    style={{ fontSize: '14px', fontWeight: '500', backgroundColor: '#000000', color: '#ffffff', borderColor: '#000000' }}
                  >
                    Back to Contacts
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Sections */}
          <div style={{ 
            display: mobileActiveSection === 'folders' ? 'block' : 'none',
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            WebkitOverflowScrolling: 'touch'
          }}>
            {/* Folders Section - Mobile */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              marginBottom: '16px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '16px' 
              }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Folders</h2>
              </div>

              {/* Search Bar - Desktop Only */}
              {!isMobile && (
                <div style={{ marginBottom: '16px' }}>
                  <TextField
                    placeholder="Search folders..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                    prefix={<i className="far fa-search" style={{ color: '#666' }}></i>}
                  />
                </div>
              )}

              {/* All Contacts and All Tags buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '16px' 
              }}>
                <button
                  onClick={() => {
                    setSelectedFolder(null);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    border: !selectedFolder ? '2px solid #008060' : '1px solid #e1e3e5',
                    borderRadius: '8px',
                    backgroundColor: !selectedFolder ? '#f6fff8' : 'white',
                    color: !selectedFolder ? '#008060' : '#374151',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i className="far fa-address-book" style={{ fontSize: '16px' }}></i>
                  All Contacts
                </button>
                <button
                  onClick={() => {
                    setShowTagsSection(!showTagsSection);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    border: showTagsSection ? '2px solid #008060' : '1px solid #e1e3e5',
                    borderRadius: '8px',
                    backgroundColor: showTagsSection ? '#f6fff8' : 'white',
                    color: showTagsSection ? '#008060' : '#374151',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i className="far fa-bookmark" style={{ fontSize: '16px' }}></i>
                  All Tags
                </button>
              </div>

              {/* Tags Section */}
              {(showTagsSection || selectedTags.length > 0) && (
                <div style={{ 
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e1e3e5',
                  borderRadius: '8px'
                }}>
                  <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                    All Tags:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(() => {
                      const allTags = contacts.reduce((acc, contact) => {
                        if (contact.tags) {
                          contact.tags.forEach(tag => {
                            acc[tag] = (acc[tag] || 0) + 1;
                          });
                        }
                        return acc;
                      }, {});
                      
                      const tagsToShow = Object.entries(allTags).map(([tag, count]) => ({ name: tag, count }));
                      
                      return tagsToShow.length > 0 ? (
                        tagsToShow.map((tagData, index) => (
                          <span
                            key={index}
                            onClick={() => {
                              // Add tag to filter section under search bar
                              toggleTagFilter(tagData.name);
                            }}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: selectedTagFilter.includes(tagData.name) ? '#e8f5e8' : '#f1f3f4',
                              color: selectedTagFilter.includes(tagData.name) ? '#008060' : '#374151',
                              border: selectedTagFilter.includes(tagData.name) ? '1px solid #b8e6b8' : '1px solid #e1e3e5',
                              borderRadius: '16px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {tagData.name} ({tagData.count})
                            {showTagsSection && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTagToDelete(tagData.name);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  padding: '0 2px',
                                  fontSize: '14px',
                                  marginLeft: '4px',
                                  fontWeight: 'bold',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Delete tag from all contacts"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          No tags found
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Instructional Text */}
              <div style={{ 
                marginBottom: '16px',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                Select a folder to view its contacts
              </div>

              {/* Folders List */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleFolderDragEnd}
              >
                <SortableContext
                  items={folders.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div>
                    {folders.length === 0 ? (
                      <div style={{ 
                        textAlign: "center", 
                        padding: "40px 20px",
                        color: "#6d7175",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "8px",
                        border: "1px solid #e1e3e5"
                      }}>
                        <img 
                          src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png" 
                          alt="No folders" 
                          style={{ 
                            width: "120px", 
                            height: "auto", 
                            marginBottom: "16px", 
                            display: "block",
                            margin: "0 auto 16px auto"
                          }} 
                        />
                        <p style={{ margin: 0, fontSize: "16px", fontWeight: "500", color: "#202223", marginBottom: "8px" }}>No folders yet</p>
                        <p style={{ margin: "8px 0 24px 0", fontSize: "14px", color: "#6d7175" }}>
                          Get started by creating your first folder to organize your contacts.
                        </p>
                        <Button
                          variant="primary"
                          onClick={() => setShowNewFolderModal(true)}
                          size="medium"
                        >
                          Create your first folder
                        </Button>
                      </div>
                    ) : (
                      folders.map((folder) => (
                        <DraggableFolder 
                          key={folder.id} 
                          folder={folder}
                          selectedFolder={selectedFolder?.id}
                          openFolderMenu={openFolderMenu}
                          setOpenFolderMenu={setOpenFolderMenu}
                          onFolderClick={handleFolderSelect}
                        >
                          {openFolderMenu === folder.id && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              right: '8px',
                              backgroundColor: 'white',
                              border: '1px solid #e1e3e5',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                              zIndex: 1000,
                              minWidth: '120px',
                              padding: '4px 0'
                            }}>
                              <button
                                onClick={() => {
                                  setShowRenameFolderModal(folder.id);
                                  setEditingFolderName(folder.name);
                                  setOpenFolderMenu(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: 'none',
                                  background: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                <i className="far fa-edit" style={{ fontSize: '12px' }}></i>
                                Rename
                              </button>
                              <button
                                onClick={() => {
                                  setShowIconPicker(folder.id);
                                  setOpenFolderMenu(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: 'none',
                                  background: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                <ExchangeIcon style={{ width: '15px', height: '15px' }} />
                                Change Icon
                              </button>
                              <button
                                onClick={() => {
                                  setShowDeleteConfirm(folder.id);
                                  setOpenFolderMenu(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: 'none',
                                  background: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: '#dc2626'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                <i className="far fa-trash-alt" style={{ fontSize: '12px' }}></i>
                                Delete
                              </button>
                            </div>
                          )}
                        </DraggableFolder>
                      ))
                    )}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Create New Folder Button */}
              <Button
                onClick={() => setShowNewFolderModal(true)}
                variant="primary"
                size="large"
                fullWidth
                style={{
                  marginTop: '16px',
                  backgroundColor: '#000000',
                  borderColor: '#000000'
                }}
              >
                Create New Folder
              </Button>
            </div>
          </div>

          <div style={{ 
            display: mobileActiveSection === 'contacts' ? 'block' : 'none',
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            WebkitOverflowScrolling: 'touch'
          }}>
            {/* Contacts Section - Mobile */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              {/* Delete and Move Buttons - Stacked */}
              {selectedContacts.length > 0 && (
                <>
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete ${selectedContacts.length} selected contact(s)?`)) {
                        setIsLoading(true);
                        try {
                          const form = new FormData();
                          form.append('_action', 'bulk-delete');
                          form.append('contactIds', JSON.stringify(selectedContacts));

                          const response = await fetch('/api/contacts', {
                            method: 'POST',
                            body: form
                          });

                          const result = await response.json();

                          if (result.success) {
                            setContacts(prev => prev.filter(c => !selectedContacts.includes(c.id)));
                            setSelectedContacts([]);
                            setAlertMessage(`Successfully deleted ${result.deletedCount} contact(s)`);
                            setAlertType("success");
                            setTimeout(() => setAlertMessage(''), 3000);
                          } else {
                            setAlertMessage(result.error || "Failed to delete contacts");
                            setAlertType("error");
                            setTimeout(() => setAlertMessage(''), 3000);
                          }
                        } catch (error) {
                          console.error('Error deleting contacts:', error);
                          setAlertMessage("Failed to delete contacts");
                          setAlertType("error");
                          setTimeout(() => setAlertMessage(''), 3000);
                        } finally {
                          setIsLoading(false);
                        }
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: '#d72c0d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      marginBottom: '12px'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#d72c0d'}
                  >
                    Delete {selectedContacts.length} Selected Contact{selectedContacts.length > 1 ? 's' : ''}
                  </button>
                  
                  <button
                    onClick={() => setShowBulkMoveModal(true)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: '#303030',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      marginBottom: '16px'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1f1f1f'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#303030'}
                  >
                    Move {selectedContacts.length} Selected Contact{selectedContacts.length > 1 ? 's' : ''}
                  </button>
                </>
              )}

              {/* Current Folder Pill and Change Folder Button */}
              {selectedFolder && (
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#e6f2ff',
                    border: '1px solid #0078d4',
                    borderRadius: '20px',
                    fontSize: '14px'
                  }}>
                    <span style={{ color: '#374151', fontWeight: '500' }}>
                      Current Folder:
                    </span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      backgroundColor: '#0078d4',
                      color: 'white',
                      borderRadius: '16px',
                      fontWeight: '600'
                    }}>
                      {selectedFolder.name}
                      <button
                        onClick={() => {
                          setSelectedFolder(null);
                          setSelectedContacts([]);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '16px'
                        }}
                        aria-label="Clear folder"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                  
                  <Button
                    onClick={() => setMobileActiveSection('folders')}
                    size="slim"
                  >
                    <span style={{ color: 'black' }}>Change Folder</span>
                  </Button>
                </div>
              )}

              {/* Search Bar */}
              <div style={{ marginBottom: '16px' }}>
                <TextField
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  prefix={<SearchIcon />}
                />
              </div>

                {/* Contacts List */}
                <div>
                {filteredContacts.length === 0 ? (
                  <EmptyState
                    heading="No contacts yet"
                    action={{
                      content: "Create your first contact",
                      onAction: handleNewContact,
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Start building your contact list by adding people and businesses.</p>
                  </EmptyState>
                ) : (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      style={{
                        position: 'relative',
                        border: selectedContacts.includes(contact.id) ? '2px solid #FF8C00' : '1px solid #e1e3e5',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        transition: 'all 0.2s ease',
                        backgroundColor: selectedContacts.includes(contact.id) ? '#fffbf8' : 'white',
                        overflow: 'hidden',
                        boxShadow: selectedContacts.includes(contact.id) ? '0 4px 12px rgba(255, 140, 0, 0.3)' : 'none'
                      }}
                    >
                      {/* Pin Icon - Top Right */}
                      {contact.pinnedAt && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          zIndex: 1,
                          color: '#008060'
                        }}>
                          <Icon source={PinFilledIcon} />
                        </div>
                      )}
                      
                      {/* Contact Info Section */}
                      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ borderRadius: '10px', overflow: 'hidden', width: '48px', height: '48px' }}>
                          <Avatar 
                            initials={(() => {
                              if (contact.type === 'PERSON') {
                                const first = (contact.firstName || '').trim();
                                const last = (contact.lastName || '').trim();
                                if (first && last) return (first[0] + last[0]).toUpperCase();
                                else if (first) return first.substring(0, 2).toUpperCase();
                                else if (last) return last.substring(0, 2).toUpperCase();
                                return 'UN';
                              } else {
                                const business = (contact.businessName || '').trim();
                                if (business.length >= 2) return business.substring(0, 2).toUpperCase();
                                else if (business.length === 1) return business[0].toUpperCase();
                                return 'BU';
                              }
                            })()}
                            size="large"
                          />
                        </div>
                        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleContactEdit(contact)}>
                          <h3 style={{ 
                            margin: 0, 
                            fontSize: '16px', 
                            fontWeight: '600',
                            color: '#374151',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            {contact.type === 'PERSON' 
                              ? `${contact.firstName} ${contact.lastName}`.trim()
                              : contact.businessName
                            }
                          </h3>
                          {contact.email && (
                            <p style={{ 
                              margin: '4px 0 0 0', 
                              fontSize: '14px', 
                              color: '#666' 
                            }}>
                              {contact.email}
                            </p>
                          )}
                          {contact.phone && (
                            <p style={{ 
                              margin: '2px 0 0 0', 
                              fontSize: '14px', 
                              color: '#666' 
                            }}>
                              {contact.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Buttons Row at Bottom */}
                      <div style={{ 
                        display: 'flex',
                        borderTop: '1px solid #e1e3e5'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContactSelect(contact.id);
                          }}
                          style={{
                            flex: 1,
                            padding: '12px',
                            border: 'none',
                            backgroundColor: selectedContacts.includes(contact.id) ? '#FF8C00' : '#f6f6f7',
                            color: selectedContacts.includes(contact.id) ? 'white' : '#374151',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            borderRight: '1px solid #e1e3e5',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (!selectedContacts.includes(contact.id)) {
                              e.target.style.backgroundColor = '#e8e8e9';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedContacts.includes(contact.id)) {
                              e.target.style.backgroundColor = '#f6f6f7';
                            }
                          }}
                        >
                          Select
                        </button>
                        <button
                          onClick={(e) => handleManageMenu(contact, e)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            border: 'none',
                            backgroundColor: '#f6f6f7',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            borderRight: '1px solid #e1e3e5',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#e8e8e9'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                        >
                          Manage
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContactDelete(contact.id);
                          }}
                          style={{
                            flex: 1,
                            padding: '12px',
                            border: 'none',
                            backgroundColor: '#f6f6f7',
                            color: '#d72c0d',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#fee';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#f6f6f7';
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
                </div>
            </div>
          </div>

          <div style={{ 
            display: (editingContact || showNewContactForm) && mobileActiveSection === 'editor' ? 'block' : 'none',
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            WebkitOverflowScrolling: 'touch',
            position: 'relative',
            backgroundColor: 'white'
          }}>
            {/* Contact Editor Section - Mobile */}
            <div style={{ padding: '20px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '20px' 
              }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                  {editingContact ? 'Edit Contact' : 'New Contact'}
                </h2>
                <button
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#f6f6f7',
                    border: '1px solid #e1e3e5',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                  onClick={() => setMobileActiveSection('contacts')}
                >
                  Cancel
                </button>
              </div>

              {/* Contact Form - Mobile */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Contact Type */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Contact Type
                  </label>
                  <Select
                    options={[
                      { label: 'Person', value: 'PERSON' },
                      { label: 'Business', value: 'BUSINESS' }
                    ]}
                    value={formData.type}
                    onChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  />
                </div>

                {/* Person Fields */}
                {formData.type === 'PERSON' && (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        First Name *
                      </label>
                      <TextField
                        value={formData.firstName}
                        onChange={(value) => setFormData(prev => ({ ...prev, firstName: value }))}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Last Name *
                      </label>
                      <TextField
                        value={formData.lastName}
                        onChange={(value) => setFormData(prev => ({ ...prev, lastName: value }))}
                        placeholder="Enter last name"
                      />
                    </div>
                  </>
                )}

                {/* Business Fields */}
                {formData.type === 'BUSINESS' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Business Name *
                    </label>
                    <TextField
                      value={formData.businessName}
                      onChange={(value) => setFormData(prev => ({ ...prev, businessName: value }))}
                      placeholder="Enter business name"
                    />
                  </div>
                )}

                {/* Common Fields */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Email
                  </label>
                  <TextField
                    type="email"
                    value={formData.email}
                    onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Phone
                  </label>
                  <TextField
                    type="tel"
                    value={formData.phone}
                    onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Address
                  </label>
                  <TextField
                    multiline={3}
                    value={formData.address}
                    onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
                    placeholder="Enter address"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Memo
                  </label>
                  <TextField
                    multiline={4}
                    value={formData.memo}
                    onChange={(value) => setFormData(prev => ({ ...prev, memo: value }))}
                    placeholder="Add a memo about this contact"
                  />
                </div>

                {/* Points of Contact - Business Only */}
                {formData.type === 'BUSINESS' && (
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <label style={{ fontWeight: '600', fontSize: '15px' }}>
                        Points of Contact
                      </label>
                      <Button
                        size="slim"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            pointsOfContact: [...prev.pointsOfContact, { name: '', phone: '', email: '' }]
                          }));
                        }}
                      >
                        Add Contact
                      </Button>
                    </div>
                    
                    {formData.pointsOfContact.map((point, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '16px',
                          backgroundColor: '#f6f6f7',
                          borderRadius: '8px',
                          marginBottom: '12px'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '12px'
                        }}>
                          <span style={{ fontWeight: '500', fontSize: '14px' }}>
                            Contact {index + 1}
                          </span>
                          <Button
                            size="slim"
                            tone="critical"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                pointsOfContact: prev.pointsOfContact.filter((_, i) => i !== index)
                              }));
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <TextField
                            label="Name"
                            value={point.name}
                            onChange={(value) => {
                              setFormData(prev => ({
                                ...prev,
                                pointsOfContact: prev.pointsOfContact.map((p, i) => 
                                  i === index ? { ...p, name: value } : p
                                )
                              }));
                            }}
                            placeholder="Contact name"
                          />
                          
                          <TextField
                            label="Phone"
                            type="tel"
                            value={point.phone}
                            onChange={(value) => {
                              setFormData(prev => ({
                                ...prev,
                                pointsOfContact: prev.pointsOfContact.map((p, i) => 
                                  i === index ? { ...p, phone: value } : p
                                )
                              }));
                            }}
                            placeholder="Contact phone"
                          />
                          
                          <TextField
                            label="Email"
                            type="email"
                            value={point.email}
                            onChange={(value) => {
                              setFormData(prev => ({
                                ...prev,
                                pointsOfContact: prev.pointsOfContact.map((p, i) => 
                                  i === index ? { ...p, email: value } : p
                                )
                              }));
                            }}
                            placeholder="Contact email"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tags Field */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Tags
                  </label>
                  <div onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagsInputValue.trim()) {
                      e.preventDefault();
                      // Add the current tag
                      const newTag = tagsInputValue.trim();
                      setFormData(prev => ({ 
                        ...prev, 
                        tags: [...(prev.tags || []), newTag]
                      }));
                      setTagsInputValue('');
                    }
                  }}>
                    <TextField
                      placeholder="e.g., client, vip, important (press Enter or comma)"
                      value={tagsInputValue}
                      onChange={(value) => {
                        // Check if user typed a comma
                        if (value.includes(',')) {
                          // Process all complete tags (before commas)
                          const parts = value.split(',');
                          const completeTags = parts.slice(0, -1).map(tag => tag.trim()).filter(tag => tag.length > 0);
                          
                          if (completeTags.length > 0) {
                            setFormData(prev => ({ 
                              ...prev, 
                              tags: [...(prev.tags || []), ...completeTags]
                            }));
                          }
                          
                          // Keep the text after the last comma
                          setTagsInputValue(parts[parts.length - 1]);
                        } else {
                          setTagsInputValue(value);
                        }
                      }}
                    />
                  </div>
                  {formData.tags.length > 0 && (
                    <div style={{ 
                      marginTop: '8px', 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '6px' 
                    }}>
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#e8f5e8',
                            color: '#008060',
                            border: '1px solid #b8e6b8',
                            borderRadius: '16px',
                            fontSize: '13px',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {tag}
                          <button
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                tags: prev.tags.filter((_, i) => i !== index)
                              }));
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#008060',
                              cursor: 'pointer',
                              padding: '0',
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Folder Selection */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Folder
                  </label>
                  <Select
                    options={folders.map(folder => ({ label: folder.name, value: folder.id }))}
                    value={formData.folderId}
                    onChange={(value) => setFormData(prev => ({ ...prev, folderId: value }))}
                  />
                </div>

                {/* Save Button */}
                <div style={{ marginTop: '20px' }}>
                  <Button
                    variant="primary"
                    size="large"
                    onClick={handleSubmit}
                    loading={isLoading}
                    style={{ width: '100%', fontSize: '16px', fontWeight: '600' }}
                  >
                    {editingContact ? 'Update Contact' : 'Create Contact'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Modals */}
          {isMobile && (
            <>
              {/* New Folder Modal */}
              {showNewFolderModal && (
                <NewFolderModal
                  isOpen={showNewFolderModal}
                  onClose={() => setShowNewFolderModal(false)}
                  onCreateFolder={handleCreateFolder}
                />
              )}

              {/* Rename Folder Modal */}
              {showRenameFolderModal && (
                <Modal
                  open={!!showRenameFolderModal}
                  onClose={() => setShowRenameFolderModal(null)}
                  title="Rename Folder"
                  primaryAction={{
                    content: 'Save',
                    onAction: async () => {
                      if (editingFolderName.trim() && editingFolderName !== folders.find(f => f.id === showRenameFolderModal)?.name) {
                        await handleFolderRename(showRenameFolderModal, editingFolderName.trim());
                      }
                      setShowRenameFolderModal(null);
                      setEditingFolderName('');
                    }
                  }}
                  secondaryActions={[{
                    content: 'Cancel',
                    onAction: () => {
                      setShowRenameFolderModal(null);
                      setEditingFolderName('');
                    }
                  }]}
                >
                  <Modal.Section>
                    <TextField
                      label="Folder Name"
                      value={editingFolderName}
                      onChange={setEditingFolderName}
                      autoComplete="off"
                    />
                  </Modal.Section>
                </Modal>
              )}

              {/* Icon Picker Modal */}
              {showIconPicker && (
                <FolderIconPicker
                  isOpen={!!showIconPicker}
                  onClose={() => setShowIconPicker(null)}
                  onSelectIcon={async ({ icon, color }) => {
                    await handleFolderIconChange(showIconPicker, icon, color);
                    setShowIconPicker(null);
                  }}
                  currentIcon={folders.find(f => f.id === showIconPicker)?.icon || 'folder'}
                  currentColor={folders.find(f => f.id === showIconPicker)?.iconColor || '#f57c00'}
                  folderName={folders.find(f => f.id === showIconPicker)?.name || 'Folder'}
                />
              )}

              {/* Delete Confirmation Modal */}
              {showDeleteConfirm && (
                <Modal
                  open={!!showDeleteConfirm}
                  onClose={() => setShowDeleteConfirm(null)}
                  title="Delete Folder"
                  primaryAction={{
                    content: 'Delete',
                    destructive: true,
                    onAction: async () => {
                      await handleFolderDelete(showDeleteConfirm);
                      setShowDeleteConfirm(null);
                    }
                  }}
                  secondaryActions={[{
                    content: 'Cancel',
                    onAction: () => setShowDeleteConfirm(null)
                  }]}
                >
                  <Modal.Section>
                    <Text as="p">
                      Are you sure you want to delete this folder? All contacts in this folder will be moved to "All Contacts".
                    </Text>
                  </Modal.Section>
                </Modal>
              )}


              {/* Manage Menu Dropdown - Mobile */}
              {manageMenuContact && (
                <div
                  className="manage-menu"
                  style={{
                    position: 'fixed',
                    left: manageMenuPosition.x,
                    top: manageMenuPosition.y,
                    backgroundColor: 'white',
                    border: '1px solid #e1e3e5',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 99998,
                    width: '250px',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      padding: '8px 0'
                    }}
                  >
                    <button
                      onClick={() => {
                        if (manageMenuContact) {
                          handleContactPin(manageMenuContact.id);
                        }
                        closeManageMenu();
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        border: 'none',
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <i className="fas fa-thumbtack" style={{ fontSize: '14px' }}></i>
                      {manageMenuContact.pinnedAt ? 'Unpin' : 'Pin'}
                    </button>
                    
                    <button
                      onClick={() => {
                        if (manageMenuContact) {
                          closeManageMenu();
                          // Add a small delay to ensure manage menu is fully closed
                          setTimeout(() => {
                            setSelectedContacts([manageMenuContact.id]);
                            setShowBulkMoveModal(true);
                          }, 100);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        border: 'none',
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <i className="fas fa-folder" style={{ fontSize: '14px' }}></i>
                      Move to different folder
                    </button>
                    
                    <button
                      onClick={() => {
                        if (manageMenuContact) {
                          handleContactDuplicate(manageMenuContact.id, selectedFolder?.id || null);
                        }
                        closeManageMenu();
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        border: 'none',
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <i className="fas fa-copy" style={{ fontSize: '14px' }}></i>
                      Duplicate to current folder
                    </button>
                    
                    <button
                      onClick={() => {
                        if (manageMenuContact) {
                          closeManageMenu();
                          // Add a small delay to ensure manage menu is fully closed
                          setTimeout(() => {
                            setSelectedContacts([manageMenuContact.id]);
                            setShowBulkMoveModal(true);
                            // We'll handle the duplicate logic in the bulk move modal
                          }, 100);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        border: 'none',
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <i className="fas fa-copy" style={{ fontSize: '14px' }}></i>
                      Duplicate to different folder
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Mobile Footer */}
          <div style={{
            position: "relative",
            bottom: "0",
            left: "0",
            right: "0",
            backgroundColor: "#f8f9fa",
            borderTop: "1px solid #e1e3e5",
            padding: "16px 24px",
            marginTop: "40px",
            fontSize: "14px",
            color: "#6d7175",
            zIndex: 100,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              © 2025, Scriberr Powered by{" "}
              <a 
                href="https://www.alienpowered.net" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: "#008060",
                  textDecoration: "none",
                  fontWeight: "600",
                  transition: "color 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = "#008000";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "#008060";
                }}
              >
                Aliens
              </a>
            </div>
            <div style={{ 
              fontStyle: "italic", 
              fontSize: "12px", 
              color: "#9ca3af",
              marginLeft: "24px"
            }}>
              {version}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Modals - Rendered outside mobile layout to avoid z-index conflicts */}
      <div style={{ 
        position: 'relative', 
        zIndex: 100000000,
        pointerEvents: isMobile && (showBulkMoveModal || showContactDeleteModal) ? 'auto' : 'none'
      }}>
        {isMobile && showBulkMoveModal && (
          <Modal
            open={showBulkMoveModal}
            onClose={() => {
              setShowBulkMoveModal(false);
              setSelectedContacts([]);
              setSelectedFolderForMove(null);
            }}
            title="Move Contacts"
            primaryAction={{
              content: 'Move',
              disabled: !selectedFolderForMove,
              onAction: async () => {
                await handleBulkMoveContacts();
              }
            }}
            secondaryActions={[{
              content: 'Cancel',
              onAction: () => {
                setShowBulkMoveModal(false);
                setSelectedContacts([]);
                setSelectedFolderForMove(null);
              }
            }]}
          >
            <Modal.Section>
              <Text as="p" style={{ marginBottom: '16px' }}>
                Select a folder to move {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} to.
              </Text>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {folders.map((folder) => {
                  const isCurrentFolder = selectedContacts.length === 1 && contacts.find(c => c.id === selectedContacts[0])?.folderId === folder.id;
                  const isSelected = selectedFolderForMove === folder.id;
                  
                  return (
                    <div
                      key={folder.id}
                      onClick={() => {
                        if (!isCurrentFolder) {
                          setSelectedFolderForMove(folder.id);
                        }
                      }}
                      style={{
                        padding: '12px',
                        border: isSelected ? '2px solid #008060' : '1px solid #e1e3e5',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        cursor: isCurrentFolder ? 'not-allowed' : 'pointer',
                        backgroundColor: isSelected ? '#e8f5e8' : (isCurrentFolder ? '#f1f3f4' : '#fafbfb'),
                        opacity: isCurrentFolder ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <i 
                        className={`far fa-${folder.icon || 'folder'}`} 
                        style={{ 
                          fontSize: '18px', 
                          color: folder.iconColor || '#f57c00' 
                        }}
                      ></i>
                      <span style={{ fontWeight: '500', flex: 1 }}>{folder.name}</span>
                      {isCurrentFolder && (
                        <span style={{ 
                          fontSize: '12px', 
                          color: '#6d7175',
                          fontWeight: '600',
                          backgroundColor: '#e1e3e5',
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>
                          Current
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Modal.Section>
          </Modal>
        )}

        {/* Mobile Contact Delete Modal - Rendered outside mobile layout */}
        {isMobile && showContactDeleteModal && (
          <Modal
            open={!!showContactDeleteModal}
            onClose={() => setShowContactDeleteModal(null)}
            title="Delete Contact"
            primaryAction={{
              content: 'Delete',
              destructive: true,
              onAction: async () => {
                await confirmContactDelete(showContactDeleteModal);
                setShowContactDeleteModal(null);
              }
            }}
            secondaryActions={[{
              content: 'Cancel',
              onAction: () => setShowContactDeleteModal(null)
            }]}
          >
            <Modal.Section>
              <Text as="p">
                Are you sure you want to delete this contact? This action is permanent and cannot be undone.
              </Text>
            </Modal.Section>
          </Modal>
        )}

        {/* Tag Deletion Confirmation Modal */}
        {tagToDelete && (
          <Modal
            open={!!tagToDelete}
            onClose={() => setTagToDelete(null)}
            title="Delete Tag"
            primaryAction={{
              content: 'Delete',
              onAction: () => handleDeleteTag(tagToDelete),
              destructive: true
            }}
            secondaryActions={[{
              content: 'Cancel',
              onAction: () => setTagToDelete(null)
            }]}
          >
            <Modal.Section>
              <Text as="p">
                Are you sure you want to delete the tag "{tagToDelete}" from all contacts? This action is permanent and cannot be undone.
              </Text>
            </Modal.Section>
          </Modal>
        )}
      </div>

      {/* Desktop Footer */}
      {!isMobile && (
        <div style={{
          position: "relative",
          bottom: "0",
          left: "0",
          right: "0",
          backgroundColor: "#f8f9fa",
          borderTop: "1px solid #e1e3e5",
          padding: "16px 24px",
          marginTop: "40px",
          fontSize: "14px",
          color: "#6d7175",
          zIndex: 100,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            © 2025, Scriberr Powered by{" "}
            <a 
              href="https://www.alienpowered.net" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: "#008060",
                textDecoration: "none",
                fontWeight: "600",
                transition: "color 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.color = "#008000";
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "#008060";
              }}
            >
              Aliens
            </a>
          </div>
          <div style={{ 
            fontStyle: "italic", 
            fontSize: "12px", 
            color: "#9ca3af",
            marginLeft: "24px"
          }}>
            {version}
          </div>
        </div>
      )}
    </>
  );
}
