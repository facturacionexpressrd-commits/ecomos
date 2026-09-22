"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CampaignActionMenu from "./CampaignActionMenu";
import { StatTile } from "@/components/dashboard/ui/StatTile";
import { StatusPill, EmptyState } from "@/components/dashboard/ui/PageHeader";
import { Layers, DollarSign, TrendingUp, Gauge, Info } from "lucide-react";

interface Campaign {
  id: string;
  metaCampaignId: string;
  name: string;
  status: string;
  objective: string;
  spend: number;
  impressions: number;
  conversions: number;
  revenueRoas: number;
  contributionRoas: number;
  profitability: number;
  estimatedRevenue: number;
  estimatedProfit: number;
  cpa: number;
  syncedAt?: string;
  createdAt: string;
}

interface CampaignsTableProps {
  storeId: string;
}

type SortField = "spend" | "roas" | "profitability" | "profit";

export default function CampaignsTable({ storeId }: CampaignsTableProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("spend");
  const [meta, setMeta] = useState({
    total: 0,
    totalSpend: 0,
    totalRevenue: 0,
    avgContributionRoas: 0,
  });

  useEffect(() => {
    // Guarded so a quick re-sort can't let an earlier, slower response
    // overwrite the newer one.
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/campaigns/list?storeId=${encodeURIComponent(storeId)}&sortBy=${encodeURIComponent(sortBy)}`
        );
        if (!res.ok) throw new Error("Failed to fetch campaigns");

        const data = await res.json();
        if (cancelled) return;

        setCampaigns(data.campaigns);
        setMeta(data.meta);
        setError("");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [storeId, sortBy]);

  const handleCampaignActionCompleted = () => {
    const load = async () => {
      try {
        const res = await fetch(
          `/api/campaigns/list?storeId=${encodeURIComponent(storeId)}&sortBy=${encodeURIComponent(sortBy)}`
        );
        if (!res.ok) throw new Error("Failed to fetch campaigns");
        const data = await res.json();
        setCampaigns(data.campaigns);
        setMeta(data.meta);
      } catch (err) {
        console.error("Failed to reload campaigns:", err);
      }
    };
    load();
  };

  if (loading) return <div className="glass p-6 text-sm text-lo">Loading campaigns…</div>;
  if (error) return <div className="glass p-6 text-sm text-coral">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href={`/dashboard/meta/campaigns/new?storeId=${encodeURIComponent(storeId)}`}
          className="inline-flex items-center rounded-lg bg-gradient-to-b from-gold-hi to-gold px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90"
        >
          + Create campaign
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatTile label="Total campaigns" value={meta.total.toString()} icon={<Layers size={16} />} />
        <StatTile label="Total ad spend" value={`$${meta.totalSpend.toFixed(2)}`} icon={<DollarSign size={16} />} />
        <StatTile label="Est. revenue" value={`$${meta.totalRevenue.toFixed(2)}`} icon={<TrendingUp size={16} />} />
        <StatTile
          label="Avg contribution ROAS"
          value={`${meta.avgContributionRoas.toFixed(2)}x`}
          icon={<Gauge size={16} />}
        />
      </div>

      {campaigns.length === 0 ? (
        <EmptyState title="No campaigns yet">Connect a Meta account to sync campaigns.</EmptyState>
      ) : (
        <div className="glass overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-faint uppercase">
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
                <th
                  className="cursor-pointer px-4 py-3 font-medium hover:text-hi"
                  onClick={() => setSortBy("spend")}
                >
                  Spend {sortBy === "spend" ? "↓" : ""}
                </th>
                <th className="px-4 py-3 text-right font-medium">Impressions</th>
                <th className="px-4 py-3 text-right font-medium">Conversions</th>
                <th className="px-4 py-3 text-right font-medium">CPA</th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium hover:text-hi"
                  onClick={() => setSortBy("roas")}
                >
                  Contrib ROAS {sortBy === "roas" ? "↓" : ""}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium hover:text-hi"
                  onClick={() => setSortBy("profitability")}
                >
                  Profitability {sortBy === "profitability" ? "↓" : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-line last:border-0 hover:bg-white/3">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/campaigns/${campaign.id}`} className="font-medium text-hi hover:text-gold-hi">
                      {campaign.name}
                    </Link>
                    <p className="text-xs text-faint">{campaign.objective}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={campaign.status} />
                  </td>
                  <td className="px-4 py-3">
                    <CampaignActionMenu
                      storeId={storeId}
                      campaignId={campaign.id}
                      metaCampaignId={campaign.metaCampaignId}
                      status={campaign.status}
                      onActionCompleted={handleCampaignActionCompleted}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-hi">${campaign.spend.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-lo">{campaign.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-lo">{campaign.conversions}</td>
                  <td className="px-4 py-3 text-right font-mono text-lo">${campaign.cpa.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono font-medium ${campaign.contributionRoas >= 1 ? "text-teal" : "text-coral"}`}>
                      {campaign.contributionRoas.toFixed(2)}x
                    </span>
                    <p className="text-xs text-faint">Profit: ${campaign.estimatedProfit.toFixed(0)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono font-medium ${campaign.profitability > 0 ? "text-teal" : "text-coral"}`}>
                      ${campaign.profitability.toFixed(2)}/$ spent
                    </span>
                    <p className="text-xs text-faint">{campaign.profitability > 0 ? "Profitable" : "Loss"}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="glass flex gap-3 p-4 text-xs text-lo">
        <Info size={16} className="mt-0.5 shrink-0 text-gold-hi" />
        <ul className="space-y-1">
          <li>
            <strong className="text-hi">Contribution ROAS:</strong> (Estimated revenue × contribution margin%) / ad spend. Accounts for COGS & fees.
          </li>
          <li>
            <strong className="text-hi">Profitability:</strong> Profit per $1 spent. Positive = profitable campaign.
          </li>
          <li>
            <strong className="text-hi">CPA:</strong> Cost per action (order). Compare to max sustainable CPA to evaluate efficiency.
          </li>
          <li>
            <strong className="text-hi">Revenue attribution:</strong> MVP estimates based on store average; use UTM tracking for accurate per-campaign revenue.
          </li>
        </ul>
      </div>
    </div>
  );
}
