import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing mobile notes state and interactions
 * Provides optimized mobile-specific functionality with Polaris integration
 */
export const useMobileNotes = ({
  initialFolders = [],
  initialNotes = [],
  onSaveNote,
  onDeleteNote,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder
}) => {
  // Core state
  const [folders, setFolders] = useState(initialFolders);
  const [notes, setNotes] = useState(initialNotes);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Mobile UI state
  const [mobileActiveSection, setMobileActiveSection] = useState('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  
  // Editor state
  const [editingNote, setEditingNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteFolder, setNoteFolder] = useState('');
  
  // Modal states
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  
  // Filter and sort state
  const [sortBy, setSortBy] = useState('updated');
  const [viewMode, setViewMode] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  
  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update local state when props change
  useEffect(() => {
    setFolders(initialFolders);
  }, [initialFolders]);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  // Get all unique tags from notes
  const allTags = useMemo(() => {
    const tagSet = new Set();
    notes.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Filter notes based on current filters
  const filteredNotes = useMemo(() => {
    let filtered = [...notes];
    
    // Filter by folder
    if (selectedFolder !== null) {
      filtered = filtered.filter(note => note.folderId === selectedFolder);
    }
    
    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note => 
        selectedTags.some(tag => note.tags?.includes(tag))
      );
    }
    
    // Filter by search query
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
    setToastMessage(message);
    setToastError(error);
    setShowToast(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  }, []);

  // Mobile section navigation
  const handleMobileSectionChange = useCallback((section) => {
    setMobileActiveSection(section);
    
    // Auto-hide filters when changing sections
    if (section !== 'notes') {
      setShowFilters(false);
    }
  }, []);

  // Note management
  const handleNoteSelect = useCallback((note) => {
    setSelectedNote(note);
    setEditingNote(note);
    setNoteTitle(note.title || '');
    setNoteContent(note.content || '');
    setNoteFolder(note.folderId || '');
    setMobileActiveSection('editor');
  }, []);

  const handleNoteCreate = useCallback(() => {
    setSelectedNote(null);
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteFolder(selectedFolder || '');
    setMobileActiveSection('editor');
  }, [selectedFolder]);

  const handleNoteEdit = useCallback((note) => {
    handleNoteSelect(note);
  }, [handleNoteSelect]);

  const handleSaveNote = useCallback(async () => {
    if (!noteTitle.trim() && !noteContent.trim()) {
      showToastNotification('Note cannot be empty', true);
      return;
    }

    setIsSaving(true);
    try {
      const noteData = {
        id: editingNote?.id || null,
        title: noteTitle.trim() || 'Untitled',
        content: noteContent,
        folderId: noteFolder || null,
        tags: editingNote?.tags || []
      };

      await onSaveNote(noteData);
      
      showToastNotification(editingNote ? 'Note updated successfully' : 'Note created successfully');
      
      // Clear editor state
      setEditingNote(null);
      setNoteTitle('');
      setNoteContent('');
      setNoteFolder('');
      setSelectedNote(null);
      setMobileActiveSection('notes');
    } catch (error) {
      showToastNotification('Failed to save note', true);
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [noteTitle, noteContent, noteFolder, editingNote, onSaveNote, showToastNotification]);

  const handleCancelEdit = useCallback(() => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteFolder('');
    setSelectedNote(null);
    setMobileActiveSection('notes');
  }, []);

  const handleNoteDelete = useCallback(async (noteId) => {
    setIsLoading(true);
    try {
      await onDeleteNote(noteId);
      showToastNotification('Note deleted successfully');
      
      // Clear selection if deleted note was selected
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setEditingNote(null);
        setMobileActiveSection('notes');
      }
    } catch (error) {
      showToastNotification('Failed to delete note', true);
      console.error('Error deleting note:', error);
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  }, [onDeleteNote, selectedNote, showToastNotification]);

  const handleNoteDuplicate = useCallback(async (note) => {
    try {
      const duplicatedNote = {
        ...note,
        id: null,
        title: `${note.title} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await onSaveNote(duplicatedNote);
      showToastNotification('Note duplicated successfully');
    } catch (error) {
      showToastNotification('Failed to duplicate note', true);
      console.error('Error duplicating note:', error);
    }
  }, [onSaveNote, showToastNotification]);

  const handleNotePin = useCallback(async (note) => {
    try {
      const updatedNote = {
        ...note,
        pinned: !note.pinned
      };
      
      await onSaveNote(updatedNote);
      showToastNotification(note.pinned ? 'Note unpinned' : 'Note pinned');
    } catch (error) {
      showToastNotification('Failed to update note', true);
      console.error('Error pinning/unpinning note:', error);
    }
  }, [onSaveNote, showToastNotification]);

  const handleNoteMove = useCallback((note) => {
    setShowFolderSelector(true);
    // Store the note to be moved
    setSelectedNote(note);
  }, []);

  // Folder management
  const handleFolderSelect = useCallback((folderId) => {
    setSelectedFolder(folderId);
    setSelectedTags([]); // Clear tag filters when selecting folder
    setMobileActiveSection('notes');
  }, []);

  const handleFolderCreate = useCallback(async (folderData) => {
    try {
      await onCreateFolder(folderData);
      showToastNotification('Folder created successfully');
      setShowNewFolderModal(false);
    } catch (error) {
      showToastNotification('Failed to create folder', true);
      console.error('Error creating folder:', error);
    }
  }, [onCreateFolder, showToastNotification]);

  const handleFolderDelete = useCallback(async (folderId) => {
    try {
      await onDeleteFolder(folderId);
      showToastNotification('Folder deleted successfully');
      
      // Clear selection if deleted folder was selected
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
      }
    } catch (error) {
      showToastNotification('Failed to delete folder', true);
      console.error('Error deleting folder:', error);
    }
  }, [onDeleteFolder, selectedFolder, showToastNotification]);

  const handleFolderRename = useCallback((folder) => {
    // This would typically open a rename modal
    // For now, we'll use a simple prompt
    const newName = prompt('Enter new folder name:', folder.name);
    if (newName && newName.trim() && newName !== folder.name) {
      // Call update folder function
      console.log('Rename folder:', folder.id, 'to', newName);
    }
  }, []);

  // Tag management
  const handleTagSelect = useCallback((tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  const handleTagFilter = useCallback((tag) => {
    handleTagSelect(tag);
  }, [handleTagSelect]);

  // Search
  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // Modal handlers
  const handleToggleNewFolderModal = useCallback(() => {
    setShowNewFolderModal(prev => !prev);
  }, []);

  const handleToggleDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(prev => !prev);
  }, []);

  const handleToggleFolderSelector = useCallback(() => {
    setShowFolderSelector(prev => !prev);
  }, []);

  // Input handlers
  const handleTitleChange = useCallback((value) => {
    setNoteTitle(value);
  }, []);

  const handleContentChange = useCallback((value) => {
    setNoteContent(value);
  }, []);

  const handleFolderChange = useCallback((value) => {
    setNoteFolder(value);
  }, []);

  return {
    // State
    folders,
    notes,
    filteredNotes,
    allTags,
    isLoading,
    isSaving,
    mobileActiveSection,
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
    isMobile,
    
    // Actions
    setMobileActiveSection: handleMobileSectionChange,
    setSearchQuery: handleSearchChange,
    setSortBy,
    setViewMode,
    setShowFilters,
    
    // Note handlers
    onNoteSelect: handleNoteSelect,
    onNoteCreate: handleNoteCreate,
    onNoteEdit: handleNoteEdit,
    onNoteDelete: handleNoteDelete,
    onNoteDuplicate: handleNoteDuplicate,
    onNotePin: handleNotePin,
    onNoteMove: handleNoteMove,
    onSaveNote: handleSaveNote,
    onCancelEdit: handleCancelEdit,
    
    // Folder handlers
    onFolderSelect: handleFolderSelect,
    onFolderCreate: handleFolderCreate,
    onFolderDelete: handleFolderDelete,
    onFolderRename: handleFolderRename,
    
    // Tag handlers
    onTagSelect: handleTagSelect,
    onTagFilter: handleTagFilter,
    
    // Modal handlers
    onToggleNewFolderModal: handleToggleNewFolderModal,
    onToggleDeleteConfirm: handleToggleDeleteConfirm,
    onToggleFolderSelector: handleToggleFolderSelector,
    
    // Input handlers
    onTitleChange: handleTitleChange,
    onContentChange: handleContentChange,
    onFolderChange: handleFolderChange,
    
    // Utility
    showToastNotification
  };
};