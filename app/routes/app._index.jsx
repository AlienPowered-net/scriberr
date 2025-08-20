import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { shopify } from "~/shopify.server";
import { prisma } from "~/utils/db.server";
import { getOrCreateShopId } from "~/utils/tenant.server";

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
  });

  return json({ folders, notes });
}

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const form = await request.formData();
  const intent = form.get("_intent");

  if (intent === "create-note") {
    await prisma.note.create({
      data: {
        title: String(form.get("title") || ""),
        content: String(form.get("content") || ""),
        folderId: form.get("folderId") ? String(form.get("folderId")) : null,
        shopId,
      },
    });
    return redirect("/app");
  }

  if (intent === "update-note") {
    await prisma.note.updateMany({
      where: { id: String(form.get("id")), shopId },
      data: {
        title: String(form.get("title") || ""),
        content: String(form.get("content") || ""),
        folderId: form.get("folderId") ? String(form.get("folderId")) : null,
      },
    });
    return redirect("/app");
  }

  if (intent === "delete-note") {
    await prisma.note.deleteMany({
      where: { id: String(form.get("id")), shopId },
    });
    return redirect("/app");
  }

  return redirect("/app");
}

export default function AppIndex() {
  const { folders, notes } = useLoaderData();
  // ...your existing UI...
  return (
    <div>{/* render folders/notes */}</div>
  );
}