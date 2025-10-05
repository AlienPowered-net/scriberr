import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const noteId = url.searchParams.get("noteId");
    const versionId1 = url.searchParams.get("versionId1");
    const versionId2 = url.searchParams.get("versionId2");

    if (!noteId || !versionId1 || !versionId2) {
      return json({ error: "Note ID and both version IDs are required" }, { status: 400 });
    }

    // Verify the note belongs to the shop
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        shopId: admin.session.shop,
      },
    });

    if (!note) {
      return json({ error: "Note not found" }, { status: 404 });
    }

    // Get both versions
    const [version1, version2] = await Promise.all([
      prisma.noteVersion.findFirst({
        where: { id: versionId1, noteId },
      }),
      prisma.noteVersion.findFirst({
        where: { id: versionId2, noteId },
      }),
    ]);

    if (!version1 || !version2) {
      return json({ error: "One or both versions not found" }, { status: 404 });
    }

    // Simple diff calculation (can be enhanced with more sophisticated diffing)
    const diff = {
      version1: {
        id: version1.id,
        title: version1.title,
        content: version1.content,
        createdAt: version1.createdAt,
        versionTitle: version1.versionTitle,
        isAuto: version1.isAuto,
      },
      version2: {
        id: version2.id,
        title: version2.title,
        content: version2.content,
        createdAt: version2.createdAt,
        versionTitle: version2.versionTitle,
        isAuto: version2.isAuto,
      },
      differences: {
        titleChanged: version1.title !== version2.title,
        contentChanged: version1.content !== version2.content,
        contentLengthDiff: version1.content.length - version2.content.length,
      }
    };

    return json(diff);
  } catch (error) {
    console.error("Error comparing note versions:", error);
    return json({ error: "Failed to compare versions" }, { status: 500 });
  }
};