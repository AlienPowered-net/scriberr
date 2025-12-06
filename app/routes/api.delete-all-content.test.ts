import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuthenticateAdmin = vi.fn();
const mockGetShopId = vi.fn();
const mockPrisma = {
  note: { deleteMany: vi.fn() },
  folder: { deleteMany: vi.fn() },
  contact: { deleteMany: vi.fn() },
  contactFolder: { deleteMany: vi.fn() },
};

vi.mock("../shopify.server", () => ({
  shopify: {
    authenticate: {
      admin: mockAuthenticateAdmin,
    },
  },
}));

vi.mock("../utils/db.server", () => ({
  prisma: mockPrisma,
}));

vi.mock("../utils/tenant.server", () => ({
  getOrCreateShopId: mockGetShopId,
}));

describe("api.delete-all-content action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAdmin.mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
    });
    mockGetShopId.mockResolvedValue("shop-id-123");
    mockPrisma.note.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.folder.deleteMany.mockResolvedValue({ count: 2 });
    mockPrisma.contact.deleteMany.mockResolvedValue({ count: 3 });
    mockPrisma.contactFolder.deleteMany.mockResolvedValue({ count: 4 });
  });

  it("returns success JSON without redirect when confirmation is valid", async () => {
    const { action } = await import("./api.delete-all-content.jsx");

    const formData = new FormData();
    formData.set("confirmation", "DELETE");

    const request = new Request(
      "http://localhost/api/delete-all-content?shop=test-shop.myshopify.com&host=test-host",
      {
        method: "POST",
        body: formData,
      },
    );

    const response = await action({ request });

    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBeNull();

    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(mockAuthenticateAdmin).toHaveBeenCalledTimes(1);
    expect(mockGetShopId).toHaveBeenCalledWith("test-shop.myshopify.com");
  });
});
