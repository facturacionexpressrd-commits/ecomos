"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

interface ApprovalActionItem {
  id: string;
  actionType: string;
  title: string;
  description: string;
  priority: string;
  confidenceScore: number;
  reasoning: string;
  executiveExplanation: string;
  status: string;
  createdAt: string;
}

interface ApprovalCenterProps {
  storeId: string;
}

// Los valores vienen de la base de datos, así que se traducen por tabla y, si
// aparece uno nuevo, se muestra el valor crudo en vez de romper la pantalla.
const PRIORITY_KEYS: Record<string, MessageKey> = {
  critical: "approvalCenter.priority.critical",
  high: "approvalCenter.priority.high",
  medium: "approvalCenter.priority.medium",
  low: "approvalCenter.priority.low",
};

const STATUS_KEYS: Record<string, MessageKey> = {
  pending: "approvalCenter.status.pending",
  approved: "approvalCenter.status.approved",
  rejected: "approvalCenter.status.rejected",
};

const ACTION_TYPE_KEYS: Record<string, MessageKey> = {
  supplier_add: "approvalCenter.action.supplier_add",
  budget_update: "approvalCenter.action.budget_update",
  price_adjustment: "approvalCenter.action.price_adjustment",
  creative_approval: "approvalCenter.action.creative_approval",
  campaign_launch: "approvalCenter.action.campaign_launch",
  product_publish: "approvalCenter.action.product_publish",
  order_fulfillment: "approvalCenter.action.order_fulfillment",
};

