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
      folderId: true,
      folder: {
        select: {
          id: true,
          name: true,
        },
      },
      updatedAt: true,
    },
  });

  return json({ folders, notes });
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

  const folderOptions = [
    { label: "No folder", value: "" },
    ...folders.map((f) => ({ label: f.name, value: String(f.id) })),
  ];

  // Filter notes based on selected folder
  const filteredNotes = selectedFolder 
    ? notes.filter(note => note.folderId === selectedFolder)
    : notes;

  // Handle creating a new note
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
    
    try {
      const response = await fetch('/api/create-note', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTitle(''); // Clear the inputs
          setBody('');
          window.location.reload();
        } else {
          setAlertMessage(result.error || 'Failed to create note');
          setAlertType('error');
          setTimeout(() => setAlertMessage(''), 3000);
        }
      } else {
        setAlertMessage('Failed to create note');
        setAlertType('error');
        setTimeout(() => setAlertMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error creating note:', error);
      setAlertMessage('Failed to create note');
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
      <Page title="scriberr">
        {/* Custom Alert */}
        {alertMessage && (
          <>
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
          </>
        )}
        
        <InlineStack gap="400" wrap={false}>
        {/* FOLDERS */}
        <div style={{ flex: 1 }}>
        <Card>
          <div style={{ padding: "16px" }}>
            <Text as="h2" variant="headingLg">Folders</Text>
          </div>
          <div style={{ padding: "16px" }}>
            {folders.length === 0 ? (
              <Text as="p">No folders yet</Text>
            ) : (
              <div>
                {folders.map((folder) => (
                  <div key={folder.id} style={{ 
                    padding: "8px 0", 
                    borderBottom: "1px solid #e1e3e5",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    backgroundColor: selectedFolder === folder.id ? "#f6f6f7" : "transparent"
                  }}
                  onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}
                  >
                    {editingFolderId === folder.id ? (
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "8px",
                        flex: 1,
                        marginRight: "8px"
                      }}>
                        <input
                          type="text"
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveFolderName(folder.id);
                            } else if (e.key === 'Escape') {
                              setEditingFolderId(null);
                              setEditingFolderName("");
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: "4px 8px",
                            border: "1px solid #c9cccf",
                            borderRadius: "4px",
                            fontSize: "14px"
                          }}
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveFolderName(folder.id);
                          }}
                          style={{
                            padding: "4px 8px",
                            background: "#008060",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolderId(null);
                            setEditingFolderName("");
                          }}
                          style={{
                            padding: "4px 8px",
                            background: "#6d7175",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <Text as="span" variant="headingSm">
                        {folder.name}
                      </Text>
                    )}
                    <div style={{ position: "relative" }}>
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
                              setEditingFolderId(folder.id);
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
              <InlineStack gap="300" align="end">
                <div style={{ flex: 1 }}>
                  <TextField
                    label="New folder name"
                    value={folderName}
                    onChange={setFolderName}
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateFolder();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleCreateFolder}>Create folder</Button>
              </InlineStack>
            </div>
          </Card>
        </div>

        {/* NOTES */}
        <div style={{ flex: 1 }}>
          <Card>
            <div style={{ padding: "16px" }}>
               <Text as="h2" variant="headingLg">
                 Notes {selectedFolder && `- ${folders.find(f => f.id === selectedFolder)?.name}`}
               </Text>
            </div>
           <div style={{ padding: "16px" }}>
              {filteredNotes.length === 0 ? (
                <Text as="p">
                  {selectedFolder ? "No notes in this folder" : "No notes yet"}
                </Text>
              ) : (
                <div>
                  {filteredNotes.map((note) => (
                    <div key={note.id} style={{ padding: "8px 0", borderBottom: "1px solid #e1e3e5" }}>
                      <Text as="span" variant="headingSm">
                        {note.title || "(untitled)"}
                      </Text>
                      <Text as="p" tone="subdued">
                        {note.folder ? `Folder: ${note.folder.name}` : "No folder"}
                      </Text>
                      {note.content && (
                        <Text as="p" tone="subdued">
                          {note.content.substring(0, 100)}...
                        </Text>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: "16px" }}>
              <BlockStack gap="300">
                <TextField
                  label="Title"
                  value={title}
                  onChange={setTitle}
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleCreateNote();
                    }
                  }}
                />
                <TextField
                  label="Body"
                  value={body}
                  onChange={setBody}
                  autoComplete="off"
                  multiline={4}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleCreateNote();
                    }
                  }}
                />
                <div>
                  <label htmlFor="folderId" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                    Folder
                  </label>
                  <select
                    id="folderId"
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
                <Button onClick={handleCreateNote}>Add note</Button>
              </BlockStack>
            </div>
          </Card>
        </div>
              </InlineStack>
        
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
      </Page>
    );
  }
