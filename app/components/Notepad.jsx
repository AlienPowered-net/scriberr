import { useEffect, useMemo, useRef, useState } from "react";
import {
  TextField, Button, ResourceList, InlineStack, Text
} from "@shopify/polaris";
import { STORAGE_KEYS, loadJSON, saveJSON, generateId } from "../utils/storage";

const AUTOSAVE_MS = 30_000;

function useStoreName() {
  const [name, setName] = useState("STORE NAME");
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const shop = url.searchParams.get("shop");
      if (shop) {
        const base = shop.replace(".myshopify.com", "").replace(/-/g, " ");
        setName(base.replace(/\b\w/g, c => c.toUpperCase()));
      }
    } catch {}
  }, []);
  return name;
}

export default function Notepad() {
  const storeName = useStoreName();

  // Data (folders + notes persisted to localStorage)
  const [folders, setFolders] = useState(() => loadJSON(STORAGE_KEYS.CATEGORIES, ["General"]));
  const [notes, setNotes] = useState(() => loadJSON(STORAGE_KEYS.NOTES, []));
  const [selectedFolder, setSelectedFolder] = useState(folders[0] || "General");

  // Editor state (draft first)
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folderForEditing, setFolderForEditing] = useState(selectedFolder);

  // UI state
  const [searchAllNotes, setSearchAllNotes] = useState("");
  const [openFolderMenuId, setOpenFolderMenuId] = useState(null);
  const lastSavedRef = useRef(null);

  // Persist
  useEffect(() => saveJSON(STORAGE_KEYS.CATEGORIES, folders), [folders]);
  useEffect(() => saveJSON(STORAGE_KEYS.NOTES, notes), [notes]);

  // Keep selections valid
  useEffect(() => {
    if (!folders.includes(selectedFolder) && folders.length) setSelectedFolder(folders[0]);
    if (!folders.includes(folderForEditing) && folders.length) setFolderForEditing(folders[0]);
  }, [folders]); // eslint-disable-line

  // Mirror left folder → editor selector
  useEffect(() => { setFolderForEditing(selectedFolder); }, [selectedFolder]);

  // Derived lists
  const allNotesFiltered = useMemo(() => {
    const q = searchAllNotes.trim().toLowerCase();
    return notes
      .filter(n =>
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [notes, searchAllNotes]);

  const notesInFolder = useMemo(() => {
    return allNotesFiltered.filter(n => n.folder === selectedFolder);
  }, [allNotesFiltered, selectedFolder]);

  // Autosave (creates on first save if draft has content)
  useEffect(() => {
    const hasDraft = !!(title || content);
    if (!editingId && !hasDraft) return;
    const t = setInterval(() => handleSave({ silent: true }), AUTOSAVE_MS);
    return () => clearInterval(t);
  }, [editingId, title, content, folderForEditing]);

  // Actions
  function resetDraft(forFolder = selectedFolder) {
    setEditingId(null); setTitle(""); setContent(""); setFolderForEditing(forFolder);
  }
  function handleNewNote() { resetDraft(selectedFolder); }

  function handleSelectNote(id) {
    const n = notes.find(n => n.id === id); if (!n) return;
    setEditingId(n.id); setTitle(n.title); setContent(n.content); setFolderForEditing(n.folder);
  }

  function handleSave({ silent = false } = {}) {
    const now = new Date().toISOString();
    if (!editingId) {
      if (!(title.trim() || content.trim())) return;
      const id = generateId();
      const n = { id, title: title.trim() || "Untitled", content, folder: folderForEditing, createdAt: now, updatedAt: now };
      setNotes(prev => [n, ...prev]);
      setEditingId(id);
      lastSavedRef.current = new Date();
      return;
    }
    setNotes(prev =>
      prev.map(n =>
        n.id === editingId
          ? { ...n, title: title.trim() || "Untitled", content, folder: folderForEditing, updatedAt: now }
          : n
      )
    );
    lastSavedRef.current = new Date();
  }

  function handleDeleteNote(id) {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (editingId === id) resetDraft();
  }

  function addFolder() {
    const base = "New Folder"; let name = base, i = 1;
    while (folders.includes(name)) name = `${base} ${i++}`;
    setFolders(prev => [...prev, name]);
    setSelectedFolder(name);
  }

  function deleteFolder(name) {
    if (name === "General") return;
    const remaining = folders.filter(c => c !== name);
    if (remaining.length === 0) remaining.push("General");
    setFolders(remaining);
    setNotes(prev => prev.map(n => n.folder === name ? { ...n, folder: remaining[0] } : n));
    if (selectedFolder === name) setSelectedFolder(remaining[0]);
    if (folderForEditing === name) setFolderForEditing(remaining[0]);
  }

  function renameFolder(oldName, newName) {
    const trimmed = (newName || "").trim();
    if (!trimmed || trimmed === oldName || folders.includes(trimmed)) return;
    setFolders(prev => prev.map(c => c === oldName ? trimmed : c));
    setNotes(prev => prev.map(n => n.folder === oldName ? { ...n, folder: trimmed } : n));
    if (selectedFolder === oldName) setSelectedFolder(trimmed);
    if (folderForEditing === oldName) setFolderForEditing(trimmed);
  }

  function openFolder(name) {
    setSelectedFolder(name);
    const latest = notes
      .filter(n => n.folder === name)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
    latest ? handleSelectNote(latest.id) : resetDraft(name);
  }

  const statusText = editingId
    ? lastSavedRef.current
      ? `Last modified ${lastSavedRef.current.toLocaleString()}`
      : "Autosaves every 30s"
    : "Draft (unsaved). Autosaves every 30s once you start typing.";

  // UI
  return (
    <div className="ui-premium">

      {/* LEFT: Folders */}
      <aside className="pane folders">
        <div className="brand">{storeName}</div>

        <div className="search">
          <TextField label="Search notes…" labelHidden placeholder="Search notes…" value={searchAllNotes} onChange={setSearchAllNotes} />
        </div>

        <div className="folderList">
          <ResourceList
            resourceName={{ singular: "folder", plural: "folders" }}
            items={folders.map(f => ({ id: f, name: f }))}
            renderItem={({ id, name }) => {
              const active = selectedFolder === name;
              return (
                <ResourceList.Item id={id}>
                  <div className={`folderRow ${active ? "active" : ""}`}>
                    <button className="folderBtn" onClick={() => openFolder(name)}>
                      <span className="folderIcon" aria-hidden>📁</span>
                      <span className="folderName">{name}</span>
                    </button>

                    {openFolderMenuId === id && (
                      <div style={{
                        position: "absolute",
                        right: "0",
                        top: "100%",
                        backgroundColor: "white",
                        border: "1px solid #c9cccf",
                        borderRadius: "4px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        zIndex: 1000,
                        minWidth: "120px"
                      }}>
                        <button
                          onClick={() => {
                            const next = prompt("Rename folder:", name);
                            if (next != null) renameFolder(name, next);
                            setOpenFolderMenuId(null);
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
                          Edit name
                        </button>
                        <button
                          onClick={() => { 
                            deleteFolder(name); 
                            setOpenFolderMenuId(null); 
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
                          Delete folder
                        </button>
                      </div>
                    )}
                    <Button onClick={() => setOpenFolderMenuId(p => p === id ? null : id)} accessibilityLabel="Folder menu">⋯</Button>
                  </div>
                </ResourceList.Item>
              );
            }}
          />
        </div>

        <div className="addFolder">
          <Button fullWidth onClick={addFolder}>+ Add new folder</Button>
        </div>
      </aside>

      {/* MIDDLE: Notes list */}
      <main className="pane notes">
        <div className="notesHeader">
          <Text as="h2" variant="headingLg">My Notes</Text>
          <Button onClick={handleNewNote}>+ Add new note</Button>
        </div>

        <div className="notesList">
          <ResourceList
            resourceName={{ singular: "note", plural: "notes" }}
            items={notesInFolder}
            renderItem={(item) => {
              const selected = editingId === item.id;
              const date = new Date(item.updatedAt);
              const dd = date.toLocaleString(undefined, { day: "2-digit" });
              const mon = date.toLocaleString(undefined, { month: "short" }).toUpperCase();
              return (
                <ResourceList.Item id={item.id} onClick={() => handleSelectNote(item.id)}>
                  <div className={`noteCard ${selected ? "selected" : ""}`}>
                    <div className="datePill">
                      <div className="day">{dd}</div>
                      <div className="mon">{mon}</div>
                    </div>
                    <div className="noteMeta">
                      <div className="noteTitle">{item.title || "Untitled"}</div>
                      <div className="noteSnippet">{(item.content || "").slice(0, 120)}</div>
                    </div>
                  </div>
                </ResourceList.Item>
              );
            }}
          />
        </div>
      </main>

      {/* RIGHT: Editor */}
      <section className="pane editor">
        <div className="crumbRow">
          <div className="crumb">
            {selectedFolder} &nbsp;&gt;&nbsp; {editingId ? (title || "Untitled") : "New note"}
          </div>
          <div className="crumbActions">
            <Button variant="primary" tone="success" onClick={() => handleSave()}>Save note</Button>
            {editingId && <Button tone="critical" onClick={() => handleDeleteNote(editingId)}>Delete</Button>}
          </div>
        </div>

        <div className="lastMeta">
          <span>Last modified</span>
          <span className="time">
            {editingId && lastSavedRef.current ? lastSavedRef.current.toLocaleString() : "—"}
          </span>
        </div>

        <div className="titleRow">
          <TextField
            label="Title"
            labelHidden
            value={title}
            onChange={setTitle}
            autoComplete="off"
            placeholder="Note title"
          />
          <div>
            <label htmlFor="folderSelect" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Folder
            </label>
            <select
              id="folderSelect"
              value={folderForEditing}
              onChange={(e) => setFolderForEditing(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #c9cccf",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            >
              {folders.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="contentRow">
          <TextField
            label="Notepad"
            value={content}
            onChange={setContent}
            multiline={22}
            autoComplete="off"
            placeholder="Type your note…"
          />
        </div>

        <div className="footerRow">
          <Text tone="subdued">{statusText}</Text>
          <InlineStack gap="300">
            <Button onClick={handleNewNote} variant="secondary">New note</Button>
            <Button onClick={() => handleSave()} tone="success" variant="primary">Save note</Button>
            {editingId && <Button onClick={() => handleDeleteNote(editingId)} tone="critical">Delete</Button>}
          </InlineStack>
        </div>
      </section>
    </div>
  );
}
