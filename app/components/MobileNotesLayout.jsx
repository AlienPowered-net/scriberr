import React, { useState, useEffect, useCallback } from 'react';
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
  EmptyState,
  ButtonGroup,
  Popover,
  ActionList,
  TextContainer,
  Icon,
  Divider,
  Box,
  Select,
  Modal,
  Frame,
  TopBar,
  NavigationMenu,
  Collapsible,
  Filters,
  Tag,
  Banner,
  Toast,
  Spinner,
  SkeletonBodyText,
  SkeletonDisplayText
} from '@shopify/polaris';
import {
  SearchIcon,
  PlusIcon,
  EditIcon,
  DeleteIcon,
  DuplicateIcon,
  PinIcon,
  UnpinIcon,
  FolderIcon,
  TagIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MoreIcon,
  BackIcon,
  SaveIcon,
  CancelIcon,
  FilterIcon,
  SortIcon,
  ViewIcon,
  MobileIcon
} from '@shopify/polaris-icons';

const MobileNotesLayout = ({
  // Data props
  folders = [],
  notes = [],
  selectedFolder,
  selectedNote,
  selectedTags = [],
  allTags = [],
  
  // State props
  isLoading = false,
  isSaving = false,
  searchQuery = '',
  showNewFolderModal = false,
  showDeleteConfirm = false,
  showFolderSelector = false,
  
  // Event handlers
  onFolderSelect,
  onNoteSelect,
  onNoteCreate,
  onNoteEdit,
  onNoteDelete,
  onNoteDuplicate,
  onNotePin,
  onNoteMove,
  onFolderCreate,
  onFolderDelete,
  onFolderRename,
  onSearchChange,
  onTagSelect,
  onTagFilter,
  onSaveNote,
  onCancelEdit,
  onToggleNewFolderModal,
  onToggleDeleteConfirm,
  onToggleFolderSelector,
  
  // Mobile state
  mobileActiveSection = 'notes',
  onMobileSectionChange,
  
  // Note editing state
  editingNote = null,
  noteTitle = '',
  noteContent = '',
  onTitleChange,
  onContentChange,
  noteFolder = '',
  onFolderChange
}) => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileSort, setShowMobileSort] = useState(false);
  const [sortBy, setSortBy] = useState('updated');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [toastProps, setToastProps] = useState({});
  const [showToast, setShowToast] = useState(false);

  // Mobile responsive utilities
  const isMobile = window.innerWidth <= 768;
  const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;

  // Filter and sort notes
  const filteredNotes = React.useMemo(() => {
    let filtered = notes;
    
    // Filter by folder
    if (selectedFolder) {
      filtered = filtered.filter(note => note.folderId === selectedFolder);
    }
    
    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note => 
        selectedTags.some(tag => note.tags?.includes(tag))
      );
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.title?.toLowerCase().includes(query) ||
        note.content?.toLowerCase().includes(query) ||
        note.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Sort notes
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'pinned':
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        default:
          return 0;
      }
    });
  }, [notes, selectedFolder, selectedTags, searchQuery, sortBy]);

  // Show toast notification
  const showToastNotification = useCallback((message, error = false) => {
    setToastProps({
      content: message,
      error
    });
    setShowToast(true);
  }, []);

  // Mobile navigation component
  const MobileNavigation = () => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      borderTop: '1px solid #e1e3e5',
      padding: '8px 16px 12px',
      zIndex: 1000,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}>
        {[
          { id: 'folders', label: 'Folders', icon: FolderIcon },
          { id: 'notes', label: 'Notes', icon: ViewIcon },
          { id: 'editor', label: 'Editor', icon: EditIcon }
        ].map(({ id, label, icon: IconComponent }) => (
          <button
            key={id}
            onClick={() => onMobileSectionChange(id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: mobileActiveSection === id ? '#f6fff8' : 'transparent',
              color: mobileActiveSection === id ? '#008060' : '#6d7175',
              cursor: 'pointer',
              minWidth: '60px',
              transition: 'all 0.2s ease'
            }}
          >
            <Icon source={IconComponent} />
            <span style={{ fontSize: '11px', fontWeight: '500' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Mobile header component
  const MobileHeader = () => (
    <div style={{
      position: 'sticky',
      top: 0,
      backgroundColor: 'white',
      borderBottom: '1px solid #e1e3e5',
      padding: '16px',
      zIndex: 100
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {mobileActiveSection !== 'notes' && (
            <Button
              variant="plain"
              icon={BackIcon}
              onClick={() => onMobileSectionChange('notes')}
              accessibilityLabel="Back to notes"
            />
          )}
          <Text variant="headingLg" as="h1">
            {mobileActiveSection === 'folders' && 'Folders'}
            {mobileActiveSection === 'notes' && 'Notes'}
            {mobileActiveSection === 'editor' && 'Editor'}
          </Text>
        </div>
        
        {mobileActiveSection === 'notes' && (
          <InlineStack gap="2">
            <Button
              variant="plain"
              icon={FilterIcon}
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              accessibilityLabel="Filter notes"
            />
            <Button
              variant="primary"
              icon={PlusIcon}
              onClick={onNoteCreate}
              accessibilityLabel="Create new note"
            />
          </InlineStack>
        )}
      </div>

      {/* Search bar */}
      {mobileActiveSection === 'notes' && (
        <TextField
          label="Search notes"
          labelHidden
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search notes..."
          prefix={<Icon source={SearchIcon} />}
          clearButton
        />
      )}

      {/* Mobile filters */}
      {showMobileFilters && (
        <Collapsible
          open={showMobileFilters}
          id="mobile-filters"
          transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
        >
          <Box padding="4">
            <BlockStack gap="3">
              <Text variant="headingSm">Filters & Sort</Text>
              
              {/* Tag filters */}
              {allTags.length > 0 && (
                <div>
                  <Text variant="bodySm" fontWeight="medium">Tags</Text>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginTop: '4px'
                  }}>
                    {allTags.map(tag => (
                      <Tag
                        key={tag}
                        onRemove={() => onTagFilter(tag)}
                      >
                        {tag}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {/* Sort options */}
              <Select
                label="Sort by"
                options={[
                  { label: 'Last updated', value: 'updated' },
                  { label: 'Date created', value: 'created' },
                  { label: 'Title A-Z', value: 'title' },
                  { label: 'Pinned first', value: 'pinned' }
                ]}
                value={sortBy}
                onChange={setSortBy}
              />

              {/* View mode */}
              <div>
                <Text variant="bodySm" fontWeight="medium">View</Text>
                <ButtonGroup>
                  <Button
                    pressed={viewMode === 'list'}
                    onClick={() => setViewMode('list')}
                    icon={ViewIcon}
                  >
                    List
                  </Button>
                  <Button
                    pressed={viewMode === 'grid'}
                    onClick={() => setViewMode('grid')}
                    icon={MobileIcon}
                  >
                    Grid
                  </Button>
                </ButtonGroup>
              </div>
            </BlockStack>
          </Box>
        </Collapsible>
      )}
    </div>
  );

  // Folders section
  const FoldersSection = () => (
    <div style={{ padding: '16px' }}>
      <BlockStack gap="4">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Text variant="headingMd">Folders</Text>
          <Button
            variant="primary"
            icon={PlusIcon}
            onClick={onToggleNewFolderModal}
          >
            New Folder
          </Button>
        </div>

        {/* All Notes and All Tags buttons */}
        <InlineStack gap="2">
          <Button
            variant={selectedFolder === null ? 'primary' : 'secondary'}
            fullWidth
            onClick={() => onFolderSelect(null)}
          >
            All Notes
          </Button>
          <Button
            variant={selectedTags.length > 0 ? 'primary' : 'secondary'}
            fullWidth
            onClick={() => setShowMobileFilters(true)}
          >
            All Tags
          </Button>
        </InlineStack>

        {/* Folders list */}
        <ResourceList
          resourceName={{ singular: 'folder', plural: 'folders' }}
          items={folders}
          renderItem={(item) => {
            const isSelected = selectedFolder === item.id;
            return (
              <ResourceItem
                id={item.id}
                url="#"
                accessibilityLabel={`View folder ${item.name}`}
                onClick={() => onFolderSelect(item.id)}
              >
                <InlineStack gap="3" align="space-between">
                  <InlineStack gap="3">
                    <Icon source={FolderIcon} />
                    <BlockStack gap="1">
                      <Text variant="bodyMd" fontWeight={isSelected ? 'semibold' : 'medium'}>
                        {item.name}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        {notes.filter(note => note.folderId === item.id).length} notes
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  
                  <Popover
                    active={false}
                    activator={
                      <Button
                        variant="plain"
                        icon={MoreIcon}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle folder menu
                        }}
                      />
                    }
                  >
                    <ActionList
                      items={[
                        {
                          content: 'Rename',
                          onAction: () => onFolderRename(item)
                        },
                        {
                          content: 'Delete',
                          destructive: true,
                          onAction: () => onFolderDelete(item.id)
                        }
                      ]}
                    />
                  </Popover>
                </InlineStack>
              </ResourceItem>
            );
          }}
        />
      </BlockStack>
    </div>
  );

  // Notes section
  const NotesSection = () => (
    <div style={{ padding: '16px' }}>
      <BlockStack gap="4">
        {/* Notes count and actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Text variant="bodyMd" color="subdued">
            {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
          </Text>
          
          <InlineStack gap="2">
            <Button
              variant="secondary"
              icon={SortIcon}
              onClick={() => setShowMobileSort(!showMobileSort)}
            >
              Sort
            </Button>
            <Button
              variant="primary"
              icon={PlusIcon}
              onClick={onNoteCreate}
            >
              New Note
            </Button>
          </InlineStack>
        </div>

        {/* Loading state */}
        {isLoading && (
          <Card>
            <BlockStack gap="3">
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={3} />
            </BlockStack>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && filteredNotes.length === 0 && (
          <Card>
            <EmptyState
              heading="No notes found"
              action={{
                content: 'Create your first note',
                onAction: onNoteCreate
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Start by creating your first note or adjusting your search filters.</p>
            </EmptyState>
          </Card>
        )}

        {/* Notes list */}
        {!isLoading && filteredNotes.length > 0 && (
          <BlockStack gap="3">
            {filteredNotes.map(note => (
              <Card key={note.id}>
                <div
                  onClick={() => onNoteSelect(note)}
                  style={{ cursor: 'pointer' }}
                >
                  <BlockStack gap="3">
                    {/* Note header */}
                    <InlineStack align="space-between">
                      <InlineStack gap="2">
                        {note.pinned && (
                          <Icon source={PinIcon} color="base" />
                        )}
                        <Text variant="bodyMd" fontWeight="semibold" truncate>
                          {note.title || 'Untitled'}
                        </Text>
                      </InlineStack>
                      
                      <Popover
                        active={false}
                        activator={
                          <Button
                            variant="plain"
                            icon={MoreIcon}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle note menu
                            }}
                          />
                        }
                      >
                        <ActionList
                          items={[
                            {
                              content: note.pinned ? 'Unpin' : 'Pin',
                              icon: note.pinned ? UnpinIcon : PinIcon,
                              onAction: () => onNotePin(note)
                            },
                            {
                              content: 'Duplicate',
                              icon: DuplicateIcon,
                              onAction: () => onNoteDuplicate(note)
                            },
                            {
                              content: 'Move',
                              icon: FolderIcon,
                              onAction: () => onNoteMove(note)
                            },
                            {
                              content: 'Delete',
                              icon: DeleteIcon,
                              destructive: true,
                              onAction: () => onNoteDelete(note.id)
                            }
                          ]}
                        />
                      </Popover>
                    </InlineStack>

                    {/* Note content preview */}
                    {note.content && (
                      <Text variant="bodySm" color="subdued">
                        {note.content.replace(/<[^>]*>/g, '').substring(0, 150)}
                        {note.content.length > 150 && '...'}
                      </Text>
                    )}

                    {/* Note tags */}
                    {note.tags && note.tags.length > 0 && (
                      <InlineStack gap="2">
                        {note.tags.slice(0, 3).map(tag => (
                          <Tag key={tag} onRemove={() => onTagFilter(tag)}>
                            {tag}
                          </Tag>
                        ))}
                        {note.tags.length > 3 && (
                          <Text variant="bodySm" color="subdued">
                            +{note.tags.length - 3} more
                          </Text>
                        )}
                      </InlineStack>
                    )}

                    {/* Note metadata */}
                    <InlineStack align="space-between">
                      <Text variant="bodySm" color="subdued">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </Text>
                      {note.folderId && (
                        <InlineStack gap="1">
                          <Icon source={FolderIcon} />
                          <Text variant="bodySm" color="subdued">
                            {folders.find(f => f.id === note.folderId)?.name}
                          </Text>
                        </InlineStack>
                      )}
                    </InlineStack>
                  </BlockStack>
                </div>
              </Card>
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </div>
  );

  // Editor section
  const EditorSection = () => (
    <div style={{ padding: '16px' }}>
      <Card>
        <BlockStack gap="4">
          {/* Editor header */}
          <InlineStack align="space-between">
            <Text variant="headingMd">Note Editor</Text>
            <InlineStack gap="2">
              <Button
                variant="secondary"
                icon={CancelIcon}
                onClick={onCancelEdit}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={SaveIcon}
                onClick={onSaveNote}
                loading={isSaving}
              >
                Save
              </Button>
            </InlineStack>
          </InlineStack>

          {/* Folder selector */}
          <Select
            label="Folder"
            options={[
              { label: 'Select a folder', value: '' },
              ...folders.map(folder => ({
                label: folder.name,
                value: folder.id
              }))
            ]}
            value={noteFolder}
            onChange={onFolderChange}
          />

          {/* Title input */}
          <TextField
            label="Title"
            value={noteTitle}
            onChange={onTitleChange}
            placeholder="Note title..."
            autoComplete="off"
          />

          {/* Content editor */}
          <TextField
            label="Content"
            value={noteContent}
            onChange={onContentChange}
            multiline={20}
            placeholder="Start writing your note..."
            autoComplete="off"
          />
        </BlockStack>
      </Card>
    </div>
  );

  return (
    <Frame>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#f6f6f7',
        overflow: 'hidden'
      }}>
        {/* Mobile header */}
        <MobileHeader />

        {/* Main content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          paddingBottom: '80px', // Space for bottom navigation
          WebkitOverflowScrolling: 'touch'
        }}>
          {mobileActiveSection === 'folders' && <FoldersSection />}
          {mobileActiveSection === 'notes' && <NotesSection />}
          {mobileActiveSection === 'editor' && <EditorSection />}
        </div>

        {/* Bottom navigation */}
        <MobileNavigation />

        {/* Toast notifications */}
        {showToast && (
          <Toast
            {...toastProps}
            onDismiss={() => setShowToast(false)}
          />
        )}
      </div>
    </Frame>
  );
};

export default MobileNotesLayout;