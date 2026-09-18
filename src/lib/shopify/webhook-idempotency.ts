import { Prisma } from "@prisma/client";

/**
 * Pure decision function: was this error a unique-constraint violation (Prisma P2002)?
 * The only unique constraint the webhook route's insert can hit is
 * WebhookEvent.shopifyWebhookId, so "P2002 on this insert" == "already recorded this
 * exact webhook delivery." Isolated from the DB call itself so it's unit-testable
 * with a plain fake error object, no live DB required.
 */
export function isDuplicateWebhookError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
