import { useCallback, useRef } from "react";
import { usePlanContext } from "./usePlanContext";
import { PLAN } from "../../src/lib/plan";

type EditType = "note" | "folder";

const SESSION_STORAGE_KEYS = {
  note: "scriberr-over-limit-edit-note-shown",
  folder: "scriberr-over-limit-edit-folder-shown",
} as const;

interface UseOverLimitEditUpsellOptions {
  notesUsed: number;
  foldersUsed: number;
}

/**
 * Hook that triggers a soft upsell modal when FREE plan users who are over their limits
 * start editing existing notes or folders.
 * 
 * The modal appears once per browser session per edit type (note vs folder).
 * Editing is NEVER blocked - this is purely informational.
 */
export function useOverLimitEditUpsell({ notesUsed, foldersUsed }: UseOverLimitEditUpsellOptions) {
  const { plan, openUpgradeModal } = usePlanContext();
  
  // Track if we've shown the modal in this component instance (backup for SSR)
  const shownInSessionRef = useRef<Record<EditType, boolean>>({
    note: false,
    folder: false,
  });

  const isOverLimit = useCallback(() => {
    if (plan !== "FREE") return false;
    
    const isOverNoteLimit = notesUsed > PLAN.FREE.NOTES_MAX;
    const isOverFolderLimit = foldersUsed > PLAN.FREE.NOTE_FOLDERS_MAX;
    
    return isOverNoteLimit || isOverFolderLimit;
  }, [plan, notesUsed, foldersUsed]);

  const hasShownThisSession = useCallback((editType: EditType): boolean => {
    // Check sessionStorage first
    if (typeof sessionStorage !== "undefined") {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEYS[editType]);
      if (stored === "true") return true;
    }
    // Fallback to ref for SSR or if sessionStorage unavailable
    return shownInSessionRef.current[editType];
  }, []);

  const markAsShown = useCallback((editType: EditType) => {
    shownInSessionRef.current[editType] = true;
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(SESSION_STORAGE_KEYS[editType], "true");
    }
  }, []);

  /**
   * Call this when entering an edit flow for a note or folder.
   * If the user is on FREE plan, over limits, and hasn't seen the modal
   * this session, it will show the upsell modal.
   * 
   * Returns true if the modal was shown, false otherwise.
   */
  const triggerIfOverLimit = useCallback((editType: EditType): boolean => {
    // Don't show if not on FREE plan
    if (plan !== "FREE") return false;
    
    // Don't show if not over limits
    if (!isOverLimit()) return false;
    
    // Don't show if already shown this session
    if (hasShownThisSession(editType)) return false;
    
    // Show the modal with over_limit_edit context
    openUpgradeModal({
      context: "over_limit_edit",
    });
    
    // Mark as shown so it won't appear again this session
    markAsShown(editType);
    
    return true;
  }, [plan, isOverLimit, hasShownThisSession, markAsShown, openUpgradeModal]);

  return {
    triggerIfOverLimit,
    isOverLimit: isOverLimit(),
    plan,
  };
}

