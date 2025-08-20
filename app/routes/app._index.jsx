// app/routes/app._index.jsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

import { Page, Card, Text } from "@shopify/polaris";

export const loader = async ({ request }) => {
  // Authenticate the admin request (embedded app)
  const { admin } = await shopify.authenticate.admin(request);

  // Get a per‑store tenant id
  const shopId = await getOrCreateShopId(admin.session.shop);

  // Fetch tenant‑scoped data
  const [folders, notes] = await Promise.all([
    prisma.folder.findMany({ where: { shopId }, orderBy: { name: "asc" } }),
    prisma.note.findMany({
      where: { shopId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return json({ folders, notes });
};

export default function AppIndex() {
  const { folders, notes } = useLoaderData();

  // Minimal visible output (so you can confirm it renders)
  return (
    <Page title="scriberr">
      <Card>
        <Text as="p">Folders: {folders.length}</Text>
        <Text as="p">Notes: {notes.length}</Text>
      </Card>

      {/* TODO: render your real UI here */}
    </Page>
  );
}
