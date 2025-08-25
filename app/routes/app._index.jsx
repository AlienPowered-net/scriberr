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
import { useState } from "react";

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

  if (intent === "create-folder") {
    const name = (form.get("name") || "").toString().trim();
    if (name) {
      await prisma.folder.create({ data: { name, shopId } });
    }
    return redirect("/app");
  }

  if (intent === "create-note") {
    const title = (form.get("title") || "").toString().trim();
    const body = (form.get("body") || "").toString().trim();
    const folderIdRaw = form.get("folderId");
    const folderId = folderIdRaw && folderIdRaw !== "" ? folderIdRaw : null;

    if (title || body) {
      await prisma.note.create({
        data: { title, content: body, shopId, folderId },
      });
    }
    return redirect("/app");
  }

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
  const [openFolderMenu, setOpenFolderMenu] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const folderOptions = [
    { label: "No folder", value: "" },
    ...folders.map((f) => ({ label: f.name, value: String(f.id) })),
  ];

  // Filter notes based on selected folder
  const filteredNotes = selectedFolder 
    ? notes.filter(note => note.folderId === selectedFolder)
    : notes;

  return (
    <Page title="scriberr">
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
                    <Text as="span" variant="headingSm">
                      {folder.name}
                    </Text>
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
                          <Form method="post">
                            <input type="hidden" name="_intent" value="rename-folder" />
                            <input type="hidden" name="folderId" value={folder.id} />
                            <button
                              type="button"
                              onClick={() => {
                                const newName = prompt("Rename folder:", folder.name);
                                if (newName && newName.trim()) {
                                  const form = document.createElement('form');
                                  form.method = 'post';
                                  form.innerHTML = `
                                    <input type="hidden" name="_intent" value="rename-folder" />
                                    <input type="hidden" name="folderId" value="${folder.id}" />
                                    <input type="hidden" name="newName" value="${newName.trim()}" />
                                  `;
                                  document.body.appendChild(form);
                                  form.submit();
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
                              Rename Folder
                            </button>
                          </Form>
                          <Form method="post">
                            <input type="hidden" name="_intent" value="move-folder-up" />
                            <input type="hidden" name="folderId" value={folder.id} />
                            <button
                              type="submit"
                              style={{
                                display: "block",
                                width: "100%",
                                padding: "8px 12px",
                                border: "none",
                                background: "none",
                                textAlign: "left",
                                cursor: "pointer"
                              }}
                              onClick={() => setOpenFolderMenu(null)}
                            >
                              Move Folder Up
                            </button>
                          </Form>
                          <Form method="post">
                            <input type="hidden" name="_intent" value="move-folder-down" />
                            <input type="hidden" name="folderId" value={folder.id} />
                            <button
                              type="submit"
                              style={{
                                display: "block",
                                width: "100%",
                                padding: "8px 12px",
                                border: "none",
                                background: "none",
                                textAlign: "left",
                                cursor: "pointer"
                              }}
                              onClick={() => setOpenFolderMenu(null)}
                            >
                              Move Folder Down
                            </button>
                          </Form>
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
              <Form method="post">
                <input type="hidden" name="_intent" value="create-folder" />
                <InlineStack gap="300" align="end">
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="New folder name"
                      value={folderName}
                      onChange={setFolderName}
                      autoComplete="off"
                      name="name"
                    />
                  </div>
                  <Button submit>Create folder</Button>
                </InlineStack>
              </Form>
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
              <Form method="post">
                <input type="hidden" name="_intent" value="create-note" />
                <BlockStack gap="300">
                  <TextField
                    label="Title"
                    value={title}
                    onChange={setTitle}
                    autoComplete="off"
                    name="title"
                  />
                  <TextField
                    label="Body"
                    value={body}
                    onChange={setBody}
                    autoComplete="off"
                    multiline={4}
                    name="body"
                  />
                  <div>
                    <label htmlFor="folderId" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                      Folder
                    </label>
                    <select
                      id="folderId"
                      name="folderId"
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
                  <Button submit>Add note</Button>
                </BlockStack>
              </Form>
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
                <Form method="post">
                  <input type="hidden" name="_intent" value="delete-folder" />
                  <input type="hidden" name="folderId" value={showDeleteConfirm} />
                  <Button
                    tone="critical"
                    submit
                    onClick={() => setShowDeleteConfirm(null)}
                  >
                    Delete Folder
                  </Button>
                </Form>
              </div>
            </div>
          </div>
        )}
      </Page>
    );
  }
