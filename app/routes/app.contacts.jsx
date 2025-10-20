import { json } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

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

    return json({ folders, contacts });
  } catch (error) {
    console.error('Error loading contacts data:', error);
    return json({ folders: [], contacts: [] });
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
  ChevronRightIcon
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

            {/* Tags Field */}
            <div>
              <Text as="label" variant="bodyMd" fontWeight="medium">
                Tags
              </Text>
              <div style={{ marginTop: "8px" }}>
                <TextField
                  label="Add tags (comma separated)"
                  labelHidden
                  placeholder="e.g., client, vip, important"
                  value={formData.tags.join(', ')}
                  onChange={(value) => {
                    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                    setFormData(prev => ({ ...prev, tags }));
                  }}
                />
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
  const { folders: initialFolders, contacts: initialContacts } = useLoaderData();
  
  // State management
  const [folders, setFolders] = useState(initialFolders);
  const [contacts, setContacts] = useState(initialContacts);
  const [selectedFolder, setSelectedFolder] = useState(null);
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
      folderId: selectedFolder?.id || null,
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
  const [showTagsSection, setShowTagsSection] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  
  // Manage menu state
  const [manageMenuContact, setManageMenuContact] = useState(null);
  const [manageMenuPosition, setManageMenuPosition] = useState({ x: 0, y: 0 });
  
  // Bulk actions state
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [showContactDeleteModal, setShowContactDeleteModal] = useState(null);

  // Debug mode state
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

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

  // Debug information collector
  useEffect(() => {
    if (debugMode && (showBulkMoveModal || showContactDeleteModal)) {
      setTimeout(() => {
        const info = {};
        
        // Check mobile layout
        const mobileLayout = document.querySelector('.mobile-layout');
        if (mobileLayout) {
          const styles = window.getComputedStyle(mobileLayout);
          info.mobileLayout = {
            zIndex: styles.zIndex,
            position: styles.position,
            pointerEvents: styles.pointerEvents,
            isolation: styles.isolation,
            transform: styles.transform
          };
        }
        
        // Check manage menu
        const manageMenu = document.querySelector('.manage-menu');
        if (manageMenu) {
          const styles = window.getComputedStyle(manageMenu);
          info.manageMenu = {
            zIndex: styles.zIndex,
            position: styles.position,
            display: styles.display
          };
        }
        
        // Check Polaris Portal
        const portal = document.querySelector('.Polaris-Portal');
        if (portal) {
          const styles = window.getComputedStyle(portal);
          info.polarisPortal = {
            zIndex: styles.zIndex,
            position: styles.position,
            pointerEvents: styles.pointerEvents
          };
        }
        
        // Check Polaris Backdrop
        const backdrop = document.querySelector('.Polaris-Backdrop');
        if (backdrop) {
          const styles = window.getComputedStyle(backdrop);
          info.polarisBackdrop = {
            zIndex: styles.zIndex,
            position: styles.position,
            pointerEvents: styles.pointerEvents,
            display: styles.display
          };
        }
        
        // Check Polaris Modal Dialog
        const modalDialog = document.querySelector('.Polaris-Modal-Dialog');
        if (modalDialog) {
          const styles = window.getComputedStyle(modalDialog);
          info.polarisModalDialog = {
            zIndex: styles.zIndex,
            position: styles.position,
            pointerEvents: styles.pointerEvents,
            display: styles.display
          };
        }
        
        // Check Polaris Modal Dialog Inner Modal
        const modalInner = document.querySelector('.Polaris-Modal-Dialog__Modal');
        if (modalInner) {
          const styles = window.getComputedStyle(modalInner);
          info.polarisModalInner = {
            zIndex: styles.zIndex,
            position: styles.position,
            pointerEvents: styles.pointerEvents
          };
        }
        
        // Check if backdrop is in front of modal (check actual rendered position)
        if (backdrop && modalDialog) {
          const backdropRect = backdrop.getBoundingClientRect();
          const modalRect = modalDialog.getBoundingClientRect();
          info.elementPositions = {
            backdropTop: backdropRect.top,
            modalTop: modalRect.top,
            backdropCoveringModal: (backdropRect.top <= modalRect.top && backdropRect.bottom >= modalRect.bottom)
          };
        }
        
        // Check what element is actually at the center of the screen (where modal should be)
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const elementAtCenter = document.elementFromPoint(centerX, centerY);
        if (elementAtCenter) {
          const styles = window.getComputedStyle(elementAtCenter);
          info.elementAtCenter = {
            tagName: elementAtCenter.tagName,
            className: elementAtCenter.className,
            id: elementAtCenter.id,
            pointerEvents: styles.pointerEvents,
            zIndex: styles.zIndex,
            position: styles.position,
            inlineStyle: elementAtCenter.getAttribute('style'),
            parentClassName: elementAtCenter.parentElement?.className || 'no parent'
          };
        }
        
        // Check modal wrapper (the one we added)
        const modalWrapper = document.querySelector('[style*="zIndex: 100000000"]');
        if (modalWrapper) {
          const styles = window.getComputedStyle(modalWrapper);
          const rect = modalWrapper.getBoundingClientRect();
          info.modalWrapper = {
            zIndex: styles.zIndex,
            position: styles.position,
            pointerEvents: styles.pointerEvents,
            width: rect.width,
            height: rect.height,
            isFullScreen: (rect.width >= window.innerWidth - 10 && rect.height >= window.innerHeight - 10)
          };
        }
        
        info.timestamp = new Date().toISOString();
        info.showBulkMoveModal = showBulkMoveModal;
        info.showContactDeleteModal = !!showContactDeleteModal;
        
        setDebugInfo(info);
        console.log('🔍 Z-Index Debug Info:', info);
      }, 300);
    }
  }, [debugMode, showBulkMoveModal, showContactDeleteModal]);

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
    
    return matchesFolder && matchesSearch && matchesTags;
  }).sort((a, b) => {
    // Sort pinned first, then by creation date
    if (a.pinnedAt && !b.pinnedAt) return -1;
    if (!a.pinnedAt && b.pinnedAt) return 1;
    if (a.pinnedAt && b.pinnedAt) {
      return new Date(b.pinnedAt) - new Date(a.pinnedAt);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

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
    setFormData({
      type: contact.type,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      businessName: contact.businessName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || '',
      notes: contact.notes || '',
      folderId: contact.folderId || null,
      pointsOfContact: contact.pointsOfContact || []
    });
    
    if (isMobile) {
      setMobileActiveSection('editor');
    }
  };

  // Handle new contact on mobile
  const handleNewContact = () => {
    if (!selectedFolder) {
      setAlertMessage("Please select a folder to create a contact");
      setAlertType("error");
      setTimeout(() => setAlertMessage(''), 3000);
      return;
    }
    
    setShowNewContactForm(true);
    setEditingContact(null);
    setFormData(getInitialFormData());
    
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

  // Handle manage menu
  const handleManageMenu = (contact, event) => {
    event.stopPropagation();
    const rect = event.target.getBoundingClientRect();
    setManageMenuContact(contact);
    setManageMenuPosition({ x: rect.left, y: rect.bottom + 4 });
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

  // Handle bulk move contacts
  const handleBulkMoveContacts = async (targetFolderId) => {
    if (selectedContacts.length === 0) return;

    setIsLoading(true);
    try {
      const form = new FormData();
      form.append('_action', 'bulk-move');
      form.append('contactIds', JSON.stringify(selectedContacts));
      form.append('folderId', targetFolderId);

      const response = await fetch('/api/contacts', {
        method: 'POST',
        body: form
      });

      const result = await response.json();

      if (result.success) {
        // Update contacts state
        setContacts(prev => prev.map(contact => 
          selectedContacts.includes(contact.id) 
            ? { ...contact, folderId: targetFolderId }
            : contact
        ));
        
        setSelectedContacts([]);
        setShowBulkMoveModal(false);
        setAlertMessage(`Successfully moved ${selectedContacts.length} contact(s)`);
        setAlertType("success");
        setTimeout(() => setAlertMessage(''), 3000);
      } else {
        setAlertMessage(result.error || "Failed to move contacts");
        setAlertType("error");
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error moving contacts:', error);
      setAlertMessage("Failed to move contacts");
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
    if (!selectedFolder) {
      setAlertMessage('Please select a folder to create a contact');
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
        <Page title="Contacts">
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

          <div style={{ paddingBottom: "80px" }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="app-layout" style={{ 
            display: "flex", 
            gap: "16px", 
            minHeight: "calc(100vh - 80px)",
            paddingBottom: "80px"
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
                  minWidth: "400px"
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
                              {selectedTags.length > 0 ? "Selected Tags:" : "All Tags:"}
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
                                
                                const tagsToShow = selectedTags.length > 0 
                                  ? selectedTags.map(tag => ({ name: tag, count: allTags[tag] || 0 }))
                                  : Object.entries(allTags).map(([tag, count]) => ({ name: tag, count }));
                                
                                return tagsToShow.map((tagData, index) => (
                                  <span
                                    key={index}
                                    onClick={() => {
                                      if (selectedTags.includes(tagData.name)) {
                                        setSelectedTags(prev => prev.filter(t => t !== tagData.name));
                                      } else {
                                        setSelectedTags(prev => [...prev, tagData.name]);
                                      }
                                    }}
                                    style={{
                                      padding: "6px 10px",
                                      backgroundColor: selectedTags.includes(tagData.name) ? "#e8f5e8" : "#f1f3f4",
                                      color: selectedTags.includes(tagData.name) ? "#008060" : "#374151",
                                      border: selectedTags.includes(tagData.name) ? "1px solid #b8e6b8" : "1px solid #e1e3e5",
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
                                    {selectedTags.includes(tagData.name) && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedTags(prev => prev.filter(t => t !== tagData.name));
                                        }}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "#008060",
                                          cursor: "pointer",
                                          padding: "0",
                                          fontSize: "12px",
                                          marginLeft: "2px"
                                        }}
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
                              <i className="far fa-folder" style={{ fontSize: "24px", marginBottom: "8px", display: "block" }}></i>
                              <p style={{ margin: 0, fontSize: "14px" }}>No folders created yet</p>
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
                            disabled={!selectedFolder}
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

                      {/* Table Header */}
                      {filteredContacts.length > 0 && (
                        <div style={{ 
                          padding: "12px 16px", 
                          borderBottom: "1px solid #e1e3e5",
                          backgroundColor: "#f6f6f7",
                          display: "grid",
                          gridTemplateColumns: "60px 1fr 1fr 1fr 120px 100px 120px",
                          gap: "16px",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6d7175",
                          textTransform: "uppercase"
                        }}>
                          <div>Profile</div>
                          <div>First name</div>
                          <div>Last name</div>
                          <div>Contact Info</div>
                          <div>Creation Date</div>
                          <div>Tag</div>
                          <div>Actions</div>
                        </div>
                      )}

                      {/* Scrollable Content */}
                      <div style={{ 
                        flex: "1", 
                        overflowY: filteredContacts.length > 1 ? "auto" : "visible",
                        overflowX: "hidden"
                      }}>
                        {filteredContacts.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            {filteredContacts.map((contact) => (
                              <div
                                key={contact.id}
                                onClick={() => {
                                  setSelectedContact(contact);
                                  setShowContactDetails(true);
                                }}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "60px 1fr 1fr 1fr 120px 100px 120px",
                                  gap: "16px",
                                  padding: "12px 16px",
                                  borderBottom: "1px solid #f1f3f4",
                                  cursor: "pointer",
                                  backgroundColor: selectedContacts.includes(contact.id) ? "#fffbf8" : "transparent",
                                  borderLeft: selectedContacts.includes(contact.id) ? "3px solid #FF8C00" : "3px solid transparent",
                                  transition: "all 0.2s ease",
                                  alignItems: "center"
                                }}
                                onMouseEnter={(e) => {
                                  if (!selectedContacts.includes(contact.id)) {
                                    e.target.style.backgroundColor = "#f6f6f7";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!selectedContacts.includes(contact.id)) {
                                    e.target.style.backgroundColor = "transparent";
                                  }
                                }}
                              >
                                {/* Profile Avatar */}
                                <div style={{ display: "flex", alignItems: "center" }}>
                                  <div
                                    style={{
                                      width: "40px",
                                      height: "40px",
                                      borderRadius: "50%",
                                      backgroundColor: contact.avatarColor || (contact.type === 'PERSON' ? '#10b981' : '#f97316'),
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "white"
                                    }}
                                  >
                                    <Icon 
                                      source={contact.type === 'PERSON' ? PersonIcon : OrganizationIcon} 
                                      tone="base"
                                      style={{ color: 'white' }}
                                    />
                                  </div>
                                </div>
                                
                                {/* First Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {contact.pinnedAt && (
                                    <i className="fas fa-thumbtack" style={{ color: '#FF8C00', fontSize: '12px' }}></i>
                                  )}
                                  <Text as="span" variant="bodyMd">
                                    {contact.firstName || '-'}
                                  </Text>
                                </div>
                                
                                {/* Last Name */}
                                <div>
                                  <Text as="span" variant="bodyMd">
                                    {contact.lastName || contact.businessName || '-'}
                                  </Text>
                                </div>
                                
                                {/* Contact Info */}
                                <div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                    {contact.email && (
                                      <Text as="span" variant="bodySm" tone="subdued">
                                        {contact.email}
                                      </Text>
                                    )}
                                    {contact.phone && (
                                      <Text as="span" variant="bodySm" tone="subdued">
                                        {contact.phone}
                                      </Text>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Creation Date */}
                                <div>
                                  <Text as="span" variant="bodySm" tone="subdued">
                                    {new Date(contact.createdAt).toLocaleDateString()}
                                  </Text>
                                </div>
                                
                                {/* Tags */}
                                <div>
                                  <Badge tone={contact.type === 'PERSON' ? 'info' : 'success'}>
                                    {contact.type === 'PERSON' ? 'Person' : 'Business'}
                                  </Badge>
                                </div>
                                
                                {/* Action Buttons */}
                                <div style={{ display: "flex", gap: "4px" }}>
                                  <Button
                                    size="micro"
                                    variant={selectedContacts.includes(contact.id) ? "primary" : "secondary"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleContactSelect(contact.id);
                                    }}
                                  >
                                    Select
                                  </Button>
                                  <Button
                                    size="micro"
                                    variant="secondary"
                                    onClick={(e) => handleManageMenu(contact, e)}
                                  >
                                    Manage
                                  </Button>
                                  <Button
                                    size="micro"
                                    variant="secondary"
                                    tone="critical"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleContactDelete(contact.id);
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ 
                            display: "flex", 
                            flexDirection: "column", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            height: "200px",
                            textAlign: "center",
                            padding: "40px"
                          }}>
                            <div style={{ 
                              width: "80px", 
                              height: "80px", 
                              borderRadius: "50%", 
                              backgroundColor: "#f6f6f7", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              marginBottom: "16px" 
                            }}>
                              <i className="far fa-address-book" style={{ fontSize: "32px", color: "#8c9196" }}></i>
                            </div>
                            <Text as="h3" variant="headingMd" style={{ marginBottom: "8px" }}>
                              No contacts found
                            </Text>
                            <Text as="p" variant="bodyMd" tone="subdued" style={{ marginBottom: "16px" }}>
                              Start building your contact list by adding people and businesses.
                            </Text>
                            <Button variant="primary" onClick={() => setShowNewContactForm(true)}>
                              Create your first contact
                            </Button>
                          </div>
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
                options={[
                  { label: 'No folder', value: null },
                  ...folders.map(folder => ({ label: folder.name, value: folder.id }))
                ]}
                value={formData.folderId}
                onChange={(value) => setFormData({ ...formData, folderId: value })}
              />
            </div>
          </Modal.Section>
        </Modal>
        )}

        {/* Contact Details Modal - Desktop Only */}
        {!isMobile && (
          <Modal
            open={showContactDetails && selectedContact !== null}
            onClose={() => {
              setShowContactDetails(false);
              setSelectedContact(null);
            }}
            title="Contact Details"
            primaryAction={{
              content: 'Edit',
              onAction: () => {
                setShowContactDetails(false);
                setEditingContact(selectedContact);
              }
            }}
          secondaryActions={[{
            content: 'Close',
            onAction: () => {
              setShowContactDetails(false);
              setSelectedContact(null);
            }
          }]}
        >
          <Modal.Section>
            {selectedContact && (
              <ContactCard 
                contact={selectedContact} 
                variant="modal" 
                onClose={() => {
                  setShowContactDetails(false);
                  setSelectedContact(null);
                }}
              />
            )}
          </Modal.Section>
        </Modal>
        )}
      </div>
    </Page>
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
              {/* Debug Toggle Button */}
              <button
                onClick={() => setDebugMode(!debugMode)}
                style={{
                  padding: '6px 12px',
                  border: debugMode ? '2px solid #00a0ff' : '1px solid #e1e3e5',
                  borderRadius: '6px',
                  background: debugMode ? '#e6f7ff' : 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: debugMode ? '#00a0ff' : '#666'
                }}
              >
                🐛 {debugMode ? 'ON' : 'OFF'}
              </button>
              
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
                    // TODO: Implement tags functionality
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    border: '1px solid #e1e3e5',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#374151',
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
                        textAlign: 'center', 
                        padding: '40px 20px', 
                        color: '#666' 
                      }}>
                        <i className="far fa-folder" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}></i>
                        <p style={{ margin: 0, fontSize: '16px' }}>No folders yet</p>
                        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#999' }}>
                          Create your first folder to organize contacts
                        </p>
                      </div>
                    ) : (
                      folders.map((folder) => (
                        <div
                          key={folder.id}
                          style={{
                            position: 'relative',
                            marginBottom: '8px',
                            padding: '12px 16px',
                            border: selectedFolder?.id === folder.id ? '2px solid #008060' : '1px solid #e1e3e5',
                            borderRadius: '8px',
                            backgroundColor: selectedFolder?.id === folder.id ? '#f6fff8' : '#F8F9FA',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                          onClick={() => handleFolderSelect(folder)}
                        >
                          {/* Drag Handle */}
                          <div
                            style={{
                              cursor: 'grab',
                              color: '#666',
                              fontSize: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px'
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <DragHandleIcon style={{ width: '16px', height: '16px' }} />
                          </div>

                          {/* Folder Icon */}
                          <i className={`far fa-${folder.icon || 'folder'}`} style={{ 
                            fontSize: '18px', 
                            color: folder.iconColor || '#f57c00' 
                          }}></i>

                          {/* Folder Name */}
                          <div style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                            {folder.name}
                          </div>

                          {/* Active Badge */}
                          {selectedFolder?.id === folder.id && (
                            <div style={{
                              padding: '2px 8px',
                              backgroundColor: '#f6fff8',
                              color: '#008060',
                              fontSize: '12px',
                              fontWeight: '500',
                              borderRadius: '12px',
                              border: '1px solid #008060'
                            }}>
                              Active
                            </div>
                          )}

                          {/* Menu Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenFolderMenu(openFolderMenu === folder.id ? null : folder.id);
                            }}
                            style={{
                              padding: '4px',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              color: '#6b7280',
                              fontSize: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <MenuHorizontalIcon style={{ width: '16px', height: '16px' }} />
                          </button>

                          {/* Folder Menu */}
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
                        </div>
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
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              marginBottom: '16px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '16px' 
              }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                  {selectedFolder ? selectedFolder.name : 'All Contacts'}
                </h2>
                <Button
                  variant="primary"
                  size="slim"
                  onClick={handleNewContact}
                  style={{ fontSize: '14px', fontWeight: '500' }}
                >
                  Add Contact
                </Button>
              </div>

              {/* Search Bar */}
              <div style={{ marginBottom: '16px' }}>
                <TextField
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  prefix={<SearchIcon />}
                />
              </div>

              {/* Bulk Action Buttons - Mobile */}
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
                    size="slim"
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
                    Delete ({selectedContacts.length})
                  </Button>
                  <Button
                    variant="secondary"
                    size="slim"
                    onClick={() => {
                      setShowBulkMoveModal(true);
                    }}
                  >
                    Move ({selectedContacts.length})
                  </Button>
                </div>
              )}

              {/* Contacts List */}
              <div>
                {filteredContacts.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px', 
                    color: '#666' 
                  }}>
                    <i className="far fa-address-book" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}></i>
                    <p style={{ margin: 0, fontSize: '16px' }}>No contacts yet</p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#999' }}>
                      Add your first contact to get started
                    </p>
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      style={{
                        padding: '16px',
                        border: selectedContacts.includes(contact.id) ? '2px solid #FF8C00' : '1px solid #e1e3e5',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        transition: 'all 0.2s ease',
                        backgroundColor: selectedContacts.includes(contact.id) ? '#fffbf8' : 'white'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: contact.avatarColor || (contact.type === 'PERSON' ? '#008060' : '#f57c00'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '18px',
                          fontWeight: '600'
                        }}>
                          <Icon 
                            source={contact.type === 'PERSON' ? PersonIcon : OrganizationIcon} 
                            tone="base"
                            style={{ color: 'white' }}
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
                            {contact.pinnedAt && (
                              <i className="fas fa-thumbtack" style={{ color: '#FF8C00', fontSize: '12px' }}></i>
                            )}
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
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <Button
                            size="micro"
                            variant={selectedContacts.includes(contact.id) ? "primary" : "secondary"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContactSelect(contact.id);
                            }}
                          >
                            Select
                          </Button>
                          <Button
                            size="micro"
                            variant="secondary"
                            onClick={(e) => handleManageMenu(contact, e)}
                          >
                            Manage
                          </Button>
                          <Button
                            size="micro"
                            variant="secondary"
                            tone="critical"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContactDelete(contact.id);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
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
                    Notes
                  </label>
                  <TextField
                    multiline={4}
                    value={formData.notes}
                    onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
                    placeholder="Add notes about this contact"
                  />
                </div>

                {/* Folder Selection */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Folder
                  </label>
                  <Select
                    options={[
                      { label: 'No folder', value: null },
                      ...folders.map(folder => ({ label: folder.name, value: folder.id }))
                    ]}
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

          {/* Debug Panel */}
          {debugMode && isMobile && (
            <div style={{
              position: 'fixed',
              bottom: 60,
              left: 10,
              right: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              color: '#00ff00',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 999999999,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
              <div style={{ 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#00a0ff',
                borderBottom: '1px solid #00a0ff',
                paddingBottom: '4px'
              }}>
                🐛 Z-Index Debug Info
              </div>
              
              {Object.keys(debugInfo).length === 0 ? (
                <div style={{ color: '#ffaa00' }}>
                  Open a modal to collect debug info...
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#00a0ff' }}>Modal States:</strong><br/>
                    Move Modal: {debugInfo.showBulkMoveModal ? '✅ OPEN' : '❌ CLOSED'}<br/>
                    Delete Modal: {debugInfo.showContactDeleteModal ? '✅ OPEN' : '❌ CLOSED'}<br/>
                    Manage Menu: {manageMenuContact ? '⚠️ STILL OPEN' : '✅ CLOSED'}
                  </div>
                  
                  {debugInfo.mobileLayout && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: '#ff6b6b' }}>Mobile Layout:</strong><br/>
                      z-index: {debugInfo.mobileLayout.zIndex}<br/>
                      position: {debugInfo.mobileLayout.position}<br/>
                      pointerEvents: {debugInfo.mobileLayout.pointerEvents} {debugInfo.mobileLayout.pointerEvents === 'none' ? '✅' : '⚠️ BLOCKING'}<br/>
                      isolation: {debugInfo.mobileLayout.isolation}<br/>
                      transform: {debugInfo.mobileLayout.transform !== 'none' ? '⚠️ ' + debugInfo.mobileLayout.transform : 'none'}
                    </div>
                  )}
                  
                  {debugInfo.manageMenu && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: '#ff6b6b' }}>Manage Menu:</strong><br/>
                      z-index: {debugInfo.manageMenu.zIndex}<br/>
                      position: {debugInfo.manageMenu.position}<br/>
                      display: {debugInfo.manageMenu.display}
                    </div>
                  )}
                  
                  {debugInfo.modalWrapper && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: '#4ecdc4' }}>Modal Wrapper (Our DIV):</strong><br/>
                      z-index: {debugInfo.modalWrapper.zIndex}<br/>
                      position: {debugInfo.modalWrapper.position}<br/>
                      pointerEvents: {debugInfo.modalWrapper.pointerEvents}<br/>
                      size: {debugInfo.modalWrapper.width}x{debugInfo.modalWrapper.height}<br/>
                      {debugInfo.modalWrapper.isFullScreen && (
                        <span style={{ color: '#ff0000', fontWeight: 'bold' }}>⚠️ COVERS FULL SCREEN!</span>
                      )}
                    </div>
                  )}
                  
                  {debugInfo.polarisPortal && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: '#95e1d3' }}>Polaris Portal:</strong><br/>
                      z-index: {debugInfo.polarisPortal.zIndex}<br/>
                      position: {debugInfo.polarisPortal.position}<br/>
                      pointerEvents: {debugInfo.polarisPortal.pointerEvents}
                    </div>
                  )}
                  
                  {debugInfo.polarisBackdrop && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: '#f38181' }}>Polaris Backdrop:</strong><br/>
                      z-index: {debugInfo.polarisBackdrop.zIndex}<br/>
                      position: {debugInfo.polarisBackdrop.position}<br/>
                      pointerEvents: {debugInfo.polarisBackdrop.pointerEvents}<br/>
                      display: {debugInfo.polarisBackdrop.display}
                    </div>
                  )}
                  
                  {debugInfo.polarisModalDialog && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: '#aa96da' }}>Polaris Modal Dialog:</strong><br/>
                      z-index: {debugInfo.polarisModalDialog.zIndex}<br/>
                      position: {debugInfo.polarisModalDialog.position}<br/>
                      pointerEvents: {debugInfo.polarisModalDialog.pointerEvents}<br/>
                      display: {debugInfo.polarisModalDialog.display}
                    </div>
                  )}
                  
                  {debugInfo.polarisModalInner && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: '#c77dff' }}>Polaris Modal Inner:</strong><br/>
                      z-index: {debugInfo.polarisModalInner.zIndex}<br/>
                      position: {debugInfo.polarisModalInner.position}<br/>
                      pointerEvents: {debugInfo.polarisModalInner.pointerEvents}
                    </div>
                  )}
                  
                  {debugInfo.elementAtCenter && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: '#ffd60a' }}>Element at Screen Center:</strong><br/>
                      Tag: {debugInfo.elementAtCenter.tagName}<br/>
                      Class: {debugInfo.elementAtCenter.className || 'none'}<br/>
                      ID: {debugInfo.elementAtCenter.id || 'none'}<br/>
                      pointerEvents: {debugInfo.elementAtCenter.pointerEvents}<br/>
                      z-index: {debugInfo.elementAtCenter.zIndex}<br/>
                      position: {debugInfo.elementAtCenter.position}<br/>
                      Parent: {debugInfo.elementAtCenter.parentClassName}<br/>
                      {debugInfo.elementAtCenter.inlineStyle && (
                        <>Inline: {debugInfo.elementAtCenter.inlineStyle.substring(0, 50)}...<br/></>
                      )}
                      {debugInfo.elementAtCenter.className && debugInfo.elementAtCenter.className.includes('Backdrop') && (
                        <span style={{ color: '#ff0000', fontWeight: 'bold' }}>⚠️ BACKDROP BLOCKING!</span>
                      )}
                      {debugInfo.elementAtCenter.pointerEvents === 'auto' && !debugInfo.elementAtCenter.className.includes('Modal') && (
                        <span style={{ color: '#ff0000', fontWeight: 'bold' }}>⚠️ THIS ELEMENT BLOCKING!</span>
                      )}
                    </div>
                  )}
                  
                  {debugInfo.elementPositions && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: '#06ffa5' }}>Position Check:</strong><br/>
                      Backdrop Top: {debugInfo.elementPositions.backdropTop}<br/>
                      Modal Top: {debugInfo.elementPositions.modalTop}<br/>
                      {debugInfo.elementPositions.backdropCoveringModal && (
                        <span style={{ color: '#ff0000', fontWeight: 'bold' }}>⚠️ Backdrop may be covering modal!</span>
                      )}
                    </div>
                  )}
                  
                  <div style={{ 
                    marginTop: '8px', 
                    paddingTop: '8px', 
                    borderTop: '1px solid #666',
                    fontSize: '10px',
                    color: '#888'
                  }}>
                    Updated: {debugInfo.timestamp ? new Date(debugInfo.timestamp).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>
              )}
            </div>
          )}
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
            }}
            title="Move Contacts"
            primaryAction={{
              content: 'Move',
              onAction: () => {
                // This will be handled by folder selection
              }
            }}
            secondaryActions={[{
              content: 'Cancel',
              onAction: () => {
                setShowBulkMoveModal(false);
                setSelectedContacts([]);
              }
            }]}
          >
            <Modal.Section>
              <Text as="p" style={{ marginBottom: '16px' }}>
                Select a folder to move {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} to nested folders.
              </Text>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => handleBulkMoveContacts(folder.id)}
                    style={{
                      padding: '12px',
                      border: '1px solid #e1e3e5',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      backgroundColor: '#fafbfb',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: folder.iconColor || '#f57c00',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Icon 
                        source={FolderIcon} 
                        tone="base" 
                      />
                    </div>
                    <span style={{ fontWeight: '500' }}>{folder.name}</span>
                  </div>
                ))}
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
      </div>
    </>
  );
}
