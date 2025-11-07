export const PLAN = {
  FREE: {
    NOTES_MAX: 25,
    NOTE_FOLDERS_MAX: 3,
    NOTE_VERSIONS_MAX: 5,
    CONTACTS_ENABLED: false,
    NOTE_TAGS_ENABLED: false,
  },
  PRO: {
    NOTES_MAX: Infinity,
    NOTE_FOLDERS_MAX: Infinity,
    NOTE_VERSIONS_MAX: Infinity,
    CONTACTS_ENABLED: true,
    NOTE_TAGS_ENABLED: true,
  },
} as const;

export type PlanKey = keyof typeof PLAN;

