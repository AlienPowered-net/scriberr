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

  it("trims note versions to five for free plan", async () => {
    const stubDb = {
      noteVersion: {
        findMany: vi.fn().mockResolvedValue([
          { id: "old-1" },
          { id: "old-2" },
        ]),
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };

    await enforceVersionRetention("note-123", freePlan, stubDb as any);

    expect(stubDb.noteVersion.findMany).toHaveBeenCalledWith({
      where: { noteId: "note-123" },
      orderBy: { createdAt: "desc" },
      skip: 5,
      select: { id: true },
    });

    expect(stubDb.noteVersion.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["old-1", "old-2"] } },
    });
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

