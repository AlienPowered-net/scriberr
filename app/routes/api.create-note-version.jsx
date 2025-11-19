import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  // Dynamic imports for server-only modules
  const [
    { prisma },
    {
      INLINE_ALERTS,
      buildVersionLimitPlanError,
      buildVersionsMeta,
      getVersionLimitStatus,
      isPlanError,
      listVisibleVersions,
      serializePlanError,
      withPlanContext,
    },
  ] = await Promise.all([
    import("../utils/db.server"),
    import("../utils/ensurePlan.server"),
  ]);

  // Wrap handler with plan context
  const handler = withPlanContext(async ({ request, planContext }) => {
    const DEBUG_VERSIONS = process.env.DEBUG_VERSIONS === "1";
    
    try {
      const { shopId, plan, versionLimit } = planContext;
      
      const { noteId, title, content, versionTitle, snapshot, isAuto = false } =
        await request.json();
      
      const op = isAuto ? "auto" : "manual";
      
      if (DEBUG_VERSIONS) {
        console.log("[DEBUG_VERSIONS] Request:", { plan, noteId, op, title: title?.substring(0, 50) });
      }

      // Verify the note belongs to the shop
      const note = await prisma.note.findFirst({
        where: {
          id: noteId,
          shopId: shopId,
        },
      });

      if (!note) {
        console.error("Note not found for noteId:", noteId, "shopId:", shopId);
        return json({ error: "Note not found" }, { status: 404 });
      }

      let inlineAlert = null;
      let freeVisible = true;
      let action = "insert-visible";
      let result = "ok";

      const isFreePlan = plan === "FREE" && Number.isFinite(versionLimit);
      let versionLimitStatus = null;

      // Manual save gating (FREE plan only)
      if (!isAuto && isFreePlan) {
        versionLimitStatus = await getVersionLimitStatus(noteId, versionLimit);
        if (DEBUG_VERSIONS) {
          console.log("[DEBUG_VERSIONS] Manual save check:", { visibleCount: versionLimitStatus.visibleCount, limit: versionLimit });
        }
        if (versionLimitStatus.atLimit) {
          action = "block-upgrade";
          result = "blocked";
          const error = await buildVersionLimitPlanError(planContext);
          return json(serializePlanError(error), { status: 403 });
        }
      }

      // Auto-save logic (FREE plan only)
      if (isAuto && isFreePlan) {
        if (!versionLimitStatus) {
          versionLimitStatus = await getVersionLimitStatus(noteId, versionLimit);
        }
        if (DEBUG_VERSIONS) {
          console.log("[DEBUG_VERSIONS] Auto-save check:", { visibleCount: versionLimitStatus.visibleCount, limit: versionLimit });
        }

        if (versionLimitStatus.atLimit) {
          inlineAlert = INLINE_ALERTS.NO_ROOM_DUE_TO_MANUALS;
          const meta = await buildVersionsMeta(noteId, plan, prisma, inlineAlert, versionLimit);
          if (DEBUG_VERSIONS) {
            console.log("[DEBUG_VERSIONS] Auto-save skipped due to limit");
          }
          return json({
            skipped: true,
            inlineAlert,
            meta,
          });
        }
      }

      // Create version (for manual saves or auto-saves that don't need rotation)
      const created = await prisma.noteVersion.create({
        data: {
          noteId,
          title,
          content,
          versionTitle,
          snapshot: snapshot ? JSON.parse(snapshot) : null,
          isAuto,
          saveType: isAuto ? "AUTO" : "MANUAL",
          freeVisible,
        },
      });

      const [versions, meta] = await Promise.all([
        listVisibleVersions(noteId, plan),
        buildVersionsMeta(noteId, plan, prisma, inlineAlert, versionLimit),
      ]);

      if (DEBUG_VERSIONS) {
        console.log("[DEBUG_VERSIONS] Version created:", {
          plan,
          noteId,
          op,
          visibleCount: meta.visibleCount,
          hasAllManual: meta.hasAllManualVisible,
          action,
          result: "ok",
          versionId: created.id,
          freeVisible: created.freeVisible,
        });
      }

      const debugPayload = DEBUG_VERSIONS ? {
        plan,
        noteId,
        op,
        visibleCount: meta.visibleCount,
        hasAllManual: meta.hasAllManualVisible,
        action,
        result: "ok",
      } : undefined;

      return json({
        version: created,
        versions,
        meta,
        inlineAlert,
        ...(debugPayload && { debug: debugPayload }),
      });
    } catch (error) {
      const DEBUG_VERSIONS = process.env.DEBUG_VERSIONS === "1";
      
      if (isPlanError(error)) {
        // Surface upgrade hints for any plan guard violations
        if (DEBUG_VERSIONS) {
          console.log("[DEBUG_VERSIONS] PlanError:", { code: error.code, status: error.status });
        }
        return json(serializePlanError(error), { status: error.status });
      }

      const errorDetails = {
        message: error.message,
        code: error.code,
        ...(DEBUG_VERSIONS && { stack: error.stack }),
      };

      if (DEBUG_VERSIONS) {
        console.error("[DEBUG_VERSIONS] Error:", {
          plan: planContext?.plan || "unknown",
          error: errorDetails,
        });
      }

      console.error("Error creating note version:", error);
      return json({
        error: "Failed to create version",
        details: error.message,
        ...(DEBUG_VERSIONS && { debug: { error: errorDetails } }),
      }, { status: 500 });
    }
  });

  return handler({ request });
};
