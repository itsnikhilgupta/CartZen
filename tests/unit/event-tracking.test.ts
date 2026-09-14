import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventTrackingService } from "@/server/services/event-tracking.service";
import { prisma } from "@/server/db/prisma";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    consent: {
      findUnique: vi.fn(),
    },
    behaviourEvent: {
      create: vi.fn(),
    },
  },
}));

describe("EventTrackingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should record event when user has opted into behavioural tracking", async () => {
    vi.mocked(prisma.consent.findUnique).mockResolvedValue({
      id: "c1",
      userId: "u1",
      personalizationOptIn: true,
      behaviouralTrackingOptIn: true,
      marketingOptIn: false,
      updatedToAt: new Date(),
    });

    const res = await EventTrackingService.logEvent({
      userId: "u1",
      eventType: "PRODUCT_SCAN",
      barcode: "8901030000012",
    });

    expect(res.recorded).toBe(true);
    expect(prisma.behaviourEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          eventType: "PRODUCT_SCAN",
        }),
      })
    );
  });

  it("should silently skip event recording when user has NOT opted in", async () => {
    vi.mocked(prisma.consent.findUnique).mockResolvedValue({
      id: "c2",
      userId: "u2",
      personalizationOptIn: false,
      behaviouralTrackingOptIn: false,
      marketingOptIn: false,
      updatedToAt: new Date(),
    });

    const res = await EventTrackingService.logEvent({
      userId: "u2",
      eventType: "ADD_TO_CART",
      barcode: "8901030000012",
      quantity: 2,
    });

    expect(res.recorded).toBe(false);
    expect(prisma.behaviourEvent.create).not.toHaveBeenCalled();
  });

  it("should skip recording when consent record is missing", async () => {
    vi.mocked(prisma.consent.findUnique).mockResolvedValue(null);

    const res = await EventTrackingService.logEvent({
      userId: "u-no-consent",
      eventType: "PRODUCT_VIEW",
    });

    expect(res.recorded).toBe(false);
    expect(prisma.behaviourEvent.create).not.toHaveBeenCalled();
  });
});
