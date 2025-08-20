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
  ResourceList,
  ResourceItem,
  Text,
  Stack,
  Select,
} from "@shopify/polaris";
import { useState } from "react";

/* ------------------ Loader ------------------ */
export async function loader({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const folders = await prisma.folder.findMany({
    where: { shopId },
    orderBy: { name: "asc" },
  });

  const notes = await prisma.note.findMany({
    where: { shopId },
    orderBy: { updatedAt: "desc" },
    include: { folder: true },
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
    const folderId = folderIdRaw ? Number(folderIdRaw) : null;

    if (title || body) {
      await prisma.note.create({
        data: { title, body, shopId, folderId },
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

  const folderOptions = [
    { label: "No folder", value: "" },
    ...folders.map((f) => ({ label: f.name, value: String(f.id) })),
  ];

  return (
    <Page title="scriberr">
      <Stack gap="400" wrap={false}>
        {/* FOLDERS */}
        <Stack.Item fill>
          <Card>
            <Card.Header title="Folders" />
            <Card.Section>
              <ResourceList
                emptyState={<Text as="p">No folders yet</Text>}
                resourceName={{ singular: "folder", plural: "folders" }}
                items={folders}
                renderItem={(folder) => (
                  <ResourceItem id={folder.id}>
                    <Text as="span" variant="headingSm">
                      {folder.name}
                    </Text>
                  </ResourceItem>
                )}
              />
            </Card.Section>
            <Card.Section>
              <Form method="post">
                <input type="hidden" name="_intent" value="create-folder" />
                <Stack gap="300" align="end">
                  <Stack.Item fill>
                    <TextField
                      label="New folder name"
                      value={folderName}
                      onChange={setFolderName}
                      autoComplete="off"
                      name="name"
                    />
                  </Stack.Item>
                  <Button submit>Create folder</Button>
                </Stack>
              </Form>
            </Card.Section>
          </Card>
        </Stack.Item>

        {/* NOTES */}
        <Stack.Item fill>
          <Card>
            <Card.Header title="Notes" />
            <Card.Section>
              <ResourceList
                emptyState={<Text as="p">No notes yet</Text>}
                resourceName={{ singular: "note", plural: "notes" }}
                items={notes}
                renderItem={(note) => (
                  <ResourceItem id={note.id}>
                    <Text as="span" variant="headingSm">
                      {note.title || "(untitled)"}
                    </Text>
                    <Text as="p" tone="subdued">
                      {note.folder ? `Folder: ${note.folder.name}` : "No folder"}
                    </Text>
                  </ResourceItem>
                )}
              />
            </Card.Section>
            <Card.Section>
              <Form method="post">
                <input type="hidden" name="_intent" value="create-note" />
                <Stack gap="300">
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
                  <Select
                    label="Folder"
                    options={folderOptions}
                    value={folderId}
                    onChange={setFolderId}
                    name="folderId"
                  />
                  <Button submit>Add note</Button>
                </Stack>
              </Form>
            </Card.Section>
          </Card>
        </Stack.Item>
      </Stack>
    </Page>
  );
}
