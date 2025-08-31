// app/routes/app._index.jsx
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

import {
  Page,
  Card,
  TextField,
  Button,
  Text,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import { useState, useEffect } from "react";

// Client-only Quill component
function ClientQuill({ value, onChange, placeholder }) {
  const [QuillComponent, setQuillComponent] = useState(null);
  const [isClient, setIsClient] = useState(false);

  // Remove emoji characters from input
  const removeEmojis = (str) => {
    if (!str) return str;
    // Remove emoji characters using regex
    return str.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]/gu, '');
  };

  // Filter emojis from the onChange callback
  const handleChange = (content, delta, source, editor) => {
    const filteredContent = removeEmojis(content);
    if (content !== filteredContent) {
      // If emojis were detected, update the editor with filtered content
      editor.setText(removeEmojis(editor.getText()));
    }
    onChange(filteredContent);
  };

  useEffect(() => {
    setIsClient(true);
    import("react-quill").then((module) => {
      setQuillComponent(() => module.default);
      // Import CSS dynamically
      import("react-quill/dist/quill.snow.css");
    });
  }, []);

  if (!isClient || !QuillComponent) {
    return (
      <div style={{
        border: "1px solid #c9cccf",
        borderRadius: "4px",
        padding: "12px",
        minHeight: "300px",
        backgroundColor: "#f6f6f7",
        color: "#6d7175"
      }}>
        Loading editor...
      </div>
    );
  }

  return (
    <QuillComponent
      value={value}
      onChange={handleChange}
      style={{ height: "300px", marginBottom: "20px" }}
      modules={{
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'align': [] }],
          ['link', 'image'],
          ['clean']
        ]
      }}
      placeholder={placeholder}
      onPaste={(e) => {
        // Filter emojis from pasted content
        const pastedText = e.clipboardData.getData('text/plain');
        const filteredText = removeEmojis(pastedText);
        if (pastedText !== filteredText) {
          e.preventDefault();
          // Insert filtered text
          const quill = e.target.quill;
          if (quill) {
            const range = quill.getSelection();
            quill.insertText(range.index, filteredText);
          }
        }
      }}
    />
  );
}

/* ------------------ Loader ------------------ */
export async function loader({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const folders = await prisma.folder.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });

  const notes = await prisma.note.findMany({
    where: { shopId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      tags: true,
      folderId: true,
      folder: {
        select: {
          id: true,
          name: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });



  return json({ folders, notes }, {
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

/* ------------------ Action ------------------ */
export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const form = await request.formData();
  const intent = form.get("_intent");





  if (intent === "rename-folder") {
    const folderId = form.get("folderId");
    const newName = (form.get("newName") || "").toString().trim();
    if (folderId && newName) {
      await prisma.folder.update({
        where: { id: folderId },
        data: { name: newName },
      });
    }
    return redirect("/app");
  }

  if (intent === "move-folder-up") {
    const folderId = form.get("folderId");
    if (folderId) {
      const allFolders = await prisma.folder.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
      });
      const currentIndex = allFolders.findIndex(f => f.id === folderId);
      if (currentIndex > 0) {
        const currentFolder = allFolders[currentIndex];
        const prevFolder = allFolders[currentIndex - 1];
        
        // Simply set the current folder's createdAt to be newer than the previous folder
        const newTimestamp = new Date(prevFolder.createdAt.getTime() + 1000);
        
        await prisma.folder.update({
          where: { id: folderId },
          data: { createdAt: newTimestamp },
        });
      }
    }
    return redirect("/app");
  }

  if (intent === "move-folder-down") {
    const folderId = form.get("folderId");
    if (folderId) {
      const allFolders = await prisma.folder.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
      });
      const currentIndex = allFolders.findIndex(f => f.id === folderId);
      if (currentIndex < allFolders.length - 1) {
        const currentFolder = allFolders[currentIndex];
        const nextFolder = allFolders[currentIndex + 1];
        
        // Simply set the current folder's createdAt to be older than the next folder
        const newTimestamp = new Date(nextFolder.createdAt.getTime() - 1000);
        
        await prisma.folder.update({
          where: { id: folderId },
          data: { createdAt: newTimestamp },
        });
      }
    }
    return redirect("/app");
  }

  if (intent === "delete-folder") {
    const folderId = form.get("folderId");
    if (folderId) {
      // Delete all notes in the folder first, then delete the folder
      await prisma.note.deleteMany({
        where: { folderId },
      });
      await prisma.folder.delete({
        where: { id: folderId },
      });
    }
    return redirect("/app");
  }

  return redirect("/app");
}

