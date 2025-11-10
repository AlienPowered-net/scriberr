import { json } from "@remix-run/node";

export async function action({ request }) {
  // Dynamic imports for server-only modules
  const [
    { shopify },
    { prisma },
    { getOrCreateShopId },
  ] = await Promise.all([
    import("../shopify.server"),
    import("../utils/db.server"),
    import("../utils/tenant.server"),
  ]);

  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  const form = await request.formData();
  const noteId = form.get("noteId");

  if (!noteId) {
    return json({ error: "Missing note ID" });
  }

  try {
    // Verify the note exists and belongs to this shop
    const note = await prisma.note.findFirst({
      where: { 
        id: noteId,
        shopId 
      },
    });

    if (!note) {
      return json({ error: "Note not found" });
    }

    // Delete the note
    await prisma.note.delete({
      where: { id: noteId },
    });
    
    return json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    return json({ error: "Failed to delete note" });
  }
}
