import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Shopify server before importing guards
vi.mock("~/shopify.server.js", () => ({
  default: {
    authenticate: {
      admin: vi.fn(),
    },
  },
}));

// Mock Prisma
vi.mock("~/utils/db.server", () => ({
  prisma: {
    shop: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  ensureCanCreateNote,
  ensureCanCreateNoteFolder,
  requireFeature,
  PlanError,
  getVisibleCount,
  hasFiveAllManual,
  hideOldestVisibleAuto,
  surfaceNewestHiddenAuto,
  listVisibleVersions,
  buildVersionsMeta,
  getVersionLimit,
  isWithinVersionPromptCooldown,
  buildVersionLimitPlanError,
  getVersionLimitStatus,
} from "~/utils/ensurePlan.server";
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

  describe("version visibility model", () => {
    it("counts visible versions correctly", async () => {
      const stubDb = {
        noteVersion: {
          count: vi.fn().mockResolvedValue(3),
        },
      };

      const result = await getVisibleCount("note-123", stubDb as any);
      expect(result).toBe(3);
      expect(stubDb.noteVersion.count).toHaveBeenCalledWith({
        where: { noteId: "note-123", freeVisible: true },
      });
    });

    it("detects when all 5 visible versions are manual", async () => {
      const stubDb = {
        noteVersion: {
          count: vi
            .fn()
            .mockResolvedValueOnce(5) // visible count
            .mockResolvedValueOnce(5), // manual visible count
        },
      };

      const result = await hasFiveAllManual("note-123", stubDb as any);
      expect(result).toBe(true);
    });

    it("detects when not all visible versions are manual", async () => {
      const stubDb = {
        noteVersion: {
          count: vi
            .fn()
            .mockResolvedValueOnce(5) // visible count
            .mockResolvedValueOnce(3), // manual visible count (2 are auto)
        },
      };

      const result = await hasFiveAllManual("note-123", stubDb as any);
      expect(result).toBe(false);
    });

    it("hides oldest visible auto version", async () => {
      const oldestAuto = { id: "old-auto-1" };
      const stubDb = {
        noteVersion: {
          findFirst: vi.fn().mockResolvedValue(oldestAuto),
          update: vi.fn().mockResolvedValue(oldestAuto),
        },
      };

      const result = await hideOldestVisibleAuto("note-123", stubDb as any);
      expect(result).toBe("old-auto-1");
      expect(stubDb.noteVersion.findFirst).toHaveBeenCalledWith({
        where: { noteId: "note-123", freeVisible: true, saveType: "AUTO" },
        orderBy: [
          { createdAt: "asc" },
          { id: "asc" },
        ],
        select: { id: true },
      });
      expect(stubDb.noteVersion.update).toHaveBeenCalledWith({
        where: { id: "old-auto-1" },
        data: { freeVisible: false },
      });
    });

    it("returns null when no visible auto versions exist", async () => {
      const stubDb = {
        noteVersion: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      };

      const result = await hideOldestVisibleAuto("note-123", stubDb as any);
      expect(result).toBeNull();
    });

    it("surfaces newest hidden auto version", async () => {
      const newestHiddenAuto = { id: "hidden-auto-1" };
      const stubDb = {
        noteVersion: {
          findFirst: vi.fn().mockResolvedValue(newestHiddenAuto),
          update: vi.fn().mockResolvedValue(newestHiddenAuto),
        },
      };

      const result = await surfaceNewestHiddenAuto("note-123", stubDb as any);
      expect(result).toBe("hidden-auto-1");
      expect(stubDb.noteVersion.findFirst).toHaveBeenCalledWith({
        where: { noteId: "note-123", freeVisible: false, saveType: "AUTO" },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        select: { id: true },
      });
      expect(stubDb.noteVersion.update).toHaveBeenCalledWith({
        where: { id: "hidden-auto-1" },
        data: { freeVisible: true },
      });
    });

    it("returns null when no hidden auto versions exist", async () => {
      const stubDb = {
        noteVersion: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      };

      const result = await surfaceNewestHiddenAuto("note-123", stubDb as any);
      expect(result).toBeNull();
    });

    it("detects when version limit is reached", async () => {
      const stubDb = {
        noteVersion: {
          count: vi.fn().mockResolvedValue(5),
        },
      };

      const status = await getVersionLimitStatus("note-123", 5, stubDb as any);
      expect(status).toEqual({ visibleCount: 5, atLimit: true });
    });

    it("detects when version limit is not reached", async () => {
      const stubDb = {
        noteVersion: {
          count: vi.fn().mockResolvedValue(3),
        },
      };

      const status = await getVersionLimitStatus("note-123", 5, stubDb as any);
      expect(status).toEqual({ visibleCount: 3, atLimit: false });
    });

    it("lists visible versions for FREE plan", async () => {
      const versions = [
        { id: "v1", createdAt: new Date("2024-01-02") },
        { id: "v2", createdAt: new Date("2024-01-01") },
      ];
      const stubDb = {
        noteVersion: {
          findMany: vi.fn().mockResolvedValue(versions),
        },
      };

      const result = await listVisibleVersions("note-123", freePlan, stubDb as any);
      expect(result).toEqual(versions);
      expect(stubDb.noteVersion.findMany).toHaveBeenCalledWith({
        where: { noteId: "note-123", freeVisible: true },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
      });
    });

    it("lists all versions for PRO plan", async () => {
      const versions = [
        { id: "v1", createdAt: new Date("2024-01-02") },
        { id: "v2", createdAt: new Date("2024-01-01") },
      ];
      const stubDb = {
        noteVersion: {
          findMany: vi.fn().mockResolvedValue(versions),
        },
      };

      const result = await listVisibleVersions("note-123", proPlan, stubDb as any);
      expect(result).toEqual(versions);
      expect(stubDb.noteVersion.findMany).toHaveBeenCalledWith({
        where: { noteId: "note-123" },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
      });
    });

    it("builds meta for FREE plan with all manual visible", async () => {
      const stubDb = {
        noteVersion: {
          count: vi
            .fn()
            .mockResolvedValueOnce(5) // visible count
            .mockResolvedValueOnce(5), // manual visible count
        },
      };

      const result = await buildVersionsMeta("note-123", freePlan, stubDb as any);
      expect(result).toMatchObject({
        plan: "FREE",
        visibleCount: 5,
        hasAllManualVisible: true,
        lastActionInlineAlert: null,
      });
    });

    it("builds meta for FREE plan with mixed visible", async () => {
      const stubDb = {
        noteVersion: {
          count: vi
            .fn()
            .mockResolvedValueOnce(5) // visible count
            .mockResolvedValueOnce(3), // manual visible count
        },
      };

      const result = await buildVersionsMeta("note-123", freePlan, stubDb as any);
      expect(result).toMatchObject({
        plan: "FREE",
        visibleCount: 5,
        hasAllManualVisible: false,
        lastActionInlineAlert: null,
      });
    });

    it("builds meta for PRO plan", async () => {
      const stubDb = {
        noteVersion: {
          count: vi.fn().mockResolvedValue(10),
        },
      };

      const result = await buildVersionsMeta("note-123", proPlan, stubDb as any);
      expect(result).toMatchObject({
        plan: "PRO",
        visibleCount: 10,
        hasAllManualVisible: false,
        lastActionInlineAlert: null,
      });
    });

    it("includes inline alert in meta", async () => {
      const stubDb = {
        noteVersion: {
          count: vi
            .fn()
            .mockResolvedValueOnce(5)
            .mockResolvedValueOnce(5),
        },
      };

      const result = await buildVersionsMeta(
        "note-123",
        freePlan,
        stubDb as any,
        "NO_ROOM_DUE_TO_MANUALS",
      );
      expect(result.lastActionInlineAlert).toBe("NO_ROOM_DUE_TO_MANUALS");
    });
  });
});

describe("version limit helpers", () => {
  it("computes per-plan version limits with extra allowances", () => {
    expect(getVersionLimit("FREE")).toBe(5);
    expect(
      getVersionLimit("FREE", {
        extraFreeVersions: 10,
      } as any),
    ).toBe(15);
    expect(getVersionLimit("PRO")).toBe(Infinity);
  });

  it("detects cooldown windows for upgrade prompts", () => {
    const now = Date.now();
    expect(
      isWithinVersionPromptCooldown(
        { versionLimitPromptedAt: new Date(now - 60 * 60 * 1000) } as any,
        now,
      ),
    ).toBe(true);
    expect(
      isWithinVersionPromptCooldown(
        { versionLimitPromptedAt: new Date(now - 49 * 60 * 60 * 1000) } as any,
        now,
      ),
    ).toBe(false);
  });

  it("builds throttled plan errors and marks prompt timestamps", async () => {
    const ctx = {
      shop: {
        extraFreeVersions: 0,
        versionLimitPromptedAt: null,
      },
      plan: "FREE",
      shopId: "shop-123",
      subscriptionStatus: "NONE",
      session: {} as any,
      versionLimit: 5,
    };
    const db = {
      shop: {
        update: vi.fn(),
      },
    };
    const now = new Date("2025-01-01T00:00:00.000Z");

    const error = await buildVersionLimitPlanError(ctx as any, db as any, now);

    expect(error).toBeInstanceOf(PlanError);
    expect(error.upgradeHint).toBe(true);
    expect(db.shop.update).toHaveBeenCalledWith({
      where: { id: "shop-123" },
      data: { versionLimitPromptedAt: now },
    });
    expect(ctx.shop.versionLimitPromptedAt).toBe(now);
  });

  it("suppresses upgrade hints when within cooldown", async () => {
    const timestamp = new Date("2025-01-01T00:00:00.000Z");
    const ctx = {
      shop: {
        extraFreeVersions: 0,
        versionLimitPromptedAt: timestamp,
      },
      plan: "FREE",
      shopId: "shop-123",
      subscriptionStatus: "NONE",
      session: {} as any,
      versionLimit: 5,
    };
    const db = {
      shop: {
        update: vi.fn(),
      },
    };

    const later = new Date(timestamp.getTime() + 60 * 60 * 1000); // 1 hour later
    const error = await buildVersionLimitPlanError(ctx as any, db as any, later);

    expect(error).toBeInstanceOf(PlanError);
    expect(error.upgradeHint).toBe(false);
    expect(db.shop.update).not.toHaveBeenCalled();
    expect(ctx.shop.versionLimitPromptedAt).toBe(timestamp);
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
