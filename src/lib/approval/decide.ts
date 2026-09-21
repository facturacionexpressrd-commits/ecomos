import { prisma } from "@/lib/db";
import { setCampaignBudget, setCampaignStatus } from "@/lib/meta/actions";

export type ExecutorContext = { storeId: string; userId: string };
export type Executor = (ctx: ExecutorContext, data: Record<string, unknown>) => Promise<void>;

function field<T>(data: Record<string, unknown>, key: string, type: "string" | "number"): T {
  if (typeof data[key] !== type) throw new Error(`Approval data is missing "${key}" (${type})`);
  return data[key] as T;
}

/** Only action types with a real implementation belong here; anything else is recorded, not run. */
export const EXECUTORS: Record<string, Executor> = {
  budget_update: ({ storeId }, data) =>
    setCampaignBudget({
      storeId,
      campaignId: field(data, "campaignId", "string"),
      dailyBudgetCents: field(data, "dailyBudgetCents", "number"),
      adSetId: typeof data.adSetId === "string" ? data.adSetId : undefined,
    }).then(() => undefined),
  campaign_launch: ({ storeId }, data) =>
    setCampaignStatus({ storeId, campaignId: field(data, "campaignId", "string"), status: "ACTIVE" }).then(
      () => undefined
    ),
};

export type DecideResult =
  | { outcome: "not_found" }
  | { outcome: "already_processed" }
  | { outcome: "rejected" }
  | { outcome: "approved_no_executor" }
  | { outcome: "completed" }
  | { outcome: "failed"; error: string };

export async function decideApproval(input: {
  storeId: string;
  approvalId: string;
  userId: string;
  decision: "approved" | "rejected";
  rejectionReason?: string;
}): Promise<DecideResult> {
  const { storeId, approvalId, userId, decision, rejectionReason } = input;

  // Claim atomically: of two concurrent requests, only one flips pending -> decided, so an
  // action can never execute twice.
  const claimed = await prisma.approvalAction.updateMany({
    where: { id: approvalId, storeId, status: "pending" },
    data: {
      status: decision,
      approvedBy: userId,
      approvedAt: new Date(),
      rejectionReason: decision === "rejected" ? (rejectionReason ?? null) : null,
    },
  });

  if (claimed.count === 0) {
    const exists = await prisma.approvalAction.findFirst({ where: { id: approvalId, storeId }, select: { id: true } });
    return { outcome: exists ? "already_processed" : "not_found" };
  }

  const approval = await prisma.approvalAction.findUniqueOrThrow({ where: { id: approvalId } });
  let result: DecideResult;

  if (decision === "rejected") {
    result = { outcome: "rejected" };
  } else if (!EXECUTORS[approval.actionType]) {
    result = { outcome: "approved_no_executor" };
  } else {
    try {
      await EXECUTORS[approval.actionType]({ storeId, userId }, approval.data as Record<string, unknown>);
      await prisma.approvalAction.update({ where: { id: approvalId }, data: { status: "completed" } });
      result = { outcome: "completed" };
    } catch (err) {
      // Put it back in the queue so it can be retried rather than stranded as "approved".
      await prisma.approvalAction.update({
        where: { id: approvalId },
        data: { status: "pending", approvedBy: null, approvedAt: null },
      });
      result = { outcome: "failed", error: err instanceof Error ? err.message : String(err) };
    }
  }

  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { organizationId: true } });
  await prisma.auditLog.create({
    data: {
      organizationId: store.organizationId,
      userId,
      storeId,
      action: "approval.decided",
      metadata: { approvalId, actionType: approval.actionType, decision, outcome: result.outcome },
    },
  });

  return result;
}
