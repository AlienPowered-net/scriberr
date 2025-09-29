// app/routes/app._index.jsx
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { createPortal } from "react-dom";
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
  Tag,
} from "@shopify/polaris";
import { 
  SaveIcon, 
  DragDropIcon,
  DragHandleIcon,
  CollectionFilledIcon,
  ExchangeIcon,
  FolderIcon,
  ProductFilledIcon
} from "@shopify/polaris-icons";
import { useState, useEffect, useRef, useCallback } from "react";
import QuillEditor from "../components/LexicalEditor";
import AdvancedRTE from "../components/AdvancedRTE";
import MobileEditorButton from "../components/MobileEditorButton";
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

/* ------------------ SortableColumn Component ------------------ */
function SortableColumn({ id, children, isEditorFullscreen, ...props }) {
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
      {/* Drag handle positioned lower with more space from top - hidden when editor is fullscreen */}
      {!isEditorFullscreen && (
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
      )}
      {children}
    </div>
  );
}

// ---------------- DropIndicator ----------------
function DropIndicator({
  index,
  isActive,
  onRef,
}) {
  // expose a droppable so the DnD system recognizes this target
  const { setNodeRef, isOver } = useDroppable({ id: `drop-${index}` });
  const active = isActive || isOver;

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        if (onRef) onRef(el);
      }}
      id={`drop-${index}`}
      style={{
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease-out',
        backgroundColor: active ? '#abcbbc' : '#eaf4ff',
        border: active ? '2px solid #345848' : '2px solid #00527c',
        cursor: 'pointer',
        zIndex: 10,
        opacity: active ? 0.55 : 0.25,
        transform: active ? 'scale(1.1)' : 'scale(1)',
        boxShadow: active ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
      role="button"
      aria-label={`Drop column at position ${index + 1}`}
      aria-roledescription="Drop zone for column reordering"
    >
      {/* Use the project's Polaris icons. Show Save on active, DragDrop otherwise */}
      {active ? (
        <SaveIcon style={{ width: '256px', height: '256px', color: 'white', opacity: 0.5 }} />
      ) : (
        <DragDropIcon style={{ width: '256px', height: '256px', color: 'white', opacity: 0.5 }} />
      )}
    </div>
  );
}

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
    const notesWithoutPinnedAt = await prisma.note.findMany({
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
    
    // Explicitly set pinnedAt to null for all notes when column doesn't exist
    notes = notesWithoutPinnedAt.map(note => ({
      ...note,
      pinnedAt: null
    }));
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
  
  // Mobile detection state - moved early to avoid initialization issues
  const [isMobile, setIsMobile] = useState(false);
  
  
  // Note editing states
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [openNoteMenu, setOpenNoteMenu] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showDeleteNoteConfirm, setShowDeleteNoteConfirm] = useState(null);
  const [showChangeFolderModal, setShowChangeFolderModal] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(null);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(null);
  const [showTagPopup, setShowTagPopup] = useState(null);
  const [tagPopupPosition, setTagPopupPosition] = useState({ x: 0, y: 0 });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [wasJustSaved, setWasJustSaved] = useState(false);
  const [isNewlyCreated, setIsNewlyCreated] = useState(false);
  const [highlightFolders, setHighlightFolders] = useState(false);
  const [animateBackToFolders, setAnimateBackToFolders] = useState(false);
  
  // Format dates with exact time like "9 Sep 2024, 2:30 PM"
  const formatDateTime = (date) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${displayHours}:${minutes} ${ampm}`;
  };
  
  // Get the last saved time for the current note
  const getLastSavedTime = () => {
    if (!editingNoteId) return null;
    const currentNote = localNotes.find(note => note.id === editingNoteId);
    if (!currentNote || !currentNote.updatedAt) return null;
    
    const updatedDate = new Date(currentNote.updatedAt);
    return formatDateTime(updatedDate);
  };
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

  // State to track if any editor is in fullscreen mode
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);

  // Debug logging for fullscreen state changes
  useEffect(() => {
    console.log('Editor fullscreen state changed:', isEditorFullscreen);
  }, [isEditorFullscreen]);

  // Cleanup effect to reset fullscreen state when component unmounts
  useEffect(() => {
    return () => {
      setIsEditorFullscreen(false);
    };
  }, []);
  
  // Ref to hold the current columnOrder for use in event handlers
  const columnOrderRef = useRef(columnOrder);
  
  // Update the ref whenever columnOrder changes
  useEffect(() => {
    columnOrderRef.current = columnOrder;
  }, [columnOrder]);
  
  // Save column order to localStorage
  const saveColumnOrder = (newOrder) => {
    setColumnOrder(newOrder);
    if (typeof window !== 'undefined') {
      localStorage.setItem('columnOrder', JSON.stringify(newOrder));
    }
  };

  // Drag and drop state
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);

  // Drag and drop handlers for drop indicator system
  const [activeDropIndex, setActiveDropIndex] = useState(null);

  const handleDragStart = (event) => {
    const activeId = event.active?.id?.replace?.(/^col-/, "") ?? event.active?.id ?? null;
    setActiveId(activeId);
    // initialize drop index to current position
    const idx = columnOrder.indexOf(activeId);
    setActiveDropIndex(idx === -1 ? null : idx);
  };

  const handleDragOver = (event) => {
    const overId = event.over?.id;
    if (!overId) return;
    if (overId.startsWith("drop-")) {
      const idx = parseInt(overId.replace("drop-", ""), 10);
      if (!Number.isNaN(idx)) setActiveDropIndex(idx);
    } else if (overId.startsWith("col-")) {
      // If hovering a column itself, compute nearest insert point: before or after
      const colId = overId.replace("col-", "");
      const idx = columnOrder.indexOf(colId);
      if (idx !== -1) {
        // By default treat it as "insert before" that column
        setActiveDropIndex(idx);
      }
    }
  };

  const handleDragEnd = (event) => {
    const overId = event.over?.id;
    const active = activeId;
    setActiveId(null);

    if (!active || !overId) {
      setActiveDropIndex(null);
      return;
    }

    // If over a drop indicator, insert at that index
    if (overId.startsWith("drop-")) {
      const dropIndex = parseInt(overId.replace("drop-", ""), 10);
      if (!Number.isNaN(dropIndex)) {
        setColumnOrder((prev) => {
          const without = prev.filter((c) => c !== active);
          const next = [...without];
          next.splice(dropIndex, 0, active);
          saveColumnOrder(next);
          return next;
        });
      }
    } else if (overId.startsWith("col-")) {
      // fallback: if user dropped onto a column, insert before that column
      const colId = overId.replace("col-", "");
      const idx = columnOrder.indexOf(colId);
      if (idx !== -1) {
        setColumnOrder((prev) => {
          const without = prev.filter((c) => c !== active);
          const next = [...without];
          next.splice(idx, 0, active);
          saveColumnOrder(next);
          return next;
        });
      }
    }

    setActiveDropIndex(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveDropIndex(null);
  };

  // Helper function to render column content for DragOverlay
  const renderColumnContent = (columnId) => {
    if (columnId === 'folders') {
      return (
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
          border: "1px solid #e1e3e5",
          width: "380px",
          minWidth: "380px",
          maxWidth: "380px",
          overflow: "hidden"
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
                value={globalSearchQuery}
                readOnly
                placeholder="Search all notes..."
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

            {/* All Notes and All Tags Buttons */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <div 
                  style={{ 
                    padding: "8px 12px", 
                    flex: "1",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: selectedFolder === null ? "#f6fff8" : "#F8F9FA",
                    border: selectedFolder === null ? "2px solid #008060" : "2px solid #E1E3E5",
                    borderRadius: "8px",
                    position: "relative",
                    transition: "all 0.2s ease",
                    boxShadow: selectedFolder === null ? "0 2px 8px rgba(10, 0, 0, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.05)"
                  }}
                >
                  <Text as="span" variant="bodyMd" style={{ 
                    fontWeight: "600", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px",
                    color: selectedFolder === null ? "#008060" : "rgba(48, 48, 48, 1)",
                    fontSize: "14px"
                  }}>
                    <i className="far fa-note-sticky" style={{ fontSize: "16px" }}></i>
                    All Notes
                  </Text>
                </div>

                <div 
                  style={{ 
                    padding: "8px 12px", 
                    flex: "1",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: showTagsSection ? "#f6fff8" : "#F8F9FA",
                    border: showTagsSection ? "2px solid #008060" : "2px solid #E1E3E5",
                    borderRadius: "8px",
                    position: "relative",
                    transition: "all 0.2s ease",
                    boxShadow: showTagsSection ? "0 2px 8px rgba(10, 0, 0, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.05)"
                  }}
                >
                  <Text as="span" variant="bodyMd" style={{ 
                    fontWeight: "600", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px",
                    color: showTagsSection ? "#008060" : "rgba(48, 48, 48, 1)",
                    fontSize: "14px"
                  }}>
                    <i className="far fa-bookmark" style={{ fontSize: "16px" }}></i>
                    All Tags
                  </Text>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div style={{ 
            flex: "1", 
            overflowY: "auto", 
            padding: "16px",
            backgroundColor: "#fff"
          }}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFolderDragEnd}
            >
              <SortableContext
                items={localFolders.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div>
                {localFolders.slice(0, 6).map((folder) => (
                  <DraggableFolder 
                    key={folder.id} 
                    folder={folder}
                    selectedFolder={selectedFolder}
                    onFolderClick={() => {}}
                    openFolderMenu={null}
                    setOpenFolderMenu={() => {}}
                  >
                    <div style={{ display: 'none' }}>
                    </div>
                  </DraggableFolder>
                ))}
                </div>
              </SortableContext>
            </DndContext>
            {localFolders.length > 6 && (
              <Text variant="bodyMd" style={{ color: '#6d7175', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
                +{localFolders.length - 6} more folders...
              </Text>
            )}
          </div>
        </Card>
      );
    } else if (columnId === 'notes') {
      return (
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
          border: "1px solid #e1e3e5",
          width: "380px",
          minWidth: "380px",
          maxWidth: "380px",
          overflow: "hidden"
        }}>
          {/* Fixed Header Section */}
          <div style={{ 
            padding: "16px", 
            borderBottom: "1px solid #e1e3e5",
            backgroundColor: "white",
            flexShrink: 0
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <Text as="h2" variant="headingLg" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <i className="far fa-note-sticky"></i>
                Notes
              </Text>
            </div>
          </div>

          {/* Scrollable Content */}
          <div style={{ 
            flex: "1", 
            overflowY: "auto", 
            padding: "16px",
            backgroundColor: "#fff"
          }}>
            <div className="note-grid" style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
              gap: "16px",
              padding: "0"
            }}>
              {filteredNotes.slice(0, 4).map((note) => {
                const createdAt = new Date(note.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                });
                const updatedAt = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                }) : null;
                const isSelected = selectedNote && selectedNote.id === note.id;
                
                return (
                  <NoteCard
                    key={note.id}
                    title={note.title}
                    content={note.content}
                    tags={note.tags || []}
                    createdAt={createdAt}
                    updatedAt={updatedAt}
                    folder={note.folder?.name}
                    isSelected={isSelected}
                    inContext={false}
                    isPinned={note.pinnedAt !== null}
                    onClick={() => {}}
                    onSelect={() => {}}
                    onManage={() => {}}
                    onDelete={() => {}}
                    onTagClick={() => {}}
                    onDuplicate={() => {}}
                    onMove={() => {}}
                    onPin={() => {}}
                    isSelectButtonClicked={false}
                  />
                );
              })}
            </div>
            {filteredNotes.length > 4 && (
              <Text variant="bodyMd" style={{ color: '#6d7175', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
                +{filteredNotes.length - 4} more notes...
              </Text>
            )}
          </div>
        </Card>
      );
    } else if (columnId === 'editor') {
      return (
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
          border: "1px solid #e1e3e5",
          flex: "1",
          minWidth: "400px",
          transition: "all 0.3s ease"
        }}>
          <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Text as="h2" variant="headingLg" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <i className="far fa-edit" style={{ fontSize: "20px" }}></i>
                Note Editor
              </Text>
              {(autoSaveNotification || hasUnsavedChanges) && (
                <div style={{ marginTop: "4px" }}>
                  {autoSaveNotification && (
                    <Text as="p" style={{ 
                      fontSize: "14px", 
                      color: "#008060", 
                      fontWeight: "500", 
                      marginBottom: hasUnsavedChanges ? "4px" : "0",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      <i className="fas fa-check-circle" style={{ fontSize: "16px", color: "#008060" }}></i>
                      {autoSaveNotification}
                    </Text>
                  )}
                  {hasUnsavedChanges && (
                    <Text as="p" style={{ 
                      fontSize: "14px", 
                      color: "rgba(199, 10, 36, 1)", 
                      fontWeight: "600", 
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      <i className="fas fa-exclamation-triangle" style={{ fontSize: "16px", color: "rgba(199, 10, 36, 1)" }}></i>
                      You have unsaved changes
                    </Text>
                  )}
                </div>
              )}
            </div>
            <InlineStack gap="200">
              {editingNoteId ? (
                <>
                  <Button 
                    variant="primary"
                    tone="success"
                    disabled
                  >
                    Save Note
                  </Button>
                  <Button 
                    variant="primary"
                    tone="base"
                    disabled
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="primary"
                    tone="critical"
                    disabled
                  >
                    Delete Note
                  </Button>
                </>
              ) : (
                <Button 
                  variant="primary"
                  tone="success"
                  disabled
                >
                  Save Note
                </Button>
              )}
            </InlineStack>
          </div>
          <div style={{ padding: "16px 16px 16px 16px", flex: "1", overflowY: "auto" }}>
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
                    readOnly
                    placeholder="Add a tag and press Enter..."
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
                          backgroundColor: "#f6fff8",
                          border: "1px solid #008060",
                          borderRadius: "16px",
                          fontSize: "12px",
                          color: "#008060"
                        }}
                      >
                        <span>{tag}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <input
                  type="text"
                  value={title}
                  readOnly
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
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                  Body
                </label>
                <div style={{
                  border: "1px solid #e1e3e5",
                  borderRadius: "8px",
                  padding: "16px",
                  minHeight: "200px",
                  backgroundColor: "#f8f9fa",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  color: "#6d7175"
                }}>
                  {body ? (
                    <div dangerouslySetInnerHTML={{ __html: body.substring(0, 300) + (body.length > 300 ? '...' : '') }} />
                  ) : (
                    <span style={{ fontStyle: "italic" }}>Type your note here...</span>
                  )}
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <InlineStack gap="300">
                {editingNoteId ? (
                  <>
                    <Button 
                      variant="primary"
                      tone="success"
                      disabled
                    >
                      Save Note
                    </Button>
                    <Button 
                      variant="primary"
                      tone="base"
                      disabled
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="primary"
                      tone="critical"
                      disabled
                    >
                      Delete Note
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="primary"
                    tone="success"
                    disabled
                  >
                    Save Note
                  </Button>
                )}
                </InlineStack>
              </div>
            </BlockStack>
          </div>
        </Card>
      );
    }
    return null;
  };
  
  const toggleColumnCollapse = (column) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };
  
  // Folder icon picker states
  const [showIconPicker, setShowIconPicker] = useState(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderIcon, setNewFolderIcon] = useState('folder');
  const [newFolderIconColor, setNewFolderIconColor] = useState('rgba(255, 184, 0, 1)');
  const [localFolders, setLocalFolders] = useState(folders);
  
  // Mobile icon picker states
  const [mobileSelectedIcon, setMobileSelectedIcon] = useState('folder');
  const [mobileSelectedColor, setMobileSelectedColor] = useState('rgba(255, 184, 0, 1)');
  
  // Mobile new folder modal states
  const [mobileFolderName, setMobileFolderName] = useState('');
  const [mobileNewFolderIcon, setMobileNewFolderIcon] = useState('folder');
  const [mobileNewFolderColor, setMobileNewFolderColor] = useState('rgba(255, 184, 0, 1)');
  
  // Folder selection popover states
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [folderSelectorAction, setFolderSelectorAction] = useState(null); // 'duplicate' or 'move'
  const [folderSelectorNoteId, setFolderSelectorNoteId] = useState(null);
  const [folderSelectorSearchQuery, setFolderSelectorSearchQuery] = useState("");

  // Mobile layout state
  const [mobileActiveSection, setMobileActiveSection] = useState('folders'); // 'folders', 'notes'
  const [showMobileTags, setShowMobileTags] = useState(false);
  const [mobileOpenFolderMenu, setMobileOpenFolderMenu] = useState(null);
  
  // Initialize mobile icon picker state when modal opens
  useEffect(() => {
    if (showIconPicker && isMobile) {
      const currentFolder = localFolders.find(f => f.id === showIconPicker);
      setMobileSelectedIcon(currentFolder?.icon || "folder");
      setMobileSelectedColor(currentFolder?.iconColor || "rgba(255, 184, 0, 1)");
    }
  }, [showIconPicker, isMobile, localFolders]);
  
  // Initialize mobile new folder modal state when modal opens
  useEffect(() => {
    if (showNewFolderModal && isMobile) {
      setMobileFolderName('');
      setMobileNewFolderIcon('folder');
      setMobileNewFolderColor('rgba(255, 184, 0, 1)');
    }
  }, [showNewFolderModal, isMobile]);
  
  
  // Update local folders when loader data changes
  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile folder drag handlers - use same DND system as desktop
  const handleMobileFolderDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localFolders.findIndex((folder) => folder.id === active.id);
    const newIndex = localFolders.findIndex((folder) => folder.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      console.error('Could not find folder indices:', { oldIndex, newIndex, activeId: active.id, overId: over.id });
      return;
    }

    const reorderedFolders = arrayMove(localFolders, oldIndex, newIndex);
    setLocalFolders(reorderedFolders);

    // Send the new order to the server - use same endpoint as desktop
    try {
      const response = await fetch('/api/reorder-folders-drag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          folderIds: reorderedFolders.map(f => f.id)
        })
      });
      
      if (!response.ok) {
        console.error('Failed to reorder folders');
        // Revert on error
        setLocalFolders(localFolders);
      }
    } catch (error) {
      console.error('Error reordering folders:', error);
      // Revert on error
      setLocalFolders(localFolders);
    }
  };

  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  


  // Handle drag end for folders
  const handleFolderDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localFolders.findIndex((folder) => folder.id === active.id);
    const newIndex = localFolders.findIndex((folder) => folder.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      console.error('Could not find folder indices:', { oldIndex, newIndex, activeId: active.id, overId: over.id });
      return;
    }

    const reorderedFolders = arrayMove(localFolders, oldIndex, newIndex);
    setLocalFolders(reorderedFolders);

    // Send the new order to the server
    try {
      const response = await fetch('/api/reorder-folders-drag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderIds: reorderedFolders.map(f => f.id)
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Reorder API error:', result);
        // Revert on error
        setLocalFolders(localFolders); // Revert to pre-drag state
        setAlertMessage("Failed to reorder folders: " + (result.error || 'Unknown error'));
        setAlertType("error");
        setTimeout(() => setAlertMessage(''), 3000);
      } else {
        // Success - keep the reordered state
        console.log('Folders reordered successfully');
        setAlertMessage("Folders reordered successfully");
        setAlertType("success");
        setTimeout(() => setAlertMessage(''), 2000);
      }
    } catch (error) {
      console.error('Error reordering folders:', error);
      // Revert on error
      setLocalFolders(localFolders); // Revert to pre-drag state
      setAlertMessage("Failed to reorder folders: Network error");
      setAlertType("error");
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  // Handle folder icon change
  const handleIconChange = async (folderId, iconData) => {
    // Update local state immediately for instant feedback
    setLocalFolders(prev => prev.map(folder => 
      folder.id === folderId ? { 
        ...folder, 
        icon: iconData.icon, 
        iconColor: iconData.color 
      } : folder
    ));

    try {
      const response = await fetch('/api/update-folder-icon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId: folderId,
          icon: iconData.icon,
          color: iconData.color
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAlertMessage("Folder icon updated successfully");
          setAlertType("success");
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        const result = await response.json();
        setAlertMessage("Icon updated locally: " + (result.error || 'Database not ready'));
        setAlertType("success");
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error updating folder icon:', error);
      setAlertMessage("Icon updated locally (database not available)");
      setAlertType("success");
      setTimeout(() => setAlertMessage(''), 3000);
    }
    
    setShowIconPicker(null);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close folder menu if clicking outside
      if (openFolderMenu && !event.target.closest('.folder-menu-container') && !event.target.closest('[data-portal-dropdown]')) {
        setOpenFolderMenu(null);
      }
      
      // Close note menu if clicking outside
      if (openNoteMenu && !event.target.closest('.note-card-container') && 
          !event.target.closest('[data-dropdown-menu]') &&
          !event.target.closest('[data-manage-button]') &&
          !event.target.closest('.mobile-note-actions')) {
        setOpenNoteMenu(null);
      }
      
      // Close mobile folder menu if clicking outside
      if (mobileOpenFolderMenu && !event.target.closest('[data-mobile-folder-menu]') && !event.target.closest('.mobile-folder-menu')) {
        setMobileOpenFolderMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openFolderMenu, openNoteMenu, mobileOpenFolderMenu]);

  // Create portal dropdown when folder menu opens
  useEffect(() => {
    if (!openFolderMenu) return;

    // Find the folder button element
    const folderButton = document.querySelector(`[data-folder-id="${openFolderMenu}"] .folder-menu-container button`);
    if (!folderButton) return;

    // Get button position
    const buttonRect = folderButton.getBoundingClientRect();
    const dropdownHeight = 120;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    
    // Create portal element
    const portal = document.createElement('div');
    portal.setAttribute('data-portal-dropdown', 'true');
    portal.style.position = 'fixed';
    portal.style.zIndex = '9999';
    portal.style.backgroundColor = 'white';
    portal.style.border = '1px solid #c9cccf';
    portal.style.borderRadius = '4px';
    portal.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    portal.style.minWidth = '150px';
    portal.style.right = `${window.innerWidth - buttonRect.right}px`;
    
    // Position above or below based on available space
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      portal.style.bottom = `${viewportHeight - buttonRect.top}px`;
    } else {
      portal.style.top = `${buttonRect.bottom}px`;
    }
    
    // Add dropdown content
    portal.innerHTML = `
      <button type="button" style="display: block; width: 100%; padding: 8px 12px; border: none; background: none; text-align: left; cursor: pointer; border-bottom: 1px solid #e1e3e5;">
        Rename Folder
      </button>
      <button type="button" style="display: block; width: 100%; padding: 8px 12px; border: none; background: none; text-align: left; cursor: pointer; border-bottom: 1px solid #e1e3e5;">
        Change Icon
      </button>
      <button type="button" style="display: block; width: 100%; padding: 8px 12px; border: none; background: none; text-align: left; cursor: pointer; color: #d32f2f;">
        Delete Folder
      </button>
    `;
    
    // Add click handlers
    portal.querySelectorAll('button').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        if (index === 0) {
          setShowRenameFolderModal(openFolderMenu);
          setEditingFolderName(folders.find(f => f.id === openFolderMenu)?.name || '');
        } else if (index === 1) {
          setShowIconPicker(openFolderMenu);
        } else if (index === 2) {
          setShowDeleteConfirm(openFolderMenu);
        }
        setOpenFolderMenu(null);
        document.body.removeChild(portal);
      });
    });
    
    // Add to body
    document.body.appendChild(portal);
    
    // Cleanup function
    return () => {
      if (document.body.contains(portal)) {
        document.body.removeChild(portal);
      }
    };
  }, [openFolderMenu, folders]);

  // Debug state changes
  useEffect(() => {
    console.log('showDuplicateModal changed:', showDuplicateModal);
  }, [showDuplicateModal]);

  useEffect(() => {
    console.log('showMoveModal changed:', showMoveModal);
  }, [showMoveModal]);

  // Get all unique tags and their counts
  const getAllTagsWithCounts = () => {
    const tagCounts = {};
    localNotes.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    return Object.entries(tagCounts).map(([tag, count]) => ({ tag, count }));
  };

  // Handle tag selection/deselection
  const handleTagClick = (tag) => {
    setSelectedTags(prevTags => {
      if (prevTags.includes(tag)) {
        // Remove tag if already selected
        const newTags = prevTags.filter(t => t !== tag);
        if (newTags.length === 0) {
          setGlobalSearchQuery("");
        } else {
          setGlobalSearchQuery(`tag:${newTags.join(' tag:')}`);
        }
        return newTags;
      } else {
        // Add tag if not selected
        const newTags = [...prevTags, tag];
        setGlobalSearchQuery(`tag:${newTags.join(' tag:')}`);
        return newTags;
      }
    });
  };

  // Handle tag search from tooltip
  const handleTagSearch = (tag) => {
    setGlobalSearchQuery(`tag:${tag}`);
    setSelectedTags([tag]);
    setSelectedFolder(null);
    setSelectedNoteId(null);
    setSelectedNote(null);
    setEditingNoteId(null);
    setTitle('');
    setBody('');
    setFolderId('');
    setNoteTags([]);
  };

  // Make searchForTag available globally for tooltip clicks
  useEffect(() => {
    window.searchForTag = handleTagSearch;
    return () => {
      delete window.searchForTag;
    };
  }, []);

  // Track unsaved changes
  useEffect(() => {
    if (!editingNoteId) {
      setHasUnsavedChanges(false);
      return;
    }

    const currentNote = localNotes.find(note => note.id === editingNoteId);
    if (!currentNote) {
      setHasUnsavedChanges(false);
      return;
    }

    const hasChanges = 
      title !== (currentNote.title || "") ||
      body !== (currentNote.content || "") ||
      JSON.stringify(noteTags) !== JSON.stringify(currentNote.tags || []);

    setHasUnsavedChanges(hasChanges);
    
    // Reset isNewlyCreated when user starts editing
    if (hasChanges && isNewlyCreated) {
      setIsNewlyCreated(false);
    }
  }, [title, body, noteTags, editingNoteId, localNotes, isNewlyCreated]);

  // Track when a note was just saved
  useEffect(() => {
    if (hasUnsavedChanges === false && editingNoteId) {
      // If we just went from having unsaved changes to no unsaved changes, 
      // and we have an editingNoteId, it means we just saved
      setWasJustSaved(true);
      
      // Reset wasJustSaved after a short delay
      const timer = setTimeout(() => {
        setWasJustSaved(false);
      }, 3000); // Show "Saved changes" for 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, editingNoteId]);

  // Restore selected note and folder from localStorage on page load
  useEffect(() => {
    const savedNoteId = localStorage.getItem('selectedNoteId');
    const savedFolderId = localStorage.getItem('selectedFolderId');
    
    if (savedNoteId && savedFolderId) {
      // Find the note in the current notes list
      const noteToSelect = localNotes.find(note => note.id === savedNoteId);
      if (noteToSelect) {
        setEditingNoteId(savedNoteId);
        setSelectedNoteId(savedNoteId);
        setSelectedNote(noteToSelect);
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
    ...localFolders.map((f) => ({ label: f.name, value: String(f.id) })),
  ];

  const moveFolderOptions = localFolders.map((f) => ({ label: f.name, value: String(f.id) }));

  // Filter notes based on selected folder and search queries
  const filteredNotes = localNotes.filter(note => {
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
    setWasJustSaved(false); // Reset when opening existing note
    setIsNewlyCreated(false); // Reset when opening existing note
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

  // Handle mobile save - maintains editing state and shows saved status
  const handleMobileSave = async () => {
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
    formData.append('title', trimmedTitle);
    formData.append('body', trimmedBody);
    formData.append('folderId', trimmedFolderId);
    formData.append('tags', JSON.stringify(noteTags.map(tag => removeEmojis(tag))));
    
    try {
      const endpoint = editingNoteId ? '/api/update-note' : '/api/create-note';
      if (editingNoteId) {
        formData.append('noteId', editingNoteId);
      }
      
      const response = await fetch(endpoint, {
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
          if (editingNoteId) {
            // Update existing note in the notes list
            const updatedNote = {
              id: editingNoteId,
              title: trimmedTitle || "Untitled",
              content: trimmedBody,
              tags: noteTags.map(tag => removeEmojis(tag)),
              folderId: trimmedFolderId,
              updatedAt: new Date().toISOString()
            };
            
            setLocalNotes(prevNotes => 
              prevNotes.map(note => 
                note.id === editingNoteId ? { ...note, ...updatedNote } : note
              )
            );
          } else {
            // Add new note to the notes list
            const newNote = {
              id: result.noteId,
              title: trimmedTitle || "Untitled",
              content: trimmedBody,
              tags: noteTags.map(tag => removeEmojis(tag)),
              folderId: trimmedFolderId,
              pinnedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              folder: {
                id: trimmedFolderId,
                name: folders.find(f => f.id === trimmedFolderId)?.name || "Unknown Folder"
              }
            };
            
            setLocalNotes(prevNotes => insertNoteAfterOldestPin(newNote, prevNotes));
            setEditingNoteId(result.noteId);
          }
          
          // Keep the form open and show saved state
          setHasUnsavedChanges(false);
          setWasJustSaved(true);
          
          // Reset wasJustSaved after 3 seconds
          setTimeout(() => setWasJustSaved(false), 3000);
          
          // Show success message
          setAlertMessage('Note saved successfully');
          setAlertType('success');
          setTimeout(() => setAlertMessage(''), 3000);
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
          // Update the notes list to reflect the changes
          const updatedNote = {
            id: editingNoteId,
            title: trimmedTitle || "Untitled",
            content: trimmedBody,
            tags: noteTags.map(tag => removeEmojis(tag)),
            folderId: trimmedFolderId,
            updatedAt: new Date().toISOString()
          };
          
          // Update the notes list
          setLocalNotes(prevNotes => 
            prevNotes.map(note => 
              note.id === editingNoteId ? { ...note, ...updatedNote } : note
            )
          );
          
          // Clear the form
          setEditingNoteId(null);
          setTitle('');
          setBody('');
          setFolderId('');
          setNoteTags([]);
          setHasUnsavedChanges(false);
          setWasJustSaved(true);
          
          // Show success message
          setAlertMessage('Note updated successfully');
          setAlertType('success');
          setTimeout(() => setAlertMessage(''), 3000);
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
      setAlertMessage('Please select a folder first to create a new note');
      setAlertType('error');
      // Highlight the folders column to draw attention
      setHighlightFolders(true);
      setTimeout(() => setHighlightFolders(false), 3000);
      // Hide error message after 4 seconds
      setTimeout(() => setAlertMessage(''), 4000);
      // Animate the Back to Folders button after error message disappears
      setTimeout(() => {
        console.log('Starting Back to Folders animation');
        setAnimateBackToFolders(true);
        setTimeout(() => {
          console.log('Stopping Back to Folders animation');
          setAnimateBackToFolders(false);
        }, 2000);
      }, 4000);
      return;
    }

    // If there's an open note being edited, save it first (only if it has content)
    if (editingNoteId && (title.trim() || body.trim())) {
      const trimmedTitle = removeEmojis(title.trim());
      const trimmedBody = removeEmojis(body.trim());
      const trimmedFolderId = folderId.trim();

      // If the current note has no content, just discard it instead of saving
      if (!trimmedBody && !trimmedTitle) {
        // Just clear the current note and continue with creating new one
        setEditingNoteId(null);
        setTitle('');
        setBody('');
        setFolderId('');
        setNoteTags([]);
        setHasUnsavedChanges(false);
        setWasJustSaved(false);
      } else if (!trimmedBody) {
        // If note has title but no body, discard it when creating new note
        // (Don't block new note creation)
        setEditingNoteId(null);
        setTitle('');
        setBody('');
        setFolderId('');
        setNoteTags([]);
        setHasUnsavedChanges(false);
        setWasJustSaved(false);
      } else {
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
    }

    // Now create the new note
    const formData = new FormData();
    formData.append('title', '');
    formData.append('body', '');
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
        if (result.success && result.note) {
          // Add new note to the notes list immediately
          const newNote = result.note;
          
          // Update notes state to include new note (add after oldest pinned note)
          setLocalNotes(prevNotes => insertNoteAfterOldestPin(newNote, prevNotes));
          
          // Set the new note as the editing note and populate editor
          setEditingNoteId(newNote.id);
          setTitle(newNote.title || '');
          setBody(newNote.content || '');
          setFolderId(newNote.folderId || currentFolderId);
          setNoteTags(newNote.tags || []);
          setHasUnsavedChanges(false);
          setWasJustSaved(false);
          setIsNewlyCreated(true);
          
          // Navigate to editor section on mobile
          if (isMobile) {
            setMobileActiveSection('editor');
          }
          
          setAlertMessage('New note created successfully!');
          setAlertType('success');
          setTimeout(() => setAlertMessage(''), 3000);
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
    setWasJustSaved(false);
    setIsNewlyCreated(false);
    setAutoSaveNotification('');
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
          // Remove the note from local state instead of reloading
          setLocalNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
          // If we were editing this note, clear the editor
          if (editingNoteId === noteId) {
            setEditingNoteId(null);
            setTitle('');
            setBody('');
            setFolderId('');
            setNoteTags([]);
            setHasUnsavedChanges(false);
            setWasJustSaved(false);
            setIsNewlyCreated(false);
          }
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

  // Handle deleting a tag from all notes
  const handleDeleteTag = async (tagToDelete) => {
    try {
      // Find all notes that have this tag
      const notesWithTag = localNotes.filter(note => 
        note.tags && Array.isArray(note.tags) && note.tags.includes(tagToDelete)
      );

      // Update each note to remove the tag
      const updatePromises = notesWithTag.map(note => {
        const updatedTags = note.tags.filter(tag => tag !== tagToDelete);
        const formData = new FormData();
        formData.append('noteId', note.id);
        formData.append('title', note.title || '');
        formData.append('body', note.content || '');
        formData.append('folderId', note.folderId || '');
        formData.append('tags', JSON.stringify(updatedTags));
        
        return fetch('/api/update-note', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8'
          },
          body: formData
        });
      });

      await Promise.all(updatePromises);
      setShowDeleteTagConfirm(null);
      window.location.reload();
    } catch (error) {
      console.error('Error deleting tag:', error);
      setAlertMessage('Failed to delete tag');
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
        
        // Update notes in local state instead of reloading
        setLocalNotes(prevNotes => 
          prevNotes.map(note => 
            selectedNotes.includes(note.id)
              ? { ...note, folderId: duplicateFolderId, folder: { id: duplicateFolderId, name: localFolders.find(f => f.id === duplicateFolderId)?.name || "Unknown Folder" } }
              : note
          )
        );
        
        setSelectedNotes([]);
        setShowMoveModal(null);
        setDuplicateFolderId("");
        
        setAlertMessage('Notes moved successfully!');
        setAlertType('success');
        setTimeout(() => setAlertMessage(''), 3000);
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
            // Update note in local state instead of reloading
            setLocalNotes(prevNotes => 
              prevNotes.map(note => 
                note.id === moveType
                  ? { ...note, folderId: duplicateFolderId, folder: { id: duplicateFolderId, name: localFolders.find(f => f.id === duplicateFolderId)?.name || "Unknown Folder" } }
                  : note
              )
            );
            
            setShowMoveModal(null);
            setDuplicateFolderId("");
            
            setAlertMessage('Note moved successfully!');
            setAlertType('success');
            setTimeout(() => setAlertMessage(''), 3000);
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
      
      // Remove deleted notes from local state instead of reloading
      setLocalNotes(prevNotes => prevNotes.filter(note => !selectedNotes.includes(note.id)));
      
      // If we were editing one of the deleted notes, clear the editor
      if (selectedNotes.includes(editingNoteId)) {
        setEditingNoteId(null);
        setTitle('');
        setBody('');
        setFolderId('');
        setNoteTags([]);
        setHasUnsavedChanges(false);
        setWasJustSaved(false);
        setIsNewlyCreated(false);
      }
      
      setSelectedNotes([]);
      setShowDeleteMultipleConfirm(false);
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

  // Close mobile note menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on the dropdown itself or manage button
      if (event.target.closest('[data-dropdown-menu]') || 
          event.target.closest('[data-manage-button]') ||
          event.target.closest('.mobile-note-actions')) {
        return;
      }
      setOpenNoteMenu(null);
    };
    
    if (openNoteMenu) {
      // Add a small delay to prevent immediate closing
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openNoteMenu]);

  // Position folder selector activator in notes column
  useEffect(() => {
    if (showFolderSelector && !isMobile) {
      const activator = document.getElementById('folder-selector-activator');
      const notesColumn = document.querySelector('[data-notes-column]');
      
      if (activator && notesColumn) {
        const notesRect = notesColumn.getBoundingClientRect();
        const notesCenterX = notesRect.left + (notesRect.width / 2);
        const notesCenterY = notesRect.top + (notesRect.height / 2);
        
        activator.style.position = 'fixed';
        activator.style.left = `${notesCenterX}px`;
        activator.style.top = `${notesCenterY}px`;
        activator.style.transform = 'translate(-50%, -50%)';
      }
    }
  }, [showFolderSelector, isMobile]);

  // Portal-based dropdown component
  const PortalDropdown = ({ isOpen, position, onClose, note }) => {
    if (!isOpen || !note) return null;

    return createPortal(
      <div
        data-dropdown-menu
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          backgroundColor: 'white',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 10001,
          minWidth: '200px',
          maxWidth: '250px',
          // Mobile-friendly touch targets
          touchAction: 'manipulation'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            borderBottom: '1px solid #f1f3f4',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minHeight: '44px', // iOS recommended touch target size
            transition: 'background-color 0.2s ease'
          }}
          onClick={(e) => {
            e.stopPropagation();
            console.log('Mobile Pin clicked for note:', note.id);
            handlePinNote(note.id);
            onClose();
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
          onTouchStart={(e) => e.target.style.backgroundColor = '#f6f6f7'}
          onTouchEnd={(e) => e.target.style.backgroundColor = 'white'}
        >
          <i className="fas fa-thumbtack" style={{ fontSize: '12px' }}></i>
          {note.pinnedAt ? "Unpin" : "Pin"}
        </div>
        <div
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            borderBottom: '1px solid #f1f3f4',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minHeight: '44px',
            transition: 'background-color 0.2s ease'
          }}
          onClick={(e) => {
            e.stopPropagation();
            console.log('Mobile Duplicate current clicked for note:', note.id);
            handleDuplicateFromMenu(note.id, "current");
            onClose();
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
          onTouchStart={(e) => e.target.style.backgroundColor = '#f6f6f7'}
          onTouchEnd={(e) => e.target.style.backgroundColor = 'white'}
        >
          <i className="fas fa-copy" style={{ fontSize: '12px' }}></i>
          Duplicate to current folder
        </div>
        <div
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            borderBottom: '1px solid #f1f3f4',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minHeight: '44px',
            transition: 'background-color 0.2s ease'
          }}
          onClick={(e) => {
            e.stopPropagation();
            console.log('Mobile Duplicate different clicked for note:', note.id);
            handleDuplicateFromMenu(note.id, "different");
            onClose();
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
          onTouchStart={(e) => e.target.style.backgroundColor = '#f6f6f7'}
          onTouchEnd={(e) => e.target.style.backgroundColor = 'white'}
        >
          <i className="fas fa-copy" style={{ fontSize: '12px' }}></i>
          Duplicate to different folder
        </div>
        <div
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minHeight: '44px',
            transition: 'background-color 0.2s ease'
          }}
          onClick={(e) => {
            e.stopPropagation();
            console.log('Mobile Move clicked for note:', note.id);
            handleMoveFromMenu(note.id);
            onClose();
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
          onTouchStart={(e) => e.target.style.backgroundColor = '#f6f6f7'}
          onTouchEnd={(e) => e.target.style.backgroundColor = 'white'}
        >
          <i className="fas fa-folder" style={{ fontSize: '12px' }}></i>
          Move to different folder
        </div>
      </div>,
      document.body
    );
  };

  // Handle select button clicks
  const handleSelectButtonClick = (noteId) => {
    // Update visual selection state
    setSelectButtonClicked(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
    
    // Update bulk selection state for bulk actions
    setSelectedNotes(prev => {
      if (prev.includes(noteId)) {
        return prev.filter(id => id !== noteId);
      } else {
        return [...prev, noteId];
      }
    });
  };

  // Helper function to insert new note after oldest pinned note
  const insertNoteAfterOldestPin = (newNote, notes) => {
    // Find the oldest pinned note (last in the pinned section)
    const pinnedNotes = notes.filter(note => note.pinnedAt !== null);
    
    if (pinnedNotes.length === 0) {
      // No pinned notes, add to beginning
      return [newNote, ...notes];
    }
    
    // Sort pinned notes by pinnedAt DESC (newest first)
    const sortedPinnedNotes = pinnedNotes.sort((a, b) => 
      new Date(b.pinnedAt) - new Date(a.pinnedAt)
    );
    
    // Find the oldest pinned note (last in sorted array)
    const oldestPinnedNote = sortedPinnedNotes[sortedPinnedNotes.length - 1];
    const oldestPinnedIndex = notes.findIndex(note => note.id === oldestPinnedNote.id);
    
    // Insert new note after the oldest pinned note
    const newNotes = [...notes];
    newNotes.splice(oldestPinnedIndex + 1, 0, newNote);
    
    return newNotes;
  };

  // Handle pin note with optimistic updates
  const handlePinNote = async (noteId) => {
    // Find the note to get current pin status
    const note = localNotes.find(n => n.id === noteId);
    if (!note) return;

    const wasPinned = note.pinnedAt !== null;
    const newPinnedAt = wasPinned ? null : new Date();

    // Optimistic update: immediately update local state
    setLocalNotes(prevNotes => {
      const updatedNotes = prevNotes.map(n => 
        n.id === noteId 
          ? { ...n, pinnedAt: newPinnedAt }
          : n
      );
      
      // Sort notes: pinned first (newest pins first), then unpinned by updatedAt
      return updatedNotes.sort((a, b) => {
        // If one is pinned and other isn't, pinned comes first
        if (a.pinnedAt && !b.pinnedAt) return -1;
        if (!a.pinnedAt && b.pinnedAt) return 1;
        
        // If both pinned, sort by pinnedAt DESC (newest first)
        if (a.pinnedAt && b.pinnedAt) {
          return new Date(b.pinnedAt) - new Date(a.pinnedAt);
        }
        
        // If both unpinned, sort by updatedAt DESC (most recent first)
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
    });

    // Make API call in background
    try {
      const response = await fetch('/api/pin-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noteId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Note pin toggled successfully:', result.isPinned ? 'pinned' : 'unpinned');
        // No need to reload - optimistic update already handled it
      } else {
        console.error('Failed to toggle note pin');
        // Revert optimistic update on error
        setLocalNotes(prevNotes => {
          const revertedNotes = prevNotes.map(n => 
            n.id === noteId 
              ? { ...n, pinnedAt: wasPinned ? new Date() : null }
              : n
          );
          
          // Re-sort with reverted data
          return revertedNotes.sort((a, b) => {
            if (a.pinnedAt && !b.pinnedAt) return -1;
            if (!a.pinnedAt && b.pinnedAt) return 1;
            if (a.pinnedAt && b.pinnedAt) {
              return new Date(b.pinnedAt) - new Date(a.pinnedAt);
            }
            return new Date(b.updatedAt) - new Date(a.updatedAt);
          });
        });
      }
    } catch (error) {
      console.error('Error toggling note pin:', error);
      // Revert optimistic update on error
      setLocalNotes(prevNotes => {
        const revertedNotes = prevNotes.map(n => 
          n.id === noteId 
            ? { ...n, pinnedAt: wasPinned ? new Date() : null }
            : n
        );
        
        // Re-sort with reverted data
        return revertedNotes.sort((a, b) => {
          if (a.pinnedAt && !b.pinnedAt) return -1;
          if (!a.pinnedAt && b.pinnedAt) return 1;
          if (a.pinnedAt && b.pinnedAt) {
            return new Date(b.pinnedAt) - new Date(a.pinnedAt);
          }
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
      });
    }
  };

  // Handle duplicate note from manage menu
  const handleDuplicateFromMenu = async (noteId, type = "current") => {
    if (type === "current") {
      // Duplicate to current folder - use the note's current folder
      try {
        const note = localNotes.find(n => n.id === noteId);
        const targetFolderId = note ? note.folderId : null;

        const formData = new FormData();
        formData.append('noteId', noteId);
        if (targetFolderId) {
          formData.append('targetFolderId', targetFolderId);
        }

        const response = await fetch('/api/duplicate-note', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.note) {
            // Add the duplicated note to local state instead of reloading
            const duplicatedNote = result.note;
            setLocalNotes(prevNotes => insertNoteAfterOldestPin(duplicatedNote, prevNotes));
            
            setAlertMessage('Note duplicated successfully!');
            setAlertType('success');
            setTimeout(() => setAlertMessage(''), 3000);
          } else {
            console.error('Failed to duplicate note');
            setAlertMessage(result.error || 'Failed to duplicate note');
            setAlertType('error');
            setTimeout(() => setAlertMessage(''), 3000);
          }
        } else {
          const error = await response.json();
          console.error('Failed to duplicate note:', error.error);
          setAlertMessage(error.error || 'Failed to duplicate note');
          setAlertType('error');
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } catch (error) {
        console.error('Error duplicating note:', error);
        setAlertMessage('Failed to duplicate note');
        setAlertType('error');
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } else if (type === "different") {
      // Show folder selector popover
      setFolderSelectorAction('duplicate');
      setFolderSelectorNoteId(noteId);
      setShowFolderSelector(true);
    }
  };

  // Handle move note from manage menu
  const handleMoveFromMenu = (noteId) => {
    // Show folder selector popover
    setFolderSelectorAction('move');
    setFolderSelectorNoteId(noteId);
    setShowFolderSelector(true);
  };

  // Handle folder selection from popover
  const handleFolderSelection = async (folderId) => {
    if (!folderSelectorNoteId || !folderSelectorAction) return;

    try {
      if (folderSelectorAction === 'duplicate') {
        const formData = new FormData();
        formData.append('noteId', folderSelectorNoteId);
        formData.append('targetFolderId', folderId);

        const response = await fetch('/api/duplicate-note', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.note) {
            // Add the duplicated note to local state instead of reloading
            const duplicatedNote = result.note;
            setLocalNotes(prevNotes => insertNoteAfterOldestPin(duplicatedNote, prevNotes));
            
            setAlertMessage('Note duplicated successfully!');
            setAlertType('success');
            setTimeout(() => setAlertMessage(''), 3000);
          } else {
            console.error('Failed to duplicate note');
            setAlertMessage(result.error || 'Failed to duplicate note');
            setAlertType('error');
            setTimeout(() => setAlertMessage(''), 3000);
          }
        } else {
          const error = await response.json();
          console.error('Failed to duplicate note:', error.error);
          setAlertMessage(error.error || 'Failed to duplicate note');
          setAlertType('error');
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else if (folderSelectorAction === 'move') {
        const formData = new FormData();
        formData.append('noteId', folderSelectorNoteId);
        formData.append('folderId', folderId);

        const response = await fetch('/api/move-note', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Update the note's folder in local state instead of reloading
            setLocalNotes(prevNotes => 
              prevNotes.map(note => 
                note.id === folderSelectorNoteId 
                  ? { ...note, folderId: folderId, folder: { id: folderId, name: localFolders.find(f => f.id === folderId)?.name || "Unknown Folder" } }
                  : note
              )
            );
            
            setAlertMessage('Note moved successfully!');
            setAlertType('success');
            setTimeout(() => setAlertMessage(''), 3000);
          } else {
            console.error('Failed to move note');
            setAlertMessage(result.error || 'Failed to move note');
            setAlertType('error');
            setTimeout(() => setAlertMessage(''), 3000);
          }
        } else {
          const error = await response.json();
          console.error('Failed to move note:', error.error);
          setAlertMessage(error.error || 'Failed to move note');
          setAlertType('error');
          setTimeout(() => setAlertMessage(''), 3000);
        }
      }
    } catch (error) {
      console.error(`Error ${folderSelectorAction}ing note:`, error);
      setAlertMessage(`Error ${folderSelectorAction}ing note`);
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
    } finally {
      // Close popover and reset state
      setShowFolderSelector(false);
      setFolderSelectorAction(null);
      setFolderSelectorNoteId(null);
      setFolderSelectorSearchQuery("");
    }
  };

  // Handle auto-saving the entire note
  const handleAutoSaveNote = useCallback(async () => {
    if (!editingNoteId) return;

    try {
      const trimmedTitle = title.trim();
      const trimmedBody = body.trim();
      const trimmedFolderId = folderId.trim();

      const formData = new FormData();
      formData.append('noteId', editingNoteId);
      formData.append('title', trimmedTitle);
      formData.append('body', trimmedBody);
      formData.append('folderId', trimmedFolderId);
      formData.append('tags', JSON.stringify(noteTags.map(tag => removeEmojis(tag))));

      const response = await fetch('/api/update-note', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Charset': 'utf-8'
        },
        body: formData
      });

      if (response.ok) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString();
        setAutoSaveNotification(`Your note was auto-saved at ${timestamp}`);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [editingNoteId, title, body, folderId, noteTags]);

  // Auto-save note every 30 seconds
  useEffect(() => {
    if (!editingNoteId || !hasUnsavedChanges) return;

    const autoSaveInterval = setInterval(async () => {
      await handleAutoSaveNote();
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [editingNoteId, hasUnsavedChanges, handleAutoSaveNote]);

  // dnd-kit drag and drop is now handled by the DndContext wrapper

  // Handle auto-saving tags when they are added or removed
  const handleAutoSaveTags = async (newTags) => {
    if (!editingNoteId) return; // Only auto-save if we're editing an existing note
    
    try {
      const formData = new FormData();
      formData.append('noteId', editingNoteId);
      formData.append('tags', JSON.stringify(newTags.map(tag => removeEmojis(tag))));
      
      const response = await fetch('/api/update-note-tags', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Charset': 'utf-8'
        },
        body: formData
      });
      
      if (response.ok) {
        console.log('Tags auto-saved successfully');
      } else {
        console.error('Failed to auto-save tags');
      }
    } catch (error) {
      console.error('Error auto-saving tags:', error);
    }
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
          // Add the new note to the notes list
          const newNote = {
            id: result.noteId,
            title: trimmedTitle || "Untitled",
            content: trimmedBody,
            tags: noteTags.map(tag => removeEmojis(tag)),
            folderId: trimmedFolderId,
            pinnedAt: null, // Explicitly set to null for new notes
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            folder: {
              id: trimmedFolderId,
              name: folders.find(f => f.id === trimmedFolderId)?.name || "Unknown Folder"
            }
          };
          
          // Add the new note to the notes list (after oldest pinned note)
          setLocalNotes(prevNotes => insertNoteAfterOldestPin(newNote, prevNotes));
          
          // Clear the form
          setEditingNoteId(null);
          setTitle('');
          setBody('');
          setFolderId('');
          setNoteTags([]);
          setHasUnsavedChanges(false);
          setWasJustSaved(true);
          
          // Show success message
          setAlertMessage('Note created successfully');
          setAlertType('success');
          setTimeout(() => setAlertMessage(''), 3000);
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

  // Handle new folder button click - launches new folder modal
  const handleNewFolderClick = () => {
    // Launch new folder modal directly
    setShowNewFolderModal(true);
  };

  // Handle creating a new folder from modal
  const handleCreateFolderFromModal = async (folderData) => {
    const trimmedName = folderData.name.trim();
    if (!trimmedName) {
      setAlertMessage('Folder name cannot be empty');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
      return;
    }

    try {
      const response = await fetch('/api/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          icon: folderData.icon,
          iconColor: folderData.color
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.folder) {
          // Add new folder to local state immediately
          setLocalFolders(prev => [result.folder, ...prev]);
          setFolderName(''); // Clear the input
          
          
          setAlertMessage('Folder created successfully!');
          setAlertType('success');
          setTimeout(() => setAlertMessage(''), 3000);
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

  // Handle creating a new folder (legacy - for existing input)
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
        if (result.success && result.folder) {
          setFolderName(''); // Clear the input
          // Add new folder to local state immediately
          setLocalFolders(prev => [result.folder, ...prev]);
          setAlertMessage('Folder created successfully!');
          setAlertType('success');
          setTimeout(() => setAlertMessage(''), 3000);
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
          
          /* Ensure fullscreen editor appears above all other elements */
          .advanced-rte-container.fixed {
            z-index: 9999999 !important;
            position: fixed !important;
          }
        `}</style>
      </Page>
    );
  }

  return (
    <>
      {/* Desktop Layout */}
      {!isMobile && (
        <Page title="Scriberr" style={{ paddingBottom: "160px", marginBottom: "10%" }}>
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
          
          /* Mobile and tablet responsive layout */
          @media (max-width: 1024px) {
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
            
            /* Desktop mobile view - match note card styling */
            .col-editor .mobile-note-card {
              width: 100% !important;
              margin: 0 !important;
              border-radius: 8px !important;
            }
            
            /* Ensure editor container matches note card */
            .col-editor {
              padding: 16px !important;
              box-sizing: border-box !important;
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
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
            max-height: calc(1.4em * 4);
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
          
          .Polaris-Box {
            margin-bottom: 5% !important;
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
              
              /* dnd-kit Drag and Drop Visual Feedback */
              .draggable-column {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
              }
              
              /* Dragged element - visually distinct */
              .sortable-dragging {
                opacity: 0.3 !important;
                transform: rotate(2deg) scale(1.02);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                z-index: 1000;
                border: 2px solid #008060 !important;
                background-color: rgba(0, 128, 96, 0.05) !important;
              }
              
              /* Active drop target - single green highlight */
              .sortable-drag-over {
                border: 3px solid #008060 !important;
                background-color: rgba(0, 128, 96, 0.15) !important;
                transform: scale(1.02);
                box-shadow: 0 6px 20px rgba(0, 128, 96, 0.3);
                border-radius: 8px !important;
                position: relative;
              }
              
              /* Potential drop targets - subtle blue outline */
              .sortable-available {
                border: 2px solid #5c6ac4 !important;
                background-color: rgba(92, 106, 196, 0.08) !important;
                border-radius: 8px !important;
                position: relative;
                transform: translateY(1px);
              }
              
              /* Smooth space-making animation for other columns */
              .sortable-available:not(.sortable-drag-over) {
                transform: translateY(1px);
              }
              
              /* Drag handle hover effect */
              .column-drag-handle:hover {
                background-color: #e1e3e5 !important;
                cursor: grab;
              }
              
              .column-drag-handle:active {
                cursor: grabbing;
              }
              
              /* Shake animation for Back to Folders button */
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
                20%, 40%, 60%, 80% { transform: translateX(8px); }
              }
              
              /* Glow animation for Back to Folders button */
              @keyframes glow {
                0%, 100% { box-shadow: 0 0 5px #16A34A; }
                50% { box-shadow: 0 0 20px #16A34A, 0 0 30px #16A34A; }
              }
              
              /* Animation class for Back to Folders button */
              .back-to-folders-animate {
                background-color: #16A34A !important;
                border-color: #16A34A !important;
                animation: shake 0.6s ease-in-out, glow 1s ease-in-out infinite !important;
                transition: all 0.3s ease !important;
                transform: scale(1.05) !important;
              }
        `}</style>

        {/* Mobile and Tablet Styles */}
        <style>{`
          /* Ensure modals are visible on mobile */
          @media (max-width: 1024px) {
            .modal-overlay {
              z-index: 10001 !important;
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
            }
            
            /* Polaris Modal mobile fixes */
            [data-polaris-portal] {
              z-index: 10001 !important;
            }
            
            .Polaris-Modal-Dialog {
              z-index: 10001 !important;
            }
          }
          
          @media (max-width: 1024px) {
            .mobile-layout {
              display: flex !important;
              flex-direction: column;
              height: 100vh;
              overflow: hidden;
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: white !important;
              z-index: 10000;
              isolation: isolate;
            }
            
            .mobile-section {
              flex: 1;
              overflow-y: auto;
              -webkit-overflow-scrolling: touch;
            }
            
            .mobile-bottom-nav {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              background-color: white;
              border-top: 1px solid #e1e3e5;
              display: flex;
              justify-content: center;
              gap: 60px;
              padding: 8px 0;
              z-index: 1000;
              box-shadow: 0 -1px 6px rgba(0,0,0,0.08);
            }
            
            .mobile-nav-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2px;
              padding: 6px 8px;
              cursor: pointer;
              border-radius: 6px;
              min-width: 50px;
            }
            
            .mobile-header {
              padding: 16px;
              border-bottom: 1px solid #e1e3e5;
              background-color: white;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            
            .mobile-title {
              margin: 0;
              font-size: 20px;
              font-weight: 600;
            }
            
            .mobile-back-btn {
              background: none;
              border: none;
              font-size: 18px;
              cursor: pointer;
              padding: 8px;
              border-radius: 4px;
            }
          }
          
          /* Desktop layout - hide mobile elements */
          @media (min-width: 1025px) {
            .mobile-layout {
              display: none !important;
            }
          }
        `}</style>

        {/* Custom Alert - Desktop Only */}
        {!isMobile && alertMessage && (
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
        


        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={columnOrder.map(c => `col-${c}`)} strategy={verticalListSortingStrategy}>
            <div className="app-layout" style={{ 
              display: "flex", 
              gap: "16px", 
              minHeight: "calc(100vh - 80px)", // Account for fixed footer height
              paddingBottom: "80px", // Space for fixed footer
              alignItems: "stretch",
              marginBottom: "0",
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
                  accessibilityLabel="Expand Folders"
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
            {/* Columns with Drop Indicators */}
            {columnOrder.map((columnId, index) => (
              <div key={`slot-${index}`} style={{ position: 'relative' }}>
                {columnId === 'folders' && !collapsedColumns.folders && (
                  <SortableColumn 
                    key="folders"
                    id="folders"
                    isEditorFullscreen={isEditorFullscreen}
                    style={{ width: "380px", minWidth: "380px", maxWidth: "380px", overflow: "hidden" }}
                    data-column-id="folders"
                  >
          <Card
            style={{
              transition: "all 0.3s ease",
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
              border: "1px solid #e1e3e5",
              ...(highlightFolders && {
                backgroundColor: "#fff3cd",
                border: "2px solid #ffc107",
                borderRadius: "8px",
                boxShadow: "0 0 20px rgba(255, 193, 7, 0.3)"
              })
            }}
          >
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
                  onClick={() => toggleColumnCollapse('folders')}
                  variant="tertiary"
                  size="slim"
                  accessibilityLabel="Collapse Folders"
                >
                  <i className="fas fa-chevron-left"></i>
                </Button>
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
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(removeEmojis(e.target.value))}
                  placeholder="Search all notes..."
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

              {/* All Notes and All Tags Buttons - Under Search Box */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  {/* All Notes Button */}
                  <div 
                    style={{ 
                      padding: "8px 12px", 
                      flex: "1",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                      backgroundColor: selectedFolder === null ? "#f6fff8" : "#F8F9FA",
                      border: selectedFolder === null ? "2px solid #008060" : "2px solid #E1E3E5",
                      borderRadius: "8px",
                      position: "relative",
                      transition: "all 0.2s ease",
                      boxShadow: selectedFolder === null ? "0 2px 8px rgba(10, 0, 0, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.05)"
                    }}
                    onClick={() => setSelectedFolder(null)}
                    onMouseEnter={(e) => {
                      if (selectedFolder !== null) {
                        e.currentTarget.style.backgroundColor = "#f6fff8";
                        e.currentTarget.style.borderColor = "#008060";
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
                    <Text as="span" variant="bodyMd" style={{ 
                      fontWeight: "600", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px",
                      color: selectedFolder === null ? "#008060" : "rgba(48, 48, 48, 1)",
                      fontSize: "14px"
                    }}>
                      <i className="far fa-note-sticky" style={{ fontSize: "16px" }}></i>
                      All Notes
                    </Text>
                  </div>

                  {/* All Tags Button */}
                  <div 
                    style={{ 
                      padding: "8px 12px", 
                      flex: "1",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                      backgroundColor: showTagsSection ? "#f6fff8" : "#F8F9FA",
                      border: showTagsSection ? "2px solid #008060" : "2px solid #E1E3E5",
                      borderRadius: "8px",
                      position: "relative",
                      transition: "all 0.2s ease",
                      boxShadow: showTagsSection ? "0 2px 8px rgba(10, 0, 0, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.05)"
                    }}
                    onClick={() => {
                      if (showTagsSection) {
                        // When closing All Tags section, keep only selected tags visible
                        setShowTagsSection(false);
                      } else {
                        // When opening All Tags section, show all tags
                        setShowTagsSection(true);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!showTagsSection) {
                        e.currentTarget.style.backgroundColor = "#f6fff8";
                        e.currentTarget.style.borderColor = "#008060";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(10, 0, 0, 0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!showTagsSection) {
                        e.currentTarget.style.backgroundColor = "#F8F9FA";
                        e.currentTarget.style.borderColor = "#E1E3E5";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                      }
                    }}
                  >
                    <Text as="span" variant="bodyMd" style={{ 
                      fontWeight: "600", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px",
                      color: showTagsSection ? "#008060" : "rgba(48, 48, 48, 1)",
                      fontSize: "14px"
                    }}>
                      <i className="far fa-bookmark" style={{ fontSize: "16px" }}></i>
                      All Tags
                    </Text>
                  </div>
                </div>

                {/* Create New Folder Button - Under Search (only show when 6+ folders) */}
                {localFolders.length >= 6 && (
                  <div style={{ marginBottom: "12px" }}>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => setShowNewFolderModal(true)}
                      style={{ backgroundColor: '#008060', borderColor: '#008060' }}
                    >
                      <span style={{ color: 'white' }}>Create New Folder</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Tags Section - Under All Notes & All Tags Buttons */}
              {(showTagsSection || selectedTags.length > 0) && (
                <div style={{ 
                  marginBottom: "12px",
                  padding: "12px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e1e3e5"
                }}>
                  {getAllTagsWithCounts().length === 0 ? (
                    <Text as="p" style={{ color: "#6d7175", fontSize: "14px" }}>No tags created yet</Text>
                  ) : (
                    <div style={{ 
                      display: "flex", 
                      flexWrap: "wrap", 
                      gap: "6px",
                      padding: "8px 0"
                    }}>
                      {(showTagsSection ? getAllTagsWithCounts() : getAllTagsWithCounts().filter(({ tag }) => selectedTags.includes(tag))).map(({ tag, count }) => (
                        <div
                          key={tag}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: showTagsSection ? "6px" : "6px",
                            padding: showTagsSection ? "6px 10px" : "4px 8px",
                            backgroundColor: showTagsSection ? (selectedTags.includes(tag) ? "#008060" : "#f6fff8") : (selectedTags.includes(tag) ? "#f6fff8" : "transparent"),
                            borderRadius: "16px",
                            border: showTagsSection ? (selectedTags.includes(tag) ? "none" : "1px solid #008060") : (selectedTags.includes(tag) ? "1px solid #008060" : "1px solid #008060"),
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            position: "relative",
                            fontSize: showTagsSection ? "12px" : "12px",
                            fontWeight: showTagsSection ? "500" : "400",
                            color: showTagsSection ? (selectedTags.includes(tag) ? "white" : "#008060") : (selectedTags.includes(tag) ? "#008060" : "#008060"),
                            minHeight: showTagsSection ? "28px" : "24px",
                            justifyContent: "center",
                            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            boxShadow: showTagsSection ? (selectedTags.includes(tag) ? "0 2px 4px rgba(0, 128, 96, 0.2)" : "none") : "none"
                          }}
                          onClick={() => handleTagClick(tag)}
                          onMouseEnter={(e) => {
                            if (showTagsSection) {
                              if (selectedTags.includes(tag)) {
                                e.currentTarget.style.backgroundColor = "#006b52";
                                e.currentTarget.style.transform = "translateY(-1px)";
                                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 128, 96, 0.3)";
                              } else {
                                e.currentTarget.style.backgroundColor = "#e8f5f0";
                                e.currentTarget.style.borderColor = "#008060";
                              }
                            } else if (!selectedTags.includes(tag)) {
                              e.currentTarget.style.backgroundColor = "#e1e3e5";
                              e.currentTarget.style.borderColor = "#aeb4b9";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (showTagsSection) {
                              if (selectedTags.includes(tag)) {
                                e.currentTarget.style.backgroundColor = "#008060";
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 128, 96, 0.2)";
                              } else {
                                e.currentTarget.style.backgroundColor = "#f6fff8";
                                e.currentTarget.style.borderColor = "#008060";
                              }
                            } else if (!selectedTags.includes(tag)) {
                              e.currentTarget.style.backgroundColor = "#f6f6f7";
                              e.currentTarget.style.borderColor = "#d1d3d4";
                            }
                          }}
                        >
                          {(showTagsSection || selectedTags.includes(tag)) && (
                            <ProductFilledIcon style={{ width: '14px', height: '14px', color: (showTagsSection && selectedTags.includes(tag)) ? 'white' : '#008060' }} />
                          )}
                          <span>{tag}</span>
                          <span style={{ 
                            fontSize: showTagsSection ? "11px" : "11px", 
                            color: showTagsSection ? (selectedTags.includes(tag) ? "white" : "#008060") : (selectedTags.includes(tag) ? "#008060" : "#6d7175"), 
                            backgroundColor: showTagsSection ? (selectedTags.includes(tag) ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 128, 96, 0.1)") : (selectedTags.includes(tag) ? "rgba(0, 128, 96, 0.1)" : "rgba(0, 0, 0, 0.1)"), 
                            padding: showTagsSection ? "2px 5px" : "1px 4px", 
                            borderRadius: "10px",
                            fontWeight: showTagsSection ? "600" : "500"
                          }}>
                            {count}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteTagConfirm(tag);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: showTagsSection ? "12px" : "12px",
                              color: showTagsSection ? (selectedTags.includes(tag) ? "#dc2626" : "#dc2626") : (selectedTags.includes(tag) ? "#dc2626" : "#6d7175"),
                              padding: "2px",
                              borderRadius: "2px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                              marginLeft: "3px",
                              width: showTagsSection ? "18px" : "16px",
                              height: showTagsSection ? "18px" : "16px",
                              opacity: "0.8",
                              fontWeight: "bold"
                            }}
                            onMouseEnter={(e) => {
                              if (showTagsSection) {
                                e.target.style.backgroundColor = "rgba(220, 38, 38, 0.1)";
                                e.target.style.color = "#b91c1c";
                              } else {
                                e.target.style.backgroundColor = selectedTags.includes(tag) ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)";
                              }
                              e.target.style.opacity = "1";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = "transparent";
                              e.target.style.color = showTagsSection ? "#dc2626" : (selectedTags.includes(tag) ? "#dc2626" : "#6d7175");
                              e.target.style.opacity = "0.8";
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Scrollable Folders Section */}
            <div style={{ 
              flex: "1",
              overflowY: localFolders.length > 9 ? "auto" : "visible",
              overflowX: "hidden", 
              padding: "16px 20px 16px 16px",
              maxHeight: localFolders.length > 9 ? "500px" : "none"
            }}>
              {localFolders.length === 0 && localNotes.length === 0 ? (
                <EmptyState
                  heading="Create your first folder"
                  action={{
                    content: 'Create folder',
                    onAction: () => setShowNewFolderModal(true),
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Get organized by creating folders to group your notes by topic, project, or category.</p>
                </EmptyState>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleFolderDragEnd}
                >
                  <SortableContext
                    items={localFolders.map(f => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div>
                    {localFolders.map((folder) => (
                      <DraggableFolder 
                        key={folder.id} 
                        folder={folder}
                        selectedFolder={selectedFolder}
                        openFolderMenu={openFolderMenu}
                        setOpenFolderMenu={setOpenFolderMenu}
                        onFolderClick={(folderId) => setSelectedFolder(selectedFolder === folderId ? null : folderId)}
                      >
                        {openFolderMenu === folder.id && (
                          <div style={{ display: 'none' }}>
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
                onClick={handleNewFolderClick}
                variant="primary"
                size="large"
                fullWidth
              >
                New Folder
              </Button>
            </div>
          </Card>
                  </SortableColumn>
                )}
                {/* Drop indicator overlay - only show when dragging */}
                {activeId && (
                  <DropIndicator index={index} isActive={activeDropIndex === index} />
                )}
                {columnId === 'notes' && !collapsedColumns.notes && (
                  <SortableColumn 
                    key="notes"
                    id="notes"
                    isEditorFullscreen={isEditorFullscreen}
                    style={{ width: "380px", minWidth: "380px", maxWidth: "380px", overflow: "hidden" }}
                    data-column-id="notes"
                  >
          <Card style={{ flex: "1", display: "flex", flexDirection: "column", backgroundColor: "#fff", height: "100%", minHeight: "100%", padding: "0", margin: "0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", border: "1px solid #e1e3e5" }}>
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
                    <i className="far fa-note-sticky" style={{ fontSize: "20px" }}></i>
                    Notes
                  </Text>
                  {selectedFolder && (
                    <Text as="h1" style={{ fontSize: "32px", fontWeight: "900", color: "#202223", marginTop: "8px" }}>
                      {localFolders.find(f => f.id === selectedFolder)?.name}
                    </Text>
                  )}
                </div>
                <Button
                  onClick={() => toggleColumnCollapse('notes')}
                  variant="tertiary"
                  size="slim"
                  accessibilityLabel="Collapse Notes"
                >
                  <i className="fas fa-chevron-left"></i>
                </Button>
              </div>
              
              {/* Search Notes Input */}
              <div style={{ position: "relative" }}>
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
              
              {/* New Note Button */}
              <div style={{ marginTop: "16px" }}>
                <Button 
                  onClick={handleNewNote}
                  variant="primary" 
                  tone="warning"
                  fullWidth
                >
                  New Note
                </Button>
              </div>
            </div>

            {/* Scrollable Notes Section */}
            <div 
              data-notes-column
              style={{ 
                flex: "1",
                overflowY: filteredNotes.length > 1 ? "auto" : "visible",
                overflowX: "hidden",
                padding: "16px 20px 16px 16px",
                maxHeight: filteredNotes.length > 1 ? "calc(100vh - 200px)" : "none"
              }}>
              
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
                      backgroundColor: "rgba(48, 48, 48, 1)",
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
                      e.target.style.backgroundColor = "rgba(48, 48, 48, 1)";
                      e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                    }}
                  >
                    Move {selectedNotes.length} Selected Note{selectedNotes.length > 1 ? 's' : ''}
                  </Button>
                </div>
              )}
              
              {filteredNotes.length === 0 ? (
                <EmptyState
                  heading={selectedFolder ? "Create your first note" : "Select a folder to create notes"}
                  action={{
                    content: selectedFolder ? 'Create note' : 'Create folder first',
                    onAction: selectedFolder ? handleNewNote : () => setShowNewFolderModal(true),
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    {selectedFolder 
                      ? "Start writing your thoughts, ideas, and important information in this folder."
                      : "Select a folder from the left sidebar to organize your notes, or create your first folder to get started."
                    }
                  </p>
                </EmptyState>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", padding: "8px" }}>
                  {filteredNotes.map((note) => {
                    const createdDate = new Date(note.createdAt);
                    const updatedDate = new Date(note.updatedAt);
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const isSelected = editingNoteId === note.id;
                    const isCheckboxSelected = selectedNotes.includes(note.id);
                    
                    // Format dates with exact time like "9 Sep 2024, 2:30 PM"
                    const formatDateTime = (date) => {
                      const day = date.getDate();
                      const month = monthNames[date.getMonth()];
                      const year = date.getFullYear();
                      const hours = date.getHours();
                      const minutes = date.getMinutes().toString().padStart(2, '0');
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      const displayHours = hours % 12 || 12;
                      return `${day} ${month} ${year}, ${displayHours}:${minutes} ${ampm}`;
                    };
                    
                    const createdAt = formatDateTime(createdDate);
                    const updatedAt = formatDateTime(updatedDate);
                    
                    return (
                      <NoteCard
                        key={note.id}
                        title={note.title}
                        content={note.content}
                        tags={note.tags || []}
                        createdAt={createdAt}
                        updatedAt={updatedAt}
                        folder={note.folder?.name}
                        isSelected={isSelected}
                        inContext={isCheckboxSelected}
                        isPinned={note.pinnedAt !== null}
                        onClick={() => handleEditNote(note)}
                        onSelect={() => handleSelectButtonClick(note.id)}
                        isSelectButtonClicked={selectButtonClicked.has(note.id)}
                        onManage={() => setOpenNoteMenu(openNoteMenu === note.id ? null : note.id)}
                        onDelete={() => setShowDeleteNoteConfirm(note.id)}
                        onTagClick={(tag) => {
                          // Filter notes by tag within current context
                          // - If in a specific folder: shows notes with that tag in that folder only
                          // - If in All Notes: shows notes with that tag across all folders
                          console.log('onTagClick called with tag:', tag);
                          setGlobalSearchQuery(`tag:${tag}`);
                        }}
                        onDuplicate={(type) => handleDuplicateFromMenu(note.id, type)}
                        onMove={() => handleMoveFromMenu(note.id)}
                        onPin={() => handlePinNote(note.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
                  </SortableColumn>
                )}
                {/* Drop indicator overlay - only show when dragging */}
                {activeId && (
                  <DropIndicator index={index} isActive={activeDropIndex === index} />
                )}
                {columnId === 'editor' && (
                  <SortableColumn 
                    key="editor"
                    id="editor"
                    isEditorFullscreen={isEditorFullscreen}
                    style={{ 
                      ...(collapsedColumns.folders && collapsedColumns.notes ? {
                        flex: "1",
                        width: "auto",
                        maxWidth: "none"
                      } : {
                        flex: "1",
                        minWidth: "400px"
                      }),
                      transition: "all 0.3s ease"
                    }}
                    data-column-id="editor"
                  >
          <Card style={{ flex: "1", display: "flex", flexDirection: "column", backgroundColor: "#fff", height: "100%", minHeight: "100%", padding: "0", margin: "0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", border: "1px solid #e1e3e5" }}>
            <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Text as="h2" variant="headingLg" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <i className="far fa-edit" style={{ fontSize: "20px" }}></i>
                  Note Editor
                </Text>
                {(autoSaveNotification || hasUnsavedChanges) && (
                  <div style={{ marginTop: "4px" }}>
                    {autoSaveNotification && (
                      <Text as="p" style={{ 
                        fontSize: "14px", 
                        color: "#008060", 
                        fontWeight: "500", 
                        marginBottom: hasUnsavedChanges ? "4px" : "0",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        <i className="fas fa-check-circle" style={{ fontSize: "16px", color: "#008060" }}></i>
                        {autoSaveNotification}
                      </Text>
                    )}
                    {hasUnsavedChanges && (
                      <Text as="p" style={{ 
                        fontSize: "14px", 
                        color: "rgba(199, 10, 36, 1)", 
                        fontWeight: "600", 
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        <i className="fas fa-exclamation-triangle" style={{ fontSize: "16px", color: "rgba(199, 10, 36, 1)" }}></i>
                        You have unsaved changes
                      </Text>
                    )}
                  </div>
                )}
              </div>
              <InlineStack gap="200">
                {editingNoteId ? (
                  <>
                    <Button 
                      onClick={handleSaveNote}
                      variant="primary"
                      tone="success"
                    >
                      Save Note
                    </Button>
                    <Button 
                      onClick={handleCancelEdit}
                      variant="primary"
                      tone="base"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => setShowDeleteNoteConfirm(editingNoteId)}
                      variant="primary"
                      tone="critical"
                    >
                      Delete Note
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={handleCreateNote}
                    variant="primary"
                    tone="success"
                  >
                    Save Note
                  </Button>
                )}
              </InlineStack>
            </div>
            <div style={{ padding: "16px 16px 16px 16px", flex: "1", overflowY: "auto" }}>
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
                            const newTags = [...noteTags, cleanTag];
                            setNoteTags(newTags);
                            handleAutoSaveTags(newTags);
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
                            backgroundColor: "#f6fff8",
                            border: "1px solid #008060",
                            borderRadius: "16px",
                            fontSize: "12px",
                            color: "#008060"
                          }}
                        >
                          <span>{tag}</span>
                          <button
                            onClick={() => {
                              const newTags = noteTags.filter((_, i) => i !== index);
                              setNoteTags(newTags);
                              handleAutoSaveTags(newTags);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "14px",
                              color: "rgba(199, 10, 36, 1)",
                              padding: "0",
                              display: "flex",
                              alignItems: "center",
                              fontWeight: "bold"
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
                  {isMobile ? (
                    <MobileEditorButton
                      value={body}
                      onChange={setBody}
                      placeholder="Type your note here..."
                      isMobile={isMobile}
                      hasUnsavedChanges={hasUnsavedChanges}
                      lastSavedTime={autoSaveNotification ? null : (editingNoteId ? (wasJustSaved ? "Just now" : getLastSavedTime()) : null)}
                      autoSaveTime={autoSaveNotification}
                      editingNoteId={editingNoteId}
                      wasJustSaved={wasJustSaved}
                      isNewlyCreated={isNewlyCreated}
                      onFullscreenChange={setIsEditorFullscreen}
                    />
                  ) : (
                    <AdvancedRTE
                      value={body}
                      onChange={setBody}
                      placeholder="Type your note here..."
                      onFullscreenChange={setIsEditorFullscreen}
                    />
                  )}
                </div>
                <div style={{ marginTop: "20px" }}>
                  <InlineStack gap="300">
                  {editingNoteId ? (
                    <>
                      <Button 
                        onClick={handleSaveNote}
                        variant="primary"
                        tone="success"
                      >
                        Save Note
                      </Button>
                      <Button 
                        onClick={handleCancelEdit}
                        variant="primary"
                        tone="base"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => setShowDeleteNoteConfirm(editingNoteId)}
                        variant="primary"
                        tone="critical"
                      >
                        Delete Note
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={handleCreateNote}
                      variant="primary"
                      tone="success"
                    >
                      Save Note
                    </Button>
                   )}
                 </InlineStack>
               </div>
             </BlockStack>
            </div>
          </Card>
                  </SortableColumn>
                )}
                {/* Drop indicator overlay - only show when dragging */}
                {activeId && (
                  <DropIndicator index={index} isActive={activeDropIndex === index} />
                )}
              </div>
            ))}

          </div>
          </SortableContext>
        
        {/* Delete Confirmation Modal - Desktop Only */}
        {!isMobile && showDeleteConfirm && (
          <div className="modal-overlay" style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10001,
            padding: "16px"
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto"
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
                          // Remove folder from local state and clear selected folder if it was deleted
                          setLocalFolders(prevFolders => prevFolders.filter(folder => folder.id !== showDeleteConfirm));
                          if (selectedFolder === showDeleteConfirm) {
                            setSelectedFolder(null);
                          }
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
            zIndex: 10001
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
            zIndex: 10001
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
            zIndex: 10001
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
            zIndex: 10001
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
            zIndex: 10001
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
            zIndex: 10001
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

        {/* Delete Tag Confirmation Modal - Desktop Only */}
        {!isMobile && showDeleteTagConfirm && (
          <div className="modal-overlay" style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10001,
            padding: "16px"
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto"
            }}>
              <Text as="h3" variant="headingMd" style={{ marginBottom: "16px" }}>
                Delete Tag
              </Text>
              <Text as="p" style={{ marginBottom: "24px" }}>
                Are you sure you want to delete the tag "{showDeleteTagConfirm}" from all notes? This action is permanent and cannot be undone.
              </Text>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteTagConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  tone="critical"
                  onClick={() => handleDeleteTag(showDeleteTagConfirm)}
                >
                  Delete Tag
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Rename Folder Modal - Desktop Only */}
        {!isMobile && showRenameFolderModal && (
          <div className="modal-overlay" style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10001,
            padding: "16px"
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto"
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
                      // Remove emojis from folder name input
                      const cleanValue = removeEmojis(newValue);
                      if (cleanValue.length <= 30) {
                        setEditingFolderName(cleanValue);
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
                {localNotes.find(n => n.id === showTagPopup)?.tags?.map((tag, index) => (
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
                      background: "#008060",
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
                      e.target.style.backgroundColor = "#004c3b";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#008060";
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
          
          {/* DragOverlay for visual feedback */}
          <DragOverlay>
            {activeId ? (
              <div style={{
                opacity: 0.95,
                transform: 'rotate(2deg) scale(1.02)',
                boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 128, 96, 0.3)',
                borderRadius: '8px',
                overflow: 'hidden',
                zIndex: 10001,
                cursor: 'grabbing',
                maxHeight: '80vh',
                maxWidth: '90vw',
                pointerEvents: 'none'
              }}>
                {renderColumnContent(activeId)}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Copyright Footer */}
        <div style={{
          position: "fixed",
          bottom: "0",
          left: "0",
          right: "0",
          backgroundColor: "#f8f9fa",
          borderTop: "1px solid #e1e3e5",
          padding: "12px 24px",
          marginTop: "10px",
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



        {/* Folder Icon Picker Modal - Desktop Only */}
        {!isMobile && showIconPicker && (
          <FolderIconPicker
            isOpen={true}
            onClose={() => setShowIconPicker(null)}
            onSelectIcon={(iconData) => {
              handleIconChange(showIconPicker, iconData);
              setShowIconPicker(null);
            }}
            currentIcon={localFolders.find(f => f.id === showIconPicker)?.icon || "folder"}
            currentColor={localFolders.find(f => f.id === showIconPicker)?.iconColor || "rgba(255, 184, 0, 1)"}
            folderName={localFolders.find(f => f.id === showIconPicker)?.name || "Folder"}
          />
        )}

        {/* Folder Selector Popover */}
        <Popover
          active={showFolderSelector}
          activator={
            <div 
              id="folder-selector-activator"
              style={{ 
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '1px',
                height: '1px',
                opacity: 0,
                pointerEvents: 'none',
                zIndex: -1
              }} 
            />
          }
          onClose={() => {
            setShowFolderSelector(false);
            setFolderSelectorAction(null);
            setFolderSelectorNoteId(null);
            setFolderSelectorSearchQuery("");
          }}
          preferredPosition="below"
          preferredAlignment="left"
        >
          <Popover.Pane>
            <div style={{ padding: '16px', minWidth: '280px' }}>
              <TextContainer>
                <Text variant="headingMd" as="h3">
                  {folderSelectorAction === 'duplicate' ? 'Duplicate to folder' : 'Move to folder'}
                </Text>
                <div style={{ marginTop: '12px' }}>
                  <TextField
                    label="Search folders"
                    value={folderSelectorSearchQuery}
                    onChange={setFolderSelectorSearchQuery}
                    placeholder="Type to search folders..."
                    autoComplete="off"
                  />
                </div>
                <div style={{ marginTop: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                  <ActionList
                    items={localFolders
                      .filter(folder => {
                        // Filter out current folder and match search query
                        const currentNote = localNotes.find(n => n.id === folderSelectorNoteId);
                        const isCurrentFolder = currentNote && folder.id === currentNote.folderId;
                        return !isCurrentFolder && folder.name.toLowerCase().includes(folderSelectorSearchQuery.toLowerCase());
                      })
                      .map(folder => ({
                        content: folder.name,
                        onAction: () => handleFolderSelection(folder.id),
                        icon: 'folder'
                      }))
                    }
                  />
                </div>
              </TextContainer>
            </div>
          </Popover.Pane>
        </Popover>
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
            backgroundColor: 'white',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column'
          }}>
          
          {/* Mobile Alert */}
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
          {/* Mobile Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e1e3e5',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Left Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {mobileActiveSection === 'folders' && (
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                  Folders
                </h1>
              )}
              {mobileActiveSection === 'notes' && (
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                  Notes
                </h1>
              )}
              {editingNoteId && mobileActiveSection === 'editor' && (
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                  Note Editor
                </h1>
              )}
            </div>
            
            {/* Right Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {mobileActiveSection === 'folders' && (
                <Button
                  variant="primary"
                  size="slim"
                  onClick={() => setMobileActiveSection('notes')}
                  style={{ fontSize: '14px', fontWeight: '500' }}
                >
                  View Notes
                </Button>
              )}
              {mobileActiveSection === 'notes' && (
                <>
                  <Button
                    variant="secondary"
                    size="slim"
                    onClick={() => setMobileActiveSection('folders')}
                    className={animateBackToFolders ? 'back-to-folders-animate' : ''}
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
                    onClick={() => {
                      if (!selectedFolder) {
                        setAlertMessage('Please select a folder first to create a new note');
                        setAlertType('error');
                        // Hide error message after 4 seconds
                        setTimeout(() => setAlertMessage(''), 4000);
                        // Animate the Back to Folders button after error message disappears
                        setTimeout(() => {
                          console.log('Starting Back to Folders animation (mobile)');
                          setAnimateBackToFolders(true);
                          setTimeout(() => {
                            console.log('Stopping Back to Folders animation (mobile)');
                            setAnimateBackToFolders(false);
                          }, 2000);
                        }, 4000);
                        return;
                      }
                      handleNewNote();
                    }}
                    style={{ fontSize: '14px', fontWeight: '500' }}
                  >
                    Create Note
                  </Button>
                </>
              )}
              {editingNoteId && mobileActiveSection === 'editor' && (
                <>
                  <Button
                    variant="secondary"
                    size="slim"
                    onClick={() => setMobileActiveSection('folders')}
                    className={animateBackToFolders ? 'back-to-folders-animate' : ''}
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
                    onClick={() => setMobileActiveSection('notes')}
                    style={{ fontSize: '14px', fontWeight: '500', backgroundColor: '#000000', color: '#ffffff', borderColor: '#000000' }}
                  >
                    Back to Notes
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
            {/* Folders Section Content */}
            <div style={{ 
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Folders</h2>
              </div>
              
              {/* All Notes and All Tags Buttons - Mobile */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  {/* All Notes Button */}
                  <div 
                    style={{ 
                      padding: "8px 12px", 
                      flex: "1",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                      backgroundColor: selectedFolder === null ? "#f6fff8" : "#F8F9FA",
                      border: selectedFolder === null ? "2px solid #008060" : "2px solid #E1E3E5",
                      borderRadius: "8px",
                      position: "relative",
                      transition: "all 0.2s ease",
                      boxShadow: selectedFolder === null ? "0 2px 8px rgba(10, 0, 0, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.05)"
                    }}
                    onClick={() => setSelectedFolder(null)}
                  >
                    <span style={{ 
                      fontWeight: "600", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px",
                      color: selectedFolder === null ? "#008060" : "rgba(48, 48, 48, 1)",
                      fontSize: "14px"
                    }}>
                      <i className="far fa-note-sticky" style={{ fontSize: "16px" }}></i>
                      All Notes
                    </span>
                  </div>

                  {/* All Tags Button */}
                  <div 
                    style={{ 
                      padding: "8px 12px", 
                      flex: "1",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                      backgroundColor: showTagsSection ? "#f6fff8" : "#F8F9FA",
                      border: showTagsSection ? "2px solid #008060" : "2px solid #E1E3E5",
                      borderRadius: "8px",
                      position: "relative",
                      transition: "all 0.2s ease",
                      boxShadow: showTagsSection ? "0 2px 8px rgba(10, 0, 0, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.05)"
                    }}
                    onClick={() => {
                      if (showTagsSection) {
                        // When closing All Tags section, keep only selected tags visible
                        setShowTagsSection(false);
                      } else {
                        // When opening All Tags section, show all tags
                        setShowTagsSection(true);
                      }
                    }}
                  >
                    <span style={{ 
                      fontWeight: "600", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px",
                      color: showTagsSection ? "#008060" : "rgba(48, 48, 48, 1)",
                      fontSize: "14px"
                    }}>
                      <i className="far fa-bookmark" style={{ fontSize: "16px" }}></i>
                      All Tags
                    </span>
                  </div>
                </div>

                {/* Create New Folder Button - Mobile Top (only show when 6+ folders) */}
                {localFolders.length >= 6 && (
                  <div style={{ marginBottom: "12px" }}>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => setShowNewFolderModal(true)}
                      style={{ backgroundColor: '#008060', borderColor: '#008060' }}
                    >
                      <span style={{ color: 'white' }}>Create New Folder</span>
                    </Button>
                  </div>
                )}
              </div>
              
              <>
                {/* Tags Section - Mobile */}
                {(showTagsSection || selectedTags.length > 0) && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>Tags</h3>
                  <p style={{ color: '#6d7175', margin: '0 0 16px 0', fontSize: '14px' }}>Filter notes by tags</p>
                  
                  {/* Tags List - Mobile */}
                  {(showTagsSection || selectedTags.length > 0) && (
                    <div style={{ 
                      marginBottom: "12px",
                      padding: "12px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px",
                      border: "1px solid #e1e3e5"
                    }}>
                      {getAllTagsWithCounts().length === 0 ? (
                        <p style={{ color: "#6d7175", fontSize: "14px", margin: 0 }}>No tags created yet</p>
                      ) : (
                        <div style={{ 
                          display: "flex", 
                          flexWrap: "wrap", 
                          gap: "6px",
                          padding: "8px 0"
                        }}>
                          {(showTagsSection ? getAllTagsWithCounts() : getAllTagsWithCounts().filter(({ tag }) => selectedTags.includes(tag))).map(({ tag, count }) => (
                            <div
                              key={tag}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: showTagsSection ? "6px" : "6px",
                                padding: showTagsSection ? "6px 10px" : "4px 8px",
                                backgroundColor: showTagsSection ? (selectedTags.includes(tag) ? "#008060" : "#f6fff8") : (selectedTags.includes(tag) ? "#f6fff8" : "transparent"),
                                borderRadius: "16px",
                                border: showTagsSection ? (selectedTags.includes(tag) ? "none" : "1px solid #008060") : (selectedTags.includes(tag) ? "1px solid #008060" : "1px solid #008060"),
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                position: "relative",
                                fontSize: showTagsSection ? "12px" : "12px",
                                fontWeight: showTagsSection ? "500" : "400",
                                color: showTagsSection ? (selectedTags.includes(tag) ? "white" : "#008060") : (selectedTags.includes(tag) ? "#008060" : "#008060"),
                                minHeight: showTagsSection ? "28px" : "24px",
                                justifyContent: "center",
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                boxShadow: showTagsSection ? (selectedTags.includes(tag) ? "0 2px 4px rgba(0, 128, 96, 0.2)" : "none") : "none"
                              }}
                              onClick={() => handleTagClick(tag)}
                              onMouseEnter={(e) => {
                                if (showTagsSection) {
                                  if (selectedTags.includes(tag)) {
                                    e.currentTarget.style.backgroundColor = "#006b52";
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 128, 96, 0.3)";
                                  } else {
                                    e.currentTarget.style.backgroundColor = "#e8f5f0";
                                    e.currentTarget.style.borderColor = "#008060";
                                  }
                                } else if (!selectedTags.includes(tag)) {
                                  e.currentTarget.style.backgroundColor = "#e1e3e5";
                                  e.currentTarget.style.borderColor = "#aeb4b9";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (showTagsSection) {
                                  if (selectedTags.includes(tag)) {
                                    e.currentTarget.style.backgroundColor = "#008060";
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 128, 96, 0.2)";
                                  } else {
                                    e.currentTarget.style.backgroundColor = "#f6fff8";
                                    e.currentTarget.style.borderColor = "#008060";
                                  }
                                } else if (!selectedTags.includes(tag)) {
                                  e.currentTarget.style.backgroundColor = "#f6f6f7";
                                  e.currentTarget.style.borderColor = "#d1d3d4";
                                }
                              }}
                            >
                              {(showTagsSection || selectedTags.includes(tag)) && (
                                <ProductFilledIcon style={{ width: '14px', height: '14px', color: (showTagsSection && selectedTags.includes(tag)) ? 'white' : '#008060' }} />
                              )}
                              <span>{tag}</span>
                              <span style={{ 
                                fontSize: showTagsSection ? "11px" : "11px", 
                                color: showTagsSection ? (selectedTags.includes(tag) ? "white" : "#008060") : (selectedTags.includes(tag) ? "#008060" : "#6d7175"), 
                                backgroundColor: showTagsSection ? (selectedTags.includes(tag) ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 128, 96, 0.1)") : (selectedTags.includes(tag) ? "rgba(0, 128, 96, 0.1)" : "rgba(0, 0, 0, 0.1)"), 
                                padding: showTagsSection ? "2px 5px" : "1px 4px", 
                                borderRadius: "10px",
                                fontWeight: showTagsSection ? "600" : "500"
                              }}>
                                {count}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteTagConfirm(tag);
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: showTagsSection ? "12px" : "12px",
                                  color: showTagsSection ? (selectedTags.includes(tag) ? "#dc2626" : "#dc2626") : (selectedTags.includes(tag) ? "#dc2626" : "#6d7175"),
                                  padding: "2px",
                                  borderRadius: "2px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all 0.15s ease",
                                  marginLeft: "3px",
                                  width: showTagsSection ? "18px" : "16px",
                                  height: showTagsSection ? "18px" : "16px",
                                  opacity: "0.8",
                                  fontWeight: "bold"
                                }}
                                onMouseEnter={(e) => {
                                  if (showTagsSection) {
                                    e.target.style.backgroundColor = "rgba(220, 38, 38, 0.1)";
                                    e.target.style.color = "#b91c1c";
                                  } else {
                                    e.target.style.backgroundColor = selectedTags.includes(tag) ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)";
                                  }
                                  e.target.style.opacity = "1";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = "transparent";
                                  e.target.style.color = showTagsSection ? "#dc2626" : (selectedTags.includes(tag) ? "#dc2626" : "#6d7175");
                                  e.target.style.opacity = "0.8";
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                )}

                {/* Folders Section - Always Visible */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>Folders</h3>
                  <p style={{ color: '#6d7175', margin: '0 0 16px 0', fontSize: '14px' }}>Select a folder to view its notes</p>
                  
                  {/* All Notes Option */}
                  <div style={{ 
                    padding: "12px 16px", 
                    marginBottom: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: selectedFolder === null ? "#f6fff8" : "#F8F9FA",
                    border: selectedFolder === null ? "2px solid #008060" : "2px solid #E1E3E5",
                    borderRadius: "8px",
                    position: "relative",
                    transition: "all 0.2s ease",
                    boxShadow: selectedFolder === null ? "0 2px 8px rgba(10, 0, 0, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.05)",
                    cursor: "pointer"
                  }}
                  onClick={() => setSelectedFolder(null)}
                  >
                    <span style={{ 
                      fontWeight: "700", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "8px",
                      color: selectedFolder === null ? "#008060" : "#374151",
                      fontSize: "14px"
                    }}>
                      <i className="far fa-sticky-note" style={{ 
                        fontSize: "18px", 
                        color: selectedFolder === null ? "#008060" : "#6d7175"
                      }}></i>
                      All Notes
                    </span>
                    {selectedFolder === null && (
                      <span style={{ 
                        fontSize: "12px", 
                        color: "#008060", 
                        backgroundColor: "rgba(0, 128, 96, 0.1)", 
                        padding: "2px 6px", 
                        borderRadius: "4px",
                        fontWeight: "600"
                      }}>
                        Active
                      </span>
                    )}
                  </div>

                  {/* Folders List */}
                  {localFolders.length === 0 ? (
                    <div style={{ 
                      padding: "20px", 
                      textAlign: "center", 
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
                        items={localFolders.map(f => f.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div>
                          {localFolders.map((folder) => (
                            <DraggableFolder 
                              key={folder.id} 
                              folder={folder}
                              selectedFolder={selectedFolder}
                              openFolderMenu={mobileOpenFolderMenu}
                              setOpenFolderMenu={setMobileOpenFolderMenu}
                              onFolderClick={(folderId) => setSelectedFolder(selectedFolder === folderId ? null : folderId)}
                            >
                              {mobileOpenFolderMenu === folder.id && (
                                <div className="mobile-folder-menu" style={{
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowRenameFolderModal(folder.id);
                                      setEditingFolderName(folder.name);
                                      setMobileOpenFolderMenu(null);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: 'none',
                                      background: 'none',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      fontSize: '14px',
                                      color: '#374151',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = '#f6fff8';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <i className="far fa-edit" style={{ fontSize: '12px' }}></i>
                                    Rename
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowIconPicker(folder.id);
                                      setMobileOpenFolderMenu(null);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: 'none',
                                      background: 'none',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      fontSize: '14px',
                                      color: '#374151',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = '#f6fff8';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <ExchangeIcon style={{ width: '15px', height: '15px' }} />
                                    Change Icon
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowDeleteConfirm(folder.id);
                                      setMobileOpenFolderMenu(null);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: 'none',
                                      background: 'none',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      fontSize: '14px',
                                      color: '#dc2626',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = '#fef2f2';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = 'transparent';
                                    }}
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
                  
                  {/* Create New Folder Button */}
                  <div style={{ marginTop: '16px' }}>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => setShowNewFolderModal(true)}
                      style={{ backgroundColor: '#008060', borderColor: '#008060' }}
                    >
                      <span style={{ color: 'white' }}>Create New Folder</span>
                    </Button>
                  </div>
                </div>

              </>
            </div>
          </div>

          <div style={{ 
            display: mobileActiveSection === 'notes' ? 'block' : 'none',
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            WebkitOverflowScrolling: 'touch'
          }}>
            {/* Notes Section Content */}
            <div style={{ 
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Notes</h2>
              </div>
              
              {/* Mobile Multi-select action buttons */}
              {selectedNotes.length > 0 && (
                <div style={{ 
                  marginBottom: "16px",
                  display: "flex",
                  gap: "8px",
                  flexDirection: "column"
                }}>
                  <Button
                    variant="primary"
                    tone="critical"
                    onClick={() => setShowDeleteMultipleConfirm(true)}
                    style={{
                      backgroundColor: "#d82c0d",
                      border: "none",
                      color: "white",
                      padding: "10px 16px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500"
                    }}
                  >
                    Delete {selectedNotes.length} Selected Note{selectedNotes.length > 1 ? 's' : ''}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setShowMoveModal('bulk')}
                    style={{
                      backgroundColor: "rgba(48, 48, 48, 1)",
                      border: "none",
                      color: "white",
                      padding: "10px 16px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500"
                    }}
                  >
                    Move {selectedNotes.length} Selected Note{selectedNotes.length > 1 ? 's' : ''}
                  </Button>
                </div>
              )}
              
              {/* Current Folder Pill/Tag Indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap'
              }}>
                {/* Current Folder Pill */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: selectedFolder ? '#e3f2fd' : '#f5f5f5',
                  border: selectedFolder ? '1px solid #1976d2' : '1px solid #e0e0e0',
                  borderRadius: '20px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  <span style={{ color: selectedFolder ? '#1976d2' : '#666666' }}>
                    Current Folder:
                  </span>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: selectedFolder ? '#1976d2' : '#666666',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '13px'
                  }}>
                    {selectedFolder ? localFolders.find(f => f.id === selectedFolder)?.name : 'Viewing all notes'}
                    {selectedFolder && (
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0',
                          marginLeft: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          transition: 'background-color 0.2s ease'
                        }}
                        onClick={() => setSelectedFolder(null)}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                </div>

                {/* Change/Select Folder Button */}
                <Button
                  variant="secondary"
                  size="slim"
                  onClick={() => setMobileActiveSection('folders')}
                  style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e0e0e0',
                    color: '#333333'
                  }}
                >
                  {selectedFolder ? 'Change Folder' : 'Select a Folder'}
                </Button>
              </div>

              {/* Selected Tags (if any) */}
              {selectedTags.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '6px',
                  marginBottom: '16px'
                }}>
                  {selectedTags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#008060',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      <i className="fas fa-tag" style={{ fontSize: '11px' }}></i>
                      {tag}
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0',
                          marginLeft: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          transition: 'background-color 0.2s ease'
                        }}
                        onClick={() => {
                          const newTags = selectedTags.filter((_, i) => i !== index);
                          setSelectedTags(newTags);
                          if (newTags.length === 0) {
                            setGlobalSearchQuery("");
                          } else {
                            setGlobalSearchQuery(`tag:${newTags.join(' tag:')}`);
                          }
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Notes List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {localNotes
                  .filter(note => {
                    if (selectedFolder && note.folderId !== selectedFolder) return false;
                    if (selectedTags.length > 0) {
                      const noteTags = note.tags || [];
                      return selectedTags.some(tag => noteTags.includes(tag));
                    }
                    return true;
                  })
                  .map((note) => {
                    const createdDate = new Date(note.createdAt);
                    const updatedDate = new Date(note.updatedAt);
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    
                    // Format dates with exact time like "9 Sep 2024, 2:30 PM"
                    const formatDateTime = (date) => {
                      const day = date.getDate();
                      const month = monthNames[date.getMonth()];
                      const year = date.getFullYear();
                      const hours = date.getHours();
                      const minutes = date.getMinutes().toString().padStart(2, '0');
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      const displayHours = hours % 12 || 12;
                      return `${day} ${month} ${year}, ${displayHours}:${minutes} ${ampm}`;
                    };
                    
                    const createdAt = formatDateTime(createdDate);
                    const updatedAt = formatDateTime(updatedDate);
                    const wasEdited = note.updatedAt !== note.createdAt;
                    
                    return (
                      <div
                        key={note.id}
                        style={{
                          padding: '16px',
                          border: selectButtonClicked.has(note.id) ? '1px solid #FF8C00' : '1px solid #D1D3D4',
                          borderRadius: '12px',
                          backgroundColor: selectButtonClicked.has(note.id) ? '#fffbf8' : 'white',
                          position: 'relative',
                          boxShadow: selectButtonClicked.has(note.id) ? '0 4px 12px rgba(255, 140, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          if (selectButtonClicked.has(note.id)) {
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 140, 0, 0.4)';
                            e.currentTarget.style.borderColor = '#FF8C00';
                          } else {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                            e.currentTarget.style.borderColor = '#D0D7E2';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          if (selectButtonClicked.has(note.id)) {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 140, 0, 0.3)';
                            e.currentTarget.style.borderColor = '#FF8C00';
                          } else {
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                            e.currentTarget.style.borderColor = '#D1D3D4';
                          }
                        }}
                      >
                        {/* Note Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                              {note.title || 'Untitled'}
                            </h3>
                            {/* Folder Badge */}
                            {note.folderId && localFolders.find(f => f.id === note.folderId) && (
                              <div style={{ marginTop: '4px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  backgroundColor: '#E3F2FD',
                                  color: '#1976D2',
                                  border: '1px solid #BBDEFB',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: '500'
                                }}>
                                  {localFolders.find(f => f.id === note.folderId)?.name}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Pin Icon */}
                          {note.pinnedAt && (
                            <div style={{ marginLeft: '8px' }}>
                              <i className="fas fa-thumbtack" style={{ 
                                color: '#008060', 
                                fontSize: '14px',
                                transform: 'rotate(45deg)'
                              }}></i>
                            </div>
                          )}
                        </div>
                        
                        {/* Note Content */}
                        {note.content && (
                          <p style={{ 
                            margin: '0 0 8px 0', 
                            color: '#6d7175', 
                            fontSize: '14px',
                            lineHeight: '1.4',
                            display: '-webkit-box',
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {note.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                          </p>
                        )}
                        
                        {/* Tags */}
                        {note.tags && note.tags.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {note.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={index}
                                  style={{
                                    backgroundColor: '#E8F5E8',
                                    color: '#008060',
                                    border: '1px solid #B8E6B8',
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                              {note.tags.length > 3 && (
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: '#6d7175',
                                  backgroundColor: '#F5F5F5',
                                  border: '1px solid #E0E0E0',
                                  padding: '4px 8px',
                                  borderRadius: '12px',
                                  fontWeight: '500'
                                }}>
                                  +{note.tags.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Date Information and Action Buttons */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          borderTop: '1px solid #f1f3f4',
                          paddingTop: '8px',
                          marginTop: '8px'
                        }}>
                          {/* Date Information - Left Side */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#8C9196', fontWeight: '500' }}>
                              <strong>Created:</strong> {createdAt}
                            </span>
                            {wasEdited && (
                              <span style={{ fontSize: '12px', color: '#8C9196', fontWeight: '500' }}>
                                <strong>Edited:</strong> {updatedAt}
                              </span>
                            )}
                          </div>
                          
                          {/* Action Buttons - Right Side */}
                          <div className="mobile-note-actions" style={{ display: 'flex', gap: '4px', position: 'relative', zIndex: 2 }}>
                            {/* Select Button */}
                            <Button
                              size="slim"
                              variant={selectButtonClicked.has(note.id) ? "primary" : "secondary"}
                              tone={selectButtonClicked.has(note.id) ? "warning" : "base"}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectButtonClick(note.id);
                              }}
                            >
                              Select
                            </Button>
                            
                            {/* Manage Button */}
                            <Button
                              data-manage-button
                              size="slim"
                              variant="secondary"
                              tone="warning"
                              onClick={(e) => {
                                e.stopPropagation();
                                const buttonRect = e.currentTarget.getBoundingClientRect();
                                const viewportWidth = window.innerWidth;
                                
                                // Position dropdown with mobile-friendly positioning
                                let left = buttonRect.left;
                                let top = buttonRect.bottom + 4;
                                
                                // Ensure menu doesn't go off-screen on mobile
                                if (left + 200 > viewportWidth) {
                                  left = viewportWidth - 220; // 200px menu width + 20px margin
                                }
                                
                                // If menu would go below viewport, position it above the button
                                if (top + 200 > window.innerHeight) {
                                  top = buttonRect.top - 204; // 200px menu height + 4px margin
                                }
                                
                                setDropdownPosition({ top, left });
                                setOpenNoteMenu(openNoteMenu === note.id ? null : note.id);
                              }}
                            >
                              Manage
                            </Button>
                            
                            {/* Delete Button */}
                            <Button
                              size="slim"
                              variant="secondary"
                              tone="critical"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteNoteConfirm(note.id);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        
                        {/* Click to Edit Overlay */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            cursor: 'pointer',
                            zIndex: 1
                          }}
                          onClick={() => {
                            handleEditNote(note);
                            setMobileActiveSection('editor');
                          }}
                        />
                      </div>
                    );
                  })}
              </div>

            </div>
          </div>

          {/* Portal Dropdown for Mobile */}
          <PortalDropdown
            isOpen={openNoteMenu !== null}
            position={dropdownPosition}
            onClose={() => setOpenNoteMenu(null)}
            note={(() => {
              const foundNote = localNotes.find(n => n.id === openNoteMenu);
              console.log('Mobile PortalDropdown - openNoteMenu:', openNoteMenu, 'foundNote:', foundNote);
              return foundNote;
            })()}
          />

          <div style={{ 
            display: mobileActiveSection === 'editor' ? 'block' : 'none',
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            WebkitOverflowScrolling: 'touch',
            position: 'relative',
            zIndex: 1
          }}>
            {/* Editor Section Content */}
            <div style={{ 
              backgroundColor: 'transparent',
              borderRadius: '0px',
              padding: '0px',
              boxShadow: 'none',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              border: 'none'
            }}>
              {/* Editor Header */}
              <div style={{ 
                padding: "12px 16px", 
                borderBottom: "1px solid #e1e3e5",
                marginBottom: "16px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px 8px 0 0"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Note Editor</h2>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#008060",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500"
                      }}
                      onClick={handleMobileSave}
                    >
                      Save
                    </button>
                    <button
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#6d7175",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500"
                      }}
                      onClick={() => setMobileActiveSection('notes')}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                
                {/* Folder Path */}
                {selectedFolder && (
                  <div style={{ 
                    fontSize: "12px", 
                    color: "#6d7175",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "white",
                    padding: "6px 8px",
                    borderRadius: "4px",
                    border: "1px solid #e1e3e5"
                  }}>
                    <FolderIcon style={{ width: '14px', height: '14px' }} />
                    {localFolders.find(f => f.id === selectedFolder)?.name}
                  </div>
                )}

              </div>

              {/* Title Input */}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ 
                  display: "block", 
                  fontSize: "12px", 
                  fontWeight: "600", 
                  color: "#374151", 
                  marginBottom: "4px" 
                }}>
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Note title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e1e3e5",
                    borderRadius: "6px",
                    fontSize: "15px",
                    fontWeight: "600",
                    backgroundColor: "white"
                  }}
                />
              </div>

              {/* Tags Input */}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ 
                  display: "block", 
                  fontSize: "12px", 
                  fontWeight: "600", 
                  color: "#374151", 
                  marginBottom: "4px" 
                }}>
                  Tags
                </label>
                <input
                  type="text"
                  placeholder="Add tags (comma separated)..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const tags = newTagInput.split(',').map(tag => tag.trim()).filter(tag => tag);
                      setNoteTags([...noteTags, ...tags]);
                      setNewTagInput('');
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e1e3e5",
                    borderRadius: "6px",
                    fontSize: "13px",
                    backgroundColor: "white"
                  }}
                />
                {noteTags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                    {noteTags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          backgroundColor: "#008060",
                          color: "white",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "12px"
                        }}
                      >
                        {tag}
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            padding: "0",
                            marginLeft: "4px"
                          }}
                          onClick={() => {
                            const newTags = noteTags.filter((_, i) => i !== index);
                            setNoteTags(newTags);
                          }}
                        >
                          <i className="fas fa-times" style={{ fontSize: "10px" }}></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Rich Text Editor */}
              <div style={{ 
                flex: 1, 
                minHeight: "250px",
                border: "none",
                borderRadius: "8px",
                overflow: "hidden"
              }}>
                <div style={{ height: "100%" }}>
                  {isMobile ? (
                    <MobileEditorButton
                      value={body}
                      onChange={setBody}
                      placeholder="Type your note here..."
                      isMobile={isMobile}
                      hasUnsavedChanges={hasUnsavedChanges}
                      lastSavedTime={autoSaveNotification ? null : (editingNoteId ? (wasJustSaved ? "Just now" : getLastSavedTime()) : null)}
                      autoSaveTime={autoSaveNotification}
                      editingNoteId={editingNoteId}
                      wasJustSaved={wasJustSaved}
                      isNewlyCreated={isNewlyCreated}
                      onFullscreenChange={setIsEditorFullscreen}
                    />
                  ) : (
                    <AdvancedRTE
                      value={body}
                      onChange={setBody}
                      placeholder="Type your note here..."
                      onFullscreenChange={setIsEditorFullscreen}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>


          {/* Mobile Modals - rendered inside mobile layout */}
          {isMobile && (
            <>
              {/* Delete Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="modal-overlay" style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 99999,
                  padding: "16px"
                }}>
                  <div style={{
                    backgroundColor: "white",
                    padding: "24px",
                    borderRadius: "8px",
                    maxWidth: "400px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflow: "auto"
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
                                // Remove folder from local state and clear selected folder if it was deleted
                                setLocalFolders(prevFolders => prevFolders.filter(folder => folder.id !== showDeleteConfirm));
                                if (selectedFolder === showDeleteConfirm) {
                                  setSelectedFolder(null);
                                }
                                setShowDeleteConfirm(null);
                              } else {
                                setAlertMessage(result.error || 'Failed to delete folder');
                                setShowDeleteConfirm(null);
                              }
                            } else {
                              setAlertMessage('Failed to delete folder');
                              setShowDeleteConfirm(null);
                            }
                          } catch (error) {
                            console.error('Error deleting folder:', error);
                            setAlertMessage('Failed to delete folder');
                            setShowDeleteConfirm(null);
                          }
                        }}
                      >
                        Delete Folder
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Tag Confirmation Modal */}
              {showDeleteTagConfirm && (
                <div className="modal-overlay" style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10001,
                  padding: "16px"
                }}>
                  <div style={{
                    backgroundColor: "white",
                    padding: "24px",
                    borderRadius: "8px",
                    maxWidth: "400px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflow: "auto"
                  }}>
                    <Text as="h3" variant="headingMd" style={{ marginBottom: "16px" }}>
                      Delete Tag
                    </Text>
                    <Text as="p" style={{ marginBottom: "24px" }}>
                      Are you sure you want to delete the tag "{showDeleteTagConfirm}" from all notes? This action is permanent and cannot be undone.
                    </Text>
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                      <Button
                        variant="secondary"
                        onClick={() => setShowDeleteTagConfirm(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        tone="critical"
                        onClick={() => handleDeleteTag(showDeleteTagConfirm)}
                      >
                        Delete Tag
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Note Confirmation Modal */}
              {showDeleteNoteConfirm && (
                <div className="modal-overlay" style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 99999,
                  padding: "16px"
                }}>
                  <div style={{
                    backgroundColor: "white",
                    padding: "24px",
                    borderRadius: "8px",
                    maxWidth: "400px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflow: "auto"
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
                <div className="modal-overlay" style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 99999,
                  padding: "16px"
                }}>
                  <div style={{
                    backgroundColor: "white",
                    padding: "24px",
                    borderRadius: "8px",
                    maxWidth: "400px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflow: "auto"
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
                        tone="critical"
                        onClick={() => handleDeleteMultipleNotes()}
                      >
                        Delete Notes
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Rename Folder Modal */}
              {showRenameFolderModal && (
                <div className="modal-overlay" style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10001,
                  padding: "16px"
                }}>
                  <div style={{
                    backgroundColor: "white",
                    padding: "24px",
                    borderRadius: "8px",
                    maxWidth: "400px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflow: "auto"
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
                          // Remove emojis from folder name input
                          const cleanValue = removeEmojis(newValue);
                          if (cleanValue.length <= 30) {
                            setEditingFolderName(cleanValue);
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
                          border: "1px solid #d1d3d4",
                          borderRadius: "4px",
                          fontSize: "14px",
                          outline: "none"
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

              {/* Folder Icon Picker Modal - Mobile */}
              {showIconPicker && (() => {
                const currentFolder = localFolders.find(f => f.id === showIconPicker);
                
                const folderIcons = [
                  { icon: "folder", name: "Folder" },
                  { icon: "folder-open", name: "Folder Open" },
                  { icon: "image", name: "Image" },
                  { icon: "house", name: "House" },
                  { icon: "face-smile", name: "Smile" },
                  { icon: "star", name: "Star" },
                  { icon: "heart", name: "Heart" },
                  { icon: "address-book", name: "Address Book" },
                  { icon: "bookmark", name: "Bookmark" },
                  { icon: "pen-to-square", name: "Compose" },
                  { icon: "user", name: "User" },
                  { icon: "gem", name: "Gem" },
                  { icon: "square-check", name: "Check" },
                  { icon: "trash-can", name: "Trash" },
                  { icon: "flag", name: "Flag" },
                  { icon: "calendar", name: "Calendar" },
                  { icon: "lightbulb", name: "Light Bulb" },
                  { icon: "bell", name: "Bell" },
                  { icon: "truck", name: "Truck" },
                  { icon: "file-code", name: "Code" }
                ];

                const iconColors = [
                  { color: "rgba(1, 75, 64, 1)", name: "Green" },
                  { color: "rgba(199, 10, 36, 1)", name: "Red" },
                  { color: "rgba(255, 184, 0, 1)", name: "Orange" },
                  { color: "rgba(255, 230, 0, 1)", name: "Yellow" },
                  { color: "rgba(227, 227, 227, 1)", name: "White" },
                  { color: "rgba(48, 48, 48, 1)", name: "Black" },
                  { color: "rgba(0, 91, 211, 1)", name: "Blue" },
                  { color: "rgba(128, 81, 255, 1)", name: "Purple" }
                ];

                const handleSave = () => {
                  handleIconChange(showIconPicker, { icon: mobileSelectedIcon, color: mobileSelectedColor });
                  setShowIconPicker(null);
                };

                return (
                  <div className="modal-overlay" style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10002,
                    padding: "16px"
                  }}>
                    <div style={{
                      backgroundColor: "white",
                      padding: "16px",
                      borderRadius: "8px",
                      maxWidth: "350px",
                      width: "100%",
                      maxHeight: "85vh",
                      overflow: "auto",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)"
                    }}>
                      <div style={{ marginBottom: '12px' }}>
                        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                          Change Icon for "{currentFolder?.name || "Folder"}"
                        </h2>
                      </div>
                      
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
                          Current: <i className={`far fa-${currentFolder?.icon || "folder"}`} style={{ fontSize: '18px', marginLeft: '6px', color: currentFolder?.iconColor || "rgba(255, 184, 0, 1)" }}></i>
                        </p>
                      </div>
                      
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
                          Selected: <i className={`far fa-${mobileSelectedIcon}`} style={{ fontSize: '18px', marginLeft: '6px', color: mobileSelectedColor }}></i>
                        </p>
                      </div>

                      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                        Choose an icon:
                      </h3>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '6px',
                        marginBottom: '20px',
                        padding: '8px',
                        border: '1px solid #e1e3e5',
                        borderRadius: '8px',
                        backgroundColor: '#fafbfb'
                      }}>
                        {folderIcons.map((iconData, index) => (
                          <button
                            key={index}
                            onClick={() => setMobileSelectedIcon(iconData.icon)}
                            style={{
                              width: '45px',
                              height: '45px',
                              border: mobileSelectedIcon === iconData.icon ? '2px solid #2e7d32' : '1px solid #e1e3e5',
                              borderRadius: '6px',
                              backgroundColor: mobileSelectedIcon === iconData.icon ? '#e8f5e8' : 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              transition: 'all 0.2s ease',
                              padding: '2px'
                            }}
                            title={iconData.name}
                          >
                            <i className={`far fa-${iconData.icon}`} style={{ color: mobileSelectedColor }}></i>
                          </button>
                        ))}
                      </div>

                      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                        Choose a color:
                      </h3>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '6px',
                        marginBottom: '20px',
                        padding: '8px',
                        border: '1px solid #e1e3e5',
                        borderRadius: '8px',
                        backgroundColor: '#fafbfb'
                      }}>
                        {iconColors.map((colorData, index) => (
                          <button
                            key={index}
                            onClick={() => setMobileSelectedColor(colorData.color)}
                            style={{
                              width: '35px',
                              height: '35px',
                              border: mobileSelectedColor === colorData.color ? '2px solid #2e7d32' : '1px solid #e1e3e5',
                              borderRadius: '50%',
                              backgroundColor: colorData.color,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              boxShadow: colorData.color === 'rgba(227, 227, 227, 1)' ? 'inset 0 0 0 1px #e1e3e5' : 'none'
                            }}
                            title={colorData.name}
                          >
                            {mobileSelectedColor === colorData.color && (
                              <i className="fas fa-check" style={{ 
                                color: colorData.color === 'rgba(255, 230, 0, 1)' || colorData.color === 'rgba(227, 227, 227, 1)' ? 'rgba(48, 48, 48, 1)' : 'white',
                                fontSize: '12px' 
                              }}></i>
                            )}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                          onClick={() => setShowIconPicker(null)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #e1e3e5',
                            borderRadius: '4px',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            fontSize: '13px',
                            minWidth: '60px'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          style={{
                            padding: '8px 12px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: '#008060',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            minWidth: '80px'
                          }}
                        >
                          Save Icon
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* New Folder Modal - Mobile */}
              {showNewFolderModal && (() => {
                
                const folderIcons = [
                  { icon: "folder", name: "Folder" },
                  { icon: "folder-open", name: "Folder Open" },
                  { icon: "image", name: "Image" },
                  { icon: "house", name: "House" },
                  { icon: "face-smile", name: "Smile" },
                  { icon: "star", name: "Star" },
                  { icon: "heart", name: "Heart" },
                  { icon: "address-book", name: "Address Book" },
                  { icon: "bookmark", name: "Bookmark" },
                  { icon: "pen-to-square", name: "Compose" },
                  { icon: "user", name: "User" },
                  { icon: "gem", name: "Gem" },
                  { icon: "square-check", name: "Check" },
                  { icon: "trash-can", name: "Trash" },
                  { icon: "flag", name: "Flag" },
                  { icon: "calendar", name: "Calendar" },
                  { icon: "lightbulb", name: "Light Bulb" },
                  { icon: "bell", name: "Bell" },
                  { icon: "truck", name: "Truck" },
                  { icon: "file-code", name: "Code" }
                ];

                const iconColors = [
                  { color: "rgba(1, 75, 64, 1)", name: "Green" },
                  { color: "rgba(199, 10, 36, 1)", name: "Red" },
                  { color: "rgba(255, 184, 0, 1)", name: "Orange" },
                  { color: "rgba(255, 230, 0, 1)", name: "Yellow" },
                  { color: "rgba(227, 227, 227, 1)", name: "White" },
                  { color: "rgba(48, 48, 48, 1)", name: "Black" },
                  { color: "rgba(0, 91, 211, 1)", name: "Blue" },
                  { color: "rgba(128, 81, 255, 1)", name: "Purple" }
                ];

                const handleCreate = () => {
                  if (!mobileFolderName.trim()) {
                    return;
                  }
                  
                  handleCreateFolderFromModal({
                    name: mobileFolderName.trim(),
                    icon: mobileNewFolderIcon,
                    color: mobileNewFolderColor
                  });
                  
                  // Reset form
                  setMobileFolderName('');
                  setMobileNewFolderIcon('folder');
                  setMobileNewFolderColor('rgba(255, 184, 0, 1)');
                  setShowNewFolderModal(false);
                };

                return (
                  <div className="modal-overlay" style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10002,
                    padding: "16px"
                  }}>
                    <div style={{
                      backgroundColor: "white",
                      padding: "16px",
                      borderRadius: "8px",
                      maxWidth: "350px",
                      width: "100%",
                      maxHeight: "85vh",
                      overflow: "auto",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)"
                    }}>
                      <div style={{ marginBottom: '12px' }}>
                        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                          Create New Folder
                        </h2>
                      </div>
                      
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                          Folder Name
                        </label>
                        <input
                          type="text"
                          value={mobileFolderName}
                          onChange={(e) => {
                            const cleanValue = e.target.value.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
                            if (cleanValue.length <= 30) {
                              setMobileFolderName(cleanValue);
                            }
                          }}
                          placeholder="Enter folder name..."
                          maxLength={30}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e1e3e5',
                            borderRadius: '4px',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                          }}
                        />
                        <div style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                          {mobileFolderName.length}/30 characters
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
                          Preview: <i className={`far fa-${mobileNewFolderIcon}`} style={{ fontSize: '18px', marginLeft: '6px', color: mobileNewFolderColor }}></i> {mobileFolderName || 'Folder Name'}
                        </p>
                      </div>

                      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                        Choose an icon:
                      </h3>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '6px',
                        marginBottom: '20px',
                        padding: '8px',
                        border: '1px solid #e1e3e5',
                        borderRadius: '8px',
                        backgroundColor: '#fafbfb'
                      }}>
                        {folderIcons.map((iconData, index) => (
                          <button
                            key={index}
                            onClick={() => setMobileNewFolderIcon(iconData.icon)}
                            style={{
                              width: '45px',
                              height: '45px',
                              border: mobileNewFolderIcon === iconData.icon ? '2px solid #2e7d32' : '1px solid #e1e3e5',
                              borderRadius: '6px',
                              backgroundColor: mobileNewFolderIcon === iconData.icon ? '#e8f5e8' : 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              transition: 'all 0.2s ease',
                              padding: '2px'
                            }}
                            title={iconData.name}
                          >
                            <i className={`far fa-${iconData.icon}`} style={{ color: mobileNewFolderColor }}></i>
                          </button>
                        ))}
                      </div>

                      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                        Choose a color:
                      </h3>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '6px',
                        marginBottom: '20px',
                        padding: '8px',
                        border: '1px solid #e1e3e5',
                        borderRadius: '8px',
                        backgroundColor: '#fafbfb'
                      }}>
                        {iconColors.map((colorData, index) => (
                          <button
                            key={index}
                            onClick={() => setMobileNewFolderColor(colorData.color)}
                            style={{
                              width: '35px',
                              height: '35px',
                              border: mobileNewFolderColor === colorData.color ? '2px solid #2e7d32' : '1px solid #e1e3e5',
                              borderRadius: '50%',
                              backgroundColor: colorData.color,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              boxShadow: colorData.color === 'rgba(227, 227, 227, 1)' ? 'inset 0 0 0 1px #e1e3e5' : 'none'
                            }}
                            title={colorData.name}
                          >
                            {mobileNewFolderColor === colorData.color && (
                              <i className="fas fa-check" style={{ 
                                color: colorData.color === 'rgba(255, 230, 0, 1)' || colorData.color === 'rgba(227, 227, 227, 1)' ? 'rgba(48, 48, 48, 1)' : 'white',
                                fontSize: '12px' 
                              }}></i>
                            )}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                          onClick={() => setShowNewFolderModal(false)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #e1e3e5',
                            borderRadius: '4px',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            fontSize: '13px',
                            minWidth: '60px'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreate}
                          disabled={!mobileFolderName.trim()}
                          style={{
                            padding: '8px 12px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: mobileFolderName.trim() ? '#008060' : '#ccc',
                            color: 'white',
                            cursor: mobileFolderName.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '13px',
                            fontWeight: '500',
                            minWidth: '80px'
                          }}
                        >
                          Create Folder
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Mobile Folder Selector Popover */}
              {showFolderSelector && (
                <div className="modal-overlay" style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 10002,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    width: '100%',
                    maxWidth: '400px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '20px'
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#202223'
                      }}>
                        {folderSelectorAction === 'duplicate' ? 'Duplicate to folder' : 'Move to folder'}
                      </h3>
                      <button
                        onClick={() => {
                          setShowFolderSelector(false);
                          setFolderSelectorAction(null);
                          setFolderSelectorNoteId(null);
                          setFolderSelectorSearchQuery("");
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '20px',
                          cursor: 'pointer',
                          color: '#6d7175',
                          padding: '4px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <input
                        type="text"
                        placeholder="Search folders..."
                        value={folderSelectorSearchQuery}
                        onChange={(e) => setFolderSelectorSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '1px solid #d1d3d4',
                          borderRadius: '8px',
                          fontSize: '16px',
                          outline: 'none'
                        }}
                        autoComplete="off"
                      />
                    </div>
                    
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      border: '1px solid #e1e3e5',
                      borderRadius: '8px'
                    }}>
                      {localFolders
                        .filter(folder => {
                          // Filter out current folder and match search query
                          const currentNote = localNotes.find(n => n.id === folderSelectorNoteId);
                          const isCurrentFolder = currentNote && folder.id === currentNote.folderId;
                          return !isCurrentFolder && folder.name.toLowerCase().includes(folderSelectorSearchQuery.toLowerCase());
                        })
                        .map(folder => (
                          <div
                            key={folder.id}
                            onClick={() => handleFolderSelection(folder.id)}
                            style={{
                              padding: '16px',
                              borderBottom: '1px solid #f1f3f4',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                            onTouchStart={(e) => e.target.style.backgroundColor = '#f6f6f7'}
                            onTouchEnd={(e) => e.target.style.backgroundColor = 'white'}
                          >
                            <i className="fas fa-folder" style={{
                              fontSize: '16px',
                              color: '#6d7175'
                            }}></i>
                            <span style={{
                              fontSize: '16px',
                              color: '#202223',
                              fontWeight: '500'
                            }}>
                              {folder.name}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Move Notes Modal */}
              {showMoveModal && (
                <div className="modal-overlay" style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 99999,
                  padding: "16px"
                }}>
                  <div style={{
                    backgroundColor: "white",
                    padding: "24px",
                    borderRadius: "8px",
                    maxWidth: "400px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflow: "auto"
                  }}>
                    <Text as="h3" variant="headingMd" style={{ marginBottom: "16px" }}>
                      {showMoveModal === 'bulk' ? 'Move Selected Notes' : 'Move Note'}
                    </Text>
                    <div style={{ marginBottom: "24px" }}>
                      <label htmlFor="mobileMoveFolderSelect" style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                        Select a folder to move the note{showMoveModal === 'bulk' ? 's' : ''} to:
                      </label>
                      <select
                        id="mobileMoveFolderSelect"
                        value={duplicateFolderId}
                        onChange={(e) => setDuplicateFolderId(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: "1px solid #c9cccf",
                          borderRadius: "8px",
                          fontSize: "16px",
                          backgroundColor: "white"
                        }}
                      >
                        <option value="">Select a folder...</option>
                        {localFolders
                          .filter(folder => {
                            // Filter out current folder if moving single note
                            if (showMoveModal !== 'bulk') {
                              const currentNote = localNotes.find(n => n.id === showMoveModal);
                              const isCurrentFolder = currentNote && folder.id === currentNote.folderId;
                              return !isCurrentFolder;
                            }
                            return true;
                          })
                          .map(folder => (
                            <option key={folder.id} value={folder.id}>
                              {folder.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowMoveModal(null);
                          setDuplicateFolderId('');
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
            </>
          )}
        </div>
      )}

      {/* New Folder Modal - Desktop */}
      {!isMobile && (
        <NewFolderModal
          isOpen={showNewFolderModal}
          onClose={() => setShowNewFolderModal(false)}
          onCreateFolder={handleCreateFolderFromModal}
          initialName=""
        />
      )}
    </>
  );
}
