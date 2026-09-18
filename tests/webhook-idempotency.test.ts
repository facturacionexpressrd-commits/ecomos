import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { isDuplicateWebhookError } from "@/lib/shopify/webhook-idempotency";

function makeUniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
    meta: { target: ["shopifyWebhookId"] },
  });
}

describe("isDuplicateWebhookError", () => {
  it("recognizes a unique-constraint violation as a duplicate", () => {
    expect(isDuplicateWebhookError(makeUniqueConstraintError())).toBe(true);
  });

  it("does not treat an unrelated Prisma error as a duplicate", () => {
    const notFound = new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "test",
    });
    expect(isDuplicateWebhookError(notFound)).toBe(false);
  });

  it("does not treat a plain Error as a duplicate", () => {
    expect(isDuplicateWebhookError(new Error("boom"))).toBe(false);
  });
});

describe("webhook route idempotency (simulated insert-first dedupe)", () => {
  // Mirrors the real route: insert a WebhookEvent keyed on shopifyWebhookId; a unique
  // constraint violation means "already seen" and the caller should not re-process.
  function makeFakeWebhookEventTable() {
    const seen = new Set<string>();
    let processedCount = 0;
    return {
      async receive(webhookId: string) {
        if (seen.has(webhookId)) {
          throw makeUniqueConstraintError();
        }
        seen.add(webhookId);
      },
      async process() {
        processedCount++;
      },
      get processedCount() {
        return processedCount;
      },
    };
  }

  async function handleDelivery(table: ReturnType<typeof makeFakeWebhookEventTable>, webhookId: string) {
    try {
      await table.receive(webhookId);
    } catch (err) {
      if (isDuplicateWebhookError(err)) return "duplicate" as const;
      throw err;
    }
    await table.process();
    return "processed" as const;
  }

  it("processes the first delivery and no-ops on a retried duplicate", async () => {
    const table = makeFakeWebhookEventTable();

    const first = await handleDelivery(table, "wh-123");
    const second = await handleDelivery(table, "wh-123"); // Shopify retry, same id

    expect(first).toBe("processed");
    expect(second).toBe("duplicate");
    expect(table.processedCount).toBe(1);
  });

  it("processes distinct webhook ids independently", async () => {
    const table = makeFakeWebhookEventTable();

    await handleDelivery(table, "wh-1");
    await handleDelivery(table, "wh-2");

    expect(table.processedCount).toBe(2);
  });
});