/* ------------------ UI ------------------ */
export default function Index() {
  const { folders, notes } = useLoaderData();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [folderId, setFolderId] = useState("");
  const [folderName, setFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);
  
  // Update folderId when selectedFolder changes
  useEffect(() => {
    if (selectedFolder) {
      setFolderId(selectedFolder);
    } else {
      setFolderId("");
    }
  }, [selectedFolder]);
  const [openFolderMenu, setOpenFolderMenu] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState(""); // "error" or "success"
  
  // Note editing states
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [openNoteMenu, setOpenNoteMenu] = useState(null);
  const [showDeleteNoteConfirm, setShowDeleteNoteConfirm] = useState(null);
  const [showChangeFolderModal, setShowChangeFolderModal] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(null);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(null);
  const [showTagPopup, setShowTagPopup] = useState(null);
  const [tagPopupPosition, setTagPopupPosition] = useState({ x: 0, y: 0 });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [highlightFolders, setHighlightFolders] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [noteTags, setNoteTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState("");
  
  // Multi-select states
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [showDeleteMultipleConfirm, setShowDeleteMultipleConfirm] = useState(false);
  
  // Duplicate note states
  const [showDuplicateModal, setShowDuplicateModal] = useState(null);
  const [duplicateFolderId, setDuplicateFolderId] = useState("");
  


  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close folder menu if clicking outside
      if (openFolderMenu && !event.target.closest('.folder-menu-container')) {
        setOpenFolderMenu(null);
      }
      
      // Close note menu if clicking outside
      if (openNoteMenu && !event.target.closest('.note-menu-container')) {
        setOpenNoteMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openFolderMenu, openNoteMenu]);

  // Debug state changes
  useEffect(() => {
    console.log('showDuplicateModal changed:', showDuplicateModal);
  }, [showDuplicateModal]);

  useEffect(() => {
    console.log('showMoveModal changed:', showMoveModal);
  }, [showMoveModal]);

  // Track unsaved changes
  useEffect(() => {
    if (!editingNoteId) {
      setHasUnsavedChanges(false);
      return;
    }

    const currentNote = notes.find(note => note.id === editingNoteId);
    if (!currentNote) {
      setHasUnsavedChanges(false);
      return;
    }

    const hasChanges = 
      title !== (currentNote.title || "") ||
      body !== (currentNote.content || "") ||
      JSON.stringify(noteTags) !== JSON.stringify(currentNote.tags || []);

    setHasUnsavedChanges(hasChanges);
  }, [title, body, noteTags, editingNoteId, notes]);

  // Restore selected note and folder from localStorage on page load
  useEffect(() => {
    const savedNoteId = localStorage.getItem('selectedNoteId');
    const savedFolderId = localStorage.getItem('selectedFolderId');
    
    if (savedNoteId && savedFolderId) {
      // Find the note in the current notes list
      const noteToSelect = notes.find(note => note.id === savedNoteId);
      if (noteToSelect) {
        setEditingNoteId(savedNoteId);
        setTitle(noteToSelect.title || "");
        setBody(noteToSelect.content || "");
        setFolderId(savedFolderId);
        setSelectedFolder(savedFolderId);
      }
      // Clear localStorage after restoring state
      localStorage.removeItem('selectedNoteId');
      localStorage.removeItem('selectedFolderId');
    }
  }, [notes]);

  const folderOptions = [
    { label: "No folder", value: "" },
    ...folders.map((f) => ({ label: f.name, value: String(f.id) })),
  ];

  const moveFolderOptions = folders.map((f) => ({ label: f.name, value: String(f.id) }));

  // Filter notes based on selected folder and search queries
  const filteredNotes = notes.filter(note => {
    // First filter by selected folder
    const folderMatch = selectedFolder ? note.folderId === selectedFolder : true;
    
    // Handle tag filtering
    let globalSearchMatch = true;
    if (globalSearchQuery) {
      if (globalSearchQuery.startsWith('tag:')) {
        // Tag-specific search
        const tagName = globalSearchQuery.substring(4).toLowerCase();
        globalSearchMatch = note.tags && note.tags.some(tag => tag.toLowerCase() === tagName);
      } else {
        // Regular search
        globalSearchMatch = 
          note.title?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
          note.content?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
          (note.tags && note.tags.some(tag => tag.toLowerCase().includes(globalSearchQuery.toLowerCase())));
      }
    }
    
    const folderSearchMatch = !folderSearchQuery || 
      note.title?.toLowerCase().includes(folderSearchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(folderSearchQuery.toLowerCase()) ||
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(folderSearchQuery.toLowerCase())));
    
    return folderMatch && globalSearchMatch && folderSearchMatch;
  });

  // Handle clicking on a note to edit it
  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setTitle(note.title || "");
    setBody(note.content || "");
    setFolderId(note.folderId || "");
    setNoteTags(note.tags || []);
    setHasUnsavedChanges(false);
    // Automatically select the folder associated with this note
    if (note.folderId) {
      setSelectedFolder(note.folderId);
    }
  };

  // Remove emoji characters from input
  const removeEmojis = (str) => {
    if (!str) return str;
    // Remove emoji characters using regex
    return str.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]/gu, '');
  };

  // Handle saving note changes
  const handleSaveNote = async () => {
    const trimmedTitle = removeEmojis(title.trim());
    const trimmedBody = removeEmojis(body.trim());
    const trimmedFolderId = folderId.trim();

    // Check if at least title or body is provided
    if (!trimmedTitle && !trimmedBody) {
      setAlertMessage('Please provide a title or content for the note');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
      return;
    }

    // Check if a folder is selected
    if (!trimmedFolderId) {
      setAlertMessage('Please select a folder for the note');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
      return;
    }

    const formData = new FormData();
    formData.append('noteId', editingNoteId);
    formData.append('title', trimmedTitle);
    formData.append('body', trimmedBody);
    formData.append('folderId', trimmedFolderId);
    formData.append('tags', JSON.stringify(noteTags.map(tag => removeEmojis(tag))));
    

    
    try {
      const response = await fetch('/api/update-note', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Charset': 'utf-8'
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Store current context before clearing
          const currentFolderId = selectedFolder;
          const currentNoteId = editingNoteId;
          
          // Clear the form
          setEditingNoteId(null);
          setTitle('');
          setBody('');
          setFolderId('');
          setNoteTags([]);
          
          // Reload the page but maintain context
          window.location.reload();
          
          // After reload, restore context (this will be handled by the useEffect that checks localStorage)
          localStorage.setItem('selectedNoteId', currentNoteId);
          localStorage.setItem('selectedFolderId', currentFolderId);
        } else {
          setAlertMessage(result.error || 'Failed to update note');
          setAlertType('error');
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        setAlertMessage('Failed to update note');
        setAlertType('error');
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error updating note:', error);
      setAlertMessage('Failed to update note');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  // Handle creating a new note
  const handleNewNote = async () => {
    const currentFolderId = selectedFolder || "";
    
    if (!currentFolderId) {
      setAlertMessage('Please select a folder first');
      setAlertType('error');
      // Highlight the folders column to draw attention
      setHighlightFolders(true);
      setTimeout(() => setHighlightFolders(false), 3000);
      setTimeout(() => setAlertMessage(''), 3000);
      return;
    }

    // If there's an open note being edited, save it first
    if (editingNoteId && (title.trim() || body.trim())) {
      const trimmedTitle = removeEmojis(title.trim());
      const trimmedBody = removeEmojis(body.trim());
      const trimmedFolderId = folderId.trim();

      if (!trimmedBody) {
        setAlertMessage('Please provide content for the note');
        setAlertType('error');
        setTimeout(() => setAlertMessage(''), 3000);
        return;
      }

      const formData = new FormData();
      formData.append('noteId', editingNoteId);
      formData.append('title', trimmedTitle);
      formData.append('body', trimmedBody);
      formData.append('folderId', trimmedFolderId);
      formData.append('tags', JSON.stringify(noteTags.map(tag => removeEmojis(tag))));
      

      
      try {
        const response = await fetch('/api/update-note', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8'
          },
          body: formData
        });
        
        if (!response.ok) {
          const result = await response.json();
          setAlertMessage(result.error || 'Failed to save current note');
          setAlertType('error');
          setTimeout(() => setAlertMessage(''), 3000);
          return;
        }
      } catch (error) {
        console.error('Error saving current note:', error);
        setAlertMessage('Failed to save current note');
        setAlertType('error');
        setTimeout(() => setAlertMessage(''), 3000);
        return;
      }
    }

    // Now create the new note
    const formData = new FormData();
    formData.append('title', '');
    formData.append('body', 'Type your note here...');
    formData.append('folderId', currentFolderId);
    formData.append('tags', JSON.stringify([]));
    

    
    try {
      const response = await fetch('/api/create-note', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Charset': 'utf-8'
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Store the new note and folder IDs in localStorage before reload
          localStorage.setItem('selectedNoteId', result.noteId);
          localStorage.setItem('selectedFolderId', currentFolderId);
          // Reload to get the updated note list
          window.location.reload();
        } else {
          setAlertMessage(result.error || 'Failed to create new note');
          setAlertType('error');
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        setAlertMessage('Failed to create new note');
        setAlertType('error');
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error creating new note:', error);
      setAlertMessage('Failed to create new note');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  // Handle canceling note edit
  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setTitle('');
    setBody('');
    setFolderId('');
    setNoteTags([]);
    setHasUnsavedChanges(false);
  };

  // Handle deleting a note
  const handleDeleteNote = async (noteId) => {
    const formData = new FormData();
    formData.append('noteId', noteId);
    
    try {
      const response = await fetch('/api/delete-note', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Charset': 'utf-8'
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setShowDeleteNoteConfirm(null);
          window.location.reload();
        } else {
          setAlertMessage(result.error || 'Failed to delete note');
          setAlertType('error');
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        setAlertMessage('Failed to delete note');
        setAlertType('error');
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      setAlertMessage('Failed to delete note');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  // Handle duplicating a note
  const handleDuplicateNote = async () => {
    if (!showDuplicateModal) return;
    
    const formData = new FormData();
    formData.append('noteId', showDuplicateModal);
    formData.append('targetFolderId', duplicateFolderId);
    
    try {
      const response = await fetch('/api/duplicate-note', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Charset': 'utf-8'
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setShowDuplicateModal(null);
          setDuplicateFolderId("");
          window.location.reload();
        } else {
          setAlertMessage(result.error || 'Failed to duplicate note');
          setAlertType('error');
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        setAlertMessage('Failed to duplicate note');
        setAlertType('error');
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error duplicating note:', error);
      setAlertMessage('Failed to duplicate note');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  // Handle moving a note or multiple notes
  const handleMoveNote = async (moveType) => {
    if (!duplicateFolderId) return;
    
    try {
      if (moveType === 'bulk') {
        // Move multiple notes
        const movePromises = selectedNotes.map(noteId => {
          const formData = new FormData();
          formData.append('noteId', noteId);
          formData.append('folderId', duplicateFolderId);
          return fetch('/api/move-note', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-Charset': 'utf-8'
            },
            body: formData
          });
        });
        
        await Promise.all(movePromises);
        setSelectedNotes([]);
        setShowMoveModal(null);
        setDuplicateFolderId("");
        window.location.reload();
      } else {
        // Move single note
        const formData = new FormData();
        formData.append('noteId', moveType);
        formData.append('folderId', duplicateFolderId);
        
        const response = await fetch('/api/move-note', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8'
          },
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setShowMoveModal(null);
            setDuplicateFolderId("");
            window.location.reload();
          } else {
            setAlertMessage(result.error || 'Failed to move note');
            setAlertType('error');
            setTimeout(() => setAlertMessage(''), 3000);
          }
        } else {
          setAlertMessage('Failed to move note');
          setAlertType('error');
          setTimeout(() => setAlertMessage(''), 3000);
        }
      }
    } catch (error) {
      console.error('Error moving note(s):', error);
      setAlertMessage('Failed to move note(s)');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  // Handle deleting multiple notes
  const handleDeleteMultipleNotes = async () => {
    if (selectedNotes.length === 0) return;
    
    try {
      const deletePromises = selectedNotes.map(noteId => {
        const formData = new FormData();
        formData.append('noteId', noteId);
        return fetch('/api/delete-note', {
          method: 'POST',
          body: formData
        });
      });
      
      await Promise.all(deletePromises);
      setSelectedNotes([]);
      setShowDeleteMultipleConfirm(false);
      window.location.reload();
    } catch (error) {
      console.error('Error deleting multiple notes:', error);
      setAlertMessage('Failed to delete some notes');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  // Handle note selection for multi-select
  const handleNoteSelection = (noteId) => {
    setSelectedNotes(prev => {
      if (prev.includes(noteId)) {
        return prev.filter(id => id !== noteId);
      } else {
        return [...prev, noteId];
      }
    });
  };

  // Handle creating a new note or updating existing note
  const handleCreateNote = async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const trimmedFolderId = folderId.trim();

    // Check if at least title or body is provided
    if (!trimmedTitle && !trimmedBody) {
      setAlertMessage('Please provide a title or content for the note');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
      return;
    }

    // Check if a folder is selected
    if (!trimmedFolderId) {
      setAlertMessage('Please select a folder for the note');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
      return;
    }

    const formData = new FormData();
    formData.append('title', trimmedTitle);
    formData.append('body', trimmedBody);
    formData.append('folderId', trimmedFolderId);
    formData.append('tags', JSON.stringify(noteTags));
    
    try {
      const endpoint = editingNoteId ? '/api/update-note' : '/api/create-note';
      if (editingNoteId) {
        formData.append('noteId', editingNoteId);
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Store current context before clearing
          const currentFolderId = selectedFolder;
          const newNoteId = result.noteId; // For new notes, we get the ID back
          
          // Clear the form
          setEditingNoteId(null);
          setTitle('');
          setBody('');
          setFolderId('');
          setNoteTags([]);
          
          // Reload the page but maintain context
          window.location.reload();
          
          // After reload, restore context (this will be handled by the useEffect that checks localStorage)
          localStorage.setItem('selectedNoteId', newNoteId || editingNoteId);
          localStorage.setItem('selectedFolderId', currentFolderId);
        } else {
          setAlertMessage(result.error || 'Failed to save note');
          setAlertType('error');
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        setAlertMessage('Failed to save note');
        setAlertType('error');
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      setAlertMessage('Failed to save note');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  // Handle creating a new folder
  const handleCreateFolder = async () => {
    const trimmedName = folderName.trim();
    if (!trimmedName) {
      setAlertMessage('Folder name cannot be empty');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
      return;
    }

    const formData = new FormData();
    formData.append('name', trimmedName);
    
    try {
      const response = await fetch('/api/create-folder', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setFolderName(''); // Clear the input
          window.location.reload();
        } else {
          setAlertMessage(result.error || 'Failed to create folder');
          setAlertType('error');
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        setAlertMessage('Failed to create folder');
        setAlertType('error');
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      setAlertMessage('Failed to create folder');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  // Handle saving folder name
  const handleSaveFolderName = async (folderId) => {
    const trimmedName = editingFolderName.trim();
    if (!trimmedName) {
      setAlertMessage('Folder name cannot be empty');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
      return;
    }

    const formData = new FormData();
    formData.append('folderId', folderId);
    formData.append('newName', trimmedName);
    
    try {
      const response = await fetch('/api/rename-folder', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          window.location.reload();
        } else {
          setAlertMessage(result.error || 'Failed to rename folder');
          setAlertType('error');
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        setAlertMessage('Failed to rename folder');
        setAlertType('error');
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error renaming folder:', error);
      setAlertMessage('Failed to rename folder');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

      return (
      <Page title="scriberr" style={{ paddingBottom: "40px" }}>
        {/* Material Symbols Rounded CDN */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

        {/* Global Styles - Always Applied */}
                  <style>{`
          /* Material Symbols Rounded font settings */
          .material-symbols-rounded {
            font-family: 'Material Symbols Rounded';
            font-weight: normal;
            font-style: normal;
            font-size: 24px;
            line-height: 1;
            letter-spacing: normal;
            text-transform: none;
            display: inline-block;
            white-space: nowrap;
            word-wrap: normal;
            direction: ltr;
            -webkit-font-feature-settings: 'liga';
            -webkit-font-smoothing: antialiased;
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
            padding-right: 5px;
          }
          
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
          
          /* Mobile responsive layout */
          @media (max-width: 768px) {
            .app-layout {
              flex-direction: column;
              height: auto;
            }
            .col-folders,
            .col-notes,
            .col-editor {
              width: 100% !important;
            }
            .Polaris-Card {
              margin-bottom: 12px;
            }
          }
          
          /* Tablet responsive layout */
          @media (min-width: 769px) and (max-width: 1200px) {
            .app-layout {
              flex-wrap: wrap;
              height: auto;
            }
            .col-folders,
            .col-notes {
              width: 50% !important;
            }
            .col-editor {
              width: 100% !important;
            }
            .Polaris-Card {
              margin-bottom: 12px;
            }
          }

          /* Desktop wide layout */
          @media (min-width: 1201px) {
            .app-layout {
              width: 100%;
            }
            .col-folders { width: 23% !important; }
            .col-notes   { width: 23% !important; }
            .col-editor  { width: 54% !important; }
          }
          
          /* Note card responsive layout */
          @media (max-width: 640px) {
            .note-grid {
              grid-template-columns: 1fr !important;
            }
            .note-grid aside {
              order: -1;
              margin-bottom: 16px;
            }
          }
          
          /* Ensure no overflow issues */
          .note-grid {
            overflow: visible !important;
          }
          
          .note-grid > div,
          .note-grid > aside {
            overflow: visible !important;
          }
          
          /* Preview text clamp fallback */
          .preview-clip {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            max-height: calc(1.4em * 2);
          }
          
          body, html {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          body {
            padding-bottom: 40px !important;
          }
          
          .Polaris-Page {
            max-width: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
          
          .Polaris-Page__Content {
            max-width: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
          
          .Polaris-Layout {
            max-width: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
          
          .Polaris-Layout__Section {
            max-width: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
          
                        .Polaris-Card {
                width: 100% !important;
              }
              
              /* Quill Editor Styles */
              .ql-editor {
                min-height: 250px !important;
                font-size: 14px !important;
                line-height: 1.5 !important;
              }
              
              .ql-toolbar {
                border-top-left-radius: 4px !important;
                border-top-right-radius: 4px !important;
                border-bottom: 1px solid #c9cccf !important;
              }
              
              .ql-container {
                border-bottom-left-radius: 4px !important;
                border-bottom-right-radius: 4px !important;
                border: 1px solid #c9cccf !important;
              }
        `}</style>

        {/* Custom Alert */}
        {alertMessage && (
          <div style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "12px 16px",
            borderRadius: "6px",
            color: "white",
            fontSize: "14px",
            fontWeight: "500",
            zIndex: 3000,
            maxWidth: "300px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            animation: "slideIn 0.3s ease-out",
            backgroundColor: alertType === 'error' ? "#d82c0d" : "#008060"
          }}>
            {alertMessage}
          </div>
        )}
        
        <div className="app-layout" style={{ display: "flex", gap: "16px", minHeight: "calc(100vh - 240px)", paddingBottom: "40px" }}>
        {/* FOLDERS */}
        <div className="col-folders" style={{ width: "25%" }}>
        <Card
          style={{
            transition: "all 0.3s ease",
            ...(highlightFolders && {
              backgroundColor: "#fff3cd",
              border: "2px solid #ffc107",
              borderRadius: "8px",
              boxShadow: "0 0 20px rgba(255, 193, 7, 0.3)"
            })
          }}
        >
                      <div style={{ padding: "16px" }}>
              <Text as="h2" variant="headingLg" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span className="material-symbols-rounded">home_storage</span>
                Folders
              </Text>
            </div>
                      <div style={{ padding: "16px" }}>
              <div style={{ marginBottom: "24px", position: "relative" }}>
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
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  placeholder="Search all notes..."
                  onFocus={(e) => {
                    e.target.style.boxShadow = "0 0 0 2px #16A34A, 0 1px 2px rgba(0,0,0,0.05)";
                    e.target.style.backgroundColor = "#FFFFFF";
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
                    e.target.style.backgroundColor = "#FAFAF8";
                  }}
                />
                <span 
                  className="material-symbols-rounded"
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
                  search
                </span>
              </div>
              {/* All Notes Button - Separated from folder list */}
              <div 
                style={{ 
                  padding: "12px 16px", 
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  backgroundColor: selectedFolder === null ? "#E8F5E8" : "#F8F9FA",
                  border: selectedFolder === null ? "2px solid #0a0" : "2px solid #E1E3E5",
                  borderRadius: "12px",
                  position: "relative",
                  transition: "all 0.2s ease",
                  boxShadow: selectedFolder === null ? "0 2px 8px rgba(10, 0, 0, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.05)"
                }}
                onClick={() => setSelectedFolder(null)}
                onMouseEnter={(e) => {
                  if (selectedFolder !== null) {
                    e.currentTarget.style.backgroundColor = "#E8F5E8";
                    e.currentTarget.style.borderColor = "#0a0";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(10, 0, 0, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedFolder !== null) {
                    e.currentTarget.style.backgroundColor = "#F8F9FA";
                    e.currentTarget.style.borderColor = "#E1E3E5";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                  }
                }}
              >
                <Text as="span" variant="headingSm" style={{ 
                  fontWeight: "700", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px",
                  color: selectedFolder === null ? "#0a0" : "#374151"
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: "20px" }}>note_stack</span>
                  All Notes
                </Text>
              </div>

              {folders.length === 0 ? (
                <Text as="p">No folders yet</Text>
              ) : (
                <div>
                {folders.map((folder) => (
                  <div key={folder.id} style={{ 
                    padding: "8px 16px", 
                    borderBottom: "1px solid #e1e3e5",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                                                  backgroundColor: selectedFolder === folder.id ? "#f6f6f7" : "transparent",
                              borderRight: selectedFolder === folder.id ? "3px solid #0a0" : "none",
                    borderRadius: "8px",
                    position: "relative",
                    transition: "background-color 0.2s ease"
                  }}
                  onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}
                  onMouseEnter={(e) => {
                    if (selectedFolder !== folder.id) {
                      e.currentTarget.style.backgroundColor = "#f0f0f0";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFolder !== folder.id) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                  >
                    <Text as="span" variant="headingSm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="material-symbols-rounded" style={{ fontSize: "18px" }}>folder</span>
                      {folder.name}
                    </Text>
                    <div className="folder-menu-container" style={{ position: "relative", paddingRight: "8px" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFolderMenu(openFolderMenu === folder.id ? null : folder.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          fontSize: "16px"
                        }}
                      >
                        ⋯
                      </button>
                      {openFolderMenu === folder.id && (
                        <div style={{
                          position: "absolute",
                          right: "0",
                          top: "100%",
                          backgroundColor: "white",
                          border: "1px solid #c9cccf",
                          borderRadius: "4px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          zIndex: 1000,
                          minWidth: "150px"
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowRenameFolderModal(folder.id);
                              setEditingFolderName(folder.name);
                              setOpenFolderMenu(null);
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "8px 12px",
                              border: "none",
                              background: "none",
                              textAlign: "left",
                              cursor: "pointer"
                            }}
                          >
                            Rename Folder
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const formData = new FormData();
                              formData.append('folderId', folder.id);
                              formData.append('direction', 'up');
                              
                              try {
                                const response = await fetch('/api/reorder-folders', {
                                  method: 'POST',
                                  body: formData
                                });
                                if (response.ok) {
                                  window.location.reload();
                                }
                              } catch (error) {
                                console.error('Error moving folder:', error);
                              }
                              setOpenFolderMenu(null);
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "8px 12px",
                              border: "none",
                              background: "none",
                              textAlign: "left",
                              cursor: "pointer"
                            }}
                          >
                            Move Folder Up
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const formData = new FormData();
                              formData.append('folderId', folder.id);
                              formData.append('direction', 'down');
                              
                              try {
                                const response = await fetch('/api/reorder-folders', {
                                  method: 'POST',
                                  body: formData
                                });
                                if (response.ok) {
                                  window.location.reload();
                                }
                              } catch (error) {
                                console.error('Error moving folder:', error);
                              }
                              setOpenFolderMenu(null);
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "8px 12px",
                              border: "none",
                              background: "none",
                              textAlign: "left",
                              cursor: "pointer"
                            }}
                          >
                            Move Folder Down
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowDeleteConfirm(folder.id);
                              setOpenFolderMenu(null);
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "8px 12px",
                              border: "none",
                              background: "none",
                              textAlign: "left",
                              cursor: "pointer",
                              color: "#d82c0d"
                            }}
                          >
                            Delete Folder
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
            <div style={{ padding: "16px" }}>
              <InlineStack gap="300" align="center">
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                    New folder name
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      style={{
                        border: "none",
                        outline: "none",
                        fontSize: "14px",
                        color: "#202223",
                        padding: "8px 0",
                        borderBottom: "1px solid #e1e3e5",
                        cursor: "text",
                        width: "100%",
                        backgroundColor: "transparent",
                        fontFamily: "inherit",
                        transition: "border-color 0.2s ease"
                      }}
                      value={folderName}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (newValue.length <= 30) {
                          setFolderName(newValue);
                        }
                      }}
                      placeholder="Enter folder name..."
                      maxLength={30}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateFolder();
                        }
                      }}
                      onFocus={(e) => {
                        e.target.style.borderBottomColor = "#008060";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderBottomColor = "#e1e3e5";
                      }}
                    />
                    {folderName.length >= 30 && (
                      <div style={{
                        position: "absolute",
                        top: "-30px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "#374151",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                        zIndex: 1000,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                      }}>
                        Maximum 30 characters reached
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={handleCreateFolder}
                  style={{
                    backgroundColor: "#000000",
                    border: "0",
                    color: "white",
                    padding: "7px 20px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    textAlign: "center",
                    textDecoration: "none",
                    transition: "all 250ms",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    touchAction: "manipulation",
                    height: "5%",
                    marginTop: "30px",
                    boxShadow: "rgba(0, 0, 0, .2) 0 -25px 18px -14px inset, rgba(0, 0, 0, .15) 0 1px 2px, rgba(0, 0, 0, .15) 0 2px 4px, rgba(0, 0, 0, .15) 0 4px 8px, rgba(0, 0, 0, .15) 0 8px 16px, rgba(0, 0, 0, .15) 0 16px 32px"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = "rgba(0, 0, 0, .35) 0 -25px 18px -14px inset, rgba(0, 0, 0, .25) 0 1px 2px, rgba(0, 0, 0, .25) 0 2px 4px, rgba(0, 0, 0, .25) 0 4px 8px, rgba(0, 0, 0, .25) 0 8px 16px, rgba(0, 0, 0, .25) 0 16px 32px";
                    e.target.style.transform = "scale(1.05) rotate(-1deg)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = "rgba(0, 0, 0, .2) 0 -25px 18px -14px inset, rgba(0, 0, 0, .15) 0 1px 2px, rgba(0, 0, 0, .15) 0 2px 4px, rgba(0, 0, 0, .15) 0 4px 8px, rgba(0, 0, 0, .15) 0 8px 16px, rgba(0, 0, 0, .15) 0 16px 32px";
                    e.target.style.transform = "scale(1) rotate(0deg)";
                  }}
                >
                  New Folder
                </button>
              </InlineStack>
            </div>
          </Card>
        </div>

        {/* NOTES */}
        <div className="col-notes" style={{ width: "25%" }}>
          <Card>
            <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
               <div>
                 <Text as="h2" variant="headingLg" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                   <span className="material-symbols-rounded">note_stack</span>
                   Notes
                 </Text>
                 {selectedFolder && (
                   <Text as="h2" style={{ fontSize: "18px", fontWeight: "bold", color: "#202223", marginTop: "4px" }}>
                     {folders.find(f => f.id === selectedFolder)?.name}
                   </Text>
                 )}
               </div>
               <button 
                 onClick={handleNewNote}
                 style={{
                   backgroundColor: "#f57c00",
                   border: "0",
                   color: "white",
                   padding: "7px 20px",
                   borderRadius: "8px",
                   cursor: "pointer",
                   fontSize: "14px",
                   fontWeight: "500",
                   textAlign: "center",
                   textDecoration: "none",
                   transition: "all 250ms",
                   userSelect: "none",
                   WebkitUserSelect: "none",
                   touchAction: "manipulation",
                   boxShadow: "rgba(245, 124, 0, .2) 0 -25px 18px -14px inset, rgba(245, 124, 0, .15) 0 1px 2px, rgba(245, 124, 0, .15) 0 2px 4px, rgba(245, 124, 0, .15) 0 4px 8px, rgba(245, 124, 0, .15) 0 8px 16px, rgba(245, 124, 0, .15) 0 16px 32px"
                 }}
                 onMouseEnter={(e) => {
                   e.target.style.boxShadow = "rgba(245, 124, 0, .35) 0 -25px 18px -14px inset, rgba(245, 124, 0, .25) 0 1px 2px, rgba(245, 124, 0, .25) 0 2px 4px, rgba(245, 124, 0, .25) 0 4px 8px, rgba(245, 124, 0, .25) 0 8px 16px, rgba(245, 124, 0, .25) 0 16px 32px";
                   e.target.style.transform = "scale(1.05) rotate(-1deg)";
                 }}
                 onMouseLeave={(e) => {
                   e.target.style.boxShadow = "rgba(245, 124, 0, .2) 0 -25px 18px -14px inset, rgba(245, 124, 0, .15) 0 1px 2px, rgba(245, 124, 0, .15) 0 2px 4px, rgba(245, 124, 0, .15) 0 4px 8px, rgba(245, 124, 0, .15) 0 8px 16px, rgba(245, 124, 0, .15) 0 16px 32px";
                   e.target.style.transform = "scale(1) rotate(0deg)";
                 }}
               >
                 New Note
               </button>
            </div>
           <div style={{ padding: "16px" }}>
              <div style={{ marginBottom: "24px", position: "relative" }}>
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
                  value={folderSearchQuery}
                  onChange={(e) => setFolderSearchQuery(e.target.value)}
                  placeholder="Search notes in folder..."
                  onFocus={(e) => {
                    e.target.style.boxShadow = "0 0 0 2px #16A34A, 0 1px 2px rgba(0,0,0,0.05)";
                    e.target.style.backgroundColor = "#FFFFFF";
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
                    e.target.style.backgroundColor = "#FAFAF8";
                  }}
                />
                <span 
                  className="material-symbols-rounded"
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
                  search
                </span>
              </div>
              
              {/* Multi-select action buttons */}
              {selectedNotes.length > 0 && (
                <div style={{ 
                  marginBottom: "24px",
                  display: "flex",
                  gap: "12px"
                }}>
                  <Button
                    variant="primary"
                    tone="critical"
                    onClick={() => setShowDeleteMultipleConfirm(true)}
                    style={{
                      backgroundColor: "#d82c0d",
                      border: "none",
                      color: "white",
                      padding: "12px 20px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#b91c1c";
                      e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#d82c0d";
                      e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                    }}
                  >
                    Delete {selectedNotes.length} Selected Note{selectedNotes.length > 1 ? 's' : ''}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setShowMoveModal('bulk')}
                    style={{
                      backgroundColor: "#374151",
                      border: "none",
                      color: "white",
                      padding: "12px 20px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#1F2937";
                      e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#374151";
                      e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                    }}
                  >
                    Move {selectedNotes.length} Selected Note{selectedNotes.length > 1 ? 's' : ''}
                  </Button>
                </div>
              )}
              
              {filteredNotes.length === 0 ? (
                <Text as="p" style={{ color: "#6B7280", fontSize: "14px", textAlign: "center", padding: "32px 0" }}>
                  {selectedFolder ? "No notes in this folder" : "No notes yet"}
                </Text>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {filteredNotes.map((note) => {
                    const createdDate = new Date(note.createdAt);
                    const updatedDate = new Date(note.updatedAt);
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const isSelected = editingNoteId === note.id;
                    const isCheckboxSelected = selectedNotes.includes(note.id);
                    
                    return (
                      <div 
                        key={note.id} 
                        style={{ 
                          display: "flex",
                          backgroundColor: "#FFFFFF",
                          borderRadius: "12px",
                          padding: "20px",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                          borderRight: isSelected ? "6px solid #0a0" : isCheckboxSelected ? "6px solid #FF8C00" : "6px solid transparent",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          marginBottom: "8px",
                          position: "relative",
                          zIndex: openNoteMenu === note.id ? 1000 : 1
                        }}
                        onClick={() => handleEditNote(note)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        {/* Left checkbox area */}
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            paddingRight: "12px"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isCheckboxSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleNoteSelection(note.id);
                            }}
                            style={{
                              width: "16px",
                              height: "16px",
                              transform: "scale(1.1)"
                            }}
                          />
                        </div>

                        {/* Right content area */}
                        <div style={{ 
                          display: "flex", 
                          flexDirection: "column", 
                          flex: "1",
                          minHeight: "0"
                        }}>
                          {/* Title section */}
                          <div style={{ 
                            fontWeight: "bold", 
                            fontSize: "18px", 
                            lineHeight: "1.2",
                            color: "#111827",
                            marginBottom: "12px",
                            paddingBottom: "8px",
                            borderBottom: "1px solid #E5E7EB"
                          }}>
                            {note.title || "(untitled)"}
                          </div>
                          
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between",
                            gap: "16px",
                            flex: "1"
                          }}>
                            <div style={{ 
                              flex: "1",
                              minWidth: "0",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px"
                            }}>
                              <div style={{ 
                                fontSize: "13px",
                                color: "#6B7280",
                                lineHeight: "1.4"
                              }}>
                                <strong style={{ color: "#374151" }}>Folder:</strong> {note.folder ? note.folder.name : "No folder"}
                              </div>
                              {note.tags && note.tags.length > 0 && (
                                <div style={{ 
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "4px",
                                  alignItems: "center"
                                }}>
                                  <strong style={{ 
                                    fontSize: "12px",
                                    color: "#374151",
                                    marginRight: "4px"
                                  }}>Tags:</strong>
                                  {note.tags.slice(0, 3).map((tag, index) => (
                                    <span key={index} style={{
                                      display: "inline-block",
                                      background: "#28a745",
                                      color: "white",
                                      fontSize: "11px",
                                      fontWeight: "600",
                                      padding: "3px 8px",
                                      borderRadius: "10px",
                                      lineHeight: "1.2"
                                    }}>
                                      {tag}
                                    </span>
                                  ))}
                                  {note.tags.length > 3 && (
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = e.target.getBoundingClientRect();
                                        setTagPopupPosition({ x: rect.left, y: rect.bottom + 5 });
                                        setShowTagPopup(note.id);
                                      }}
                                      style={{
                                        display: "inline-block",
                                        background: "#6B7280",
                                        color: "white",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                        padding: "3px 8px",
                                        borderRadius: "10px",
                                        lineHeight: "1.2",
                                        cursor: "pointer",
                                        transition: "background-color 0.2s ease"
                                      }}
                                      onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = "#4B5563";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = "#6B7280";
                                      }}
                                    >
                                      View All
                                    </span>
                                  )}
                                </div>
                              )}
                              <div style={{ 
                                fontSize: "12px", 
                                fontStyle: "italic", 
                                color: "#6B7280", 
                                lineHeight: "1.4"
                              }}>
                                <strong style={{ 
                                  fontStyle: "normal",
                                  color: "#374151"
                                }}>Preview:</strong> {note.content ? note.content.replace(/<[^>]*>/g, '').substring(0, 100) : "No content"}
                              </div>
                            </div>

                            {/* Right date side */}
                            <div style={{ 
                              display: "flex", 
                              flexDirection: "column", 
                              gap: "16px", 
                              alignItems: "center",
                              flexShrink: "0",
                              alignSelf: "flex-end"
                            }}>
                              <div>
                                <div style={{ 
                                  fontSize: "11px", 
                                  color: "#777", 
                                  fontWeight: "bold", 
                                  textAlign: "center", 
                                  marginBottom: "3px", 
                                  textTransform: "uppercase" 
                                }}>
                                  LAST EDITED
                                </div>
                                <div style={{
                                  background: "#f3f3f3",
                                  borderRadius: "10px",
                                  padding: "10px 15px",
                                  textAlign: "center",
                                  width: "80px",
                                  fontSize: "14px",
                                  color: "#333"
                                }}>
                                  <span style={{ 
                                    fontSize: "22px", 
                                    fontWeight: "bold", 
                                    display: "block" 
                                  }}>
                                    {updatedDate.getDate()}
                                  </span>
                                  <span style={{ 
                                    display: "block",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    textTransform: "uppercase"
                                  }}>
                                    {monthNames[updatedDate.getMonth()]}
                                  </span>
                                  <span style={{ 
                                    display: "block",
                                    fontSize: "11px",
                                    marginTop: "2px"
                                  }}>
                                    {updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div style={{ 
                                  fontSize: "11px", 
                                  color: "#777", 
                                  fontWeight: "bold", 
                                  textAlign: "center", 
                                  marginBottom: "3px", 
                                  textTransform: "uppercase" 
                                }}>
                                  NOTE CREATED
                                </div>
                                <div style={{
                                  background: "#f3f3f3",
                                  borderRadius: "10px",
                                  padding: "10px 15px",
                                  textAlign: "center",
                                  width: "80px",
                                  fontSize: "14px",
                                  color: "#333"
                                }}>
                                  <span style={{ 
                                    fontSize: "22px", 
                                    fontWeight: "bold", 
                                    display: "block" 
                                  }}>
                                    {createdDate.getDate()}
                                  </span>
                                  <span style={{ 
                                    display: "block",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    textTransform: "uppercase"
                                  }}>
                                    {monthNames[createdDate.getMonth()]}
                                  </span>
                                  <span style={{ 
                                    display: "block",
                                    fontSize: "11px",
                                    marginTop: "2px"
                                  }}>
                                    {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Buttons aligned bottom */}
                                                    <div 
                            className="note-menu-container"
                            style={{ 
                              display: "flex", 
                              gap: "8px",
                              marginTop: "12px",
                              justifyContent: "flex-end"
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenNoteMenu(openNoteMenu === note.id ? null : note.id);
                              }}
                              style={{
                                background: "orange",
                                color: "white",
                                fontWeight: "bold",
                                padding: "8px 16px",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer",
                                transition: "background 0.2s ease-in-out",
                                width: "fit-content",
                                fontSize: "12px"
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = "#e69500";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = "orange";
                              }}
                            >
                              MANAGE
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteNoteConfirm(note.id);
                              }}
                              style={{
                                background: "#dc2626",
                                color: "white",
                                fontWeight: "bold",
                                padding: "8px 16px",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer",
                                transition: "background 0.2s ease-in-out",
                                width: "fit-content",
                                fontSize: "12px"
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = "#b91c1c";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = "#dc2626";
                              }}
                            >
                              DELETE
                            </button>
                          </div>
                          
                          {openNoteMenu === note.id && (
                            <div 
                              className="note-menu-container"
                              style={{
                                position: "absolute",
                                top: "100%",
                                left: "0",
                                right: "0",
                                backgroundColor: "white",
                                border: "1px solid #E5E7EB",
                                borderRadius: "6px",
                                boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
                                zIndex: 99999,
                                marginTop: "4px"
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Duplicate button clicked for note:', note.id);
                                  setShowDuplicateModal(note.id);
                                  setOpenNoteMenu(null);
                                }}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "none",
                                  background: "none",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  color: "#374151"
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = "#F3F4F6";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = "transparent";
                                }}
                              >
                                Duplicate Note
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Move button clicked for note:', note.id);
                                  setShowMoveModal(note.id);
                                  setOpenNoteMenu(null);
                                }}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "none",
                                  background: "none",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  color: "#374151"
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = "#F3F4F6";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = "transparent";
                                }}
                              >
                                Move to Folder
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* NOTE EDITOR */}
        <div className="col-editor" style={{ width: "50%" }}>
          <Card>
            <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Text as="h2" variant="headingLg" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span className="material-symbols-rounded">edit_note</span>
                  Note Editor
                </Text>
                {hasUnsavedChanges && (
                  <Text as="p" style={{ 
                    fontSize: "14px", 
                    color: "#d82c0d", 
                    fontWeight: "500", 
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: "16px" }}>warning</span>
                    You have unsaved changes
                  </Text>
                )}
              </div>
              <InlineStack gap="200">
                {editingNoteId ? (
                  <>
                    <button 
                      onClick={handleSaveNote}
                      style={{
                        backgroundColor: "#2e7d32",
                        border: "0",
                        color: "white",
                        padding: "7px 20px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        textAlign: "center",
                        textDecoration: "none",
                        transition: "all 250ms",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        touchAction: "manipulation",
                        boxShadow: "rgba(46, 125, 50, .2) 0 -25px 18px -14px inset, rgba(46, 125, 50, .15) 0 1px 2px, rgba(46, 125, 50, .15) 0 2px 4px, rgba(46, 125, 50, .15) 0 4px 8px, rgba(46, 125, 50, .15) 0 8px 16px, rgba(46, 125, 50, .15) 0 16px 32px"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.boxShadow = "rgba(46, 125, 50, .35) 0 -25px 18px -14px inset, rgba(46, 125, 50, .25) 0 1px 2px, rgba(46, 125, 50, .25) 0 2px 4px, rgba(46, 125, 50, .25) 0 4px 8px, rgba(46, 125, 50, .25) 0 8px 16px, rgba(46, 125, 50, .25) 0 16px 32px";
                        e.target.style.transform = "scale(1.05) rotate(-1deg)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.boxShadow = "rgba(46, 125, 50, .2) 0 -25px 18px -14px inset, rgba(46, 125, 50, .15) 0 1px 2px, rgba(46, 125, 50, .15) 0 2px 4px, rgba(46, 125, 50, .15) 0 4px 8px, rgba(46, 125, 50, .15) 0 8px 16px, rgba(46, 125, 50, .15) 0 16px 32px";
                        e.target.style.transform = "scale(1) rotate(0deg)";
                      }}
                    >
                      Save Note
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      style={{
                        backgroundColor: "#6d7175",
                        border: "0",
                        color: "white",
                        padding: "7px 20px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        textAlign: "center",
                        textDecoration: "none",
                        transition: "all 250ms",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        touchAction: "manipulation",
                        boxShadow: "rgba(109, 113, 117, .2) 0 -25px 18px -14px inset, rgba(109, 113, 117, .15) 0 1px 2px, rgba(109, 113, 117, .15) 0 2px 4px, rgba(109, 113, 117, .15) 0 4px 8px, rgba(109, 113, 117, .15) 0 8px 16px, rgba(109, 113, 117, .15) 0 16px 32px"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.boxShadow = "rgba(109, 113, 117, .35) 0 -25px 18px -14px inset, rgba(109, 113, 117, .25) 0 1px 2px, rgba(109, 113, 117, .25) 0 2px 4px, rgba(109, 113, 117, .25) 0 4px 8px, rgba(109, 113, 117, .25) 0 8px 16px, rgba(109, 113, 117, .25) 0 16px 32px";
                        e.target.style.transform = "scale(1.05) rotate(-1deg)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.boxShadow = "rgba(109, 113, 117, .2) 0 -25px 18px -14px inset, rgba(109, 113, 117, .15) 0 1px 2px, rgba(109, 113, 117, .15) 0 2px 4px, rgba(109, 113, 117, .15) 0 4px 8px, rgba(109, 113, 117, .15) 0 8px 16px, rgba(109, 113, 117, .15) 0 16px 32px";
                        e.target.style.transform = "scale(1) rotate(0deg)";
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => setShowDeleteNoteConfirm(editingNoteId)}
                      style={{
                        backgroundColor: "#d82c0d",
                        border: "0",
                        color: "white",
                        padding: "7px 20px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        textAlign: "center",
                        textDecoration: "none",
                        transition: "all 250ms",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        touchAction: "manipulation",
                        boxShadow: "rgba(216, 44, 13, .2) 0 -25px 18px -14px inset, rgba(216, 44, 13, .15) 0 1px 2px, rgba(216, 44, 13, .15) 0 2px 4px, rgba(216, 44, 13, .15) 0 4px 8px, rgba(216, 44, 13, .15) 0 8px 16px, rgba(216, 44, 13, .15) 0 16px 32px"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.boxShadow = "rgba(216, 44, 13, .35) 0 -25px 18px -14px inset, rgba(216, 44, 13, .25) 0 1px 2px, rgba(216, 44, 13, .25) 0 2px 4px, rgba(216, 44, 13, .25) 0 4px 8px, rgba(216, 44, 13, .25) 0 8px 16px, rgba(216, 44, 13, .25) 0 16px 32px";
                        e.target.style.transform = "scale(1.05) rotate(-1deg)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.boxShadow = "rgba(216, 44, 13, .2) 0 -25px 18px -14px inset, rgba(216, 44, 13, .15) 0 1px 2px, rgba(216, 44, 13, .15) 0 2px 4px, rgba(216, 44, 13, .15) 0 4px 8px, rgba(216, 44, 13, .15) 0 8px 16px, rgba(216, 44, 13, .15) 0 16px 32px";
                        e.target.style.transform = "scale(1) rotate(0deg)";
                      }}
                    >
                      Delete Note
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleCreateNote}
                    style={{
                      backgroundColor: "#2e7d32",
                      border: "0",
                      color: "white",
                      padding: "7px 20px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      textAlign: "center",
                      textDecoration: "none",
                      transition: "all 250ms",
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      touchAction: "manipulation",
                      boxShadow: "rgba(46, 125, 50, .2) 0 -25px 18px -14px inset, rgba(46, 125, 50, .15) 0 1px 2px, rgba(46, 125, 50, .15) 0 2px 4px, rgba(46, 125, 50, .15) 0 4px 8px, rgba(46, 125, 50, .15) 0 8px 16px, rgba(46, 125, 50, .15) 0 16px 32px"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.boxShadow = "rgba(46, 125, 50, .35) 0 -25px 18px -14px inset, rgba(46, 125, 50, .25) 0 1px 2px, rgba(46, 125, 50, .25) 0 2px 4px, rgba(46, 125, 50, .25) 0 4px 8px, rgba(46, 125, 50, .25) 0 8px 16px, rgba(46, 125, 50, .25) 0 16px 32px";
                      e.target.style.transform = "scale(1.05) rotate(-1deg)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.boxShadow = "rgba(46, 125, 50, .2) 0 -25px 18px -14px inset, rgba(46, 125, 50, .15) 0 1px 2px, rgba(46, 125, 50, .15) 0 2px 4px, rgba(46, 125, 50, .15) 0 4px 8px, rgba(46, 125, 50, .15) 0 8px 16px, rgba(46, 125, 50, .15) 0 16px 32px";
                      e.target.style.transform = "scale(1) rotate(0deg)";
                    }}
                  >
                    Save Note
                  </button>
                )}
              </InlineStack>
            </div>
            <div style={{ padding: "16px" }}>
              <BlockStack gap="300">
                <div>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px", 
                    fontSize: "14px", 
                    color: "#6d7175",
                    marginBottom: "16px"
                  }}>
                    {folderId ? (
                      <>
                        <span style={{ fontWeight: "500" }}>
                          {folders.find(f => f.id === folderId)?.name}
                        </span>
                        <span>/</span>
                        <span style={{ fontWeight: "600", color: "#202223" }}>
                          {title || "(untitled)"}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontStyle: "italic", color: "#8c9196" }}>
                        Select a folder to start
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                    Tags
                  </label>
                  <div style={{ marginBottom: "8px" }}>
                    <input
                      type="text"
                      style={{
                        border: "none",
                        outline: "none",
                        fontSize: "14px",
                        color: "#202223",
                        padding: "8px 0",
                        borderBottom: "1px solid #e1e3e5",
                        cursor: "text",
                        width: "100%",
                        backgroundColor: "transparent",
                        fontFamily: "inherit",
                        transition: "border-color 0.2s ease"
                      }}
                      value={newTagInput}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        // Remove emojis from tag input
                        const cleanValue = removeEmojis(newValue);
                        if (cleanValue.length <= 32) {
                          setNewTagInput(cleanValue);
                        } else {
                          setAlertMessage('Tag cannot exceed 32 characters');
                          setAlertType('error');
                          setTimeout(() => setAlertMessage(''), 3000);
                        }
                      }}
                      placeholder="Add a tag and press Enter..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagInput.trim()) {
                          const cleanTag = removeEmojis(newTagInput.trim());
                          if (!noteTags.includes(cleanTag)) {
                            setNoteTags([...noteTags, cleanTag]);
                          }
                          setNewTagInput("");
                        }
                      }}
                      onFocus={(e) => {
                        e.target.style.borderBottomColor = "#008060";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderBottomColor = "#e1e3e5";
                      }}
                    />
                  </div>
                  {noteTags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {noteTags.map((tag, index) => (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 8px",
                            backgroundColor: "#e1e3e5",
                            borderRadius: "12px",
                            fontSize: "12px",
                            color: "#202223"
                          }}
                        >
                          <span>{tag}</span>
                          <button
                            onClick={() => setNoteTags(noteTags.filter((_, i) => i !== index))}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "14px",
                              color: "#6d7175",
                              padding: "0",
                              display: "flex",
                              alignItems: "center"
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(removeEmojis(e.target.value))}
                    placeholder="Add a title to your note here..."
                    maxLength={35}
                    style={{
                      border: "none",
                      outline: "none",
                      fontSize: "24px",
                      fontWeight: "600",
                      color: "#202223",
                      padding: "8px 0",
                      borderBottom: "1px solid #e1e3e5",
                      cursor: "text",
                      width: "100%",
                      backgroundColor: "transparent",
                      fontFamily: "inherit",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderBottomColor = "#008060";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderBottomColor = "#e1e3e5";
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                    Body
                  </label>
                  <ClientQuill
                    value={body}
                    onChange={setBody}
                    placeholder="Type your note here..."
                  />
                </div>
                <div style={{ marginTop: "20px" }}>
                  <InlineStack gap="300">
                  {editingNoteId ? (
                    <>
                      <button 
                        onClick={handleSaveNote}
                        style={{
                          backgroundColor: "#2e7d32",
                          border: "0",
                          color: "white",
                          padding: "7px 20px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          textAlign: "center",
                          textDecoration: "none",
                          transition: "all 250ms",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          touchAction: "manipulation",
                          boxShadow: "rgba(46, 125, 50, .2) 0 -25px 18px -14px inset, rgba(46, 125, 50, .15) 0 1px 2px, rgba(46, 125, 50, .15) 0 2px 4px, rgba(46, 125, 50, .15) 0 4px 8px, rgba(46, 125, 50, .15) 0 8px 16px, rgba(46, 125, 50, .15) 0 16px 32px"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.boxShadow = "rgba(46, 125, 50, .35) 0 -25px 18px -14px inset, rgba(46, 125, 50, .25) 0 1px 2px, rgba(46, 125, 50, .25) 0 2px 4px, rgba(46, 125, 50, .25) 0 4px 8px, rgba(46, 125, 50, .25) 0 8px 16px, rgba(46, 125, 50, .25) 0 16px 32px";
                          e.target.style.transform = "scale(1.05) rotate(-1deg)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.boxShadow = "rgba(46, 125, 50, .2) 0 -25px 18px -14px inset, rgba(46, 125, 50, .15) 0 1px 2px, rgba(46, 125, 50, .15) 0 2px 4px, rgba(46, 125, 50, .15) 0 4px 8px, rgba(46, 125, 50, .15) 0 8px 16px, rgba(46, 125, 50, .15) 0 16px 32px";
                          e.target.style.transform = "scale(1) rotate(0deg)";
                        }}
                      >
                        Save Note
                      </button>
                      <button 
                        onClick={handleCancelEdit}
                        style={{
                          backgroundColor: "#6d7175",
                          border: "0",
                          color: "white",
                          padding: "7px 20px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          textAlign: "center",
                          textDecoration: "none",
                          transition: "all 250ms",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          touchAction: "manipulation",
                          boxShadow: "rgba(109, 113, 117, .2) 0 -25px 18px -14px inset, rgba(109, 113, 117, .15) 0 1px 2px, rgba(109, 113, 117, .15) 0 2px 4px, rgba(109, 113, 117, .15) 0 4px 8px, rgba(109, 113, 117, .15) 0 8px 16px, rgba(109, 113, 117, .15) 0 16px 32px"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.boxShadow = "rgba(109, 113, 117, .35) 0 -25px 18px -14px inset, rgba(109, 113, 117, .25) 0 1px 2px, rgba(109, 113, 117, .25) 0 2px 4px, rgba(109, 113, 117, .25) 0 4px 8px, rgba(109, 113, 117, .25) 0 8px 16px, rgba(109, 113, 117, .25) 0 16px 32px";
                          e.target.style.transform = "scale(1.05) rotate(-1deg)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.boxShadow = "rgba(109, 113, 117, .2) 0 -25px 18px -14px inset, rgba(109, 113, 117, .15) 0 1px 2px, rgba(109, 113, 117, .15) 0 2px 4px, rgba(109, 113, 117, .15) 0 4px 8px, rgba(109, 113, 117, .15) 0 8px 16px, rgba(109, 113, 117, .15) 0 16px 32px";
                          e.target.style.transform = "scale(1) rotate(0deg)";
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => setShowDeleteNoteConfirm(editingNoteId)}
                        style={{
                          backgroundColor: "#d82c0d",
                          border: "0",
                          color: "white",
                          padding: "7px 20px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          textAlign: "center",
                          textDecoration: "none",
                          transition: "all 250ms",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          touchAction: "manipulation",
                          boxShadow: "rgba(216, 44, 13, .2) 0 -25px 18px -14px inset, rgba(216, 44, 13, .15) 0 1px 2px, rgba(216, 44, 13, .15) 0 2px 4px, rgba(216, 44, 13, .15) 0 4px 8px, rgba(216, 44, 13, .15) 0 8px 16px, rgba(216, 44, 13, .15) 0 16px 32px"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.boxShadow = "rgba(216, 44, 13, .35) 0 -25px 18px -14px inset, rgba(216, 44, 13, .25) 0 1px 2px, rgba(216, 44, 13, .25) 0 2px 4px, rgba(216, 44, 13, .25) 0 4px 8px, rgba(216, 44, 13, .25) 0 8px 16px, rgba(216, 44, 13, .25) 0 16px 32px";
                          e.target.style.transform = "scale(1.05) rotate(-1deg)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.boxShadow = "rgba(216, 44, 13, .2) 0 -25px 18px -14px inset, rgba(216, 44, 13, .15) 0 1px 2px, rgba(216, 44, 13, .15) 0 2px 4px, rgba(216, 44, 13, .15) 0 4px 8px, rgba(216, 44, 13, .15) 0 8px 16px, rgba(216, 44, 13, .15) 0 16px 32px";
                          e.target.style.transform = "scale(1) rotate(0deg)";
                        }}
                      >
                        Delete Note
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={handleCreateNote}
                      style={{
                        backgroundColor: "#2e7d32",
                        border: "0",
                        color: "white",
                        padding: "7px 20px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        textAlign: "center",
                        textDecoration: "none",
                        transition: "all 250ms",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        touchAction: "manipulation",
                        boxShadow: "rgba(46, 125, 50, .2) 0 -25px 18px -14px inset, rgba(46, 125, 50, .15) 0 1px 2px, rgba(46, 125, 50, .15) 0 2px 4px, rgba(46, 125, 50, .15) 0 4px 8px, rgba(46, 125, 50, .15) 0 8px 16px, rgba(46, 125, 50, .15) 0 16px 32px"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.boxShadow = "rgba(46, 125, 50, .35) 0 -25px 18px -14px inset, rgba(46, 125, 50, .25) 0 1px 2px, rgba(46, 125, 50, .25) 0 2px 4px, rgba(46, 125, 50, .25) 0 4px 8px, rgba(46, 125, 50, .25) 0 8px 16px, rgba(46, 125, 50, .25) 0 16px 32px";
                        e.target.style.transform = "scale(1.05) rotate(-1deg)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.boxShadow = "rgba(46, 125, 50, .2) 0 -25px 18px -14px inset, rgba(46, 125, 50, .15) 0 1px 2px, rgba(46, 125, 50, .15) 0 2px 4px, rgba(46, 125, 50, .15) 0 4px 8px, rgba(46, 125, 50, .15) 0 8px 16px, rgba(46, 125, 50, .15) 0 16px 32px";
                        e.target.style.transform = "scale(1) rotate(0deg)";
                      }}
                    >
                      Save Note
                                         </button>
                   )}
                 </InlineStack>
               </div>
             </BlockStack>
            </div>
          </Card>
        </div>
        </div>
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "90%"
            }}>
              <Text as="h3" variant="headingMd" style={{ marginBottom: "16px" }}>
                Delete Folder
              </Text>
              <Text as="p" style={{ marginBottom: "24px" }}>
                Are you sure you want to delete this folder? This action will permanently delete the folder and all notes inside it. This action cannot be undone.
              </Text>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  tone="critical"
                  onClick={async () => {
                    const formData = new FormData();
                    formData.append('folderId', showDeleteConfirm);
                    
                    try {
                      const response = await fetch('/api/delete-folder', {
                        method: 'POST',
                        body: formData
                      });
                      
                      if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                          window.location.reload();
                        } else {
                          setAlertMessage(result.error || 'Failed to delete folder');
                          setAlertType('error');
                          setTimeout(() => setAlertMessage(''), 3000);
                        }
                      } else {
                        setAlertMessage('Failed to delete folder');
                        setAlertType('error');
                        setTimeout(() => setAlertMessage(''), 3000);
                      }
                    } catch (error) {
                      console.error('Error deleting folder:', error);
                      setAlertMessage('Failed to delete folder');
                      setAlertType('error');
                      setTimeout(() => setAlertMessage(''), 3000);
                    }
                    setShowDeleteConfirm(null);
                  }}
                >
                  Delete Folder
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Note Confirmation Modal */}
        {showDeleteNoteConfirm && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "90%"
            }}>
              <Text as="h3" variant="headingMd" style={{ marginBottom: "16px" }}>
                Delete Note
              </Text>
              <Text as="p" style={{ marginBottom: "24px" }}>
                Are you sure you want to delete this note? Deleting a note is permanent and cannot be undone.
              </Text>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteNoteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  tone="critical"
                  onClick={() => handleDeleteNote(showDeleteNoteConfirm)}
                >
                  Delete Note
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Change Folder Modal */}
        {showChangeFolderModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "90%"
            }}>
              <Text as="h3" variant="headingMd" style={{ marginBottom: "16px" }}>
                Change Folder
              </Text>
              <div style={{ marginBottom: "24px" }}>
                <label htmlFor="changeFolderSelect" style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Select a new folder:
                </label>
                <select
                  id="changeFolderSelect"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #c9cccf",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  {folderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button
                  variant="secondary"
                  onClick={() => setShowChangeFolderModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    handleSaveNote();
                    setShowChangeFolderModal(null);
                  }}
                >
                  Move Note
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Note Modal */}
        {showDuplicateModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "90%"
            }}>
              <Text as="h3" variant="headingMd" style={{ marginBottom: "16px" }}>
                Duplicate Note
              </Text>
              <div style={{ marginBottom: "24px" }}>
                <label htmlFor="duplicateFolderSelect" style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Select a folder to duplicate the note to:
                </label>
                <select
                  id="duplicateFolderSelect"
                  value={duplicateFolderId}
                  onChange={(e) => setDuplicateFolderId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #c9cccf",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">Select a folder...</option>
                  {moveFolderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDuplicateModal(null);
                    setDuplicateFolderId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDuplicateNote}
                  disabled={!duplicateFolderId}
                >
                  Duplicate Note
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Move Note Modal */}
        {showMoveModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "90%"
            }}>
              <Text as="h3" variant="headingMd" style={{ marginBottom: "16px" }}>
                {showMoveModal === 'bulk' ? 'Move Selected Notes' : 'Move Note'}
              </Text>
              <div style={{ marginBottom: "24px" }}>
                <label htmlFor="moveFolderSelect" style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Select a folder to move the note{showMoveModal === 'bulk' ? 's' : ''} to:
                </label>
                <select
                  id="moveFolderSelect"
                  value={duplicateFolderId}
                  onChange={(e) => setDuplicateFolderId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #c9cccf",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">Select a folder...</option>
                  {moveFolderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowMoveModal(null);
                    setDuplicateFolderId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleMoveNote(showMoveModal)}
                  disabled={!duplicateFolderId}
                >
                  Move Note{showMoveModal === 'bulk' ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Note Confirmation Modal */}
        {showDeleteNoteConfirm && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "90%"
            }}>
              <Text as="h3" variant="headingMd" style={{ marginBottom: "16px" }}>
                Delete Note
              </Text>
              <Text as="p" style={{ marginBottom: "24px" }}>
                Are you sure you want to delete this note? This action is permanent and cannot be undone.
              </Text>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteNoteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  tone="critical"
                  onClick={() => handleDeleteNote(showDeleteNoteConfirm)}
                >
                  Delete Note
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Multiple Notes Confirmation Modal */}
        {showDeleteMultipleConfirm && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "90%"
            }}>
              <Text as="h3" variant="headingMd" style={{ marginBottom: "16px" }}>
                Delete Multiple Notes
              </Text>
              <Text as="p" style={{ marginBottom: "24px" }}>
                Are you sure you want to delete {selectedNotes.length} selected note{selectedNotes.length > 1 ? 's' : ''}? This action is permanent and cannot be undone.
              </Text>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteMultipleConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  tone="critical"
                  onClick={handleDeleteMultipleNotes}
                >
                  Delete {selectedNotes.length} Note{selectedNotes.length > 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Rename Folder Modal */}
        {showRenameFolderModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "90%"
            }}>
              <Text as="h3" variant="headingMd" style={{ marginBottom: "16px" }}>
                Rename Folder
              </Text>
              <div style={{ marginBottom: "24px" }}>
                <label htmlFor="renameFolderInput" style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Enter new folder name:
                </label>
                                  <input
                    id="renameFolderInput"
                    type="text"
                    value={editingFolderName}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (newValue.length <= 30) {
                        setEditingFolderName(newValue);
                      }
                    }}
                    maxLength={30}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveFolderName(showRenameFolderModal);
                    } else if (e.key === 'Escape') {
                      setShowRenameFolderModal(null);
                      setEditingFolderName("");
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #c9cccf",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRenameFolderModal(null);
                    setEditingFolderName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleSaveFolderName(showRenameFolderModal)}
                  disabled={!editingFolderName.trim()}
                >
                  Rename Folder
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tag Popup Modal */}
        {showTagPopup && (
          <div 
            onClick={() => setShowTagPopup(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1500
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                left: tagPopupPosition.x,
                top: tagPopupPosition.y,
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                padding: "12px",
                zIndex: 1501,
                maxWidth: "300px",
                minWidth: "200px"
              }}
            >
              <div style={{ marginBottom: "8px", fontSize: "12px", fontWeight: "600", color: "#374151" }}>
                All Tags:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {notes.find(n => n.id === showTagPopup)?.tags?.map((tag, index) => (
                  <span 
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Filter notes by this tag
                      const tagFilter = `tag:${tag}`;
                      if (selectedFolder) {
                        // In a specific folder, show notes with this tag in this folder
                        setGlobalSearchQuery(tagFilter);
                      } else {
                        // In "All Notes", show all notes with this tag
                        setGlobalSearchQuery(tagFilter);
                      }
                      setShowTagPopup(null);
                    }}
                    style={{
                      display: "inline-block",
                      background: "#28a745",
                      color: "white",
                      fontSize: "11px",
                      fontWeight: "600",
                      padding: "3px 8px",
                      borderRadius: "10px",
                      lineHeight: "1.2",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#1e7e34";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#28a745";
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Page>
    );
  }
