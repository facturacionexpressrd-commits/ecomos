"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";

export default function CustomDashboardPage() {
  const t = useT();
  // Lista fija por ahora: el editor de widgets todavía no existe, así que no hay setter.
  const [widgets] = useState(
    [
      { id: 1, type: "revenue", titleKey: "custom.widget.revenue" },
      { id: 2, type: "profit", titleKey: "custom.widget.profit" },
      { id: 3, type: "products", titleKey: "custom.widget.products" },
      { id: 4, type: "campaigns", titleKey: "custom.widget.campaigns" },
    ] as const
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t("custom.title")}</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">{t("custom.editLayout")}</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {widgets.map((w) => (
          <div key={w.id} className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-semibold">{t(w.titleKey)}</h3>
            <p className="text-sm text-gray-500 mt-2">{t("custom.widgetPlaceholder", { type: w.type })}</p>
          </div>
        ))}
      </div>
    </div>
  );
}