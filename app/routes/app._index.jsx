// app/routes/app._index.jsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function loader({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  if (!session) {
    // (optional) redirect to auth if you want
    // throw redirect("/auth/login");
    return json({ folders: [], notes: [] });
  }

  const shopId = await getOrCreateShopId(session.shop);

  const folders = await prisma.folder.findMany({
    where: { shopId },
    orderBy: { name: "asc" },
  });

  const notes = await prisma.note.findMany({
    where: { shopId },
    orderBy: { updatedAt: "desc" },
  });

  return json({ folders, notes });
}

export default function AppIndex() {
  const { folders, notes } = useLoaderData();

  return (
    <main style={{ padding: 16 }}>
      <h1>scriberr</h1>

      <section>
        <h2>Folders</h2>
        {folders.length === 0 ? (
          <p>No folders yet</p>
        ) : (
          <ul>{folders.map(f => <li key={f.id}>{f.name}</li>)}</ul>
        )}
      </section>

      <section>
        <h2>Notes</h2>
        {notes.length === 0 ? (
          <p>No notes yet</p>
        ) : (
          <ul>{notes.map(n => <li key={n.id}>{n.title ?? "(untitled)"}</li>)}</ul>
        )}
      </section>
    </main>
  );
}