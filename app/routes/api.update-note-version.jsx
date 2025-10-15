import { json } from "@remix-run/node";
import db from "../utils/db.server";

export async function action({ request }) {
  if (request.method !== "PUT") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { versionId, versionTitle } = await request.json();

    if (!versionId) {
      return json({ error: "Version ID is required" }, { status: 400 });
    }

    // Update the version title
    const updatedVersion = await db.noteVersion.update({
      where: { id: versionId },
      data: { versionTitle: versionTitle || null }
    });

    return json({ success: true, version: updatedVersion });
  } catch (error) {
    console.error("Error updating version:", error);
    return json({ error: "Failed to update version" }, { status: 500 });
  }
}
