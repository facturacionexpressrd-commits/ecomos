"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Campaign {
  id: string;
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
    fetchCampaigns();
  }, [storeId, sortBy]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/campaigns/list?storeId=${storeId}&sortBy=${sortBy}`);
      if (!res.ok) throw new Error("Failed to fetch campaigns");

      const data = await res.json();
      setCampaigns(data.campaigns);
      setMeta(data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-600">Loading campaigns...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Campaigns</p>
          <p className="text-2xl font-bold">{meta.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Ad Spend</p>
          <p className="text-2xl font-bold">${meta.totalSpend.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Est. Revenue</p>
          <p className="text-2xl font-bold">${meta.totalRevenue.toFixed(2)}</p>
        </div>
        <div className={`rounded-lg border p-4 ${meta.avgContributionRoas >= 1 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <p className="text-sm text-gray-600">Avg Contribution ROAS</p>
          <p className={`text-2xl font-bold ${meta.avgContributionRoas >= 1 ? "text-green-700" : "text-red-700"}`}>
            {meta.avgContributionRoas.toFixed(2)}x
          </p>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Campaign</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-sm font-semibold hover:bg-gray-100"
                onClick={() => setSortBy("spend")}
              >
                Spend {sortBy === "spend" ? "↓" : ""}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Impressions</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Conversions</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">CPA</th>
              <th
                className="cursor-pointer px-4 py-3 text-right text-sm font-semibold hover:bg-gray-100"
                onClick={() => setSortBy("roas")}
              >
                Contrib ROAS {sortBy === "roas" ? "↓" : ""}
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right text-sm font-semibold hover:bg-gray-100"
                onClick={() => setSortBy("profitability")}
              >
                Profitability {sortBy === "profitability" ? "↓" : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr
                key={campaign.id}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {campaign.name}
                  </Link>
                  <p className="text-xs text-gray-500">{campaign.objective}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                      campaign.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : campaign.status === "PAUSED"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {campaign.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-sm">
                  ${campaign.spend.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {campaign.impressions.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {campaign.conversions}
                </td>
                <td className="px-4 py-3 text-right text-sm font-mono">
                  ${campaign.cpa.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-semibold ${campaign.contributionRoas >= 1 ? "text-green-700" : "text-red-700"}`}
                  >
                    {campaign.contributionRoas.toFixed(2)}x
                  </span>
                  <p className="text-xs text-gray-500">
                    Profit: ${campaign.estimatedProfit.toFixed(0)}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-semibold ${campaign.profitability > 0 ? "text-green-700" : "text-red-700"}`}
                  >
                    ${campaign.profitability.toFixed(2)}/$ spent
                  </span>
                  <p className="text-xs text-gray-500">
                    {campaign.profitability > 0 ? "Profitable" : "Loss"}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {campaigns.length === 0 && (
        <div className="rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">No campaigns found. Connect Meta account to sync campaigns.</p>
        </div>
      )}

      {/* Legend */}
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-gray-700">
        <p className="font-semibold mb-2">📌 Methodology</p>
        <ul className="space-y-1 text-xs">
          <li>
            <strong>Contribution ROAS:</strong> (Estimated Revenue × Contribution Margin%) / Ad Spend. Accounts for COGS & fees.
          </li>
          <li>
            <strong>Profitability:</strong> Profit per $1 spent. Positive = profitable campaign.
          </li>
          <li>
            <strong>CPA:</strong> Cost Per Action (order). Compare to Max Sustainable CPA to evaluate efficiency.
          </li>
          <li>
            <strong>Revenue attribution:</strong> MVP estimates based on store avg; use UTM tracking for accurate per-campaign revenue.
          </li>
        </ul>
      </div>
    </div>
  );
}
