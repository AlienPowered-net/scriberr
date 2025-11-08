import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Shopify server before importing guards
vi.mock("../../../app/shopify.server.js", () => ({
  default: {
    authenticate: {
      admin: vi.fn(),
    },
  },
}));

// Mock Prisma
vi.mock("../../../app/utils/db.server", () => ({
  prisma: {
    shop: {
      upsert: vi.fn(),
    },
  },
}));

import {
  ensureCanCreateNote,
  ensureCanCreateNoteFolder,
  requireFeature,
  PlanError,
  enforceVersionRetention,
  ensureCanCreateManualVersion,
  canCreateAutoSave,
} from "../server/guards/ensurePlan";
import { mapSubscriptionStatus } from "../lib/shopify/billing";

describe("plan guards", () => {
  const freePlan = "FREE";
  const proPlan = "PRO";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when free plan reaches note limit", async () => {
    const stubDb = {
      note: {
        count: vi.fn().mockResolvedValue(25),
      },
    };

    await expect(
      ensureCanCreateNote("shop-id", freePlan, stubDb as any),
    ).rejects.toMatchObject({
      code: "LIMIT_NOTES",
    } satisfies Partial<PlanError>);

    expect(stubDb.note.count).toHaveBeenCalledWith({
      where: { shopId: "shop-id" },
    });
  });

  it("allows note creation beyond limit for pro plan", async () => {
    const stubDb = {
      note: {
        count: vi.fn().mockResolvedValue(10_000),
      },
    };

    await expect(
      ensureCanCreateNote("shop-id", proPlan, stubDb as any),
    ).resolves.toBeUndefined();

    expect(stubDb.note.count).not.toHaveBeenCalled();
  });

  it("throws when free plan reaches folder cap", async () => {
    const stubDb = {
      folder: {
        count: vi.fn().mockResolvedValue(3),
      },
    };

    await expect(
      ensureCanCreateNoteFolder("shop-id", freePlan, stubDb as any),
    ).rejects.toMatchObject({
      code: "LIMIT_FOLDERS",
    } satisfies Partial<PlanError>);

    expect(stubDb.folder.count).toHaveBeenCalledWith({
      where: { shopId: "shop-id" },
    });
  });

  it("enforces feature gating for contacts and note tags on free plan", async () => {
    const ctx = {
      plan: freePlan,
    } as any;

    await expect(requireFeature("contacts")(ctx)).rejects.toMatchObject({
      code: "FEATURE_CONTACTS_DISABLED",
    } satisfies Partial<PlanError>);

    await expect(requireFeature("noteTags")(ctx)).rejects.toMatchObject({
      code: "FEATURE_NOTE_TAGS_DISABLED",
    } satisfies Partial<PlanError>);
  });

  it("allows contacts and tags features on pro plan", async () => {
    const ctx = {
      plan: proPlan,
    } as any;

    await expect(requireFeature("contacts")(ctx)).resolves.toBeUndefined();
    await expect(requireFeature("noteTags")(ctx)).resolves.toBeUndefined();
  });

  it("allows folder creation without counting for pro plan", async () => {
    const stubDb = {
      folder: {
        count: vi.fn(),
      },
    };

    await expect(
      ensureCanCreateNoteFolder("shop-id", proPlan, stubDb as any),
    ).resolves.toBeUndefined();

    expect(stubDb.folder.count).not.toHaveBeenCalled();
  });

  describe("version limits", () => {
    it("blocks manual version creation when 5 manual saves exist", async () => {
      const stubDb = {
        noteVersion: {
          count: vi
            .fn()
            .mockResolvedValueOnce(5) // total versions
            .mockResolvedValueOnce(5), // manual versions
        },
      };

      await expect(
        ensureCanCreateManualVersion("note-123", freePlan, stubDb as any),
      ).rejects.toMatchObject({
        code: "LIMIT_VERSIONS",
      } satisfies Partial<PlanError>);
    });

    it("allows manual version when under limit", async () => {
      const stubDb = {
        noteVersion: {
          count: vi.fn().mockResolvedValue(4),
        },
      };

      await expect(
        ensureCanCreateManualVersion("note-123", freePlan, stubDb as any),
      ).resolves.toBeUndefined();
    });

    it("allows manual version when at limit but not all are manual", async () => {
      const stubDb = {
        noteVersion: {
          count: vi
            .fn()
            .mockResolvedValueOnce(5) // total versions
            .mockResolvedValueOnce(3), // manual versions (2 are auto)
        },
      };

      await expect(
        ensureCanCreateManualVersion("note-123", freePlan, stubDb as any),
      ).resolves.toBeUndefined();
    });

    it("enforces version retention prioritizing manual saves", async () => {
      const stubDb = {
        noteVersion: {
          findMany: vi.fn().mockResolvedValue([
            { id: "new-auto-1", isAuto: true },
            { id: "manual-5", isAuto: false },
            { id: "manual-4", isAuto: false },
            { id: "manual-3", isAuto: false },
            { id: "manual-2", isAuto: false },
            { id: "manual-1", isAuto: false },
            { id: "old-auto-1", isAuto: true },
            { id: "old-auto-2", isAuto: true },
          ]),
          deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
        },
      };

      await enforceVersionRetention("note-123", freePlan, stubDb as any);

      // With 5 manual saves and 3 auto-saves (8 total), limit is 5
      // Should keep all 5 manual saves and delete all 3 auto-saves
      expect(stubDb.noteVersion.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["new-auto-1", "old-auto-1", "old-auto-2"] } },
      });
    });

    it("does not delete versions when under limit", async () => {
      const stubDb = {
        noteVersion: {
          findMany: vi.fn().mockResolvedValue([
            { id: "version-1", isAuto: false },
            { id: "version-2", isAuto: true },
          ]),
          deleteMany: vi.fn(),
        },
      };

      await enforceVersionRetention("note-123", freePlan, stubDb as any);

      expect(stubDb.noteVersion.deleteMany).not.toHaveBeenCalled();
    });

    it("skips version trimming for pro plan", async () => {
      const stubDb = {
        noteVersion: {
          findMany: vi.fn(),
          deleteMany: vi.fn(),
        },
      };

      await enforceVersionRetention("note-123", proPlan, stubDb as any);

      expect(stubDb.noteVersion.findMany).not.toHaveBeenCalled();
      expect(stubDb.noteVersion.deleteMany).not.toHaveBeenCalled();
    });

    it("allows auto-save when under limit", async () => {
      const stubDb = {
        noteVersion: {
          count: vi.fn().mockResolvedValue(4),
        },
      };

      const result = await canCreateAutoSave("note-123", freePlan, stubDb as any);
      expect(result.canCreate).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("allows auto-save when at limit but has auto-saves to rotate", async () => {
      const stubDb = {
        noteVersion: {
          count: vi
            .fn()
            .mockResolvedValueOnce(5) // total versions
            .mockResolvedValueOnce(3), // manual versions (2 are auto)
        },
      };

      const result = await canCreateAutoSave("note-123", freePlan, stubDb as any);
      expect(result.canCreate).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("blocks auto-save when all 5 versions are manual saves", async () => {
      const stubDb = {
        noteVersion: {
          count: vi
            .fn()
            .mockResolvedValueOnce(5) // total versions
            .mockResolvedValueOnce(5), // all are manual
        },
      };

      const result = await canCreateAutoSave("note-123", freePlan, stubDb as any);
      expect(result.canCreate).toBe(false);
      expect(result.reason).toContain("Remove a manual save");
    });

    it("always allows auto-save for pro plan", async () => {
      const stubDb = {
        noteVersion: {
          count: vi.fn().mockResolvedValue(100),
        },
      };

      const result = await canCreateAutoSave("note-123", proPlan, stubDb as any);
      expect(result.canCreate).toBe(true);
      expect(stubDb.noteVersion.count).not.toHaveBeenCalled();
    });
  });
});

describe("mapSubscriptionStatus", () => {
  it("maps Shopify statuses to internal enum", () => {
    expect(mapSubscriptionStatus("ACTIVE")).toBe("ACTIVE");
    expect(mapSubscriptionStatus("CANCELLED")).toBe("CANCELED");
    expect(mapSubscriptionStatus("DECLINED")).toBe("CANCELED");
    expect(mapSubscriptionStatus("FROZEN")).toBe("PAST_DUE");
    expect(mapSubscriptionStatus("UNKNOWN")).toBe("NONE");
  });
});

