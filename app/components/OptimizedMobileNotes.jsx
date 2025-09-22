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
  MobileIcon,
  ProductFilledIcon,
  HomeIcon
} from '@shopify/polaris-icons';
import { useMobileNotes } from '../hooks/useMobileNotes';
import '../styles/mobile-notes.css';

const OptimizedMobileNotes = ({
  // Data from parent
  folders = [],
  notes = [],
  
  // API handlers
  onSaveNote,
  onDeleteNote,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  
  // Mobile state
  isMobile = false,
  mobileActiveSection = 'notes',
  onMobileSectionChange
}) => {
  const {
    // State
    filteredNotes,
    allTags,
    isLoading,
    isSaving,
    searchQuery,
    selectedFolder,
    selectedTags,
    selectedNote,
    editingNote,
    noteTitle,
    noteContent,
    noteFolder,
    sortBy,
    viewMode,
    showFilters,
    showNewFolderModal,
    showDeleteConfirm,
    showFolderSelector,
    toastMessage,
    toastError,
    showToast,
    
    // Actions
    setSearchQuery,
    setSortBy,
    setViewMode,
    setShowFilters,
    
    // Handlers
    onNoteSelect,
    onNoteCreate,
    onNoteEdit,
    onNoteDelete,
    onNoteDuplicate,
    onNotePin,
    onNoteMove,
    onSaveNote: handleSaveNote,
    onCancelEdit,
    onFolderSelect,
    onFolderCreate,
    onFolderDelete,
    onFolderRename,
    onTagSelect,
    onTagFilter,
    onToggleNewFolderModal,
    onToggleDeleteConfirm,
    onToggleFolderSelector,
    onTitleChange,
    onContentChange,
    onFolderChange,
    showToastNotification
  } = useMobileNotes({
    initialFolders: folders,
    initialNotes: notes,
    onSaveNote,
    onDeleteNote,
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder
  });

  // Mobile navigation component
  const MobileNavigation = () => (
    <div className="mobile-bottom-nav">
      <div className="mobile-nav-items">
        {[
          { 
            id: 'folders', 
            label: 'Folders', 
            icon: FolderIcon,
            count: folders.length
          },
          { 
            id: 'notes', 
            label: 'Notes', 
            icon: ProductFilledIcon,
            count: filteredNotes.length
          },
          { 
            id: 'editor', 
            label: 'Editor', 
            icon: EditIcon,
            active: !!editingNote
          }
        ].map(({ id, label, icon: IconComponent, count, active }) => (
          <button
            key={id}
            onClick={() => onMobileSectionChange(id)}
            className={`mobile-nav-item ${mobileActiveSection === id ? 'active' : ''}`}
          >
            <div className="mobile-nav-icon">
              <Icon source={IconComponent} />
            </div>
            <span className="mobile-nav-label">{label}</span>
            {count !== undefined && count > 0 && (
              <Badge size="small" tone="info">{count}</Badge>
            )}
            {active && (
              <div style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '6px',
                height: '6px',
                backgroundColor: '#008060',
                borderRadius: '50%'
              }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // Mobile header component
  const MobileHeader = () => (
    <div className="mobile-header">
      <div className="mobile-header-content">
        <div className="mobile-header-title">
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
        
        <div className="mobile-header-actions">
          {mobileActiveSection === 'notes' && (
            <InlineStack gap="2">
              <Button
                variant="plain"
                icon={FilterIcon}
                onClick={() => setShowFilters(!showFilters)}
                accessibilityLabel="Filter notes"
                pressed={showFilters}
              />
              <Button
                variant="primary"
                icon={PlusIcon}
                onClick={onNoteCreate}
                accessibilityLabel="Create new note"
              >
                New
              </Button>
            </InlineStack>
          )}
          
          {mobileActiveSection === 'folders' && (
            <Button
              variant="primary"
              icon={PlusIcon}
              onClick={onToggleNewFolderModal}
              accessibilityLabel="Create new folder"
            >
              New
            </Button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {mobileActiveSection === 'notes' && (
        <div className="mobile-search">
          <TextField
            label="Search notes"
            labelHidden
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search notes..."
            prefix={<Icon source={SearchIcon} />}
            clearButton
          />
        </div>
      )}

      {/* Mobile filters */}
      {showFilters && (
        <Collapsible
          open={showFilters}
          id="mobile-filters"
          transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
        >
          <div className="mobile-filters">
            <div className="mobile-filters-header">
              <Text variant="headingSm">Filters & Sort</Text>
              <Button
                variant="plain"
                icon={ChevronUpIcon}
                onClick={() => setShowFilters(false)}
              />
            </div>
            
            <div className="mobile-filters-content">
              <BlockStack gap="3">
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
            </div>
          </div>
        </Collapsible>
      )}
    </div>
  );

  // Folders section
  const FoldersSection = () => (
    <div className="mobile-section">
      <BlockStack gap="4">
        {/* All Notes and All Tags buttons */}
        <InlineStack gap="2">
          <Button
            variant={selectedFolder === null ? 'primary' : 'secondary'}
            fullWidth
            onClick={() => onFolderSelect(null)}
            icon={HomeIcon}
          >
            All Notes
          </Button>
          <Button
            variant={selectedTags.length > 0 ? 'primary' : 'secondary'}
            fullWidth
            onClick={() => setShowFilters(true)}
            icon={TagIcon}
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
            const noteCount = notes.filter(note => note.folderId === item.id).length;
            
            return (
              <ResourceItem
                id={item.id}
                url="#"
                accessibilityLabel={`View folder ${item.name}`}
                onClick={() => onFolderSelect(item.id)}
              >
                <div className={`mobile-card mobile-folder-card ${isSelected ? 'selected' : ''}`}>
                  <div className="mobile-card-content">
                    <div className="mobile-folder-header">
                      <div className="mobile-folder-icon">
                        <Icon source={FolderIcon} />
                      </div>
                      <div className="mobile-folder-info">
                        <div className="mobile-folder-name">{item.name}</div>
                        <div className="mobile-folder-count">
                          {noteCount} {noteCount === 1 ? 'note' : 'notes'}
                        </div>
                      </div>
                      
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
                    </div>
                  </div>
                </div>
              </ResourceItem>
            );
          }}
        />
      </BlockStack>
    </div>
  );

  // Notes section
  const NotesSection = () => (
    <div className="mobile-section">
      <BlockStack gap="4">
        {/* Notes count */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Text variant="bodyMd" color="subdued">
            {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
            {selectedFolder && (
              <span> in {folders.find(f => f.id === selectedFolder)?.name}</span>
            )}
          </Text>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="mobile-loading">
            <Spinner size="large" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredNotes.length === 0 && (
          <Card>
            <EmptyState
              heading={searchQuery ? "No notes found" : "No notes yet"}
              action={{
                content: 'Create your first note',
                onAction: onNoteCreate
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>
                {searchQuery 
                  ? "Try adjusting your search terms or filters."
                  : "Start by creating your first note to get organized."
                }
              </p>
            </EmptyState>
          </Card>
        )}

        {/* Notes list */}
        {!isLoading && filteredNotes.length > 0 && (
          <BlockStack gap="3">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                className={`mobile-card mobile-note-card ${selectedNote?.id === note.id ? 'selected' : ''}`}
                onClick={() => onNoteSelect(note)}
              >
                <div className="mobile-card-content">
                  <BlockStack gap="3">
                    {/* Note header */}
                    <div className="mobile-note-header">
                      <div className="mobile-note-title">
                        <InlineStack gap="2" align="start">
                          {note.pinned && (
                            <Icon source={PinIcon} color="base" />
                          )}
                          <Text variant="bodyMd" fontWeight="semibold" truncate>
                            {note.title || 'Untitled'}
                          </Text>
                        </InlineStack>
                      </div>
                      
                      <div className="mobile-note-actions">
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
                      </div>
                    </div>

                    {/* Note content preview */}
                    {note.content && (
                      <div className="mobile-note-content">
                        <Text variant="bodySm" color="subdued">
                          {note.content.replace(/<[^>]*>/g, '').substring(0, 150)}
                          {note.content.length > 150 && '...'}
                        </Text>
                      </div>
                    )}

                    {/* Note tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="mobile-note-tags">
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
                      </div>
                    )}

                    {/* Note metadata */}
                    <div className="mobile-note-meta">
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
                    </div>
                  </BlockStack>
                </div>
              </div>
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </div>
  );

  // Editor section
  const EditorSection = () => (
    <div className="mobile-section">
      <div className="mobile-editor">
        <BlockStack gap="4">
          {/* Editor header */}
          <div className="mobile-editor-header">
            <Text variant="headingMd">Note Editor</Text>
            <div className="mobile-editor-actions">
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
                onClick={handleSaveNote}
                loading={isSaving}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Folder selector */}
          <div className="mobile-editor-field">
            <label>Folder</label>
            <Select
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
          </div>

          {/* Title input */}
          <div className="mobile-editor-field">
            <label>Title</label>
            <TextField
              value={noteTitle}
              onChange={onTitleChange}
              placeholder="Note title..."
              autoComplete="off"
            />
          </div>

          {/* Content editor */}
          <div className="mobile-editor-field">
            <label>Content</label>
            <TextField
              value={noteContent}
              onChange={onContentChange}
              multiline={20}
              placeholder="Start writing your note..."
              autoComplete="off"
            />
          </div>
        </BlockStack>
      </div>
    </div>
  );

  if (!isMobile) {
    return null; // Don't render on desktop
  }

  return (
    <Frame>
      <div className="mobile-notes-layout">
        {/* Mobile header */}
        <MobileHeader />

        {/* Main content */}
        <div className="mobile-content">
          {mobileActiveSection === 'folders' && <FoldersSection />}
          {mobileActiveSection === 'notes' && <NotesSection />}
          {mobileActiveSection === 'editor' && <EditorSection />}
        </div>

        {/* Bottom navigation */}
        <MobileNavigation />

        {/* Toast notifications */}
        {showToast && (
          <div className="mobile-toast">
            <Toast
              content={toastMessage}
              error={toastError}
              onDismiss={() => setShowToast(false)}
            />
          </div>
        )}
      </div>
    </Frame>
  );
};

export default OptimizedMobileNotes;