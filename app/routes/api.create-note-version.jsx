import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  // Dynamic imports for server-only modules
  const [
    { prisma },
    {
      INLINE_ALERTS,
      PlanError,
      buildVersionsMeta,
      getVisibleCount,
      hasFiveAllManual,
      hideOldestVisibleAuto,
      isPlanError,
      listVisibleVersions,
      rotateAutoAndInsertVisible,
      serializePlanError,
      withPlanContext,
    },
    { PLAN },
  ] = await Promise.all([
    import("../utils/db.server"),
    import("../utils/ensurePlan.server"),
    import("../../src/lib/plan"),
  ]);

  // Wrap handler with plan context
  const handler = withPlanContext(async ({ request, planContext }) => {
    const DEBUG_VERSIONS = process.env.DEBUG_VERSIONS === "1";
    
    try {
      const { shopId, plan } = planContext;
      
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
      let errorCode = null;

      // Manual save gating (FREE plan only)
      if (!isAuto && plan === "FREE") {
        const visibleCount = await getVisibleCount(noteId);
        if (DEBUG_VERSIONS) {
          console.log("[DEBUG_VERSIONS] Manual save check:", { visibleCount, limit: PLAN.FREE.NOTE_VERSIONS_MAX });
        }
        if (visibleCount >= PLAN.FREE.NOTE_VERSIONS_MAX) {
          action = "block-upgrade";
          result = "blocked";
          errorCode = "UPGRADE_REQUIRED";
          if (DEBUG_VERSIONS) {
            console.log("[DEBUG_VERSIONS] Manual save blocked:", { visibleCount });
          }
          return json(serializePlanError(new PlanError("LIMIT_VERSIONS")), { status: 403 });
        }
      }

      // Auto-save logic (FREE plan only)
      if (isAuto && plan === "FREE") {
        const visibleCount = await getVisibleCount(noteId);
        const hasAllManual = await hasFiveAllManual(noteId);

        if (DEBUG_VERSIONS) {
          console.log("[DEBUG_VERSIONS] Auto-save check:", { visibleCount, hasAllManual });
        }

        if (visibleCount >= PLAN.FREE.NOTE_VERSIONS_MAX) {
          if (hasAllManual) {
            // All 5 are manual - store hidden, show inline alert
            freeVisible = false;
            inlineAlert = INLINE_ALERTS.NO_ROOM_DUE_TO_MANUALS;
            action = "insert-hidden";
            if (DEBUG_VERSIONS) {
              console.log("[DEBUG_VERSIONS] All manual - inserting hidden:", { visibleCount });
            }
          } else {
            // At least one visible AUTO - use CTE rotation
            action = "rotate";
            const rotated = await rotateAutoAndInsertVisible(
              noteId,
              title,
              content,
              versionTitle,
              snapshot ? JSON.parse(snapshot) : null,
              prisma
            );
            
            if (rotated) {
              if (DEBUG_VERSIONS) {
                console.log("[DEBUG_VERSIONS] CTE rotation succeeded:", { newId: rotated.id });
              }
              // Fetch updated versions and meta
              const [versions, meta] = await Promise.all([
                listVisibleVersions(noteId, plan),
                buildVersionsMeta(noteId, plan, prisma, null),
              ]);
              
              const debugPayload = DEBUG_VERSIONS ? {
                plan,
                noteId,
                op,
                visibleCount,
                hasAllManual,
                action,
                result: "ok",
              } : undefined;

              return json({
                version: { id: rotated.id },
                versions,
                meta,
                inlineAlert: null,
                ...(debugPayload && { debug: debugPayload }),
              });
            } else {
              // Fallback: no visible AUTO found (shouldn't happen, but handle gracefully)
              if (DEBUG_VERSIONS) {
                console.warn("[DEBUG_VERSIONS] CTE rotation returned null, falling back");
              }
              freeVisible = false;
              inlineAlert = INLINE_ALERTS.NO_ROOM_DUE_TO_MANUALS;
              action = "insert-hidden";
            }
          }
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
        buildVersionsMeta(noteId, plan, prisma, inlineAlert),
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
        // Only manual saves trigger PlanError (upgrade modal)
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
