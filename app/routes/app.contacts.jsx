import { json } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export const loader = async ({ request }) => {
  const { session } = await shopify.authenticate.admin(request);
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
  Spinner
} from "@shopify/polaris";
import { 
  DeleteIcon,
  EditIcon,
  FolderIcon,
  PersonIcon,
  ProductIcon,
  PhoneIcon,
  EmailIcon,
  CollectionIcon,
  MenuVerticalIcon,
  DragHandleIcon
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

// Loader function
export async function loader({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shopId = await getOrCreateShopId(session.shop);

    // Fetch contact folders
    const folders = await prisma.contactFolder.findMany({
      where: { shopId },
      include: {
        _count: {
          select: { contacts: true }
        }
      },
      orderBy: { position: 'asc' }
    });

    // Fetch all contacts
    const contacts = await prisma.contact.findMany({
      where: { shopId },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            icon: true,
            iconColor: true
          }
        }
      },
      orderBy: [
        { folder: { position: 'asc' } },
        { createdAt: 'desc' }
      ]
    });

    return json({ folders, contacts });
  } catch (error) {
    console.error('Error loading contacts data:', error);
    return json({ folders: [], contacts: [] });
  }
}

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

            {/* Folder */}
            <Select
              label="Folder"
              options={[
                { label: 'No folder', value: '' },
                ...folders.map(folder => ({
                  label: folder.name,
                  value: folder.id
                }))
              ]}
              value={formData.folderId}
              onChange={(value) => setFormData(prev => ({ ...prev, folderId: value }))}
            />

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
      folderId: null,
      pointsOfContact: [{ name: '', phone: '', email: '' }]
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

  // Filter contacts based on selected folder and search
  const filteredContacts = contacts.filter(contact => {
    const matchesFolder = !selectedFolder || contact.folderId === selectedFolder.id;
    const matchesSearch = !searchQuery || 
      (contact.firstName && contact.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.lastName && contact.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.businessName && contact.businessName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.company && contact.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesFolder && matchesSearch;
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
    if (!confirm('Are you sure you want to delete this contact?')) return;

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
      } else {
        console.error('Error deleting contact:', result.error);
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
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
  const handleSubmit = async (e) => {
    e.preventDefault();
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
        if (key === 'pointsOfContact') {
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
        // Refresh contacts
        const updatedContacts = await fetch('/api/contacts').then(r => r.json());
        setContacts(updatedContacts);
        
        // Reset form
        setEditingContact(null);
        setShowNewContactForm(false);
        setFormData(getInitialFormData());
      } else {
        const error = await response.json();
        console.error('Error saving contact:', error);
      }
    } catch (error) {
      console.error('Error saving contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Folder handlers
  const handleCreateFolder = async (folderData) => {
    setIsLoading(true);
    
    try {
      const submitData = new FormData();
      submitData.append('_action', 'create');
      submitData.append('name', folderData.name);
      submitData.append('icon', folderData.icon || 'folder');
      submitData.append('iconColor', folderData.iconColor || '#f57c00');
      
      const response = await fetch('/api/contact-folders', {
        method: 'POST',
        body: submitData
      });
      
      if (response.ok) {
        // Refresh folders
        const updatedFolders = await fetch('/api/contact-folders').then(r => r.json());
        setFolders(updatedFolders);
        setShowNewFolderModal(false);
      } else {
        const error = await response.json();
        console.error('Error creating folder:', error);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Page title="Contacts">
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
                          <Button
                            onClick={() => setShowNewFolderModal(true)}
                            icon={EditIcon}
                            size="slim"
                          >
                            New Folder
                          </Button>
                        </div>
                      </div>

                      {/* Scrollable Content */}
                      <div style={{ 
                          flex: "1", 
                          overflowY: folders.length > 9 ? "auto" : "visible",
                          overflowX: "hidden", 
                          padding: "16px"
                        }}>
                          {folders.length === 0 ? (
                            <div style={{ 
                              display: "flex", 
                              flexDirection: "column", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              height: "200px",
                              textAlign: "center"
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
                                <i className="far fa-folder-open" style={{ fontSize: "32px", color: "#8c9196" }}></i>
                              </div>
                              <Text as="h3" variant="headingMd" style={{ marginBottom: "8px" }}>
                                Create your first folder
                              </Text>
                              <Text as="p" variant="bodyMd" tone="subdued" style={{ marginBottom: "16px" }}>
                                Get organized by creating folders to group your contacts by topic, project, or category.
                              </Text>
                              <Button variant="primary" onClick={() => setShowNewFolderModal(true)}>
                                Create folder
                              </Button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {folders.map((folder) => {
                                const isSelected = selectedFolder?.id === folder.id;
                                return (
                                  <div
                                    key={folder.id}
                                    onClick={() => handleFolderSelect(folder)}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "12px",
                                      padding: "12px",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      backgroundColor: isSelected ? "#f0f9ff" : "transparent",
                                      border: isSelected ? "1px solid #0ea5e9" : "1px solid transparent",
                                      transition: "all 0.2s ease"
                                    }}
                                  >
                                    <div style={{
                                      width: '20px',
                                      height: '20px',
                                      backgroundColor: folder.iconColor,
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '12px'
                                    }}>
                                      {folder.icon === 'folder' ? '📁' : folder.icon}
                                    </div>
                                    <Text as="span" variant="bodyMd" fontWeight={isSelected ? "semibold" : "regular"}>
                                      {folder.name}
                                    </Text>
                                    <Badge tone="info">{folder._count.contacts}</Badge>
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
                            onClick={() => setShowNewContactForm(true)}
                            variant="primary"
                          >
                            Add new contact
                          </Button>
                        </div>

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
                          gridTemplateColumns: "60px 1fr 1fr 1fr 120px 100px",
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
                                  gridTemplateColumns: "60px 1fr 1fr 1fr 120px 100px",
                                  gap: "16px",
                                  padding: "12px 16px",
                                  borderBottom: "1px solid #f1f3f4",
                                  cursor: "pointer",
                                  backgroundColor: "transparent",
                                  transition: "all 0.2s ease",
                                  alignItems: "center"
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = "#f6f6f7";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = "transparent";
                                }}
                              >
                                {/* Profile Avatar */}
                                <div style={{ display: "flex", alignItems: "center" }}>
                                  <Avatar
                                    size="small"
                                    source={contact.type === 'PERSON' 
                                      ? `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase()
                                      : contact.businessName?.[0] || 'B'
                                    }
                                    name={contact.type === 'PERSON' 
                                      ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                                      : contact.businessName
                                    }
                                  />
                                </div>
                                
                                {/* First Name */}
                                <div>
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

        {/* New Folder Modal */}
        {showNewFolderModal && (
          <NewFolderModal
            isOpen={showNewFolderModal}
            onClose={() => setShowNewFolderModal(false)}
            onSave={handleCreateFolder}
          />
        )}

        {/* Contact Edit/Create Modal */}
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
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
            </form>
          </Modal.Section>
        </Modal>

        {/* Contact Details Modal */}
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
      </div>
    </Page>
  );
}