export default function ApprovalCenter({ storeId }: ApprovalCenterProps) {
  const t = useT();
  const [approvals, setApprovals] = useState<ApprovalActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  // La clave del error se guarda sin traducir para que el efecto no dependa de `t`.
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [errorText, setErrorText] = useState("");
  const [noticeKey, setNoticeKey] = useState<MessageKey | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalActionItem | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const loadApprovals = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/approvals/list?storeId=${encodeURIComponent(storeId)}&status=pending`
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "");
        }

        const data = await response.json();
        setApprovals(data.approvals || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        setErrorKey(message ? null : "approvalCenter.loadFailed");
        setErrorText(message);
      } finally {
        setLoading(false);
      }
    };

    loadApprovals();
  }, [storeId]);

  const handleDecision = async (decision: "approved" | "rejected") => {
    if (!selectedApproval) return;
    if (decision === "rejected" && !rejectionReason.trim()) {
      setErrorKey("approvalCenter.reasonRequired");
      setErrorText("");
      return;
    }

    try {
      setDeciding(true);
      setErrorKey(null);
      setErrorText("");

      const response = await fetch("/api/approvals/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          approvalId: selectedApproval.id,
          decision,
          rejectionReason: decision === "rejected" ? rejectionReason : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "");
      }

      const result = await response.json();
      setNoticeKey(
        decision === "approved" && !result.executed ? "approvalCenter.approvedNoStep" : null
      );

      // Remove from list and deselect
      setApprovals(approvals.filter((a) => a.id !== selectedApproval.id));
      setSelectedApproval(null);
      setRejectionReason("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setErrorKey(message ? null : "approvalCenter.decisionFailed");
      setErrorText(message);
    } finally {
      setDeciding(false);
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-coral/15 text-coral border-coral/30";
      case "high":
        return "bg-gold/15 text-gold-hi border-gold/30";
      case "medium":
        return "bg-gold/15 text-gold-hi border-gold/30";
      case "low":
        return "bg-gold/10 text-gold-hi border-gold/40";
      default:
        return "bg-white/5 text-hi border-line-hi";
    }
  };

  const priorityLabel = (priority: string) => {
    const key = PRIORITY_KEYS[priority];
    return key ? t(key) : priority.toUpperCase();
  };

  const statusLabel = (status: string) => {
    const key = STATUS_KEYS[status];
    return key ? t(key) : status;
  };

  const actionTypeLabel = (actionType: string) => {
    const key = ACTION_TYPE_KEYS[actionType];
    return key ? t(key) : actionType;
  };

  const actionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case "supplier_add":
        return "🤝";
      case "budget_update":
        return "💰";
      case "price_adjustment":
        return "💵";
      case "creative_approval":
        return "🎨";
      case "campaign_launch":
        return "🚀";
      case "product_publish":
        return "📦";
      case "order_fulfillment":
        return "📦";
      default:
        return "✓";
    }
  };

  if (loading) {
    return <div className="text-center text-lo">{t("approvalCenter.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t("approvalCenter.title")}</h2>
        <p className="mt-1 text-lo">
          {approvals.length === 1
            ? t("approvalCenter.pendingCountOne")
            : t("approvalCenter.pendingCount", { count: approvals.length })}
        </p>
      </div>

      {(errorKey || errorText) && (
        <div className="rounded-lg bg-coral/15 p-4 text-sm text-coral">
          {errorText || t(errorKey ?? "approvalCenter.loadError")}
        </div>
      )}
      {noticeKey && (
        <div className="rounded-lg bg-gold/10 p-4 text-sm text-gold-hi">{t(noticeKey)}</div>
      )}

      {approvals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-hi bg-white/5 p-12 text-center">
          <p className="text-lo">{t("approvalCenter.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Approvals List */}
          <div className="lg:col-span-1">
            <div className="space-y-2">
              {approvals.map((approval) => (
                <button
                  key={approval.id}
                  onClick={() => setSelectedApproval(approval)}
                  className={`w-full rounded-lg border-2 p-4 text-left transition ${
                    selectedApproval?.id === approval.id
                      ? "border-gold bg-gold/10"
                      : "border-line hover:border-gold/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{actionTypeIcon(approval.actionType)}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{approval.title}</p>
                      <p className="text-xs text-lo line-clamp-2">
                        {approval.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`rounded border px-2 py-1 text-xs font-medium ${priorityColor(
                            approval.priority
                          )}`}
                        >
                          {priorityLabel(approval.priority)}
                        </span>
                        <span className="text-xs text-faint">
                          {t("approvalCenter.confidentShort", {
                            value: (approval.confidenceScore * 100).toFixed(0),
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedApproval && (
            <div className="rounded-lg border-2 border-gold bg-gold/10 p-6 lg:col-span-2">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{actionTypeIcon(selectedApproval.actionType)}</span>
                  <div>
                    <h3 className="text-2xl font-bold">{selectedApproval.title}</h3>
                    <p className="text-sm text-lo">{actionTypeLabel(selectedApproval.actionType)}</p>
                  </div>
                </div>
              </div>

              {/* Executive Explanation */}
              <div className="mb-6 rounded-lg bg-white/5 p-4 border-l-4 border-gold">
                <p className="text-sm font-medium text-lo mb-2">
                  {t("approvalCenter.executiveSummary")}
                </p>
                <p className="text-base leading-relaxed">
                  {selectedApproval.executiveExplanation}
                </p>
              </div>

              {/* Details */}
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div className="rounded bg-white/5 p-4">
                  <p className="text-sm text-lo">{t("approvalCenter.priority")}</p>
                  <p className={`mt-1 inline-block rounded px-3 py-1 text-sm font-medium ${priorityColor(
                    selectedApproval.priority
                  )}`}>
                    {priorityLabel(selectedApproval.priority)}
                  </p>
                </div>
                <div className="rounded bg-white/5 p-4">
                  <p className="text-sm text-lo">{t("approvalCenter.confidence")}</p>
                  <p className="mt-1 text-2xl font-bold text-gold-hi">
                    {(selectedApproval.confidenceScore * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Reasoning */}
              <div className="mb-6 rounded bg-white/5 p-4">
                <p className="mb-2 text-sm font-medium">{t("approvalCenter.aiReasoning")}</p>
                <p className="text-sm text-lo">{selectedApproval.reasoning}</p>
              </div>

              {/* Decision Section */}
              {selectedApproval.status === "pending" && (
                <div className="space-y-4 border-t pt-6">
                  {selectedApproval.priority === "critical" && (
                    <div className="rounded bg-coral/15 p-4 text-sm text-coral">
                      {t("approvalCenter.criticalWarning")}
                    </div>
                  )}

                  {rejectionReason && (
                    <div>
                      <label className="block text-sm font-medium">
                        {t("approvalCenter.rejectionReason")}
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="mt-2 h-20 w-full rounded border border-line-hi px-3 py-2"
                        placeholder={t("approvalCenter.rejectionPlaceholder")}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDecision("approved")}
                      disabled={deciding}
                      className="flex-1 rounded bg-teal px-4 py-3 text-ink hover:opacity-90 disabled:opacity-50 font-medium"
                    >
                      {deciding ? t("approvalCenter.processing") : t("approvalCenter.approve")}
                    </button>
                    <button
                      onClick={() => {
                        if (rejectionReason) {
                          handleDecision("rejected");
                        } else {
                          // Primer clic: abre el campo del motivo con un texto por defecto.
                          setRejectionReason(t("approvalCenter.rejectionPending"));
                        }
                      }}
                      disabled={deciding}
                      className="flex-1 rounded bg-coral px-4 py-3 text-ink hover:opacity-90 disabled:opacity-50 font-medium"
                    >
                      {rejectionReason
                        ? t("approvalCenter.confirmReject")
                        : t("approvalCenter.reject")}
                    </button>
                  </div>
                </div>
              )}

              {selectedApproval.status !== "pending" && (
                <div className="rounded bg-white/5 p-4 text-center text-sm text-lo">
                  {t("approvalCenter.statusLabel")}{" "}
                  <span className="font-medium">{statusLabel(selectedApproval.status)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
