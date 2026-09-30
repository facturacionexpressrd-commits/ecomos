"use client";

import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const res = await fetch("/api/analytics/summary");
        const data = await res.json();
        setSummary(data);
        setProducts(data.topProducts || []);
        setCampaigns(data.campaigns || []);
      } catch (error) {
        console.error("Failed to load analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading analytics...</div>;
  }

  return (
    <div className="space-y-8 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="Revenue (30d)" value={`$${(summary?.revenue || 0).toFixed(2)}`} />
        <SummaryCard title="Profit (30d)" value={`$${(summary?.profit || 0).toFixed(2)}`} />
        <SummaryCard title="Margin" value={`${(summary?.margin || 0).toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Orders" value={summary?.orders || 0} />
        <MetricBox label="Customers" value={summary?.customers || 0} />
        <MetricBox label="AOV" value={`$${(summary?.aov || 0).toFixed(2)}`} />
        <MetricBox label="Conversion" value={`${(summary?.conversionRate || 2.5).toFixed(1)}%`} />
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Top Products by Profit</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Revenue</th>
                <th className="text-right py-2">Profit</th>
                <th className="text-right py-2">Margin</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 10).map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="py-3">{product.title}</td>
                  <td className="text-right">${(product.revenue || 0).toFixed(2)}</td>
                  <td className="text-right font-semibold text-green-600">
                    ${(product.profit || 0).toFixed(2)}
                  </td>
                  <td className="text-right">{(product.margin || 0).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Campaign Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Campaign</th>
                <th className="text-right py-2">Spend</th>
                <th className="text-right py-2">Clicks</th>
                <th className="text-right py-2">CPC</th>
                <th className="text-right py-2">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b hover:bg-gray-50">
                  <td className="py-3">{campaign.name}</td>
                  <td className="text-right">${(campaign.spend || 0).toFixed(2)}</td>
                  <td className="text-right">{campaign.clicks || 0}</td>
                  <td className="text-right">${(campaign.cpc || 0).toFixed(2)}</td>
                  <td className={`text-right font-semibold ${(campaign.roas || 1) > 2 ? "text-green-600" : "text-red-600"}`}>
                    {(campaign.roas || 1).toFixed(2)}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <p className="text-gray-600 text-sm">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <p className="text-gray-600 text-xs uppercase">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
