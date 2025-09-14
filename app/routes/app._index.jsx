// app/routes/app._index.jsx
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";
import packageJson from "../../package.json" with { type: "json" };

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
  TextContainer,
} from "@shopify/polaris";
// Temporarily removed Polaris icons to fix server error
import { useState, useEffect } from "react";
import QuillEditor from "../components/LexicalEditor";
import AdvancedRTE from "../components/AdvancedRTE";
import FolderIconPicker from "../components/FolderIconPicker";
import NewFolderModal from "../components/NewFolderModal";
import DraggableFolder from "../components/DraggableFolder";
import NoteCard from "../components/NoteCard";
import "../styles/tiptap.css";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Draggable, Droppable, Sortable } from '@shopify/draggable';

/* ------------------ Loader ------------------ */
export async function loader({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  // Try to load folders with all fields, fallback if migration not applied
  let folders;
  try {
    folders = await prisma.folder.findMany({
      where: { shopId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        icon: true,
        iconColor: true,
        position: true,
        createdAt: true,
      },
    });
  } catch (error) {
    // Fallback: load without new fields if migration not applied yet
    console.log('New fields not available, loading folders with fallback:', error.message);
    try {
      // Try with just position field
      folders = await prisma.folder.findMany({
        where: { shopId },
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          position: true,
          createdAt: true,
        },
      });
      
      // Add default icon data
      folders = folders.map(folder => ({
        ...folder,
        icon: 'folder',
        iconColor: 'rgba(255, 184, 0, 1)'
      }));
    } catch (positionError) {
      // Final fallback: use createdAt ordering
      console.log('Position field not available, using createdAt ordering:', positionError.message);
      folders = await prisma.folder.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      });
      
      // Add default data
      folders = folders.map((folder, index) => ({
        ...folder,
        icon: 'folder',
        iconColor: 'rgba(255, 184, 0, 1)',
        position: index
      }));
    }
  }

  // Check if pinnedAt column exists before querying
  let pinnedAtExists = false;
  try {
    await prisma.$queryRaw`SELECT "pinnedAt" FROM "Note" LIMIT 1`;
    pinnedAtExists = true;
  } catch (error) {
    console.log('pinnedAt column does not exist, applying migration...');
    
    // Apply the migration automatically
    try {
      await prisma.$executeRaw`ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3)`;
      console.log('✅ pinnedAt column added successfully');
      pinnedAtExists = true;
    } catch (migrationError) {
      console.error('Failed to add pinnedAt column:', migrationError);
      // Continue without pinnedAt functionality
    }
  }

  let notes;
  if (pinnedAtExists) {
    // Use raw SQL to properly order pinned notes first, then by updatedAt
    notes = await prisma.$queryRaw`
      SELECT 
        n.id, n.title, n.content, n.tags, n."folderId", n."pinnedAt",
        n."createdAt", n."updatedAt",
        json_build_object('id', f.id, 'name', f.name) as folder
      FROM "Note" n
      LEFT JOIN "Folder" f ON n."folderId" = f.id
      WHERE n."shopId" = ${shopId}
      ORDER BY 
        CASE WHEN n."pinnedAt" IS NULL THEN 1 ELSE 0 END,
        n."pinnedAt" DESC,
        n."updatedAt" DESC
    `;
  } else {
    notes = await prisma.note.findMany({
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
  }



  return json({ folders, notes, version: packageJson.version }, {
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
  const { folders, notes, version } = useLoaderData();
  const [localNotes, setLocalNotes] = useState(notes);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [folderId, setFolderId] = useState("");

  // Sync localNotes with server data when notes change
  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);
  const [folderName, setFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Handle initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // Show skeleton for 0.8 seconds
    
    return () => clearTimeout(timer);
  }, []);
  
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
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
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
  const [autoSaveNotification, setAutoSaveNotification] = useState("");
  
  // Multi-select states
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [showDeleteMultipleConfirm, setShowDeleteMultipleConfirm] = useState(false);
  
  // Select button states
  const [selectButtonClicked, setSelectButtonClicked] = useState(new Set());
  
  // Duplicate note states
  const [showDuplicateModal, setShowDuplicateModal] = useState(null);
  const [duplicateFolderId, setDuplicateFolderId] = useState("");
  
  // Tags management states
  const [showTagsSection, setShowTagsSection] = useState(false);
  const [showDeleteTagConfirm, setShowDeleteTagConfirm] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  
  // Column collapse states
  const [collapsedColumns, setCollapsedColumns] = useState({
    folders: false,
    notes: false
  });
  
  // Column order state - default order: folders, notes, editor
  const [columnOrder, setColumnOrder] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('columnOrder');
      return saved ? JSON.parse(saved) : ['folders', 'notes', 'editor'];
    }
    return ['folders', 'notes', 'editor'];
  });
  
  const toggleColumnCollapse = (column) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };
  
  // Save column order to localStorage
  const saveColumnOrder = (newOrder) => {
    setColumnOrder(newOrder);
    if (typeof window !== 'undefined') {
      localStorage.setItem('columnOrder', JSON.stringify(newOrder));
    }
  };

  // Render column based on type and order
  const renderColumn = (columnType) => {
    switch (columnType) {
      case 'folders':
        return !collapsedColumns.folders ? (
          <div key="folders" className="draggable-column col-folders" style={{ width: "380px", minWidth: "380px", maxWidth: "380px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="column-drag-handle" style={{ 
              padding: "8px 16px", 
              backgroundColor: "#f6f6f7", 
              borderBottom: "1px solid #e1e3e5",
              cursor: "grab",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <i className="fas fa-grip-vertical" style={{ color: "#6d7175", fontSize: "14px" }}></i>
              <Text as="span" variant="bodyMd" style={{ fontWeight: "600", color: "#6d7175" }}>
                Drag to reorder
              </Text>
            </div>
            <Card
              style={{
                transition: "all 0.3s ease",
                flex: "1",
                display: "flex",
                flexDirection: "column",
                ...(highlightFolders && {
                  backgroundColor: "#fff3cd",
                  borderColor: "#ffc107"
                })
              }}
            >
              <div style={{
                padding: "16px",
                borderBottom: "1px solid #e1e3e5",
                backgroundColor: "white",
                flexShrink: 0
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <Text as="h2" variant="headingLg" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <i className="far fa-folder-open"></i>
                    Folders & Tags
                  </Text>
                  <Button
                    onClick={() => toggleColumnCollapse('folders')}
                    variant="tertiary"
                    size="slim"
                    accessibilityLabel="Collapse Folders & Tags"
                  >
                    <i className="far fa-minus" style={{ fontSize: "12px" }}></i>
                  </Button>
                </div>
                {/* Rest of folders content will be added here */}
              </div>
            </Card>
          </div>
        ) : null;
      
      case 'notes':
        return !collapsedColumns.notes ? (
          <div key="notes" className="draggable-column col-notes" style={{ width: "380px", minWidth: "380px", maxWidth: "380px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="column-drag-handle" style={{ 
              padding: "8px 16px", 
              backgroundColor: "#f6f6f7", 
              borderBottom: "1px solid #e1e3e5",
              cursor: "grab",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <i className="fas fa-grip-vertical" style={{ color: "#6d7175", fontSize: "14px" }}></i>
              <Text as="span" variant="bodyMd" style={{ fontWeight: "600", color: "#6d7175" }}>
                Drag to reorder
              </Text>
            </div>
            <Card style={{ flex: "1", display: "flex", flexDirection: "column" }}>
              {/* Rest of notes content will be added here */}
            </Card>
          </div>
        ) : null;
      
      case 'editor':
        return (
          <div key="editor" className="draggable-column col-editor" style={{ 
            ...(collapsedColumns.folders && collapsedColumns.notes ? {
              flex: "1",
              width: "auto",
              maxWidth: "none"
            } : {
              flex: "1",
              minWidth: "400px"
            }),
            transition: "all 0.3s ease",
            display: "flex",
            flexDirection: "column"
          }}>
            <div className="column-drag-handle" style={{ 
              padding: "8px 16px", 
              backgroundColor: "#f6f6f7", 
              borderBottom: "1px solid #e1e3e5",
              cursor: "grab",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <i className="fas fa-grip-vertical" style={{ color: "#6d7175", fontSize: "14px" }}></i>
              <Text as="span" variant="bodyMd" style={{ fontWeight: "600", color: "#6d7175" }}>
                Drag to reorder
              </Text>
            </div>
            <Card style={{ flex: "1", display: "flex", flexDirection: "column" }}>
              {/* Rest of editor content will be added here */}
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Initialize drag and drop for columns
  useEffect(() => {
    const container = document.querySelector('.app-layout');
    if (!container) return;

    const sortable = new Sortable(container, {
      draggable: '.draggable-column',
      handle: '.column-drag-handle',
      mirror: {
        constrainDimensions: true,
      },
      swapAnimation: {
        duration: 200,
        easingFunction: 'ease-in-out',
      },
    });

    sortable.on('sortable:stop', (event) => {
      const { oldIndex, newIndex } = event;
      if (oldIndex !== newIndex) {
        const newOrder = [...columnOrder];
        const [movedColumn] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, movedColumn);
        saveColumnOrder(newOrder);
      }
    });

    return () => {
      sortable.destroy();
    };
  }, [columnOrder]);
  
  // Show loading page while content loads
  if (isLoading) {
    return (
      <Page title="Loading Scriberr...">
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "60vh",
          flexDirection: "column",
          gap: "20px"
        }}>
          <div style={{
            width: "60px",
            height: "60px",
            border: "4px solid #e1e3e5",
            borderTop: "4px solid #5c6ac4",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }}></div>
          <Text variant="headingMd" tone="subdued">Loading Scriberr...</Text>
          <Text variant="bodyMd" tone="subdued">Please wait while we prepare your workspace</Text>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </Page>
    );
  }

  return (
    <Page title="Scriberr" style={{ paddingBottom: "160px", marginBottom: "10%" }}>
      {/* Material Symbols Rounded CDN */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

      <div className="app-layout" style={{ 
        display: "flex", 
        gap: "16px", 
        minHeight: "calc(100vh - 80px)", // Account for fixed footer height
        paddingBottom: "80px", // Space for fixed footer
        alignItems: "stretch",
        marginBottom: "0",
        marginTop: "16px" // Add spacing after onboarding block
      }}>
        {/* Side Navigation for Collapsed Columns */}
        {(collapsedColumns.folders || collapsedColumns.notes) && (
          <div style={{ 
            width: "60px", 
            backgroundColor: "#f6f6f7", 
            borderRadius: "8px", 
            padding: "16px 8px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            alignItems: "center",
            flex: "0 0 60px",
            alignSelf: "stretch"
          }}>
            {collapsedColumns.folders && (
              <Button
                onClick={() => toggleColumnCollapse('folders')}
                variant="secondary"
                size="large"
                accessibilityLabel="Expand Folders & Tags"
                style={{ height: "60px" }}
              >
                <i className="far fa-folder-open" style={{ color: "rgba(255, 184, 0, 1)", fontSize: "20px" }}></i>
              </Button>
            )}
            {collapsedColumns.notes && (
              <Button
                onClick={() => toggleColumnCollapse('notes')}
                variant="secondary"
                size="large"
                accessibilityLabel="Expand Notes"
                style={{ height: "60px" }}
              >
                <i className="far fa-note-sticky" style={{ color: "rgba(255, 184, 0, 1)", fontSize: "20px" }}></i>
              </Button>
            )}
          </div>
        )}
        
        {/* Render columns in the current order */}
        {columnOrder.map(columnType => renderColumn(columnType))}
      </div>
    </Page>
  );
}