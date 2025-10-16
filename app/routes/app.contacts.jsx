import { json } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

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

  // Contact card state
  const [showContactCard, setShowContactCard] = useState(false);
  const [contactCardContact, setContactCardContact] = useState(null);
  const [contactCardVariant, setContactCardVariant] = useState('tooltip');
  const [contactCardPosition, setContactCardPosition] = useState({ x: 0, y: 0 });

  // DnD state
  const [activeId, setActiveId] = useState(null);
  const [columnOrder, setColumnOrder] = useState(['folders', 'contacts', 'form']);

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

  return (
    <Page title="Contacts">
      <div style={{ paddingBottom: "80px" }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Layout>
            {columnOrder.map((columnId) => (
              <Layout.Section key={columnId}>
                <SortableColumn id={columnId}>
                  {columnId === 'folders' && (
                    <Card sectioned>
                      <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="h2" variant="headingMd">Folders</Text>
                          <Button
                            onClick={() => setShowNewFolderModal(true)}
                            icon={EditIcon}
                            size="slim"
                          >
                            New Folder
                          </Button>
                        </InlineStack>

                        <ResourceList
                          resourceName={{ singular: "folder", plural: "folders" }}
                          items={folders.map(folder => ({
                            id: folder.id,
                            name: folder.name,
                            count: folder._count.contacts
                          }))}
                          renderItem={({ id, name, count }) => {
                            const folder = folders.find(f => f.id === id);
                            const isSelected = selectedFolder?.id === id;
                            
                            return (
                              <ResourceItem
                                id={id}
                                onClick={() => handleFolderSelect(folder)}
                                shortcutActions={[
                                  {
                                    content: 'Edit',
                                    onAction: () => console.log('Edit folder', id)
                                  },
                                  {
                                    content: 'Delete',
                                    onAction: () => console.log('Delete folder', id)
                                  }
                                ]}
                              >
                                <InlineStack gap="300" blockAlign="center">
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
                                    {name}
                                  </Text>
                                  <Badge tone="info">{count}</Badge>
                                </InlineStack>
                              </ResourceItem>
                            );
                          }}
                        />
                      </BlockStack>
                    </Card>
                  )}

                  {columnId === 'contacts' && (
                    <Card sectioned>
                      <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="h2" variant="headingMd">
                            {selectedFolder ? selectedFolder.name : 'All Contacts'}
                          </Text>
                          <Button
                            onClick={() => setShowNewContactForm(true)}
                            icon={EditIcon}
                            size="slim"
                          >
                            New Contact
                          </Button>
                        </InlineStack>

                        <TextField
                          label="Search contacts"
                          labelHidden
                          placeholder="Search contacts..."
                          value={searchQuery}
                          onChange={setSearchQuery}
                        />

                        {filteredContacts.length > 0 ? (
                          <ResourceList
                            resourceName={{ singular: "contact", plural: "contacts" }}
                            items={filteredContacts}
                            renderItem={(contact) => (
                              <ResourceItem
                                id={contact.id}
                                shortcutActions={[
                                  {
                                    content: 'Edit',
                                    onAction: () => setEditingContact(contact)
                                  },
                                  {
                                    content: 'Delete',
                                    onAction: () => handleContactDelete(contact.id)
                                  }
                                ]}
                              >
                                <InlineStack gap="300" blockAlign="center">
                                  <Avatar
                                    size="small"
                                    source={contact.type === 'PERSON' ? '👤' : '🏢'}
                                  />
                                  <BlockStack gap="100">
                                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                                      {contact.type === 'PERSON' 
                                        ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                                        : contact.businessName
                                      }
                                    </Text>
                                    <InlineStack gap="200" blockAlign="center">
                                      <Badge tone={contact.type === 'PERSON' ? 'info' : 'success'}>
                                        {contact.type === 'PERSON' ? 'Person' : 'Business'}
                                      </Badge>
                                      {contact.company && (
                                        <Text as="span" variant="bodySm" tone="subdued">
                                          {contact.company}
                                        </Text>
                                      )}
                                    </InlineStack>
                                  </BlockStack>
                                </InlineStack>
                              </ResourceItem>
                            )}
                          />
                        ) : (
                          <EmptyState
                            heading="No contacts found"
                            action={{
                              content: 'Create your first contact',
                              onAction: () => setShowNewContactForm(true)
                            }}
                            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                          >
                            <p>Start building your contact list by adding people and businesses.</p>
                          </EmptyState>
                        )}
                      </BlockStack>
                    </Card>
                  )}

                  {columnId === 'form' && (
                    <div>
                      {editingContact ? (
                        <ContactForm
                          contact={editingContact}
                          folders={folders}
                          onSave={handleContactSave}
                          onCancel={() => setEditingContact(null)}
                          isEditing={true}
                        />
                      ) : showNewContactForm ? (
                        <ContactForm
                          folders={folders}
                          onSave={handleContactSave}
                          onCancel={() => setShowNewContactForm(false)}
                          isEditing={false}
                        />
                      ) : (
                        <Card sectioned>
                          <EmptyState
                            heading="Select a contact to edit"
                            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                          >
                            <p>Choose a contact from the list to edit, or create a new one.</p>
                          </EmptyState>
                        </Card>
                      )}
                    </div>
                  )}
                </SortableColumn>
              </Layout.Section>
            ))}
          </Layout>

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
            onSave={(folderData) => {
              // Handle folder creation
              console.log('Create folder:', folderData);
              setShowNewFolderModal(false);
            }}
          />
        )}
      </div>
    </Page>
  );
}
